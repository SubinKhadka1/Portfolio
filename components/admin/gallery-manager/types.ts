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
  small: 160,
  medium: 240,
  large: 320,
};

export const ZOOM_MIN = 120;
export const ZOOM_MAX = 400;

export function zoomToColumnWidth(zoom: number) {
  const t = Math.min(100, Math.max(0, zoom)) / 100;
  return Math.round(ZOOM_MIN + t * (ZOOM_MAX - ZOOM_MIN));
}

export function zoomToRowHeights(zoom: number) {
  const t = Math.min(100, Math.max(0, zoom)) / 100;
  return {
    minHeight: Math.round(70 + t * 100),
    maxHeight: Math.round(180 + t * 420),
    gap: 4,
  };
}

export function gridSizeToZoom(size: GridSize) {
  if (size === "small") return 25;
  if (size === "large") return 85;
  return 55;
}

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
  return (
    file.type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "svg"].includes(ext)
  );
}

export function nextSortOrder(designs: { sort_order: number }[]) {
  return designs.reduce((max, d) => Math.max(max, d.sort_order), 0) + 1_000;
}
