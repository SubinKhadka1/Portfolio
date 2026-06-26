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
    <DesignGalleryManager
      initialCategories={categories}
      initialDesigns={designs}
      gallerySettings={{
        designGalleryEyebrow: settings.designGalleryEyebrow,
        designGalleryTitle: settings.designGalleryTitle,
        designGallerySubtitle: settings.designGallerySubtitle,
      }}
    />
  );
}
