import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseAnonKey, getSupabaseProjectUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/keys";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  if (!isSupabaseConfigured() || !getSupabaseServiceRoleKey()) {
    throw new Error("Supabase admin client not configured");
  }

  return createClient(getSupabaseProjectUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Client for auth/session routes that need the anon key. */
export function createAnonAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  return createClient(getSupabaseProjectUrl(), getSupabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
