import { prepareDesignUpload } from "@/lib/compress-design-image";
import { detectDesignDimensionsFromUrl } from "@/lib/design-image";
import { parseResponseJson } from "@/lib/parse-response";
import type { Project, ProjectInput } from "@/lib/types/database";

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
  categoryId: string | null;
  gallerySortOrder?: number;
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
  return data;
}
