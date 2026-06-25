import { randomUUID } from "crypto";
import { PORTRAIT_DESIGN_IMAGES } from "@/lib/static-data";
import type {
  Category,
  DesignItem,
  GalleryDesign,
  HomepageDesign,
  Project,
} from "@/lib/types/database";
import type { PortfolioStore } from "@/lib/portfolio-store-types";

export function showsGalleryDesign(design: GalleryDesign) {
  return design.metadata?.galleryHidden !== true;
}

export function galleryDesignToLayoutItem(design: GalleryDesign) {
  return {
    id: design.id,
    imageWidth: design.metadata?.imageWidth,
    imageHeight: design.metadata?.imageHeight,
    aspectRatio: design.metadata?.aspectRatio,
    metadata: design.metadata,
  };
}

export function projectToGalleryDesign(project: Project): GalleryDesign {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: project.title,
    description: project.description,
    media_url: project.media_url,
    category_id: project.category_id,
    sort_order: project.metadata?.gallerySortOrder ?? project.sort_order,
    published: project.published,
    metadata: {
      color: project.metadata?.color,
      aspectRatio:
        project.metadata?.aspectRatio ||
        (PORTRAIT_DESIGN_IMAGES.has(project.media_url) ? "portrait" : "square"),
      imageWidth: project.metadata?.imageWidth,
      imageHeight: project.metadata?.imageHeight,
      galleryHidden: project.metadata?.showInGallery === false,
    },
    created_at: project.created_at || now,
    updated_at: project.updated_at || now,
  };
}

export function projectToHomepageDesign(project: Project): HomepageDesign {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: project.title,
    description: project.description,
    media_url: project.media_url,
    sort_order: project.metadata?.homepageSortOrder ?? project.sort_order,
    published: project.published,
    metadata: {
      color: project.metadata?.color,
      aspectRatio:
        project.metadata?.aspectRatio ||
        (PORTRAIT_DESIGN_IMAGES.has(project.media_url) ? "portrait" : "square"),
      imageWidth: project.metadata?.imageWidth,
      imageHeight: project.metadata?.imageHeight,
      marqueeRow: project.metadata?.marqueeRow,
    },
    source_gallery_design_id: null,
    created_at: project.created_at || now,
    updated_at: project.updated_at || now,
  };
}

export function galleryDesignToHomepageCopy(
  gallery: GalleryDesign,
  sortOrder: number
): HomepageDesign {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: gallery.title,
    description: gallery.description,
    media_url: gallery.media_url,
    sort_order: sortOrder,
    published: gallery.published,
    metadata: {
      color: gallery.metadata?.color,
      aspectRatio: gallery.metadata?.aspectRatio,
      imageWidth: gallery.metadata?.imageWidth,
      imageHeight: gallery.metadata?.imageHeight,
      marqueeRow: 1,
    },
    source_gallery_design_id: gallery.id,
    created_at: now,
    updated_at: now,
  };
}

export function galleryDesignToDesignItem(
  design: GalleryDesign,
  category?: Category | null
): DesignItem {
  return {
    id: design.id,
    title: design.title,
    description: design.description,
    image: design.media_url,
    color: design.metadata?.color || "from-purple-700 to-indigo-900",
    aspectRatio:
      design.metadata?.aspectRatio ||
      (PORTRAIT_DESIGN_IMAGES.has(design.media_url) ? "portrait" : "square"),
    sortOrder: design.sort_order,
    gallerySortOrder: design.sort_order,
    categoryId: design.category_id,
    categoryName: category?.name,
    categorySlug: category?.slug,
    imageWidth: design.metadata?.imageWidth,
    imageHeight: design.metadata?.imageHeight,
    clientName: design.metadata?.clientName,
    year: design.metadata?.year,
    featured: design.metadata?.featured,
    createdAt: design.created_at,
  };
}

export function homepageDesignToDesignItem(design: HomepageDesign): DesignItem {
  return {
    id: design.id,
    title: design.title,
    image: design.media_url,
    color: design.metadata?.color || "from-purple-700 to-indigo-900",
    aspectRatio:
      design.metadata?.aspectRatio ||
      (PORTRAIT_DESIGN_IMAGES.has(design.media_url) ? "portrait" : "square"),
    marqueeRow: design.metadata?.marqueeRow,
    sortOrder: design.sort_order,
    imageWidth: design.metadata?.imageWidth,
    imageHeight: design.metadata?.imageHeight,
  };
}

/** Shape used by marquee row admin UI (compatible with legacy Project fields). */
export function homepageDesignToProjectShape(design: HomepageDesign): Project {
  return {
    id: design.id,
    type: "design",
    title: design.title,
    description: design.description,
    media_url: design.media_url,
    thumbnail_url: null,
    category_id: null,
    featured: false,
    published: design.published,
    sort_order: design.sort_order,
    metadata: {
      color: design.metadata?.color,
      aspectRatio: design.metadata?.aspectRatio,
      imageWidth: design.metadata?.imageWidth,
      imageHeight: design.metadata?.imageHeight,
      marqueeRow: design.metadata?.marqueeRow,
      homepageSortOrder: design.sort_order,
      showOnHomepage: true,
    },
    created_at: design.created_at,
    updated_at: design.updated_at,
    categories: null,
  };
}

/** One-time migration from legacy shared `design` projects into separate modules. */
export function migrateSeparatedDesignModules(store: PortfolioStore): {
  store: PortfolioStore;
  changed: boolean;
} {
  let changed = false;

  if (!store.gallery_designs) {
    store.gallery_designs = [];
    changed = true;
  }
  if (!store.homepage_designs) {
    store.homepage_designs = [];
    changed = true;
  }

  if (store._design_modules_migrated) {
    return { store, changed };
  }

  const legacyDesigns = store.design ?? [];
  if (legacyDesigns.length === 0) {
    store._design_modules_migrated = true;
    changed = true;
    return { store, changed };
  }

  if (store.gallery_designs.length === 0) {
    store.gallery_designs = legacyDesigns
      .filter((p) => p.metadata?.showInGallery !== false)
      .map(projectToGalleryDesign);
    changed = true;
  }

  if (store.homepage_designs.length === 0) {
    store.homepage_designs = legacyDesigns
      .filter((p) => p.metadata?.showOnHomepage !== false)
      .map(projectToHomepageDesign);
    changed = true;
  }

  store._design_modules_migrated = true;
  changed = true;
  return { store, changed };
}
