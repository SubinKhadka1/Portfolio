import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseJsonEnabled } from "@/lib/storage-backends";

const SITE_DATA_BUCKET = "site-data";

export function supabaseJsonPath(relativePath: string) {
  return relativePath.replace(/^\/+/, "");
}

export async function readSupabaseJson<T>(relativePath: string): Promise<T | null> {
  if (!isSupabaseJsonEnabled()) return null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(SITE_DATA_BUCKET)
      .download(supabaseJsonPath(relativePath));

    if (error || !data) return null;
    const text = await data.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeSupabaseJson<T>(relativePath: string, value: T): Promise<void> {
  if (!isSupabaseJsonEnabled()) {
    throw new Error("Supabase storage is not configured.");
  }

  const supabase = createAdminClient();
  const body = JSON.stringify(value, null, 2);
  const path = supabaseJsonPath(relativePath);

  const upload = await supabase.storage.from(SITE_DATA_BUCKET).upload(path, body, {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });

  if (upload.error) {
    const message = upload.error.message || "Supabase storage upload failed";
    if (/bucket not found|does not exist/i.test(message)) {
      throw new Error(
        `Create a public Supabase Storage bucket named "${SITE_DATA_BUCKET}" (Dashboard → Storage), then try again.`
      );
    }
    throw new Error(message);
  }
}

export async function supabaseJsonExists(relativePath: string): Promise<boolean> {
  if (!isSupabaseJsonEnabled()) return false;

  try {
    const supabase = createAdminClient();
    const path = supabaseJsonPath(relativePath);
    const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    const name = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
    const { data, error } = await supabase.storage.from(SITE_DATA_BUCKET).list(folder, {
      search: name,
      limit: 1,
    });
    if (error) return false;
    return Boolean(data?.some((item) => item.name === name));
  } catch {
    return false;
  }
}
