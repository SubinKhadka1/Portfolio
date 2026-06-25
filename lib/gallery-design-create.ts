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

async function uploadPreparedDesigns({
  prepared,
  categoryId,
  startSortOrder,
  onProgress,
}: {
  prepared: PreparedUpload[];
  categoryId: string;
  startSortOrder: number;
  onProgress?: (message: string) => void;
}): Promise<{ created: GalleryDesign[]; failed: { name: string; error: string }[] }> {
  if (!prepared.length) return { created: [], failed: [] };

  onProgress?.(`Uploading ${prepared.length} design${prepared.length === 1 ? "" : "s"}…`);

  const formData = new FormData();
  formData.append("categoryId", categoryId);
  formData.append("startSortOrder", String(startSortOrder));
  formData.append(
    "manifest",
    JSON.stringify(
      prepared.map((entry) => ({
        aspectRatio: entry.aspectRatio,
        width: entry.width,
        height: entry.height,
        title: titleFromMediaUrl(entry.originalName),
      }))
    )
  );

  for (const entry of prepared) {
    formData.append("files", entry.file, entry.originalName);
  }

  const res = await fetch("/api/gallery-designs/upload", {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const data = await parseResponseJson<{
    designs?: GalleryDesign[];
    failed?: { name: string; error: string }[];
    error?: string;
  }>(res);

  if (!res.ok || !Array.isArray(data.designs)) {
    throw new Error(data.error || "Failed to save designs");
  }

  const wrongSection = data.designs.find((design) => design.category_id !== categoryId);
  if (wrongSection) {
    throw new Error("Designs were saved to the wrong section. Please refresh and try again.");
  }

  return {
    created: data.designs,
    failed: data.failed ?? [],
  };
}

function buildGalleryDesignPayload({
  mediaUrl,
  categoryId,
  sortOrder,
  title,
  prepared,
}: {
  mediaUrl: string;
  categoryId: string;
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

async function saveGalleryDesignPayload(
  payload: GalleryDesignInput,
  categoryId: string
): Promise<GalleryDesign> {
  const res = await fetch("/api/gallery-designs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await parseResponseJson<GalleryDesign & { error?: string }>(res);
  if (!res.ok || !data.id) {
    throw new Error(data.error || "Failed to create design");
  }
  if (data.category_id !== categoryId) {
    throw new Error("Design was saved but section assignment failed. Please try again.");
  }
  return data;
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

async function saveDesignsOneByOne({
  prepared,
  categoryId,
  startSortOrder,
  onProgress,
}: {
  prepared: PreparedUpload[];
  categoryId: string;
  startSortOrder: number;
  onProgress?: (message: string) => void;
}): Promise<{ created: GalleryDesign[]; failed: { name: string; error: string }[] }> {
  const created: GalleryDesign[] = [];
  const failed: { name: string; error: string }[] = [];

  for (let i = 0; i < prepared.length; i++) {
    const entry = prepared[i];
    onProgress?.(`Saving ${i + 1} of ${prepared.length}…`);
    try {
      const uploaded = await uploadDesignFile(entry.file);
      const design = await saveGalleryDesignPayload(
        buildGalleryDesignPayload({
          mediaUrl: uploaded.url,
          categoryId,
          sortOrder: startSortOrder + i * 1_000,
          prepared: {
            ...entry,
            width: uploaded.width,
            height: uploaded.height,
            aspectRatio: uploaded.aspectRatio,
          },
        }),
        categoryId
      );
      created.push(design);
    } catch (err) {
      failed.push({
        name: entry.originalName,
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

/** Upload many files into one gallery section — one media+save round trip when possible. */
export async function uploadDesignsToSection({
  files,
  categoryId,
  startSortOrder,
  onProgress,
}: {
  files: File[];
  categoryId: string;
  startSortOrder: number;
  onProgress?: (message: string) => void;
}): Promise<SectionUploadResult> {
  const { prepared, failed } = await prepareUploads(files, onProgress);
  if (!prepared.length) {
    return { created: [], failed };
  }

  try {
    const result = await uploadPreparedDesigns({
      prepared,
      categoryId,
      startSortOrder,
      onProgress,
    });
    return {
      created: result.created,
      failed: [...failed, ...result.failed],
    };
  } catch {
    onProgress?.("Bulk upload failed — saving designs one at a time…");
    const fallback = await saveDesignsOneByOne({
      prepared,
      categoryId,
      startSortOrder,
      onProgress,
    });
    return {
      created: fallback.created,
      failed: [...failed, ...fallback.failed],
    };
  }
}
