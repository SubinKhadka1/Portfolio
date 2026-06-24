import { prepareDesignUpload } from "@/lib/compress-design-image";
import { detectDesignDimensionsFromUrl } from "@/lib/design-image";
import { parseResponseJson } from "@/lib/parse-response";
import type { GalleryDesign, GalleryDesignInput } from "@/lib/types/database";

export function titleFromMediaUrl(url: string) {
  const raw = url.split("/").pop()?.replace(/\.[^.]+$/, "") || "Untitled";
  const decoded = decodeURIComponent(raw);
  const withoutTimestamp = decoded.replace(/^\d+-/, "");
  return withoutTimestamp.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

export async function uploadDesignFile(file: File): Promise<string> {
  const prepared = await prepareDesignUpload(file);
  const formData = new FormData();
  formData.append("file", prepared.file);
  formData.append("type", "design");

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await parseResponseJson<{ url?: string; error?: string }>(res);
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Upload failed for ${file.name}`);
  }
  return data.url;
}

function buildGalleryDesignPayload({
  mediaUrl,
  categoryId,
  sortOrder,
  title,
  detected,
}: {
  mediaUrl: string;
  categoryId: string;
  sortOrder: number;
  title?: string;
  detected: Awaited<ReturnType<typeof detectDesignDimensionsFromUrl>>;
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
      aspectRatio: detected.aspectRatio,
      imageWidth: detected.width,
      imageHeight: detected.height,
    },
  };
}

export async function createGalleryDesign({
  mediaUrl,
  categoryId,
  sortOrder,
  title,
}: {
  mediaUrl: string;
  categoryId: string;
  sortOrder: number;
  title?: string;
}): Promise<GalleryDesign> {
  const detected = await detectDesignDimensionsFromUrl(mediaUrl);
  const payload = buildGalleryDesignPayload({
    mediaUrl,
    categoryId,
    sortOrder,
    title,
    detected,
  });

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
  const uploaded: { file: File; url: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(`Uploading image ${i + 1} of ${files.length}…`);
    try {
      const url = await uploadDesignFile(file);
      uploaded.push({ file, url });
    } catch (err) {
      failed.push({
        name: file.name,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  if (uploaded.length === 0) {
    return { created: [], failed };
  }

  onProgress?.(`Preparing ${uploaded.length} design${uploaded.length === 1 ? "" : "s"}…`);

  const payloads: { file: File; payload: GalleryDesignInput }[] = [];
  for (let i = 0; i < uploaded.length; i++) {
    const { file, url } = uploaded[i];
    try {
      const detected = await detectDesignDimensionsFromUrl(url);
      payloads.push({
        file,
        payload: buildGalleryDesignPayload({
          mediaUrl: url,
          categoryId,
          sortOrder: startSortOrder + i * 1_000,
          detected,
        }),
      });
    } catch (err) {
      failed.push({
        name: file.name,
        error: err instanceof Error ? err.message : "Could not read image size",
      });
    }
  }

  if (payloads.length === 0) {
    return { created: [], failed };
  }

  onProgress?.(`Saving ${payloads.length} design${payloads.length === 1 ? "" : "s"} to section…`);

  try {
    const created = await createGalleryDesignsBatch(
      payloads.map((entry) => entry.payload),
      categoryId
    );
    return { created, failed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add to section";
    for (const { file } of payloads) {
      failed.push({ name: file.name, error: message });
    }
    return { created: [], failed };
  }
}
