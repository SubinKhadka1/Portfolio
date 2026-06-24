import { showsGalleryDesign } from "@/lib/design-module-mappers";
import { designDisplayAspectRatio } from "@/lib/design-image";
import type { Category, GalleryDesign } from "@/lib/types/database";

export type GalleryAdminSection = {
  category: Category;
  designs: GalleryDesign[];
};

export function sortGalleryDesigns(designs: GalleryDesign[]) {
  return [...designs].sort((a, b) => a.sort_order - b.sort_order);
}

export function groupDesignsForGalleryAdmin(
  designs: GalleryDesign[],
  categories: Category[]
): { sections: GalleryAdminSection[]; unassigned: GalleryDesign[]; hidden: GalleryDesign[] } {
  const sortedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );

  const visible = designs.filter(showsGalleryDesign);
  const hidden = designs.filter((d) => !showsGalleryDesign(d));

  const sections = sortedCategories.map((category) => ({
    category,
    designs: sortGalleryDesigns(visible.filter((d) => d.category_id === category.id)),
  }));

  const unassigned = sortGalleryDesigns(
    visible.filter(
      (d) => !d.category_id || !sortedCategories.some((c) => c.id === d.category_id)
    )
  );

  return { sections, unassigned, hidden };
}

export function galleryDesignAspect(design: GalleryDesign) {
  return designDisplayAspectRatio(design.metadata ?? {});
}
