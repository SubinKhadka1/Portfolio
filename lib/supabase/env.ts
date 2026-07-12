function hasEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "";
}

function isPlaceholderValue(value: string) {
  const v = value.trim().toLowerCase();
  return (
    v.includes("your_") ||
    v.includes("your-") ||
    v.includes("placeholder") ||
    v.includes("changeme") ||
    v === "xxx"
  );
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  return Boolean(
    url &&
    key &&
    url !== "https://your-project.supabase.co" &&
    !isPlaceholderValue(url) &&
    !isPlaceholderValue(key)
  );
}

export function isSupabaseStorageEnabled() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
