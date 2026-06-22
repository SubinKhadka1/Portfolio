import { put } from "@vercel/blob";
import {
  getSiteSettings,
  normalizeSiteSettings,
  writeSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings-read";
import { isBlobStorageEnabled } from "@/lib/storage-mode";
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
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeName = `hero-${Date.now()}.${ext}`;

  if (isBlobStorageEnabled()) {
    const blob = await put(`hero/${safeName}`, file, {
      access: "public",
      contentType: file.type || undefined,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public");
  const filepath = path.join(dir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);
  return `/${safeName}`;
}
