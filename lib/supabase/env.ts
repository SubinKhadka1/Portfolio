import {
  getSupabaseAnonKey,
  getSupabaseProjectUrl,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/keys";

function isPlaceholderValue(value: string) {
  const v = value.trim().toLowerCase();
  return (
    v.includes("your_sb_") ||
    v.includes("your_") ||
    v.includes("your-") ||
    v.includes("placeholder") ||
    v.includes("changeme") ||
    v === "xxx"
  );
}

export function isSupabaseConfigured() {
  const url = getSupabaseProjectUrl();
  const key = getSupabaseAnonKey();
  return Boolean(
    url &&
    key &&
    url !== "https://your-project.supabase.co" &&
    !isPlaceholderValue(url) &&
    !isPlaceholderValue(key)
  );
}

export function isSupabaseStorageEnabled() {
  const serviceKey = getSupabaseServiceRoleKey();
  return (
    isSupabaseConfigured() &&
    Boolean(serviceKey) &&
    !isPlaceholderValue(serviceKey)
  );
}

/** Portfolio JSON (site-data bucket + local disk) instead of Supabase Postgres tables. */
export function usesJsonFileStore() {
  return !isSupabaseConfigured() || isSupabaseStorageEnabled();
}

export function getSupabaseEnv() {
  const url = getSupabaseProjectUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
