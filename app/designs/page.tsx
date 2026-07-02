import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DesignGallery from "@/components/DesignGallery";
import { getDesignGalleryPageData } from "@/lib/projects";

/** Cache gallery page; admin mutations call revalidatePath("/designs"). */
export const revalidate = 300;

export const metadata = {
  title: "My Designs | Subin Khadka",
  description:
    "Browse flyers, food menus, pull-up banners, brochures, cover pages, movie tickets, and more graphic design work by Subin Khadka.",
};

export default async function DesignsPage() {
  const { designs, categories } = await getDesignGalleryPageData();

  return (
    <main className="designs-page min-h-screen bg-white text-[#191919]">
      <Navbar variant="light" />
      <DesignGallery designs={designs} categories={categories} />
      <Footer variant="light" />
    </main>
  );
}
