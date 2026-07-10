import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isGithubJsonEnabled, isSupabaseJsonEnabled } from "@/lib/storage-backends";

export type PersistenceStatus = {
  mode: "supabase" | "live-blob" | "live-fallback" | "live-blocked" | "local";
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
      if (isSupabaseJsonEnabled() || isGithubJsonEnabled()) {
        return {
          mode: "live-fallback",
          canSaveOnLive: true,
          message: "Live editing via Vercel Blob with Supabase/GitHub backup.",
        };
      }
      return {
        mode: "live-blob",
        canSaveOnLive: true,
        message: "Live editing is enabled via Vercel Blob.",
      };
    }

    if (isSupabaseJsonEnabled() || isGithubJsonEnabled()) {
      return {
        mode: "live-fallback",
        canSaveOnLive: true,
        message: "Live editing via Supabase/GitHub storage.",
      };
    }

    return {
      mode: "live-blocked",
      canSaveOnLive: false,
      message:
        "No live storage configured. Add Vercel Blob, Supabase, or GITHUB_TOKEN on Vercel.",
    };
  }

  return {
    mode: "local",
    canSaveOnLive: false,
    message:
      "You are on localhost. Changes save on this computer only — not on your live website.",
  };
}
