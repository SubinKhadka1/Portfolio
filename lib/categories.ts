import { randomUUID } from "crypto";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Category, ProjectType } from "@/lib/types/database";

const CATEGORIES_JSON = "data/categories.json";

const DEFAULT_DESIGN_CATEGORIES: Category[] = [
  {
    id: "cat-flyers",
    name: "Flyers & Posters",
    slug: "flyers-posters",
    description: "Promotional flyers, event posters, and print-ready creatives.",
    project_type: "design",
    sort_order: 1,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-food-menu",
    name: "Food Menu",
    slug: "food-menu",
    description: "Restaurant menus, cafe boards, and food marketing designs.",
    project_type: "design",
    sort_order: 2,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-pullup",
    name: "Pull Up Banner",
    slug: "pull-up-banner",
    description: "Standee and roll-up banners for events and storefronts.",
    project_type: "design",
    sort_order: 3,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-brochure",
    name: "Brochure",
    slug: "brochure",
    description: "Multi-panel brochures and informational print layouts.",
    project_type: "design",
    sort_order: 4,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-cover",
    name: "Cover Page",
    slug: "cover-page",
    description: "Book covers, report covers, and publication front pages.",
    project_type: "design",
    sort_order: 5,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-ticket",
    name: "Movie Tickets",
    slug: "movie-tickets",
    description: "Cinema tickets, event passes, and entry card designs.",
    project_type: "design",
    sort_order: 6,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-social",
    name: "Social Media",
    slug: "social-media",
    description: "Instagram posts, stories, and digital social creatives.",
    project_type: "design",
    sort_order: 7,
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readLocalCategories(): Promise<Category[]> {
  const raw = await readJsonFile<Category[]>(CATEGORIES_JSON);
  if (!raw || raw.length === 0) return DEFAULT_DESIGN_CATEGORIES;
  return [...raw].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

async function writeLocalCategories(categories: Category[]) {
  await writeJsonFile(CATEGORIES_JSON, categories);
}

export async function getCategories(projectType?: ProjectType): Promise<Category[]> {
  if (isSupabaseConfigured()) {
    const supabase = await tryCreateClient();
    if (supabase) {
      let query = supabase.from("categories").select("*").order("sort_order", { ascending: true });
      if (projectType) query = query.eq("project_type", projectType);
      const { data, error } = await query;
      if (!error && data?.length) {
        return (data as Category[]).map((c, i) => ({
          ...c,
          sort_order: c.sort_order ?? i + 1,
        }));
      }
    }
  }

  const categories = await readLocalCategories();
  return projectType ? categories.filter((c) => c.project_type === projectType) : categories;
}

export async function createCategory(input: {
  name: string;
  description?: string;
  project_type: ProjectType;
}): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required");

  if (isSupabaseConfigured()) {
    const supabase = await tryCreateClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name,
          slug: slugify(name),
          description: input.description?.trim() || null,
          project_type: input.project_type,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Category;
    }
  }

  const categories = await readLocalCategories();
  const category: Category = {
    id: randomUUID(),
    name,
    slug: slugify(name),
    description: input.description?.trim() || "",
    project_type: input.project_type,
    sort_order: categories.length + 1,
    created_at: new Date().toISOString(),
  };
  await writeLocalCategories([...categories, category]);
  return category;
}

export async function updateCategory(
  id: string,
  input: { name?: string; description?: string; sort_order?: number }
): Promise<Category> {
  if (isSupabaseConfigured()) {
    const supabase = await tryCreateClient();
    if (supabase) {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) {
        patch.name = input.name.trim();
        patch.slug = slugify(input.name);
      }
      if (input.description !== undefined) patch.description = input.description.trim();
      if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

      const { data, error } = await supabase
        .from("categories")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Category;
    }
  }

  const categories = await readLocalCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index < 0) throw new Error("Category not found");

  const current = categories[index];
  const updated: Category = {
    ...current,
    name: input.name !== undefined ? input.name.trim() : current.name,
    slug: input.name !== undefined ? slugify(input.name) : current.slug,
    description: input.description !== undefined ? input.description.trim() : current.description,
    sort_order: input.sort_order ?? current.sort_order,
  };
  categories[index] = updated;
  await writeLocalCategories(categories);
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await tryCreateClient();
    if (supabase) {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return;
    }
  }

  const categories = await readLocalCategories();
  await writeLocalCategories(categories.filter((c) => c.id !== id));
}

export async function reorderCategories(ids: string[]): Promise<Category[]> {
  if (isSupabaseConfigured()) {
    const supabase = await tryCreateClient();
    if (supabase) {
      await Promise.all(
        ids.map((id, index) =>
          supabase.from("categories").update({ sort_order: index + 1 }).eq("id", id)
        )
      );
      return getCategories("design");
    }
  }

  const categories = await readLocalCategories();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const reordered = ids
    .map((id, index) => {
      const cat = byId.get(id);
      return cat ? { ...cat, sort_order: index + 1 } : null;
    })
    .filter((c): c is Category => Boolean(c));

  const remaining = categories
    .filter((c) => !ids.includes(c.id))
    .map((c, i) => ({ ...c, sort_order: reordered.length + i + 1 }));

  const next = [...reordered, ...remaining].sort((a, b) => a.sort_order - b.sort_order);
  await writeLocalCategories(next);
  return next;
}
