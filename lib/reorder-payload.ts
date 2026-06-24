import { marqueeSortOrder, clampMarqueeRow } from "@/lib/marquee";
import { homepageSortValue } from "@/lib/design-placement";
import type { GalleryDesign, HomepageDesign, Project } from "@/lib/types/database";

export type ReorderItem = {
  id: string;
  sort_order?: number;
  metadata?: Project["metadata"];
};

export type ReorderScope = "homepage" | "gallery" | "default";

export function buildReorderItems(rowProjects: Project[], row: number): ReorderItem[] {
  const rowNum = clampMarqueeRow(row) as 1 | 2 | 3;
  return rowProjects.map((p, index) => ({
    id: p.id,
    sort_order: marqueeSortOrder(row, index),
    metadata: { ...p.metadata, marqueeRow: rowNum },
  }));
}

/** Homepage marquee only — does not change gallery order or global sort_order. */
export function buildHomepageReorderItems(rowProjects: Project[], row: number): ReorderItem[] {
  const rowNum = clampMarqueeRow(row) as 1 | 2 | 3;
  return rowProjects.map((p, index) => ({
    id: p.id,
    metadata: {
      ...p.metadata,
      marqueeRow: rowNum,
      homepageSortOrder: homepageSortValue(rowNum, index),
      showOnHomepage: true,
    },
  }));
}

/** Design gallery page — only updates gallery sort order. */
export function buildGalleryReorderItems(sectionProjects: Project[]): ReorderItem[] {
  return sectionProjects.map((p, index) => ({
    id: p.id,
    metadata: {
      ...p.metadata,
      gallerySortOrder: (index + 1) * 1_000,
      showInGallery: true,
    },
  }));
}

export function buildGalleryDesignReorderItems(designs: GalleryDesign[]) {
  return designs.map((d, index) => ({
    id: d.id,
    sort_order: (index + 1) * 1_000,
  }));
}

/** Homepage marquee — independent homepage design records. */
export function buildHomepageDesignReorderItems(
  rowDesigns: HomepageDesign[],
  row: number
): { id: string; sort_order: number; metadata: HomepageDesign["metadata"] }[] {
  const rowNum = clampMarqueeRow(row) as 1 | 2 | 3;
  return rowDesigns.map((d, index) => ({
    id: d.id,
    sort_order: homepageSortValue(rowNum, index),
    metadata: { ...d.metadata, marqueeRow: rowNum },
  }));
}
