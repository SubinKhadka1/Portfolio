import { marqueeSortOrder, clampMarqueeRow } from "@/lib/marquee";
import { homepageSortValue } from "@/lib/design-placement";
import type { Project } from "@/lib/types/database";

export type ReorderItem = {
  id: string;
  sort_order?: number;
  metadata?: Project["metadata"];
};

export type ReorderScope = "homepage" | "default";

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
