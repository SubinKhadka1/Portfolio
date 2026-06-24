import type { Project } from "@/lib/types/database";
import {
  filterHomepageProjects,
  getHomepageSortOrder,
} from "@/lib/design-placement";

/** Duplicate row content for seamless infinite loop (2× is standard). */
export function loopForMarquee<T>(items: T[], repeatCount = 2): T[] {
  if (items.length === 0) return [];
  const count = Math.max(2, Math.min(4, Math.round(repeatCount) || 2));
  const result: T[] = [];
  for (let i = 0; i < count; i++) result.push(...items);
  return result;
}

/** Round-robin split (clients/videos). */
export function splitIntoRows<T>(items: T[], rowCount = 2): T[][] {
  if (items.length === 0) return [];
  const rows = Math.max(1, Math.min(3, Math.round(rowCount)));
  const buckets: T[][] = Array.from({ length: rows }, () => []);
  items.forEach((item, i) => buckets[i % rows].push(item));
  return buckets.filter((row) => row.length > 0);
}

/** Chunk split — fallback when designs have no row assigned. */
export function splitIntoChunks<T>(items: T[], rowCount = 3): T[][] {
  if (items.length === 0) return [];
  const rows = Math.max(1, Math.min(3, Math.round(rowCount)));
  if (rows === 1) return [items];

  const chunkSize = Math.ceil(items.length / rows);
  const result: T[][] = [];
  for (let i = 0; i < rows; i++) {
    const chunk = items.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length) result.push(chunk);
  }
  return result;
}

export function clampMarqueeRow(value: number, maxRows = 3) {
  return Math.max(1, Math.min(maxRows, Math.round(value) || 1)) as 1 | 2 | 3;
}

export function marqueeSortOrder(row: number, index: number) {
  return clampMarqueeRow(row) * 1_000_000 + index;
}

type RowAssignable = {
  marqueeRow?: number;
  sortOrder?: number;
};

/** Group designs by assigned row for the homepage marquee. */
export function groupDesignsByMarqueeRow<T extends RowAssignable>(
  items: T[],
  rowCount = 3
): T[][] {
  if (items.length === 0) return [];
  const rows = clampMarqueeRows(rowCount);
  const hasRowAssignment = items.some((item) => item.marqueeRow != null);

  if (!hasRowAssignment) {
    return splitIntoChunks(items, rows);
  }

  const buckets: T[][] = Array.from({ length: rows }, () => []);
  for (const item of items) {
    const row = clampMarqueeRow(item.marqueeRow ?? 1, rows);
    buckets[row - 1].push(item);
  }

  for (const bucket of buckets) {
    bucket.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  return buckets.filter((bucket) => bucket.length > 0);
}

export function groupProjectsByMarqueeRow(projects: Project[], rowCount = 3): Project[][] {
  const rows = clampMarqueeRows(rowCount);
  const homepageProjects = filterHomepageProjects(projects);
  return Array.from({ length: rows }, (_, i) => {
    const rowNum = i + 1;
    return homepageProjects
      .filter((p) => clampMarqueeRow(p.metadata?.marqueeRow ?? 1, rows) === rowNum)
      .sort((a, b) => getHomepageSortOrder(a) - getHomepageSortOrder(b));
  });
}

export function clampMarqueeRepeat(value: number) {
  return Math.max(2, Math.min(4, Math.round(value) || 2));
}

export function clampMarqueeRows(value: number) {
  return Math.max(1, Math.min(3, Math.round(value) || 1));
}

export function clampScrollDuration(value: number) {
  return Math.max(35, Math.min(120, Math.round(value) || 55));
}
