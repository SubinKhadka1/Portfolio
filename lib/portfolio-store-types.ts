import type { GalleryDesign, HomepageDesign, Project, ProjectType } from "@/lib/types/database";

export type PortfolioStore = Record<ProjectType, Project[]> & {
  gallery_designs: GalleryDesign[];
  homepage_designs: HomepageDesign[];
  _design_modules_migrated?: boolean;
};

export function normalizePortfolioStore(raw: Partial<PortfolioStore>): PortfolioStore {
  return {
    design: raw.design ?? [],
    video: raw.video ?? [],
    client: raw.client ?? [],
    gallery_designs: raw.gallery_designs ?? [],
    homepage_designs: raw.homepage_designs ?? [],
    _design_modules_migrated: raw._design_modules_migrated,
  };
}
