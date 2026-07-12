import path from "path";
import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
import { publicStorageUrl, uploadStorageObject } from "@/lib/supabase/storage-rest";
import type { ProjectType } from "@/lib/types/database";

export const MEDIA_BUCKET = "portfolio-media";

const PUBLIC_DIRS: Record<ProjectType, string> = {
  design: "designs",
  video: "videos",
  client: "logos",
};

export function buildUniqueFilename(type: ProjectType, originalName: string) {
  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const base = path
    .basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim()
    .slice(0, 72)
    .replace(/\s+/g, "-");
  return `${Date.now()}-${base || "upload"}${ext}`;
}

export function getPublicMediaUrl(storagePath: string) {
  return publicStorageUrl(MEDIA_BUCKET, storagePath);
}

export async function uploadToSupabaseMedia(
  storagePath: string,
  body: Buffer | File,
  contentType?: string
) {
  if (!isSupabaseStorageEnabled()) {
    throw new Error("Supabase Storage is not configured.");
  }

  const buffer = body instanceof File ? Buffer.from(await body.arrayBuffer()) : body;

  await uploadStorageObject(MEDIA_BUCKET, storagePath, buffer, {
    upsert: false,
    contentType: contentType || "application/octet-stream",
  });

  return getPublicMediaUrl(storagePath);
}

export async function saveMediaToSupabase(type: ProjectType, file: File) {
  const filename = buildUniqueFilename(type, file.name);
  const storagePath = `${PUBLIC_DIRS[type]}/${filename}`;
  const url = await uploadToSupabaseMedia(storagePath, file, file.type || undefined);
  return { url, filename, storagePath };
}

export async function saveHeroImageToSupabase(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const storagePath = `hero/hero-${Date.now()}.${ext}`;
  return uploadToSupabaseMedia(storagePath, file, file.type || undefined);
}
