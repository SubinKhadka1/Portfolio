import {
  getSiteSettings,
  normalizeSiteSettings,
  writeSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings-read";
import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
import { saveHeroImageToSupabase } from "@/lib/supabase-media";
import { promises as fs } from "fs";
import path from "path";

export type { SiteSettings } from "@/lib/site-settings-read";
export { getSiteSettings } from "@/lib/site-settings-read";

export async function updateSiteSettings(
  partial: Partial<SiteSettings>
): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const next = normalizeSiteSettings({ ...current, ...partial });
  await writeSiteSettings(next);
  return next;
}

export async function saveHeroImage(file: File): Promise<string> {
  if (isSupabaseStorageEnabled()) {
    try {
      return await saveHeroImageToSupabase(file);
    } catch (err) {
      if (process.env.VERCEL === "1") throw err;
      console.error("[site-settings] Supabase hero upload failed, saving locally:", err);
    }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeName = `hero-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public");
  const filepath = path.join(dir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);
  return `/${safeName}`;
}
