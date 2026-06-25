export const GALLERY_ROW_GAP_PX = 8;
export const GALLERY_MIN_ROW_HEIGHT = 120;
export const GALLERY_MAX_ROW_HEIGHT = 480;

export type GalleryAspectSource = {
  imageWidth?: number;
  imageHeight?: number;
  aspectRatio?: "square" | "portrait";
  metadata?: {
    imageWidth?: number;
    imageHeight?: number;
    aspectRatio?: "square" | "portrait";
  };
};

/** Width ÷ height — drives justified row sizing. */
export function galleryWidthOverHeight(item: GalleryAspectSource): number {
  const w = item.imageWidth ?? item.metadata?.imageWidth;
  const h = item.imageHeight ?? item.metadata?.imageHeight;
  if (w && h && w > 0 && h > 0) return w / h;

  const ar = item.aspectRatio ?? item.metadata?.aspectRatio;
  if (ar === "portrait") return 1080 / 1350;
  return 1;
}

export function galleryRowHeight(
  items: GalleryAspectSource[],
  containerWidth: number,
  gap = GALLERY_ROW_GAP_PX
): number {
  if (items.length === 0) return GALLERY_MIN_ROW_HEIGHT;
  const totalRatio = items.reduce((sum, item) => sum + galleryWidthOverHeight(item), 0);
  const gaps = Math.max(0, items.length - 1) * gap;
  return (containerWidth - gaps) / totalRatio;
}

/**
 * Pack designs into rows that share a row height (like Google Photos / Behance).
 * Portrait, landscape, square, and extreme ratios sit side-by-side at natural proportions.
 */
export function packGalleryRows<T extends GalleryAspectSource>(
  items: T[],
  containerWidth: number,
  options?: {
    gap?: number;
    minHeight?: number;
    maxHeight?: number;
  }
): { rows: T[][]; heights: number[] } {
  const gap = options?.gap ?? GALLERY_ROW_GAP_PX;
  const minHeight = options?.minHeight ?? GALLERY_MIN_ROW_HEIGHT;
  const maxHeight = options?.maxHeight ?? GALLERY_MAX_ROW_HEIGHT;

  if (items.length === 0 || containerWidth <= 0) {
    return { rows: [], heights: [] };
  }

  const rows: T[][] = [];
  const heights: number[] = [];
  let index = 0;

  while (index < items.length) {
    let row: T[] = [items[index]];
    index += 1;

    while (index < items.length) {
      const candidate = [...row, items[index]];
      const height = galleryRowHeight(candidate, containerWidth, gap);

      if (height < minHeight) break;

      row = candidate;
      index += 1;

      const lastRatio = galleryWidthOverHeight(row[row.length - 1]);
      if (lastRatio >= 2.35 || lastRatio <= 0.38) break;
    }

    while (row.length > 1 && galleryRowHeight(row, containerWidth, gap) > maxHeight) {
      index -= 1;
      row.pop();
    }

    let height = galleryRowHeight(row, containerWidth, gap);
    height = Math.min(height, maxHeight);
    rows.push(row);
    heights.push(height);
  }

  return { rows, heights };
}

export function galleryCardWidth(height: number, item: GalleryAspectSource): number {
  return height * galleryWidthOverHeight(item);
}
