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
};

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

export async function uploadDesignFile(file: File): Promise<{
  url: string;
  width: number;
  height: number;
  aspectRatio: "square" | "portrait";
}> {
  const prepared = await prepareGalleryDesignUpload(file);
  const formData = new FormData();
  formData.append("file", prepared.file);
  formData.append("type", "design");

  const res = await fetch("/api/upload", { method: "POST", body: formData });
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

async function saveGalleryDesignPayload(
  payload: GalleryDesignInput,
  categoryId: string
): Promise<GalleryDesign> {
  const res = await fetch("/api/gallery-designs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

async function createGalleryDesignsBatch(
  items: GalleryDesignInput[],
  categoryId: string
): Promise<GalleryDesign[]> {
  const res = await fetch("/api/gallery-designs/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const data = await parseResponseJson<GalleryDesign[] | { error?: string }>(res);
  if (!res.ok || !Array.isArray(data)) {
    throw new Error(!Array.isArray(data) && data.error ? data.error : "Failed to save designs");
  }
  const wrongSection = data.find((p) => p.category_id !== categoryId);
  if (wrongSection) {
    throw new Error("Some designs were saved to the wrong section. Please refresh and try again.");
  }
  return data;
}

export type SectionUploadResult = {
  created: GalleryDesign[];
  failed: { name: string; error: string }[];
};

/** Upload many files into one gallery section — single save for all designs. */
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
  const failed: { name: string; error: string }[] = [];
  const staged: { file: File; url: string; prepared: PreparedUpload }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(`Uploading image ${i + 1} of ${files.length}…`);
    try {
      const uploaded = await uploadDesignFile(file);
      staged.push({
        file,
        url: uploaded.url,
        prepared: {
          file,
          width: uploaded.width,
          height: uploaded.height,
          aspectRatio: uploaded.aspectRatio,
        },
      });
    } catch (err) {
      failed.push({
        name: file.name,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  if (staged.length === 0) {
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

  const created: GalleryDesign[] = [];

  if (payloads.length > 1) {
    try {
      const batch = await createGalleryDesignsBatch(payloads, categoryId);
      return { created: batch, failed };
    } catch {
      onProgress?.("Batch save failed — saving designs one at a time…");
    }
  }

  for (let i = 0; i < payloads.length; i++) {
    const { file } = staged[i];
    try {
      const design = await saveGalleryDesignPayload(payloads[i], categoryId);
      created.push(design);
    } catch (err) {
      failed.push({
        name: file.name,
        error: err instanceof Error ? err.message : "Could not add to section",
      });
    }
  }

  return { created, failed };
}
