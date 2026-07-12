import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/lib/persistence-status";
import { probeJsonStorageHealth } from "@/lib/json-store";
import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
import { validateSupabaseKeys } from "@/lib/supabase/keys";
import { isVercelProduction } from "@/lib/storage-mode";

export async function GET() {
  const status = getPersistenceStatus();
  const health = await probeJsonStorageHealth();
  const keyIssues = validateSupabaseKeys();

  const needsSeed = health.supabaseEnabled && !health.supabaseOk;

  return NextResponse.json({
    ...status,
    ...health,
    keyIssues,
    vercel: isVercelProduction(),
    supabaseStorage: isSupabaseStorageEnabled(),
    canSaveOnLive: health.canWrite && keyIssues.length === 0,
    message:
      keyIssues.length > 0
        ? keyIssues.map((i) => `${i.field}: ${i.message}`).join(" ")
        : !health.canWrite
          ? "Live admin cannot save. Add Supabase Storage env vars on Vercel."
          : needsSeed
            ? `Supabase connected — seed site-data with portfolio.json if the homepage looks empty. (${health.supabaseError || "not found"})`
            : status.message,
  });
}
