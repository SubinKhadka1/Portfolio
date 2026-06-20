import { notFound } from "next/navigation";
import ProjectForm from "@/components/admin/ProjectForm";
import { getLocalProject } from "@/lib/local-portfolio";
import { getSiteSettings } from "@/lib/site-settings";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Project } from "@/lib/types/database";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;
  let project: Project | null = null;

  if (!isSupabaseConfigured()) {
    project = await getLocalProject(id);
  } else {
    const supabase = await tryCreateClient();
    if (supabase) {
      const { data } = await supabase
        .from("projects")
        .select("*, categories(*)")
        .eq("id", id)
        .single();
      project = (data as Project) || null;
    } else {
      project = await getLocalProject(id);
    }
  }

  if (!project) notFound();

  const settings = await getSiteSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Edit Project</h1>
        <p className="text-zinc-500 text-sm mt-1 capitalize">
          {project.type} · {project.title || "Untitled"}
        </p>
      </div>
      <ProjectForm
        initial={project}
        portfolioRows={
          project.type === "client" ? settings.clientRows : settings.portfolioRows
        }
      />
    </div>
  );
}
