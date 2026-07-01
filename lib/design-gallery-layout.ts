export const GALLERY_ROW_GAP_PX = 4;
export const GALLERY_MIN_ROW_HEIGHT = 100;
export const GALLERY_MAX_ROW_HEIGHT = 520;
/** Below this width the public gallery stacks designs full-width by aspect ratio. */
export const GALLERY_STACK_MAX_WIDTH = 540;

export type GalleryPackOptions = {
  gap: number;
  minHeight: number;
  maxHeight: number;
};

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

/** Responsive row packing tuned for phone, tablet, and desktop. */
export function getGalleryPackOptionsForWidth(width: number): GalleryPackOptions {
  if (width < 360) {
    return { gap: 3, minHeight: 112, maxHeight: 260 };
  }
  if (width < GALLERY_STACK_MAX_WIDTH) {
    return { gap: 3, minHeight: 124, maxHeight: 340 };
  }
  if (width < 768) {
    return { gap: 4, minHeight: 128, maxHeight: 380 };
  }
  if (width < 1024) {
    return { gap: 4, minHeight: 108, maxHeight: 440 };
  }
  return { gap: GALLERY_ROW_GAP_PX, minHeight: GALLERY_MIN_ROW_HEIGHT, maxHeight: GALLERY_MAX_ROW_HEIGHT };
}

export function shouldStackGallery(
  width: number,
  stackMode: boolean | "auto" = "auto"
): boolean {
  if (stackMode === false) return false;
  if (stackMode === true) return true;
  return width > 0 && width < GALLERY_STACK_MAX_WIDTH;
}

/** Row cell widths that fill the container (last cell absorbs rounding slack). */
export function computeJustifiedRow<T extends GalleryAspectSource>(
  row: T[],
  containerWidth: number,
  gap: number,
  maxHeight: number
): { height: number; cellWidths: number[] } {
  const gaps = Math.max(0, row.length - 1) * gap;
  const totalRatio = row.reduce((sum, item) => sum + galleryWidthOverHeight(item), 0);
  let height = totalRatio > 0 ? (containerWidth - gaps) / totalRatio : GALLERY_MIN_ROW_HEIGHT;
  height = Math.min(height, maxHeight);

  const cellWidths = row.map((item) => height * galleryWidthOverHeight(item));
  const used = cellWidths.reduce((sum, w) => sum + w, 0) + gaps;
  const leftover = containerWidth - used;
  if (leftover > 0.5 && cellWidths.length > 0) {
    cellWidths[cellWidths.length - 1] += leftover;
  }

  return { height, cellWidths };
}
