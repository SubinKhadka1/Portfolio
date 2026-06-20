import { notFound } from "next/navigation";
import ProjectForm from "@/components/admin/ProjectForm";
import { fetchProjectById } from "@/lib/fetch-project-by-id";
import { getSiteSettings } from "@/lib/site-settings-read";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;
  const [project, settings] = await Promise.all([
    fetchProjectById(id),
    getSiteSettings(),
  ]);

  if (!project) notFound();

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
