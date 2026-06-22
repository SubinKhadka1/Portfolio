import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readJsonFile } from "@/lib/json-store";
import type { Project, ProjectType } from "@/lib/types/database";

async function getLocalProjectById(id: string): Promise<Project | null> {
  const store = await readJsonFile<Record<ProjectType, Project[]>>("data/portfolio.json");
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

  return (data as Project) || null;
}
