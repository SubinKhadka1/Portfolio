import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
import {
  downloadStorageObject,
  publicStorageUrl,
  storageObjectExists,
  uploadStorageObject,
} from "@/lib/supabase/storage-rest";

export const SITE_DATA_BUCKET = "site-data";

export function supabaseJsonPath(relativePath: string) {
  return relativePath.replace(/^\/+/, "");
}

export async function readSupabaseJson<T>(relativePath: string): Promise<T | null> {
  if (!isSupabaseStorageEnabled()) return null;

  try {
    const text = await downloadStorageObject(SITE_DATA_BUCKET, supabaseJsonPath(relativePath));
    if (!text?.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeSupabaseJson<T>(relativePath: string, value: T): Promise<void> {
  if (!isSupabaseStorageEnabled()) {
    throw new Error("Supabase Storage is not configured.");
  }

  const body = JSON.stringify(value, null, 2);
  const objectPath = supabaseJsonPath(relativePath);

  try {
    await uploadStorageObject(SITE_DATA_BUCKET, objectPath, body, {
      upsert: true,
      contentType: "application/json",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Supabase storage upload failed";
    if (/bucket not found|does not exist/i.test(message)) {
      throw new Error(
        `Create a public Supabase Storage bucket named "${SITE_DATA_BUCKET}" (Dashboard → Storage), then try again.`
      );
    }
    throw err;
  }
}

export async function supabaseJsonExists(relativePath: string): Promise<boolean> {
  if (!isSupabaseStorageEnabled()) return false;

  try {
    return await storageObjectExists(SITE_DATA_BUCKET, supabaseJsonPath(relativePath));
  } catch {
    return false;
  }
}

export { publicStorageUrl };
