import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { reorderLocalProjects } from "@/lib/local-portfolio";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await request.json();
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    await reorderLocalProjects(items);
    return NextResponse.json({ success: true });
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    await reorderLocalProjects(items);
    return NextResponse.json({ success: true });
  }

  const updates = items.map((item: { id: string; sort_order: number }) =>
    supabase.from("projects").update({ sort_order: item.sort_order }).eq("id", item.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
