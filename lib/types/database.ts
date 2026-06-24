export type ProjectType = "design" | "video" | "client";

export type DesignMetadata = {
  color?: string;
  aspectRatio?: "square" | "portrait";
  marqueeRow?: 1 | 2 | 3;
  imageWidth?: number;
  imageHeight?: number;
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
  image: string;
  color: string;
  aspectRatio?: "square" | "portrait";
  marqueeRow?: 1 | 2 | 3;
  sortOrder?: number;
  categoryId?: string | null;
  categoryName?: string;
  categorySlug?: string;
  imageWidth?: number;
  imageHeight?: number;
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
