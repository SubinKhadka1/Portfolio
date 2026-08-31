import type { GalleryDesign, HomepageDesign, Project, ProjectType, Testimonial } from "@/lib/types/database";

export type PortfolioStore = Record<ProjectType, Project[]> & {
  gallery_designs: GalleryDesign[];
  homepage_designs: HomepageDesign[];
  testimonials: Testimonial[];
  _design_modules_migrated?: boolean;
  _design_rows_migrated?: boolean;
  _client_rows_migrated?: boolean;
  _design_placement_migrated?: boolean;
};

export function normalizePortfolioStore(raw: Partial<PortfolioStore>): PortfolioStore {
  return {
    design: raw.design ?? [],
    video: raw.video ?? [],
    client: raw.client ?? [],
    gallery_designs: raw.gallery_designs ?? [],
    homepage_designs: raw.homepage_designs ?? [],
    testimonials: raw.testimonials ?? [
      {
        id: "default-1",
        quote: "Subin completely transformed our social media presence. His video editing skills are next-level. The food reels he made for BEANS n BUN brought in so much customer engagement and foot traffic!",
        author: "Prabin Sharma",
        role: "CEO, BEANS n BUN",
        initials: "PS",
        rating: 5,
        gradient: "from-purple-500 to-indigo-500",
        published: true,
        sort_order: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "default-2",
        quote: "The brand campaign posters and promotional video ads Subin created for our visa services got us thousands of qualified leads. A true creative genius who blends aesthetics with marketing strategy perfectly.",
        author: "Samikshya Thapa",
        role: "Marketing Director, Success Education",
        initials: "ST",
        rating: 5,
        gradient: "from-blue-500 to-teal-500",
        published: true,
        sort_order: 1001,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "default-3",
        quote: "Subin consistently delivers top-tier motion graphics and logo animations. He understands the brief perfectly and always goes the extra mile. Working with him was a breeze and worth every penny.",
        author: "Ashish Shrestha",
        role: "Creative Lead, Digital Growth Nepal",
        initials: "AS",
        rating: 5,
        gradient: "from-pink-500 to-purple-500",
        published: true,
        sort_order: 1002,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    _design_modules_migrated: raw._design_modules_migrated,
    _design_rows_migrated: raw._design_rows_migrated,
    _client_rows_migrated: raw._client_rows_migrated,
    _design_placement_migrated: raw._design_placement_migrated,
  };
}
