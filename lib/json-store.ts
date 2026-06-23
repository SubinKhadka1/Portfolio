import { head, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readDiskJson<T>(relativePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), relativePath), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readBlobJson<T>(relativePath: string, attempt: number): Promise<T | null> {
  const meta = await head(relativePath);
  if (!meta?.url) return null;

  const url = new URL(meta.url);
  url.searchParams.set("_", `${Date.now()}-${attempt}`);

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache, no-store" },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function blobJsonExists(relativePath: string): Promise<boolean> {
  if (!isBlobStorageEnabled()) return false;
  try {
    await head(relativePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(relativePath: string): Promise<T | null> {
  if (isBlobStorageEnabled()) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const data = await readBlobJson<T>(relativePath, attempt);
        if (data !== null) return data;
      } catch {
        // retry
      }
      if (attempt < 3) await sleep(100 * (attempt + 1));
    }

    // Never use the read-only Git bundle on live Vercel when Blob is the source of truth.
    if (isVercelProduction()) return null;
  }

  return readDiskJson<T>(relativePath);
}

export async function writeJsonFile<T>(relativePath: string, data: T): Promise<void> {
  const body = JSON.stringify(data, null, 2);

  if (isBlobStorageEnabled()) {
    await put(relativePath, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    });
    return;
  }

  if (isVercelProduction()) {
    throw new Error(
      "Live admin edits need Vercel Blob storage. Open Vercel → Storage → Create Blob store → Redeploy."
    );
  }

  const fullPath = path.join(process.cwd(), relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, body, "utf8");
}
