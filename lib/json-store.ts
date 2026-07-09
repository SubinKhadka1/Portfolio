import { get, head, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { isNextBuildPhase } from "@/lib/is-build-time";
import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function blobWriteErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.constructor.name : "";
  const message = err instanceof Error ? err.message : String(err);

  if (
    name === "BlobStoreSuspendedError" ||
    /suspended|quota|usage limit|rate limit/i.test(message)
  ) {
    return "Vercel Blob storage is unavailable (usage limit or suspended store). Upgrade your Vercel plan or wait for usage to reset, then try again.";
  }

  return message || "Failed to save to Vercel Blob";
}

async function readDiskJson<T>(relativePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), relativePath), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readBlobViaHead<T>(relativePath: string, attempt: number): Promise<T | null> {
  const meta = await head(relativePath);
  if (!meta?.url) return null;

  const url = new URL(meta.url);
  url.searchParams.set("_", `${Date.now()}-${attempt}`);

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache, no-store" },
  });
  if (!res.ok) return null;

  const text = await res.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as T;
}

async function readBlobViaGet<T>(relativePath: string): Promise<T | null> {
  const result = await get(relativePath, { access: "public" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;

  const text = await new Response(result.stream).text();
  if (!text.trim()) return null;
  return JSON.parse(text) as T;
}

async function readBlobJson<T>(relativePath: string, attempt: number): Promise<T | null> {
  try {
    return await readBlobViaHead<T>(relativePath, attempt);
  } catch {
    try {
      return await readBlobViaGet<T>(relativePath);
    } catch {
      return null;
    }
  }
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
    const blobExists = await blobJsonExists(relativePath);

    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const data = await readBlobJson<T>(relativePath, attempt);
        if (data !== null) return data;
      } catch {
        // retry
      }
      if (attempt < 7) await sleep(200 * (attempt + 1));
    }

    // Never serve the Git bundle when live Blob already has this file — that would
    // undo admin edits (deletes, reorders, new uploads) with stale deploy data.
    if (blobExists && isVercelProduction() && !isNextBuildPhase()) {
      return null;
    }
  }

  return readDiskJson<T>(relativePath);
}

export async function writeJsonFile<T>(relativePath: string, data: T): Promise<void> {
  const body = JSON.stringify(data, null, 2);

  if (isBlobStorageEnabled()) {
    try {
      await put(relativePath, body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 0,
      });
    } catch (err) {
      throw new Error(blobWriteErrorMessage(err));
    }
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
