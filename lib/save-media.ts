import { put } from "@vercel/blob";
import path from "path";
import { savePublicMedia as savePublicMediaLocal, validateMediaFile } from "@/lib/public-media";
import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";
import type { ProjectType } from "@/lib/types/database";

const PUBLIC_DIRS: Record<ProjectType, string> = {
  design: "designs",
  video: "videos",
  client: "logos",
};

function buildUniqueFilename(type: ProjectType, originalName: string) {
  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const base = path
    .basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim()
    .slice(0, 72)
    .replace(/\s+/g, "-");
  return `${Date.now()}-${base || "upload"}${ext}`;
}

export async function saveMediaFile(
  type: ProjectType,
  file: File
): Promise<{ url: string; filename: string }> {
  const validationError = validateMediaFile(type, file);
  if (validationError) throw new Error(validationError);

  if (!isBlobStorageEnabled()) {
    if (isVercelProduction()) {
      throw new Error(
        "File uploads on the live site need Vercel Blob. In Vercel → Storage → Create Blob store, then redeploy."
      );
    }
    return savePublicMediaLocal(type, file);
  }

  const filename = buildUniqueFilename(type, file.name);
  const storagePath = `${PUBLIC_DIRS[type]}/${filename}`;

  const blob = await put(storagePath, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || undefined,
  });

  return { url: blob.url, filename };
}
