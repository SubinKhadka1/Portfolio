import { readJsonFile } from "@/lib/json-store";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { homepageDesignToProjectShape } from "@/lib/design-module-mappers";
import { getLocalGalleryDesign, getLocalHomepageDesign } from "@/lib/design-modules-store";
import type { Project, ProjectType } from "@/lib/types/database";

async function getLocalProjectById(id: string): Promise<Project | null> {
  const homepage = await getLocalHomepageDesign(id);
  if (homepage) return homepageDesignToProjectShape(homepage);

  const gallery = await getLocalGalleryDesign(id);
  if (gallery) {
    return {
      id: gallery.id,
      type: "design",
      title: gallery.title,
      description: gallery.description,
      media_url: gallery.media_url,
      thumbnail_url: null,
      category_id: gallery.category_id,
      featured: false,
      published: gallery.published,
      sort_order: gallery.sort_order,
      metadata: gallery.metadata,
      created_at: gallery.created_at,
      updated_at: gallery.updated_at,
      categories: null,
    };
  }

  const store = await readJsonFile<Partial<Record<ProjectType, Project[]>>>("data/portfolio.json");
  if (!store) return null;
  for (const type of ["design", "video", "client"] as ProjectType[]) {
    const found = store[type]?.find((p) => p.id === id);
    if (found) return found;
  }
  return null;
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured()) {
    return getLocalProjectById(id);
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return getLocalProjectById(id);
  }

  const { data } = await supabase
    .from("projects")
    .select("*, categories(*)")
    .eq("id", id)
    .single();

  return (data as Project) || getLocalProjectById(id);
}

export async function fetchGalleryDesignById(id: string) {
  return getLocalGalleryDesign(id);
}

export async function fetchHomepageDesignById(id: string) {
  return getLocalHomepageDesign(id);
}
