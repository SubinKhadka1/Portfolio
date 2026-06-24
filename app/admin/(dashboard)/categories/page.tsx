import GalleryManager from "@/components/admin/GalleryManager";
import { getCategories } from "@/lib/categories";
import { getProjects } from "@/lib/projects";
import { getSiteSettings } from "@/lib/site-settings-read";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const [categories, projects, settings] = await Promise.all([
    getCategories("design"),
    getProjects("design", { admin: true }),
    getSiteSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Design Gallery Editor</h1>
        <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
          Manage the full <span className="text-zinc-300">/designs</span> page — sections, headings,
          and which flyers appear in each category. Images preview exactly as visitors see them.
        </p>
      </div>
      <GalleryManager
        initialCategories={categories}
        initialProjects={projects}
        gallerySettings={{
          designGalleryEyebrow: settings.designGalleryEyebrow,
          designGalleryTitle: settings.designGalleryTitle,
          designGallerySubtitle: settings.designGallerySubtitle,
        }}
      />
    </div>
  );
}
