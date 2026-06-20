/** 1080×1080 vs 1080×1350 (4:5) */
export const SQUARE_RATIO = 1;
export const PORTRAIT_RATIO = 1350 / 1080;
export const DESIGN_CANVAS = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
} as const;

export function aspectRatioFromDimensions(width: number, height: number): "square" | "portrait" {
  if (width <= 0 || height <= 0) return "square";

  const ratio = height / width;
  const distSquare = Math.abs(ratio - SQUARE_RATIO);
  const distPortrait = Math.abs(ratio - PORTRAIT_RATIO);

  if (distPortrait < distSquare && ratio >= 1.1) return "portrait";
  if (ratio >= 1.18) return "portrait";
  return "square";
}

export function detectDesignAspectRatioFromUrl(url: string): Promise<"square" | "portrait"> {
  if (typeof window === "undefined") return Promise.resolve("square");

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(aspectRatioFromDimensions(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => resolve("square");
    img.src = url;
  });
}

export function formatLabel(aspectRatio: "square" | "portrait") {
  return aspectRatio === "portrait" ? "1080 × 1350" : "1080 × 1080";
}

export type DesignAspectRatio = "square" | "portrait";
