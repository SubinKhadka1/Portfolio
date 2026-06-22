import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type PersistenceStatus = {
  mode: "supabase" | "live-blob" | "live-blocked" | "local";
  canSaveOnLive: boolean;
  message: string;
};

export function getPersistenceStatus(): PersistenceStatus {
  if (isSupabaseConfigured()) {
    return {
      mode: "supabase",
      canSaveOnLive: true,
      message: "Cloud database (Supabase) is active.",
    };
  }

  if (isVercelProduction()) {
    if (isBlobStorageEnabled()) {
      return {
        mode: "live-blob",
        canSaveOnLive: true,
        message: "Live editing is enabled via Vercel Blob.",
      };
    }
    return {
      mode: "live-blocked",
      canSaveOnLive: false,
      message:
        "Vercel Blob is not connected. Live admin cannot save changes until you create a Blob store and redeploy.",
    };
  }

  return {
    mode: "local",
    canSaveOnLive: false,
    message:
      "You are on localhost. Changes save on this computer only — not on your live website.",
  };
}
