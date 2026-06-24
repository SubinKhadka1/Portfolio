import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import { clampMarqueeRepeat, clampMarqueeRows, clampScrollDuration, clampClientScrollDuration } from "@/lib/marquee";

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
  designGalleryEyebrow: string;
  designGalleryTitle: string;
  designGallerySubtitle: string;
};

const SETTINGS_JSON = "data/site-settings.json";

const DEFAULT_SETTINGS: SiteSettings = {
  heroImage: "/Profile.png",
  heroAlt: "Subin Khadka",
  portfolioRows: 3,
  portfolioRepeat: 2,
  portfolioScrollDuration: 35,
  clientRows: 2,
  clientRepeat: 2,
  clientScrollDuration: 22,
  videoRepeat: 2,
  videoScrollDuration: 35,
  designGalleryEyebrow: "Full Portfolio",
  designGalleryTitle: "My Design Work",
  designGallerySubtitle:
    "Flyers, menus, banners, brochures, tickets, and more — sized naturally for each format.",
};

export function normalizeSiteSettings(raw: Partial<SiteSettings>): SiteSettings {
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
    clientScrollDuration: clampClientScrollDuration(
      raw.clientScrollDuration ?? DEFAULT_SETTINGS.clientScrollDuration
    ),
    videoRepeat: clampMarqueeRepeat(raw.videoRepeat ?? DEFAULT_SETTINGS.videoRepeat),
    videoScrollDuration: clampScrollDuration(
      raw.videoScrollDuration ?? DEFAULT_SETTINGS.videoScrollDuration
    ),
    designGalleryEyebrow: raw.designGalleryEyebrow || DEFAULT_SETTINGS.designGalleryEyebrow,
    designGalleryTitle: raw.designGalleryTitle || DEFAULT_SETTINGS.designGalleryTitle,
    designGallerySubtitle: raw.designGallerySubtitle || DEFAULT_SETTINGS.designGallerySubtitle,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const raw = await readJsonFile<Partial<SiteSettings>>(SETTINGS_JSON);
  if (!raw) return DEFAULT_SETTINGS;
  return normalizeSiteSettings(raw);
}

export async function writeSiteSettings(settings: SiteSettings): Promise<void> {
  await writeJsonFile(SETTINGS_JSON, settings);
}
