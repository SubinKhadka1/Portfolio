import ProjectForm from "@/components/admin/ProjectForm";
import { getSiteSettings } from "@/lib/site-settings-read";
import type { ProjectType } from "@/lib/types/database";

type PageProps = {
  searchParams: Promise<{ type?: string; row?: string }>;
};

export default async function NewProjectPage({ searchParams }: PageProps) {
  const { type, row } = await searchParams;
  const defaultType = (type as ProjectType) || "design";
  const settings = await getSiteSettings();
  const defaultMarqueeRow = row ? Number(row) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Project</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {defaultType === "design" && defaultMarqueeRow
            ? `Adding to showcase row ${defaultMarqueeRow}`
            : defaultType === "client" && defaultMarqueeRow
              ? `Adding to client row ${defaultMarqueeRow}`
              : "Upload and publish to your portfolio instantly"}
        </p>
      </div>
      <ProjectForm
        defaultType={defaultType}
        portfolioRows={
          defaultType === "client" ? settings.clientRows : settings.portfolioRows
        }
        defaultMarqueeRow={defaultMarqueeRow}
      />
    </div>
  );
}
