import { promises as fs } from "fs";
import path from "path";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Project, ProjectType } from "@/lib/types/database";

const DATA_FILE = path.join(process.cwd(), "data", "portfolio.json");

async function getLocalProjectById(id: string): Promise<Project | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const store = JSON.parse(raw) as Record<ProjectType, Project[]>;
    for (const type of ["design", "video", "client"] as ProjectType[]) {
      const found = store[type]?.find((p) => p.id === id);
      if (found) return found;
    }
  } catch {
    return null;
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
