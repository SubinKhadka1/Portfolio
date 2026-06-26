import type { Category, DesignItem, GalleryDesign } from "@/lib/types/database";

export type DesignGallerySection = {
  id: string;
  title: string;
  description: string;
  slug: string;
  designs: DesignItem[];
};

export type AdminGallerySection = {
  id: string;
  title: string;
  designs: GalleryDesign[];
};

const UNCATEGORIZED_ID = "uncategorized";

export function groupDesignsByCategory(
  designs: DesignItem[],
  categories: Category[]
): DesignGallerySection[] {
  const sortedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );

  const sections: DesignGallerySection[] = sortedCategories.map((category) => ({
    id: category.id,
    title: category.name,
    description: category.description || "",
    slug: category.slug,
    designs: designs
      .filter((d) => d.categoryId === category.id)
      .sort((a, b) => (a.gallerySortOrder ?? a.sortOrder ?? 0) - (b.gallerySortOrder ?? b.sortOrder ?? 0)),
  }));

  const uncategorized = designs
    .filter((d) => !d.categoryId || !sortedCategories.some((c) => c.id === d.categoryId))
    .sort(
      (a, b) =>
        (a.gallerySortOrder ?? a.sortOrder ?? 0) - (b.gallerySortOrder ?? b.sortOrder ?? 0)
    );

  if (uncategorized.length > 0) {
    sections.push({
      id: UNCATEGORIZED_ID,
      title: "More Designs",
      description: "Additional creative work from my portfolio.",
      slug: "more-designs",
      designs: uncategorized,
    });
  }

  return sections.filter((section) => section.designs.length > 0);
}

export function groupGalleryDesignsByCategory(
  designs: GalleryDesign[],
  categories: Category[]
): AdminGallerySection[] {
  const sortedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );

  const sections: AdminGallerySection[] = sortedCategories.map((category) => ({
    id: category.id,
    title: category.name.toUpperCase(),
    designs: designs
      .filter((d) => d.category_id === category.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));

  const uncategorized = designs
    .filter((d) => !d.category_id || !sortedCategories.some((c) => c.id === d.category_id))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (uncategorized.length > 0) {
    sections.push({
      id: UNCATEGORIZED_ID,
      title: "MORE DESIGNS",
      designs: uncategorized,
    });
  }

  return sections.filter((section) => section.designs.length > 0);
}
