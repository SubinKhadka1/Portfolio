import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { reorderLocalProjects } from "@/lib/local-portfolio";
import type { ReorderItem } from "@/lib/reorder-payload";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { revalidateLiveSite } from "@/lib/revalidate-site";

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let items: ReorderItem[];
  try {
    const body = await request.json();
    if (!Array.isArray(body?.items)) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }
    items = body.items;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      await reorderLocalProjects(items);
      revalidateLiveSite();
      return NextResponse.json({ success: true });
    }

    const supabase = await tryCreateClient();
    if (!supabase) {
      await reorderLocalProjects(items);
      revalidateLiveSite();
      return NextResponse.json({ success: true });
    }

    for (const item of items) {
      const patch: { sort_order: number; metadata?: ReorderItem["metadata"] } = {
        sort_order: item.sort_order,
      };
      if (item.metadata) patch.metadata = item.metadata;

      const { error } = await supabase.from("projects").update(patch).eq("id", item.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    revalidateLiveSite();
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
