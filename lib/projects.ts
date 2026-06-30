import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getLocalDashboardStats, getLocalProjects } from "@/lib/local-portfolio";
import {
  galleryDesignToDesignItem,
  homepageDesignToDesignItem,
  homepageDesignToProjectShape,
} from "@/lib/design-module-mappers";
import {
  filterVisibleGalleryDesigns,
  getLocalGalleryDesigns,
  getLocalHomepageDesigns,
} from "@/lib/design-modules-store";
import { getCategories } from "@/lib/categories";
import { groupDesignsByCategory } from "@/lib/design-gallery";
import {
  filterGalleryProjects,
  filterHomepageProjects,
  getGallerySortOrder,
  getHomepageSortOrder,
} from "@/lib/design-placement";
import { getSiteSettings } from "@/lib/site-settings-read";
import { seedPortfolioIfEmpty, staticProjectsForAdmin } from "@/lib/seed";
import { PORTRAIT_DESIGN_IMAGES } from "@/lib/static-data";
import type {
  Category,
  ClientItem,
  DesignItem,
  DashboardStats,
  Project,
  ProjectType,
  VideoItem,
} from "@/lib/types/database";

function filterProjects(
  projects: Project[],
  options?: { publishedOnly?: boolean; admin?: boolean }
) {
  if (options?.publishedOnly !== false && !options?.admin) {
    return projects.filter((p) => p.published);
  }
  return projects;
}

async function getLocalProjectsFiltered(
  type: ProjectType,
  options?: { publishedOnly?: boolean; admin?: boolean }
) {
  const projects = await getLocalProjects(type);
  return filterProjects(projects, options);
}

export function projectToDesign(p: Project, category?: Category | null): DesignItem {
  const joined = category ?? p.categories ?? null;
  return {
    id: p.id,
    title: p.title,
    image: p.media_url,
    color: p.metadata?.color || "from-purple-700 to-indigo-900",
    aspectRatio:
      p.metadata?.aspectRatio ||
      (PORTRAIT_DESIGN_IMAGES.has(p.media_url) ? "portrait" : "square"),
    marqueeRow: p.metadata?.marqueeRow,
    sortOrder: getHomepageSortOrder(p),
    gallerySortOrder: getGallerySortOrder(p),
    categoryId: p.category_id,
    categoryName: joined?.name,
    categorySlug: joined?.slug,
    imageWidth: p.metadata?.imageWidth,
    imageHeight: p.metadata?.imageHeight,
  };
}

export function projectToVideo(p: Project): VideoItem {
  return {
    id: p.id,
    title: p.title || p.description || "Video",
    src: p.media_url,
    duration: p.metadata?.duration || "0:30",
    description: p.description || p.title,
    featured: p.featured,
    clipStart: p.metadata?.clipStart ?? 0,
    clipEnd: p.metadata?.clipEnd ?? 8,
  };
}

export function projectToClient(p: Project): ClientItem {
  return {
    name: p.title,
    logo: p.media_url,
    className: p.metadata?.className || "",
    containerClass: p.metadata?.containerClass || "",
    marqueeRow: p.metadata?.marqueeRow,
    sortOrder: p.sort_order,
  };
}

export async function getProjects(
  type: ProjectType,
  options?: { publishedOnly?: boolean; admin?: boolean }
): Promise<Project[]> {
  if (!isSupabaseConfigured()) {
    return getLocalProjectsFiltered(type, options);
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    if (options?.admin) return staticProjectsForAdmin(type);
    return getLocalProjectsFiltered(type, options);
  }

  if (options?.admin) {
    await seedPortfolioIfEmpty(supabase, type);
  }

  let query = supabase
    .from("projects")
    .select("*, categories(*)")
    .eq("type", type)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (options?.publishedOnly !== false && !options?.admin) {
    query = query.eq("published", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Failed to fetch ${type} projects:`, error.message);
    if (options?.admin) return staticProjectsForAdmin(type);
    return getLocalProjectsFiltered(type, options);
  }

  const projects = (data as Project[]) || [];

  if (options?.admin && projects.length === 0) {
    return staticProjectsForAdmin(type);
  }

  if (!options?.admin && projects.length === 0) {
    return getLocalProjectsFiltered(type, options);
  }

  return projects;
}

export async function getDesigns(): Promise<DesignItem[]> {
  if (!isSupabaseConfigured()) {
    const designs = await getLocalHomepageDesigns();
    return designs.map(homepageDesignToDesignItem);
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    const designs = await getLocalHomepageDesigns();
    return designs.map(homepageDesignToDesignItem);
  }

  const [projects, categories] = await Promise.all([
    getProjects("design"),
    getCategories("design"),
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  return filterHomepageProjects(projects).map((p) =>
    projectToDesign(p, p.category_id ? byId.get(p.category_id) : null)
  );
}

export async function getHomepageDesignProjects(options?: {
  admin?: boolean;
}): Promise<Project[]> {
  const designs = await getLocalHomepageDesigns(options);
  return designs.map(homepageDesignToProjectShape);
}

export async function getDesignGalleryPageData() {
  if (!isSupabaseConfigured()) {
    const [designs, categories, settings] = await Promise.all([
      getLocalGalleryDesigns(),
      getCategories("design"),
      getSiteSettings(),
    ]);
    const visible = filterVisibleGalleryDesigns(designs);
    const byId = new Map(categories.map((c) => [c.id, c]));
    const items = visible.map((d) =>
      galleryDesignToDesignItem(d, d.category_id ? byId.get(d.category_id) : null)
    );
    return {
      designs: items,
      categories,
      sections: groupDesignsByCategory(items, categories),
      settings,
      totalDesigns: items.length,
    };
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    const [designs, categories, settings] = await Promise.all([
      getLocalGalleryDesigns(),
      getCategories("design"),
      getSiteSettings(),
    ]);
    const visible = filterVisibleGalleryDesigns(designs);
    const byId = new Map(categories.map((c) => [c.id, c]));
    const items = visible.map((d) =>
      galleryDesignToDesignItem(d, d.category_id ? byId.get(d.category_id) : null)
    );
    return {
      designs: items,
      categories,
      sections: groupDesignsByCategory(items, categories),
      settings,
      totalDesigns: items.length,
    };
  }

  const [projects, categories, settings] = await Promise.all([
    getProjects("design"),
    getCategories("design"),
    getSiteSettings(),
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const designs = filterGalleryProjects(projects).map((p) =>
    projectToDesign(p, p.category_id ? byId.get(p.category_id) : null)
  );
  return {
    designs,
    categories,
    sections: groupDesignsByCategory(designs, categories),
    settings,
    totalDesigns: designs.length,
  };
}

export async function getVideos(): Promise<VideoItem[]> {
  const projects = await getProjects("video");
  return projects.map(projectToVideo);
}

export async function getClients(): Promise<ClientItem[]> {
  const projects = await getProjects("client");
  return projects.map(projectToClient);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) {
    return getLocalDashboardStats();
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return getLocalDashboardStats();
  }

  const { data, error } = await supabase.from("projects").select("type, featured, published");

  if (error || !data || data.length === 0) {
    return getLocalDashboardStats();
  }

  const local = await getLocalDashboardStats();

  return {
    total: data.length,
    designs: data.filter((p) => p.type === "design").length,
    videos: data.filter((p) => p.type === "video").length,
    clients: data.filter((p) => p.type === "client").length,
    galleryDesigns: local.galleryDesigns,
    featured: data.filter((p) => p.featured).length,
    published: data.filter((p) => p.published).length,
    unpublished: data.filter((p) => !p.published).length,
  };
}
