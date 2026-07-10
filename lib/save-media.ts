import { put } from "@vercel/blob";
import path from "path";
import { markBlobWritesBlocked } from "@/lib/blob-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { savePublicMedia as savePublicMediaLocal, validateMediaFile } from "@/lib/public-media";
import { isSupabaseJsonEnabled } from "@/lib/storage-backends";
import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";
import type { ProjectType } from "@/lib/types/database";

const PUBLIC_DIRS: Record<ProjectType, string> = {
  design: "designs",
  video: "videos",
  client: "logos",
};

const MEDIA_BUCKET = "portfolio-media";

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

async function saveMediaToSupabase(type: ProjectType, file: File) {
  const supabase = createAdminClient();
  const filename = buildUniqueFilename(type, file.name);
  const storagePath = `${PUBLIC_DIRS[type]}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, buffer, {
    upsert: false,
    contentType: file.type || undefined,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(error.message || "Supabase media upload failed");
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
  return { url: data.publicUrl, filename };
}

export async function saveMediaFile(
  type: ProjectType,
  file: File
): Promise<{ url: string; filename: string }> {
  const validationError = validateMediaFile(type, file);
  if (validationError) throw new Error(validationError);

  if (isBlobStorageEnabled()) {
    const filename = buildUniqueFilename(type, file.name);
    const storagePath = `${PUBLIC_DIRS[type]}/${filename}`;

    try {
      const blob = await put(storagePath, file, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type || undefined,
      });
      return { url: blob.url, filename };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      if (/suspended|quota|usage limit/i.test(message)) {
        markBlobWritesBlocked(message);
      }

      if (isSupabaseJsonEnabled()) {
        return saveMediaToSupabase(type, file);
      }

      throw new Error(
        /suspended|quota|usage limit/i.test(message)
          ? `${message} Add Supabase keys on Vercel for uploads while Blob is suspended.`
          : message
      );
    }
  }

  if (isVercelProduction()) {
    if (isSupabaseJsonEnabled()) {
      return saveMediaToSupabase(type, file);
    }
    throw new Error(
      "Live uploads need Vercel Blob or Supabase Storage. Add SUPABASE_SERVICE_ROLE_KEY on Vercel."
    );
  }

  return savePublicMediaLocal(type, file);
}
