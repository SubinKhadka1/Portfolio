import { head, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";

export async function readJsonFile<T>(relativePath: string): Promise<T | null> {
  if (isBlobStorageEnabled()) {
    try {
      const meta = await head(relativePath);
      if (meta?.url) {
        const res = await fetch(meta.url, { cache: "no-store" });
        if (res.ok) return (await res.json()) as T;
      }
    } catch {
      // fall through to bundled file
    }
  }

  try {
    const raw = await fs.readFile(path.join(process.cwd(), relativePath), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile<T>(relativePath: string, data: T): Promise<void> {
  const body = JSON.stringify(data, null, 2);

  if (isBlobStorageEnabled()) {
    await put(relativePath, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
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
