import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATIC_DESIGNS, STATIC_VIDEOS } from "@/lib/static-data";
import type { Project, ProjectInput, ProjectType } from "@/lib/types/database";

export function staticProjectsForAdmin(type: ProjectType): Project[] {
  const now = new Date().toISOString();

  if (type === "design") {
    return STATIC_DESIGNS.map((d, i) => ({
      id: `static-design-${i}`,
      type: "design",
      title: d.title,
      description: "",
      media_url: d.image,
      thumbnail_url: null,
      category_id: null,
      featured: false,
      published: true,
      sort_order: i,
      metadata: { color: d.color, aspectRatio: d.aspectRatio || "square" },
      created_at: now,
      updated_at: now,
      categories: null,
    }));
  }

  if (type === "video") {
    return STATIC_VIDEOS.map((v, i) => ({
      id: `static-video-${i}`,
      type: "video",
      title: v.title,
      description: v.description,
      media_url: v.src,
      thumbnail_url: null,
      category_id: null,
      featured: v.featured,
      published: true,
      sort_order: i,
      metadata: {
        duration: v.duration,
        clipStart: v.clipStart,
        clipEnd: v.clipEnd,
      },
      created_at: now,
      updated_at: now,
      categories: null,
    }));
  }

  return [];
}

export function getStaticProjectInputs(): ProjectInput[] {
  const designs: ProjectInput[] = STATIC_DESIGNS.map((d, i) => ({
    type: "design",
    title: d.title,
    description: "",
    media_url: d.image,
    featured: false,
    published: true,
    sort_order: i,
    metadata: { color: d.color, aspectRatio: d.aspectRatio || "square" },
  }));

  const videos: ProjectInput[] = STATIC_VIDEOS.map((v, i) => ({
    type: "video",
    title: v.title,
    description: v.description,
    media_url: v.src,
    featured: v.featured,
    published: true,
    sort_order: i,
    metadata: {
      duration: v.duration,
      clipStart: v.clipStart,
      clipEnd: v.clipEnd,
    },
  }));

  return [...designs, ...videos];
}

export async function seedPortfolioIfEmpty(
  supabase: SupabaseClient,
  type?: ProjectType
) {
  const db =
    process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? createAdminClient()
      : supabase;

  const types: ProjectType[] = type ? [type] : ["design", "video"];
  const allStatic = getStaticProjectInputs();
  let seeded = 0;

  for (const projectType of types) {
    const { count, error: countError } = await db
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("type", projectType);

    if (countError) {
      console.error(`Seed count check failed for ${projectType}:`, countError.message);
      continue;
    }

    if (count && count > 0) continue;

    const items = allStatic.filter((p) => p.type === projectType);
    if (items.length === 0) continue;

    const { error } = await db.from("projects").insert(items);
    if (error) {
      console.error(`Seed insert failed for ${projectType}:`, error.message);
      continue;
    }

    seeded += items.length;
  }

  return seeded;
}
