import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/lib/persistence-status";
import { probeJsonStorageHealth } from "@/lib/json-store";
import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
import { isVercelProduction } from "@/lib/storage-mode";

export async function GET() {
  const status = getPersistenceStatus();
  const health = await probeJsonStorageHealth();

  const needsSeed = health.supabaseEnabled && !health.supabaseOk;

  return NextResponse.json({
    ...status,
    ...health,
    vercel: isVercelProduction(),
    supabaseStorage: isSupabaseStorageEnabled(),
    canSaveOnLive: health.canWrite,
    message: !health.canWrite
      ? "Live admin cannot save. Add Supabase Storage env vars on Vercel."
      : needsSeed
        ? `Supabase connected — seed site-data with portfolio.json if the homepage looks empty. (${health.supabaseError || "not found"})`
        : status.message,
  });
}
