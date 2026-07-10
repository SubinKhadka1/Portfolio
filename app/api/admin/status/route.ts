import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/lib/persistence-status";
import { probeJsonStorageHealth } from "@/lib/json-store";
import {
  getBlobAuthMode,
  isBlobStorageEnabled,
  isVercelProduction,
} from "@/lib/storage-mode";
import { isGithubJsonEnabled, isSupabaseJsonEnabled } from "@/lib/storage-backends";

export async function GET() {
  const status = getPersistenceStatus();
  const health = await probeJsonStorageHealth();

  return NextResponse.json({
    ...status,
    ...health,
    vercel: isVercelProduction(),
    blob: isBlobStorageEnabled(),
    blobAuth: getBlobAuthMode(),
    supabaseJson: isSupabaseJsonEnabled(),
    githubJson: isGithubJsonEnabled(),
    canSaveOnLive: health.canWrite,
    message: health.canWrite
      ? health.blobSuspended
        ? `Vercel Blob is suspended — saving via ${health.activeBackend}.`
        : status.message
      : "Live admin cannot save. Add Supabase (free) or upgrade Vercel Blob.",
  });
}
