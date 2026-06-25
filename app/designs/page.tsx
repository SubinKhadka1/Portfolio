import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DesignGallery from "@/components/DesignGallery";
import { getDesignGalleryPageData } from "@/lib/projects";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Designs | Subin Khadka",
  description:
    "Browse flyers, food menus, pull-up banners, brochures, cover pages, movie tickets, and more graphic design work by Subin Khadka.",
};

export default async function DesignsPage() {
  const { designs, categories, settings, totalDesigns } = await getDesignGalleryPageData();

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar variant="light" />
      <DesignGallery
        eyebrow={settings.designGalleryEyebrow}
        title={settings.designGalleryTitle}
        subtitle={settings.designGallerySubtitle}
        designs={designs}
        categories={categories}
        totalDesigns={totalDesigns}
      />
      <Footer variant="light" />
    </main>
  );
}
