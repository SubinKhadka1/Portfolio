import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
import { isVercelProduction } from "@/lib/storage-mode";

export type PersistenceStatus = {
  mode: "supabase" | "live-blocked" | "local";
  canSaveOnLive: boolean;
  message: string;
};

export function getPersistenceStatus(): PersistenceStatus {
  if (isSupabaseStorageEnabled()) {
    if (isVercelProduction()) {
      return {
        mode: "supabase",
        canSaveOnLive: true,
        message: "Live editing is enabled via Supabase Storage.",
      };
    }
    return {
      mode: "supabase",
      canSaveOnLive: true,
      message: "Supabase Storage is configured. Local data/ files are mirrored on save.",
    };
  }

  if (isVercelProduction()) {
    return {
      mode: "live-blocked",
      canSaveOnLive: false,
      message:
        "No live storage configured. Add Supabase env vars (including SUPABASE_SERVICE_ROLE_KEY) on Vercel.",
    };
  }

  return {
    mode: "local",
    canSaveOnLive: false,
    message:
      "You are on localhost. Changes save to data/*.json on this computer — not on your live website.",
  };
}
