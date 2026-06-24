import type { Category, DesignItem } from "@/lib/types/database";

export type DesignGallerySection = {
  id: string;
  title: string;
  description: string;
  slug: string;
  designs: DesignItem[];
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
