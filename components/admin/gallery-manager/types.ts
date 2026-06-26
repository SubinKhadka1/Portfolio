export type GalleryView =
  | "dashboard"
  | "gallery"
  | "categories"
  | "featured"
  | "drafts"
  | "trash"
  | "upload"
  | "settings";

export type SortMode = "order" | "newest" | "oldest" | "featured";
export type GridSize = "small" | "medium" | "large";

export const GRID_COLUMN_WIDTH: Record<GridSize, number> = {
  small: 180,
  medium: 260,
  large: 340,
};

export const PAGE_SIZE = 48;

export function formatGalleryDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function isImageFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext);
}

export function nextSortOrder(designs: { sort_order: number }[]) {
  return designs.reduce((max, d) => Math.max(max, d.sort_order), 0) + 1_000;
}
