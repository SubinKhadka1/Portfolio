import { getGallerySortOrder, showsInGallery } from "@/lib/design-placement";
import { designDisplayAspectRatio } from "@/lib/design-image";
import type { Category, Project } from "@/lib/types/database";

export type GalleryAdminSection = {
  category: Category;
  designs: Project[];
};

export function sortGalleryProjects(projects: Project[]) {
  return [...projects].sort((a, b) => getGallerySortOrder(a) - getGallerySortOrder(b));
}

export function groupProjectsForGalleryAdmin(
  projects: Project[],
  categories: Category[]
): { sections: GalleryAdminSection[]; unassigned: Project[]; hidden: Project[] } {
  const sortedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );

  const visible = projects.filter((p) => showsInGallery(p.metadata));
  const hidden = projects.filter((p) => !showsInGallery(p.metadata));

  const sections = sortedCategories.map((category) => ({
    category,
    designs: sortGalleryProjects(
      visible.filter((p) => p.category_id === category.id)
    ),
  }));

  const unassigned = sortGalleryProjects(
    visible.filter(
      (p) => !p.category_id || !sortedCategories.some((c) => c.id === p.category_id)
    )
  );

  return { sections, unassigned, hidden };
}

export function projectGalleryAspect(project: Project) {
  return designDisplayAspectRatio(project.metadata ?? {});
}
