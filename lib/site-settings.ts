import { promises as fs } from "fs";
import path from "path";
import { clampMarqueeRepeat, clampMarqueeRows, clampScrollDuration } from "@/lib/marquee";

export type SiteSettings = {
  heroImage: string;
  heroAlt: string;
  portfolioRows: number;
  portfolioRepeat: number;
  portfolioScrollDuration: number;
  clientRows: number;
  clientRepeat: number;
  clientScrollDuration: number;
  videoRepeat: number;
  videoScrollDuration: number;
};

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "site-settings.json");

const DEFAULT_SETTINGS: SiteSettings = {
  heroImage: "/Profile.png",
  heroAlt: "Subin Khadka",
  portfolioRows: 3,
  portfolioRepeat: 2,
  portfolioScrollDuration: 60,
  clientRows: 2,
  clientRepeat: 2,
  clientScrollDuration: 45,
  videoRepeat: 2,
  videoScrollDuration: 50,
};

function normalizeSettings(raw: Partial<SiteSettings>): SiteSettings {
  return {
    heroImage: raw.heroImage || DEFAULT_SETTINGS.heroImage,
    heroAlt: raw.heroAlt || DEFAULT_SETTINGS.heroAlt,
    portfolioRows: clampMarqueeRows(raw.portfolioRows ?? DEFAULT_SETTINGS.portfolioRows),
    portfolioRepeat: clampMarqueeRepeat(raw.portfolioRepeat ?? DEFAULT_SETTINGS.portfolioRepeat),
    portfolioScrollDuration: clampScrollDuration(
      raw.portfolioScrollDuration ?? DEFAULT_SETTINGS.portfolioScrollDuration
    ),
    clientRows: clampMarqueeRows(raw.clientRows ?? DEFAULT_SETTINGS.clientRows),
    clientRepeat: clampMarqueeRepeat(raw.clientRepeat ?? DEFAULT_SETTINGS.clientRepeat),
    clientScrollDuration: clampScrollDuration(
      raw.clientScrollDuration ?? DEFAULT_SETTINGS.clientScrollDuration
    ),
    videoRepeat: clampMarqueeRepeat(raw.videoRepeat ?? DEFAULT_SETTINGS.videoRepeat),
    videoScrollDuration: clampScrollDuration(
      raw.videoScrollDuration ?? DEFAULT_SETTINGS.videoScrollDuration
    ),
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSiteSettings(
  partial: Partial<SiteSettings>
): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const next = normalizeSettings({ ...current, ...partial });
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
