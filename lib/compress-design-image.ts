import {
  aspectRatioFromDimensions,
  DESIGN_CANVAS,
} from "@/lib/design-image";
import type { DesignAspectRatio } from "@/lib/design-image";

const COMPRESS_IF_OVER_BYTES = 2.5 * 1024 * 1024;

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

/** Fit image inside 1080×1080 or 1080×1350 canvas (contain, centered). */
function drawToCanvas(
  img: HTMLImageElement,
  aspectRatio: DesignAspectRatio
): HTMLCanvasElement {
  const { width: canvasW, height: canvasH } = DESIGN_CANVAS[aspectRatio];
  const scale = Math.min(canvasW / img.naturalWidth, canvasH / img.naturalHeight);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const x = Math.round((canvasW - w) / 2);
  const y = Math.round((canvasH - h) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.drawImage(img, x, y, w, h);
  return canvas;
}

/** Resize/compress large design uploads to exact 1080×1080 or 1080×1350. */
export async function prepareDesignUpload(file: File): Promise<{
  file: File;
  optimized: boolean;
  aspectRatio: DesignAspectRatio;
}> {
  if (!isImageFile(file)) {
    return { file, optimized: false, aspectRatio: "square" };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Could not read "${file.name}"`));
      el.src = objectUrl;
    });

    const aspectRatio = aspectRatioFromDimensions(img.naturalWidth, img.naturalHeight);
    const { width: canvasW, height: canvasH } = DESIGN_CANVAS[aspectRatio];
    const alreadySized =
      img.naturalWidth === canvasW &&
      img.naturalHeight === canvasH &&
      file.size <= COMPRESS_IF_OVER_BYTES;

    if (alreadySized) {
      return { file, optimized: false, aspectRatio };
    }

    const needsOptimize =
      file.size > COMPRESS_IF_OVER_BYTES ||
      img.naturalWidth !== canvasW ||
      img.naturalHeight !== canvasH;

    if (!needsOptimize) {
      return { file, optimized: false, aspectRatio };
    }

    const canvas = drawToCanvas(img, aspectRatio);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Image optimization failed"))),
        "image/jpeg",
        0.92
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/\s+/g, "-") || "design";
    const optimizedFile = new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: optimizedFile,
      optimized: true,
      aspectRatio,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
