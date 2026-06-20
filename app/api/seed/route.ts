import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryCreateClient } from "@/lib/supabase/server";
import { seedPortfolioIfEmpty } from "@/lib/seed";
import type { ProjectType } from "@/lib/types/database";

export async function POST(request: Request) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      success: true,
      seeded: 0,
      message: "Using local storage — portfolio already loaded from your files.",
    });
  }

  const body = await request.json().catch(() => ({}));
  const type = body.type as ProjectType | undefined;

  const supabase =
    process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? createAdminClient()
      : await tryCreateClient();

  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const seeded = await seedPortfolioIfEmpty(supabase, type);

  return NextResponse.json({ success: true, seeded });
}
