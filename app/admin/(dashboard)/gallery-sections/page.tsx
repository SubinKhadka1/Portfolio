import Link from "next/link";
import { ExternalLink } from "lucide-react";
import GallerySectionGrid, {
  type GallerySectionCard,
} from "@/components/admin/GallerySectionGrid";
import { getCategories } from "@/lib/categories";
import { getLocalGalleryDesigns } from "@/lib/design-modules-store";

export const dynamic = "force-dynamic";

export default async function AdminGallerySectionsPage() {
  const [categories, designs] = await Promise.all([
    getCategories("design"),
    getLocalGalleryDesigns({ admin: true }),
  ]);

  const sections: GallerySectionCard[] = categories.map((category) => {
    const inSection = designs.filter((d) => d.category_id === category.id);
    return {
      ...category,
      designCount: inSection.length,
      previewUrls: inSection.slice(0, 4).map((d) => d.media_url),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Design Gallery Sections</h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">
            {sections.length} sections · drag cards to reorder · click pencil to rename headings on
            /designs
          </p>
        </div>
        <Link
          href="/designs"
          target="_blank"
          className="admin-btn-secondary inline-flex items-center gap-2"
        >
          <ExternalLink size={16} />
          View public gallery
        </Link>
      </div>

      <GallerySectionGrid sections={sections} />
    </div>
  );
}
