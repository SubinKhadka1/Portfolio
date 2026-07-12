import { savePublicMedia as savePublicMediaLocal, validateMediaFile } from "@/lib/public-media";
import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
import { saveMediaToSupabase } from "@/lib/supabase-media";
import { isVercelProduction } from "@/lib/storage-mode";
import type { ProjectType } from "@/lib/types/database";

export async function saveMediaFile(
  type: ProjectType,
  file: File
): Promise<{ url: string; filename: string }> {
  const validationError = validateMediaFile(type, file);
  if (validationError) throw new Error(validationError);

  if (isSupabaseStorageEnabled()) {
    try {
      const { url, filename } = await saveMediaToSupabase(type, file);
      return { url, filename };
    } catch (err) {
      if (!isVercelProduction()) {
        console.error("[save-media] Supabase upload failed, saving locally:", err);
        return savePublicMediaLocal(type, file);
      }
      throw err;
    }
  }

  if (isVercelProduction()) {
    throw new Error(
      "Live uploads require Supabase Storage. Add SUPABASE_SERVICE_ROLE_KEY on Vercel."
    );
  }

  return savePublicMediaLocal(type, file);
}
