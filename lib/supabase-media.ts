import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
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
  const supabase = createAdminClient();
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadToSupabaseMedia(
  storagePath: string,
  body: Buffer | File,
  contentType?: string
) {
  if (!isSupabaseStorageEnabled()) {
    throw new Error("Supabase Storage is not configured.");
  }

  const supabase = createAdminClient();
  const buffer = body instanceof File ? Buffer.from(await body.arrayBuffer()) : body;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, buffer, {
    upsert: false,
    contentType: contentType || undefined,
    cacheControl: "3600",
  });

  if (error) {
    const message = error.message || "Supabase media upload failed";
    if (/bucket not found|does not exist/i.test(message)) {
      throw new Error(
        `Create a public Supabase Storage bucket named "${MEDIA_BUCKET}" (Dashboard → Storage), then try again.`
      );
    }
    throw new Error(message);
  }

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
  const url = await uploadToSupabaseMedia(storagePath, file, file.type || undefined);
  return url;
}
