import { promises as fs } from "fs";
import path from "path";
import {
  getSiteSettings,
  normalizeSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings-read";

export type { SiteSettings } from "@/lib/site-settings-read";
export { getSiteSettings } from "@/lib/site-settings-read";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "site-settings.json");

export async function updateSiteSettings(
  partial: Partial<SiteSettings>
): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const next = normalizeSiteSettings({ ...current, ...partial });
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function saveHeroImage(file: File): Promise<string> {
  const dir = path.join(process.cwd(), "public");
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeName = `hero-${Date.now()}.${ext}`;
  const filepath = path.join(dir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);
  return `/${safeName}`;
}
