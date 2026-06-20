import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getLocalDashboardStats,
  getLocalProjects,
} from "@/lib/local-portfolio";
import { seedPortfolioIfEmpty, staticProjectsForAdmin } from "@/lib/seed";
import { PORTRAIT_DESIGN_IMAGES } from "@/lib/static-data";
import type {
  ClientItem,
  DesignItem,
  DashboardStats,
  Project,
  ProjectType,
  VideoItem,
} from "@/lib/types/database";

export function projectToDesign(p: Project): DesignItem {
  return {
    id: p.id,
    title: p.title,
    image: p.media_url,
    color: p.metadata?.color || "from-purple-700 to-indigo-900",
    aspectRatio:
      p.metadata?.aspectRatio ||
      (PORTRAIT_DESIGN_IMAGES.has(p.media_url) ? "portrait" : "square"),
    marqueeRow: p.metadata?.marqueeRow,
    sortOrder: p.sort_order,
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
    const projects = await getLocalProjects(type);
    const filtered =
      options?.publishedOnly !== false && !options?.admin
        ? projects.filter((p) => p.published)
        : projects;
    return filtered;
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return options?.admin ? staticProjectsForAdmin(type) : [];
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
    return [];
  }

  const projects = (data as Project[]) || [];

  if (options?.admin && projects.length === 0) {
    return staticProjectsForAdmin(type);
  }

  return projects;
}

export async function getDesigns(): Promise<DesignItem[]> {
  const projects = await getProjects("design");
  return projects.map(projectToDesign);
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

  return {
    total: data.length,
    designs: data.filter((p) => p.type === "design").length,
    videos: data.filter((p) => p.type === "video").length,
    clients: data.filter((p) => p.type === "client").length,
    featured: data.filter((p) => p.featured).length,
    published: data.filter((p) => p.published).length,
    unpublished: data.filter((p) => !p.published).length,
  };
}
