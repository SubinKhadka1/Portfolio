import { get, head, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { markBlobWritesBlocked, isBlobWritesBlocked, getBlobBlockReason } from "@/lib/blob-state";
import { readGithubJson, writeGithubJson } from "@/lib/github-json-store";
import { readSupabaseJson, supabaseJsonExists, writeSupabaseJson } from "@/lib/supabase-json-store";
import {
  getJsonReadBackends,
  getJsonWriteBackends,
  type JsonStorageBackend,
} from "@/lib/storage-backends";
import { isBlobStorageEnabled } from "@/lib/storage-mode";

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
    return "Vercel Blob storage is suspended or over quota.";
  }

  return message || "Failed to save to Vercel Blob";
}

function isBlobSuspensionError(err: unknown) {
  const message = blobWriteErrorMessage(err);
  return /suspended|quota|usage limit/i.test(message);
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

async function readFromBackend<T>(backend: JsonStorageBackend, relativePath: string): Promise<T | null> {
  switch (backend) {
    case "blob": {
      for (let attempt = 0; attempt < 4; attempt++) {
        const data = await readBlobJson<T>(relativePath, attempt);
        if (data !== null) return data;
        if (attempt < 3) await sleep(150 * (attempt + 1));
      }
      return null;
    }
    case "supabase":
      return readSupabaseJson<T>(relativePath);
    case "github":
      return readGithubJson<T>(relativePath);
    case "disk":
      return readDiskJson<T>(relativePath);
    default:
      return null;
  }
}

async function writeToBackend<T>(backend: JsonStorageBackend, relativePath: string, data: T) {
  switch (backend) {
    case "blob": {
      const body = JSON.stringify(data, null, 2);
      await put(relativePath, body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 0,
      });
      return;
    }
    case "supabase":
      await writeSupabaseJson(relativePath, data);
      return;
    case "github":
      await writeGithubJson(relativePath, data);
      return;
    case "disk": {
      const fullPath = path.join(process.cwd(), relativePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, JSON.stringify(data, null, 2), "utf8");
      return;
    }
    default:
      throw new Error(`Unknown storage backend: ${backend}`);
  }
}

export async function readJsonFile<T>(relativePath: string): Promise<T | null> {
  const blobExists = await blobJsonExists(relativePath);
  const supabaseExists = await supabaseJsonExists(relativePath);
  const remoteExists = blobExists || supabaseExists;

  const backends = getJsonReadBackends(remoteExists);

  for (const backend of backends) {
    const data = await readFromBackend<T>(backend, relativePath);
    if (data !== null) return data;
  }

  // Last resort: bundled data/*.json from the deployment (read-only fallback).
  return readDiskJson<T>(relativePath);
}

export async function writeJsonFile<T>(relativePath: string, data: T): Promise<void> {
  const backends = getJsonWriteBackends();
  if (backends.length === 0) {
    throw new Error(
      "No live storage is configured. Add Supabase (SUPABASE_SERVICE_ROLE_KEY) or GitHub (GITHUB_TOKEN) on Vercel, or restore Vercel Blob."
    );
  }

  const errors: string[] = [];

  for (const backend of backends) {
    if (backend === "blob" && isBlobWritesBlocked()) continue;

    try {
      await writeToBackend(backend, relativePath, data);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      errors.push(`${backend}: ${message}`);
      if (backend === "blob" && isBlobSuspensionError(err)) {
        markBlobWritesBlocked(message);
      }
    }
  }

  throw new Error(
    errors.length
      ? `Could not save changes. ${errors.join(" · ")}`
      : "Could not save changes. Configure Supabase or GitHub storage on Vercel."
  );
}

/** Probe which remote backend can serve portfolio data right now. */
export async function probeJsonStorageHealth() {
  const path = "data/portfolio.json";
  const blobEnabled = isBlobStorageEnabled();
  let blobOk = false;
  let blobError = getBlobBlockReason();

  if (blobEnabled && !isBlobWritesBlocked()) {
    try {
      await head(path);
      blobOk = true;
    } catch (err) {
      blobError = blobWriteErrorMessage(err);
      if (isBlobSuspensionError(err)) markBlobWritesBlocked(blobError);
    }
  }

  const supabaseOk = Boolean(await readSupabaseJson(path));
  const githubOk = Boolean(await readGithubJson(path));

  let activeBackend: JsonStorageBackend | "none" = "none";
  if (blobOk && !isBlobWritesBlocked()) activeBackend = "blob";
  else if (supabaseOk) activeBackend = "supabase";
  else if (githubOk) activeBackend = "github";

  const canWrite =
    (blobEnabled && !isBlobWritesBlocked()) ||
    getJsonWriteBackends().some((b) => b !== "blob" && b !== "disk");

  return {
    blobEnabled,
    blobOk,
    blobSuspended: isBlobWritesBlocked() || /suspended/i.test(blobError),
    blobError,
    supabaseOk,
    githubOk,
    activeBackend,
    canWrite,
    writeBackends: getJsonWriteBackends().filter((b) => b !== "disk"),
  };
}
