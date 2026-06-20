import { promises as fs } from "fs";
import path from "path";
import type { ProjectType } from "@/lib/types/database";

const PUBLIC_DIRS: Record<ProjectType, string> = {
  design: "designs",
  video: "videos",
  client: "logos",
};

const MEDIA_EXTENSIONS: Record<ProjectType, string[]> = {
  design: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  video: [".mp4", ".webm", ".mov"],
  client: [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"],
};

const DEFAULT_EXTENSIONS: Record<ProjectType, string> = {
  design: ".jpg",
  video: ".mp4",
  client: ".png",
};

const MAX_BYTES: Record<ProjectType, number> = {
  design: 100 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  client: 30 * 1024 * 1024,
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function validateMediaFile(type: ProjectType, file: File): string | null {
  const max = MAX_BYTES[type];
  if (file.size > max) {
    const mb = Math.round(max / (1024 * 1024));
    return `"${file.name}" is too large (${formatBytes(file.size)}). Max ${mb}MB — for designs, try JPG instead of PNG or re-export at 1080px.`;
  }

  const ext = path.extname(file.name).toLowerCase();
  const allowed = MEDIA_EXTENSIONS[type];

  if (ext && allowed.includes(ext)) return null;

  const mime = file.type.toLowerCase();
  if (type === "design" && mime.startsWith("image/")) return null;
  if (type === "client" && (mime.startsWith("image/") || mime.includes("svg"))) return null;
  if (type === "video" && mime.startsWith("video/")) return null;

  return `"${file.name}" is not a supported ${type} file. Use ${allowed.join(", ")}.`;
}

function buildUniqueFilename(type: ProjectType, originalName: string) {
  const extFromName = path.extname(originalName).toLowerCase();
  const ext = MEDIA_EXTENSIONS[type].includes(extFromName)
    ? extFromName
    : DEFAULT_EXTENSIONS[type];

  const base = path
    .basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);

  const safeBase = (base || "upload").replace(/\s+/g, "-");
  return `${Date.now()}-${safeBase}${ext}`;
}

export async function listPublicMedia(type: ProjectType): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", PUBLIC_DIRS[type]);

  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => !f.startsWith(".") && MEDIA_EXTENSIONS[type].includes(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((f) => `/${PUBLIC_DIRS[type]}/${f}`);
  } catch {
    return [];
  }
}

/** Public URL for a saved file */
export function publicMediaUrl(type: ProjectType, filename: string) {
  return `/${PUBLIC_DIRS[type]}/${filename}`;
}

export async function savePublicMedia(
  type: ProjectType,
  file: File
): Promise<{ url: string; filename: string }> {
  const validationError = validateMediaFile(type, file);
  if (validationError) throw new Error(validationError);

  const dir = path.join(process.cwd(), "public", PUBLIC_DIRS[type]);
  await fs.mkdir(dir, { recursive: true });

  const filename = buildUniqueFilename(type, file.name);
  const filepath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  return {
    url: publicMediaUrl(type, filename),
    filename,
  };
}
