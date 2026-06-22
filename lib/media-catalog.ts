import { readJsonFile } from "@/lib/json-store";
import { listPublicMedia } from "@/lib/public-media";
import type { ProjectType } from "@/lib/types/database";

async function urlsFromPortfolio(type: ProjectType): Promise<string[]> {
  const store = await readJsonFile<Record<ProjectType, { media_url?: string }[]>>(
    "data/portfolio.json"
  );
  if (!store) return [];
  return (store[type] || [])
    .map((p) => p.media_url)
    .filter((url): url is string => Boolean(url));
}

/** All known media URLs for a type — filesystem + portfolio.json (works on Vercel too). */
export async function listMediaCatalog(type: ProjectType): Promise<string[]> {
  const [fromFs, fromData] = await Promise.all([
    listPublicMedia(type),
    urlsFromPortfolio(type),
  ]);
  return [...new Set([...fromFs, ...fromData])].sort((a, b) => a.localeCompare(b));
}
