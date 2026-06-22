import { marqueeSortOrder, clampMarqueeRow } from "@/lib/marquee";
import type { Project } from "@/lib/types/database";

export type ReorderItem = {
  id: string;
  sort_order: number;
  metadata?: Project["metadata"];
};

export function buildReorderItems(rowProjects: Project[], row: number): ReorderItem[] {
  const rowNum = clampMarqueeRow(row) as 1 | 2 | 3;
  return rowProjects.map((p, index) => ({
    id: p.id,
    sort_order: marqueeSortOrder(row, index),
    metadata: { ...p.metadata, marqueeRow: rowNum },
  }));
}
