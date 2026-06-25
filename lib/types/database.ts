export type ProjectType = "design" | "video" | "client";

export type DesignMetadata = {
  color?: string;
  aspectRatio?: "square" | "portrait";
  marqueeRow?: 1 | 2 | 3;
  imageWidth?: number;
  imageHeight?: number;
  showOnHomepage?: boolean;
  showInGallery?: boolean;
  homepageSortOrder?: number;
  gallerySortOrder?: number;
};

/** Shared image metadata for gallery + homepage design modules. */
export type DesignImageMetadata = {
  color?: string;
  aspectRatio?: "square" | "portrait";
  imageWidth?: number;
  imageHeight?: number;
};

/** Independent record for /designs gallery CMS (gallery_designs). */
export type GalleryDesignMetadata = DesignImageMetadata & {
  /** When true, design is kept in admin but hidden from the public gallery page. */
  galleryHidden?: boolean;
  clientName?: string;
  year?: number;
  featured?: boolean;
};

export type GalleryDesign = {
  id: string;
  title: string;
  description: string;
  media_url: string;
  category_id: string | null;
  sort_order: number;
  published: boolean;
  metadata: GalleryDesignMetadata;
  created_at: string;
  updated_at: string;
};

export type GalleryDesignInput = {
  title?: string;
  description?: string;
  media_url: string;
  category_id?: string | null;
  published?: boolean;
  sort_order?: number;
  metadata?: GalleryDesignMetadata;
};

/** Independent record for homepage marquee CMS (portfolio_homepage_designs). */
export type HomepageDesignMetadata = DesignImageMetadata & {
  marqueeRow?: 1 | 2 | 3;
};

export type HomepageDesign = {
  id: string;
  title: string;
  description: string;
  media_url: string;
  sort_order: number;
  published: boolean;
  metadata: HomepageDesignMetadata;
  /** Set when copied from a gallery design via "Feature on Homepage". */
  source_gallery_design_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type HomepageDesignInput = {
  title?: string;
  description?: string;
  media_url: string;
  published?: boolean;
  sort_order?: number;
  metadata?: HomepageDesignMetadata;
  source_gallery_design_id?: string | null;
};

export type VideoMetadata = {
  duration?: string;
  clipStart?: number;
  clipEnd?: number;
};

export type ClientMetadata = {
  className?: string;
  containerClass?: string;
  marqueeRow?: 1 | 2 | 3;
};

export type ProjectMetadata = DesignMetadata & VideoMetadata & ClientMetadata;

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  project_type: ProjectType;
  sort_order: number;
  created_at: string;
};

export type Project = {
  id: string;
  type: ProjectType;
  title: string;
  description: string;
  media_url: string;
  thumbnail_url: string | null;
  category_id: string | null;
  featured: boolean;
  published: boolean;
  sort_order: number;
  metadata: ProjectMetadata;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
};

export type ProjectInput = {
  type: ProjectType;
  title?: string;
  description?: string;
  media_url: string;
  thumbnail_url?: string | null;
  category_id?: string | null;
  featured?: boolean;
  published?: boolean;
  sort_order?: number;
  metadata?: ProjectMetadata;
};

export type DashboardStats = {
  total: number;
  designs: number;
  videos: number;
  clients: number;
  featured: number;
  published: number;
  unpublished: number;
};

// Public-facing shapes (compatible with existing components)
export type DesignItem = {
  id: string;
  title: string;
  description?: string;
  image: string;
  color: string;
  aspectRatio?: "square" | "portrait";
  marqueeRow?: 1 | 2 | 3;
  sortOrder?: number;
  gallerySortOrder?: number;
  categoryId?: string | null;
  categoryName?: string;
  categorySlug?: string;
  imageWidth?: number;
  imageHeight?: number;
  clientName?: string;
  year?: number;
  featured?: boolean;
  createdAt?: string;
};

export type VideoItem = {
  id: string;
  title: string;
  src: string;
  duration: string;
  description: string;
  featured: boolean;
  clipStart: number;
  clipEnd: number;
};

export type ClientItem = {
  name: string;
  logo: string;
  className: string;
  containerClass: string;
  marqueeRow?: 1 | 2 | 3;
  sortOrder?: number;
};
