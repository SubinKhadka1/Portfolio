import { prepareGalleryDesignUpload } from "@/lib/compress-design-image";
import { titleFromMediaUrl } from "@/lib/gallery-design-create";
import { parseResponseJson } from "@/lib/parse-response";
import { clampMarqueeRow, marqueeSortOrder } from "@/lib/marquee";
import type { HomepageDesign, HomepageDesignInput } from "@/lib/types/database";

export function projectToHomepageDesignInput(
  project: Pick<HomepageDesign, "title" | "description" | "media_url" | "published" | "metadata">
): HomepageDesignInput {
  return {
    title: project.title,
    description: project.description,
    media_url: project.media_url,
    published: project.published,
    metadata: project.metadata,
  };
}

type PreparedUpload = {
  file: File;
  width: number;
  height: number;
  aspectRatio: "square" | "portrait";
  originalName: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHomepageDesignPayload({
  mediaUrl,
  row,
  sortOrder,
  prepared,
  title,
}: {
  mediaUrl: string;
  row: number;
  sortOrder: number;
  prepared: PreparedUpload;
  title?: string;
}): HomepageDesignInput {
  return {
    title: title?.trim() || titleFromMediaUrl(mediaUrl),
    description: "",
    media_url: mediaUrl,
    published: true,
    sort_order: sortOrder,
    metadata: {
      color: "from-purple-700 to-indigo-900",
      aspectRatio: prepared.aspectRatio,
      imageWidth: prepared.width,
      imageHeight: prepared.height,
      marqueeRow: clampMarqueeRow(row),
      homepageSortOrder: sortOrder,
      showOnHomepage: true,
    },
  };
}

async function uploadDesignFile(file: File) {
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
    prepared: {
      file: prepared.file,
      width: prepared.width,
      height: prepared.height,
      aspectRatio: prepared.aspectRatio,
      originalName: file.name,
    } satisfies PreparedUpload,
  };
}

async function saveHomepageDesignsBatch(payloads: HomepageDesignInput[]): Promise<HomepageDesign[]> {
  if (payloads.length === 0) return [];

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (payloads.length === 1) {
        const res = await fetch("/api/homepage-designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloads[0]),
          cache: "no-store",
        });
        const data = await parseResponseJson<HomepageDesign & { error?: string }>(res);
        if (!res.ok || !data.id) {
          throw new Error(data.error || "Failed to create homepage design");
        }
        return [data];
      }

      const res = await fetch("/api/homepage-designs/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloads }),
        cache: "no-store",
      });
      const data = await parseResponseJson<HomepageDesign[] | { error?: string }>(res);
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(!Array.isArray(data) && data.error ? data.error : "Failed to save designs");
      }
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Failed to save homepage designs");
      if (attempt < 2) await sleep(250 * (attempt + 1));
    }
  }

  throw lastError ?? new Error("Failed to save homepage designs");
}

export type HomepageRowUploadResult = {
  created: HomepageDesign[];
  failed: { name: string; error: string }[];
};

/** Upload images and save homepage marquee records immediately (like gallery section upload). */
export async function uploadDesignsToHomepageRow({
  files,
  row,
  designsInRow = 0,
  onProgress,
}: {
  files: File[];
  row: number;
  designsInRow?: number;
  onProgress?: (message: string) => void;
}): Promise<HomepageRowUploadResult> {
  const rowNum = clampMarqueeRow(row);
  const failed: { name: string; error: string }[] = [];
  const staged: { prepared: PreparedUpload; url: string }[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    onProgress?.(`Uploading ${index + 1} of ${files.length}…`);
    try {
      const uploaded = await uploadDesignFile(file);
      staged.push({ prepared: uploaded.prepared, url: uploaded.url });
    } catch (err) {
      failed.push({
        name: file.name,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  if (!staged.length) {
    return { created: [], failed };
  }

  const payloads = staged.map(({ prepared, url }, index) =>
    buildHomepageDesignPayload({
      mediaUrl: url,
      row: rowNum,
      sortOrder: marqueeSortOrder(rowNum, designsInRow + index),
      prepared,
    })
  );

  onProgress?.(`Saving ${payloads.length} design${payloads.length === 1 ? "" : "s"}…`);

  try {
    const created = await saveHomepageDesignsBatch(payloads);
    return { created, failed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save designs";
    for (const { prepared } of staged) {
      failed.push({ name: prepared.originalName, error: message });
    }
    return { created: [], failed };
  }
}
