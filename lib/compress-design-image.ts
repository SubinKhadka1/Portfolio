import {
  aspectRatioFromDimensions,
  DESIGN_CANVAS,
} from "@/lib/design-image";
import type { DesignAspectRatio } from "@/lib/design-image";

const COMPRESS_IF_OVER_BYTES = 2.5 * 1024 * 1024;
const GALLERY_MAX_EDGE_PX = 2400;

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
    const img = await loadImageFromFile(file, objectUrl);
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

    const blob = await canvasToJpegBlob(canvas);

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

async function loadImageFromFile(file: File, objectUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`Could not read "${file.name}"`));
    el.src = objectUrl;
  });
}

function isPngFile(file: File) {
  return file.type === "image/png" || /\.png$/i.test(file.name);
}

function canvasToJpegBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Image optimization failed"))),
      "image/jpeg",
      0.92
    );
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Image optimization failed"))),
      "image/png"
    );
  });
}

/** Gallery uploads keep the design's real aspect ratio — no white letterboxing. */
export async function prepareGalleryDesignUpload(file: File): Promise<{
  file: File;
  optimized: boolean;
  width: number;
  height: number;
  aspectRatio: DesignAspectRatio;
}> {
  if (!isImageFile(file)) {
    return { file, optimized: false, width: 1080, height: 1080, aspectRatio: "square" };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImageFromFile(file, objectUrl);
    const aspectRatio = aspectRatioFromDimensions(img.naturalWidth, img.naturalHeight);
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const maxEdge = Math.max(width, height);

    if (maxEdge > GALLERY_MAX_EDGE_PX) {
      const scale = GALLERY_MAX_EDGE_PX / maxEdge;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const needsResize = width !== img.naturalWidth || height !== img.naturalHeight;
    const needsCompress = file.size > COMPRESS_IF_OVER_BYTES;

    if (!needsResize && !needsCompress) {
      return {
        file,
        optimized: false,
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio,
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare image");

    const keepPng = isPngFile(file);
    if (!keepPng) {
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/\s+/g, "-") || "design";
    const blob = keepPng ? await canvasToPngBlob(canvas) : await canvasToJpegBlob(canvas);
    const optimizedFile = new File([blob], `${baseName}.${keepPng ? "png" : "jpg"}`, {
      type: keepPng ? "image/png" : "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: optimizedFile,
      optimized: true,
      width,
      height,
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
