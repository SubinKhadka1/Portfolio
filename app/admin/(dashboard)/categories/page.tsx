import DesignGalleryManager from "@/components/admin/DesignGalleryManager";
import { getCategories } from "@/lib/categories";
import { getLocalGalleryDesigns } from "@/lib/design-modules-store";
import { getSiteSettings } from "@/lib/site-settings-read";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function AdminGalleryPage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const [categories, designs, settings] = await Promise.all([
    getCategories("design"),
    getLocalGalleryDesigns({ admin: true }),
    getSiteSettings(),
  ]);

  const categoryIds = new Set(categories.map((c) => c.id));
  const initialCategoryFilter =
    category && categoryIds.has(category) ? category : "all";

  return (
    <DesignGalleryManager
      initialCategories={categories}
      initialDesigns={designs}
      initialCategoryFilter={initialCategoryFilter}
      gallerySettings={{
        designGalleryEyebrow: settings.designGalleryEyebrow,
        designGalleryTitle: settings.designGalleryTitle,
        designGallerySubtitle: settings.designGallerySubtitle,
      }}
    />
  );
}
