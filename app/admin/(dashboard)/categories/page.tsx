import DesignGalleryManager from "@/components/admin/DesignGalleryManager";
import { getCategories } from "@/lib/categories";
import { getLocalGalleryDesigns } from "@/lib/design-modules-store";
import { getSiteSettings } from "@/lib/site-settings-read";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const [categories, designs, settings] = await Promise.all([
    getCategories("design"),
    getLocalGalleryDesigns({ admin: true }),
    getSiteSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Design Gallery Manager</h1>
        <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
          Upload, organize, and publish designs for the{" "}
          <span className="text-zinc-300">/designs</span> page. This is independent from homepage
          marquee and other portfolio sections.
        </p>
      </div>
      <DesignGalleryManager
        initialCategories={categories}
        initialDesigns={designs}
        gallerySettings={{
          designGalleryEyebrow: settings.designGalleryEyebrow,
          designGalleryTitle: settings.designGalleryTitle,
          designGallerySubtitle: settings.designGallerySubtitle,
        }}
      />
    </div>
  );
}
