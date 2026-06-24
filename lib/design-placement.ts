import type { DesignMetadata, Project } from "@/lib/types/database";
import { marqueeSortOrder } from "@/lib/marquee";

export function showsOnHomepage(metadata?: DesignMetadata) {
  return metadata?.showOnHomepage !== false;
}

export function showsInGallery(metadata?: DesignMetadata) {
  return metadata?.showInGallery !== false;
}

export function getHomepageSortOrder(project: Project) {
  return project.metadata?.homepageSortOrder ?? project.sort_order;
}

export function getGallerySortOrder(project: Project) {
  return project.metadata?.gallerySortOrder ?? project.sort_order;
}

export function homepageSortValue(row: number, index: number) {
  return marqueeSortOrder(row, index);
}

export function filterHomepageProjects(projects: Project[]) {
  return projects.filter((p) => showsOnHomepage(p.metadata));
}

export function filterGalleryProjects(projects: Project[]) {
  return projects.filter((p) => showsInGallery(p.metadata));
}
