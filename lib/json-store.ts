import { promises as fs } from "fs";
import path from "path";
import {
  readSupabaseJson,
  supabaseJsonExists,
  writeSupabaseJson,
} from "@/lib/supabase-json-store";
import { formatSupabaseKeyError } from "@/lib/supabase/keys";
import { isSupabaseStorageEnabled, isVercelProduction } from "@/lib/storage-mode";

async function readDiskJson<T>(relativePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), relativePath), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeDiskJson<T>(relativePath: string, data: T): Promise<void> {
  const fullPath = path.join(process.cwd(), relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2), "utf8");
}

export async function readJsonFile<T>(relativePath: string): Promise<T | null> {
  if (isSupabaseStorageEnabled()) {
    try {
      const remote = await readSupabaseJson<T>(relativePath);
      if (remote !== null) return remote;
    } catch (err) {
      console.error(`[json-store] Supabase read failed for ${relativePath}:`, err);
    }
  }

  return readDiskJson<T>(relativePath);
}

export async function writeJsonFile<T>(relativePath: string, data: T): Promise<void> {
  if (isSupabaseStorageEnabled()) {
    try {
      await writeSupabaseJson(relativePath, data);
      if (!isVercelProduction()) {
        try {
          await writeDiskJson(relativePath, data);
        } catch {
          // Local mirror is best-effort during development.
        }
      }
      return;
    } catch (err) {
      const message = formatSupabaseKeyError(err);
      if (isVercelProduction()) {
        throw new Error(`Could not save to Supabase: ${message}`);
      }
      console.error(`[json-store] Supabase write failed for ${relativePath}:`, message);
    }
  }

  if (isVercelProduction()) {
    throw new Error(
      "Supabase Storage is not configured on Vercel. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY (service role secret, not the anon key), then redeploy."
    );
  }

  await writeDiskJson(relativePath, data);
}

/** Probe whether portfolio JSON is reachable from Supabase or bundled disk. */
export async function probeJsonStorageHealth() {
  const portfolioPath = "data/portfolio.json";
  const supabaseEnabled = isSupabaseStorageEnabled();
  let supabaseOk = false;
  let supabaseError = "";

  if (supabaseEnabled) {
    try {
      supabaseOk = Boolean(await readSupabaseJson(portfolioPath));
      if (!supabaseOk) {
        const exists = await supabaseJsonExists(portfolioPath);
        supabaseError = exists ? "Could not parse portfolio.json from Supabase." : "portfolio.json not found in site-data bucket.";
      }
    } catch (err) {
      supabaseError = err instanceof Error ? err.message : "Supabase unavailable";
    }
  }

  const diskOk = Boolean(await readDiskJson(portfolioPath));
  const activeBackend = supabaseOk ? "supabase" : diskOk ? "disk" : "none";
  const canWrite = supabaseEnabled || !isVercelProduction();

  return {
    supabaseEnabled,
    supabaseOk,
    supabaseError,
    diskOk,
    activeBackend,
    canWrite,
    writeBackends: supabaseEnabled ? ["supabase"] : isVercelProduction() ? [] : ["disk"],
  };
}
