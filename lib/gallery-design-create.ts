import { prepareDesignUpload } from "@/lib/compress-design-image";
import { detectDesignDimensionsFromUrl } from "@/lib/design-image";
import { parseResponseJson } from "@/lib/parse-response";
import type { Project, ProjectInput } from "@/lib/types/database";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

export async function createGalleryDesign({
  mediaUrl,
  categoryId,
  gallerySortOrder,
  showOnHomepage = false,
  title,
}: {
  mediaUrl: string;
  categoryId: string;
  gallerySortOrder: number;
  showOnHomepage?: boolean;
  title?: string;
}): Promise<Project> {
  const detected = await detectDesignDimensionsFromUrl(mediaUrl);

  const payload: ProjectInput = {
    type: "design",
    title: title?.trim() || titleFromMediaUrl(mediaUrl),
    description: "",
    media_url: mediaUrl,
    category_id: categoryId,
    featured: false,
    published: true,
    metadata: {
      color: "from-purple-700 to-indigo-900",
      aspectRatio: detected.aspectRatio,
      imageWidth: detected.width,
      imageHeight: detected.height,
      showOnHomepage,
      showInGallery: true,
      gallerySortOrder,
    },
  };

  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseResponseJson<Project & { error?: string }>(res);
  if (!res.ok || !data.id) {
    throw new Error(data.error || "Failed to create design");
  }
  if (data.category_id !== categoryId) {
    throw new Error("Design was saved but section assignment failed. Please try again.");
  }
  return data;
}

export type SectionUploadResult = {
  created: Project[];
  failed: { name: string; error: string }[];
};

/** Upload many files into one gallery section only — each design belongs to that section. */
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
  const created: Project[] = [];
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

  for (let i = 0; i < uploaded.length; i++) {
    const { file, url } = uploaded[i];
    onProgress?.(`Adding ${i + 1} of ${uploaded.length} to section…`);
    try {
      const project = await createGalleryDesign({
        mediaUrl: url,
        categoryId,
        gallerySortOrder: startSortOrder + i * 1_000,
        showOnHomepage: false,
      });
      created.push(project);
      if (i < uploaded.length - 1) await sleep(120);
    } catch (err) {
      failed.push({
        name: file.name,
        error: err instanceof Error ? err.message : "Could not add to section",
      });
    }
  }

  return { created, failed };
}
