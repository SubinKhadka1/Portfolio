import { isSupabaseStorageEnabled } from "@/lib/supabase/env";

export { isSupabaseStorageEnabled } from "@/lib/supabase/env";

export function isVercelProduction() {
  return process.env.VERCEL === "1";
}

/** True when admin edits can persist outside the read-only deploy bundle. */
export function isRemotePersistenceEnabled() {
  return isSupabaseStorageEnabled();
}
