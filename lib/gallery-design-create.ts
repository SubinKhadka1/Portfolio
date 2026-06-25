import { prepareGalleryDesignUpload } from "@/lib/compress-design-image";
import { parseResponseJson } from "@/lib/parse-response";
import type { GalleryDesign, GalleryDesignInput } from "@/lib/types/database";

export function titleFromMediaUrl(url: string) {
  const raw = url.split("/").pop()?.replace(/\.[^.]+$/, "") || "Untitled";
  const decoded = decodeURIComponent(raw);
  const withoutTimestamp = decoded.replace(/^\d+-/, "");
  return withoutTimestamp.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

type PreparedUpload = {
  file: File;
  width: number;
  height: number;
  aspectRatio: "square" | "portrait";
  originalName: string;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workers }, () => runWorker()));
  return results;
}

async function prepareUploads(
  files: File[],
  onProgress?: (message: string) => void
): Promise<{ prepared: PreparedUpload[]; failed: { name: string; error: string }[] }> {
  const failed: { name: string; error: string }[] = [];
  let finished = 0;

  const results = await mapWithConcurrency(
    files,
    async (file) => {
      try {
        const upload = await prepareGalleryDesignUpload(file);
        return {
          ok: true as const,
          value: {
            file: upload.file,
            width: upload.width,
            height: upload.height,
            aspectRatio: upload.aspectRatio,
            originalName: file.name,
          },
        };
      } catch (err) {
        return {
          ok: false as const,
          name: file.name,
          error: err instanceof Error ? err.message : "Could not prepare image",
        };
      } finally {
        finished += 1;
        onProgress?.(`Preparing ${finished} of ${files.length}…`);
      }
    },
    4
  );

  const prepared: PreparedUpload[] = [];
  for (const result of results) {
    if (result.ok) {
      prepared.push(result.value);
    } else {
      failed.push({ name: result.name, error: result.error });
    }
  }

  return { prepared, failed };
}

function buildGalleryDesignPayload({
  mediaUrl,
  categoryId,
  sortOrder,
  title,
  prepared,
}: {
  mediaUrl: string;
  categoryId: string | null;
  sortOrder: number;
  title?: string;
  prepared: PreparedUpload;
}): GalleryDesignInput {
  return {
    title: title?.trim() || titleFromMediaUrl(mediaUrl),
    description: "",
    media_url: mediaUrl,
    category_id: categoryId,
    published: true,
    sort_order: sortOrder,
    metadata: {
      color: "from-purple-700 to-indigo-900",
      aspectRatio: prepared.aspectRatio,
      imageWidth: prepared.width,
      imageHeight: prepared.height,
    },
  };
}

async function uploadDesignFile(file: File): Promise<{
  url: string;
  width: number;
  height: number;
  aspectRatio: "square" | "portrait";
}> {
  const prepared = await prepareGalleryDesignUpload(file);
  const formData = new FormData();
  formData.append("file", prepared.file);
  formData.append("type", "design");

  const res = await fetch("/api/upload", { method: "POST", body: formData, cache: "no-store" });
  const data = await parseResponseJson<{ url?: string; error?: string }>(res);
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Upload failed for ${file.name}`);
  }
  return {
    url: data.url,
    width: prepared.width,
    height: prepared.height,
    aspectRatio: prepared.aspectRatio,
  };
}

async function uploadPreparedFiles(
  prepared: PreparedUpload[],
  onProgress?: (message: string) => void
): Promise<{
  staged: { prepared: PreparedUpload; url: string }[];
  failed: { name: string; error: string }[];
}> {
  const failed: { name: string; error: string }[] = [];
  let finished = 0;

  const results = await mapWithConcurrency(
    prepared,
    async (entry) => {
      try {
        const uploaded = await uploadDesignFile(entry.file);
        return {
          ok: true as const,
          value: {
            prepared: {
              ...entry,
              width: uploaded.width,
              height: uploaded.height,
              aspectRatio: uploaded.aspectRatio,
            },
            url: uploaded.url,
          },
        };
      } catch (err) {
        return {
          ok: false as const,
          name: entry.originalName,
          error: err instanceof Error ? err.message : "Upload failed",
        };
      } finally {
        finished += 1;
        onProgress?.(`Uploading image ${finished} of ${prepared.length}…`);
      }
    },
    3
  );

  const staged: { prepared: PreparedUpload; url: string }[] = [];
  for (const result of results) {
    if (result.ok) {
      staged.push(result.value);
    } else {
      failed.push({ name: result.name, error: result.error });
    }
  }

  return { staged, failed };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveGalleryDesignsBatch(
  payloads: GalleryDesignInput[],
  categoryId: string | null
): Promise<GalleryDesign[]> {
  if (payloads.length === 0) return [];

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (payloads.length === 1) {
        const res = await fetch("/api/gallery-designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloads[0]),
          cache: "no-store",
        });
        const data = await parseResponseJson<GalleryDesign & { error?: string }>(res);
        if (!res.ok || !data.id) {
          throw new Error(data.error || "Failed to create design");
        }
        if ((data.category_id ?? null) !== categoryId) {
          throw new Error("Design was saved to the wrong category. Please refresh and try again.");
        }
        return [data];
      }

      const res = await fetch("/api/gallery-designs/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloads }),
        cache: "no-store",
      });
      const data = await parseResponseJson<GalleryDesign[] | { error?: string }>(res);
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(!Array.isArray(data) && data.error ? data.error : "Failed to save designs");
      }
      const wrongSection = data.find((design) => (design.category_id ?? null) !== categoryId);
      if (wrongSection) {
        throw new Error("Some designs were saved to the wrong category. Please refresh and try again.");
      }
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Failed to save designs");
      if (attempt < 2) await sleep(250 * (attempt + 1));
    }
  }

  throw lastError ?? new Error("Failed to save designs");
}

async function saveDesignsOneByOne({
  staged,
  categoryId,
  startSortOrder,
  onProgress,
}: {
  staged: { prepared: PreparedUpload; url: string }[];
  categoryId: string | null;
  startSortOrder: number;
  onProgress?: (message: string) => void;
}): Promise<{ created: GalleryDesign[]; failed: { name: string; error: string }[] }> {
  const created: GalleryDesign[] = [];
  const failed: { name: string; error: string }[] = [];

  for (let i = 0; i < staged.length; i++) {
    const { prepared, url } = staged[i];
    onProgress?.(`Saving ${i + 1} of ${staged.length}…`);
    try {
      const batch = await saveGalleryDesignsBatch(
        [
          buildGalleryDesignPayload({
            mediaUrl: url,
            categoryId,
            sortOrder: startSortOrder + created.length * 1_000,
            prepared,
          }),
        ],
        categoryId
      );
      created.push(...batch);
    } catch (err) {
      failed.push({
        name: prepared.originalName,
        error: err instanceof Error ? err.message : "Could not add to section",
      });
    }
  }

  return { created, failed };
}

export type SectionUploadResult = {
  created: GalleryDesign[];
  failed: { name: string; error: string }[];
};

/** Upload files to storage, then save all gallery records in one JSON batch. */
export async function uploadDesignsToSection({
  files,
  categoryId,
  startSortOrder,
  onProgress,
}: {
  files: File[];
  categoryId: string | null;
  startSortOrder: number;
  onProgress?: (message: string) => void;
}): Promise<SectionUploadResult> {
  const { prepared, failed: prepareFailed } = await prepareUploads(files, onProgress);
  if (!prepared.length) {
    return { created: [], failed: prepareFailed };
  }

  const { staged, failed: uploadFailed } = await uploadPreparedFiles(prepared, onProgress);
  const failed = [...prepareFailed, ...uploadFailed];

  if (!staged.length) {
    return { created: [], failed };
  }

  onProgress?.(`Saving ${staged.length} design${staged.length === 1 ? "" : "s"} to section…`);

  const payloads = staged.map((entry, index) =>
    buildGalleryDesignPayload({
      mediaUrl: entry.url,
      categoryId,
      sortOrder: startSortOrder + index * 1_000,
      prepared: entry.prepared,
    })
  );

  try {
    const created = await saveGalleryDesignsBatch(payloads, categoryId);
    return { created, failed };
  } catch (batchError) {
    onProgress?.("Batch save failed — saving designs one at a time…");
    const fallback = await saveDesignsOneByOne({
      staged,
      categoryId,
      startSortOrder,
      onProgress,
    });
    if (fallback.created.length === 0 && fallback.failed.length === 0) {
      failed.push({
        name: "batch",
        error: batchError instanceof Error ? batchError.message : "Failed to save designs",
      });
    }
    return {
      created: fallback.created,
      failed: [...failed, ...fallback.failed],
    };
  }
}
