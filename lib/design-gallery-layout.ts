export const GALLERY_ROW_GAP_PX = 4;
export const GALLERY_MIN_ROW_HEIGHT = 100;
export const GALLERY_MAX_ROW_HEIGHT = 520;
export const GALLERY_MOBILE_MAX_WIDTH = 540;
/** Wide designs (tickets, horizontal strips) span a full row on mobile. */
export const GALLERY_MOBILE_LANDSCAPE_RATIO = 1.85;
/** On mobile, only group designs with similar proportions in the same row. */
export const GALLERY_MOBILE_ASPECT_TOLERANCE = 0.36;

export type GalleryPackOptions = {
  gap: number;
  minHeight: number;
  maxHeight: number;
  mobilePacking?: boolean;
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
  const ar = item.aspectRatio ?? item.metadata?.aspectRatio;

  if (w && h && w > 0 && h > 0) {
    const ratio = w / h;
    if (Math.abs(ratio - 1) < 0.04) {
      if (ar === "portrait") return 1080 / 1350;
      if (ar === "square") return 1;
    }
    return ratio;
  }

  if (ar === "portrait") return 1080 / 1350;
  return 1;
}

export function isGalleryLandscape(item: GalleryAspectSource): boolean {
  return galleryWidthOverHeight(item) >= GALLERY_MOBILE_LANDSCAPE_RATIO;
}

function rowAspectAverage(row: GalleryAspectSource[]): number {
  if (row.length === 0) return 1;
  return row.reduce((sum, item) => sum + galleryWidthOverHeight(item), 0) / row.length;
}

/** True when the next design is close enough in shape to share a mobile row. */
export function aspectFitsRow(row: GalleryAspectSource[], next: GalleryAspectSource): boolean {
  const nextRatio = galleryWidthOverHeight(next);
  const avg = rowAspectAverage(row);
  const spread = Math.abs(nextRatio - avg) / Math.max(avg, 0.01);
  return spread <= GALLERY_MOBILE_ASPECT_TOLERANCE;
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

function pushPackedRow<T extends GalleryAspectSource>(
  rows: T[][],
  heights: number[],
  row: T[],
  containerWidth: number,
  gap: number,
  maxHeight: number
) {
  let height = galleryRowHeight(row, containerWidth, gap);
  height = Math.min(height, maxHeight);
  rows.push(row);
  heights.push(height);
}

/**
 * Pack designs into justified rows (Behance / Google Photos style).
 * On mobile: group similar shapes together, keep wide landscapes on their own row,
 * and let row height limits decide how many fit (e.g. 3–4 square flyers, 4 tall menus).
 */
export function packGalleryRows<T extends GalleryAspectSource>(
  items: T[],
  containerWidth: number,
  options?: GalleryPackOptions
): { rows: T[][]; heights: number[] } {
  const gap = options?.gap ?? GALLERY_ROW_GAP_PX;
  const minHeight = options?.minHeight ?? GALLERY_MIN_ROW_HEIGHT;
  const maxHeight = options?.maxHeight ?? GALLERY_MAX_ROW_HEIGHT;
  const mobilePacking =
    options?.mobilePacking !== false && containerWidth < GALLERY_MOBILE_MAX_WIDTH;

  if (items.length === 0 || containerWidth <= 0) {
    return { rows: [], heights: [] };
  }

  const rows: T[][] = [];
  const heights: number[] = [];
  let index = 0;

  while (index < items.length) {
    let row: T[] = [items[index]];
    index += 1;

    if (mobilePacking && isGalleryLandscape(row[0])) {
      pushPackedRow(rows, heights, row, containerWidth, gap, maxHeight);
      continue;
    }

    while (index < items.length) {
      const next = items[index];

      if (mobilePacking) {
        if (isGalleryLandscape(next)) break;
        if (!aspectFitsRow(row, next)) break;
      }

      const candidate = [...row, next];
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

    pushPackedRow(rows, heights, row, containerWidth, gap, maxHeight);
  }

  return { rows, heights };
}

export function galleryCardWidth(height: number, item: GalleryAspectSource): number {
  return height * galleryWidthOverHeight(item);
}

/** Responsive row packing tuned for phone, tablet, and desktop. */
export function getGalleryPackOptionsForWidth(width: number): GalleryPackOptions {
  if (width < GALLERY_MOBILE_MAX_WIDTH) {
    return { gap: 4, minHeight: 86, maxHeight: 300, mobilePacking: true };
  }
  if (width < 768) {
    return { gap: 4, minHeight: 110, maxHeight: 380, mobilePacking: false };
  }
  if (width < 1024) {
    return { gap: 4, minHeight: 100, maxHeight: 440, mobilePacking: false };
  }
  return {
    gap: GALLERY_ROW_GAP_PX,
    minHeight: GALLERY_MIN_ROW_HEIGHT,
    maxHeight: GALLERY_MAX_ROW_HEIGHT,
    mobilePacking: false,
  };
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
