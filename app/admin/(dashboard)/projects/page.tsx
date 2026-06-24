import Link from "next/link";
import { Plus } from "lucide-react";
import DesignRowManager from "@/components/admin/DesignRowManager";
import ClientRowManager from "@/components/admin/ClientRowManager";
import ProjectGrid from "@/components/admin/ProjectGrid";
import { getProjects } from "@/lib/projects";
import { getSiteSettings } from "@/lib/site-settings-read";
import type { ProjectType } from "@/lib/types/database";

type PageProps = {
  searchParams: Promise<{ type?: string }>;
};

export default async function AdminProjectsPage({ searchParams }: PageProps) {
  const { type: typeParam } = await searchParams;
  const type = (typeParam as ProjectType) || "design";
  const [projects, settings] = await Promise.all([
    getProjects(type, { admin: true }),
    getSiteSettings(),
  ]);

  const labels: Record<ProjectType, string> = {
    design: "Designs",
    video: "Videos",
    client: "Clients",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{labels[type]}</h1>
          {type === "design" ? (
            <p className="text-zinc-500 text-xs sm:text-sm mt-1">
              {projects.length} designs · homepage marquee rows below (independent from /designs gallery)
            </p>
          ) : type === "client" ? (
            <p className="text-zinc-500 text-xs sm:text-sm mt-1">
              {projects.length} clients · add and manage by logo row below
            </p>
          ) : (
            <p className="text-zinc-500 text-sm mt-1">
              {projects.length} videos · drag cards to reorder · hover to preview
            </p>
          )}
        </div>
        {type === "video" && (
          <Link href={`/admin/projects/new?type=${type}`} className="admin-btn-primary">
            <Plus size={18} />
            Add {type}
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        {(["design", "video", "client"] as ProjectType[]).map((t) => (
          <Link
            key={t}
            href={`/admin/projects?type=${t}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              type === t
                ? "bg-purple-600 text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {t}s
          </Link>
        ))}
      </div>

      {type === "design" ? (
        <DesignRowManager projects={projects} portfolioRows={settings.portfolioRows} />
      ) : type === "client" ? (
        <ClientRowManager projects={projects} clientRows={settings.clientRows} />
      ) : (
        <ProjectGrid projects={projects} type={type} />
      )}
    </div>
  );
}
