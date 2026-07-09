import { prepareGalleryDesignUpload } from "@/lib/compress-design-image";
import { titleFromMediaUrl } from "@/lib/gallery-design-create";
import { parseResponseJson } from "@/lib/parse-response";
import { clampMarqueeRow } from "@/lib/marquee";
import type { HomepageDesign, HomepageDesignInput } from "@/lib/types/database";

export const DRAFT_HOMEPAGE_DESIGN_PREFIX = "draft-homepage-";

export function isDraftHomepageDesignId(id: string) {
  return id.startsWith(DRAFT_HOMEPAGE_DESIGN_PREFIX);
}

export function createDraftHomepageDesignId() {
  return `${DRAFT_HOMEPAGE_DESIGN_PREFIX}${crypto.randomUUID()}`;
}

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
    width: prepared.width,
    height: prepared.height,
    aspectRatio: prepared.aspectRatio,
  };
}

export async function uploadHomepageDesignFiles(
  files: File[],
  row: number,
  onProgress?: (message: string) => void
) {
  const rowNum = clampMarqueeRow(row);
  const drafts: HomepageDesignInput[] = [];
  const failed: { name: string; error: string }[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    onProgress?.(`Uploading ${index + 1} of ${files.length}…`);
    try {
      const uploaded = await uploadDesignFile(file);
      drafts.push({
        title: titleFromMediaUrl(uploaded.url),
        description: "",
        media_url: uploaded.url,
        published: true,
        metadata: {
          color: "from-purple-700 to-indigo-900",
          aspectRatio: uploaded.aspectRatio,
          imageWidth: uploaded.width,
          imageHeight: uploaded.height,
          marqueeRow: rowNum,
        },
      });
    } catch (err) {
      failed.push({
        name: file.name,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  return { drafts, failed };
}
