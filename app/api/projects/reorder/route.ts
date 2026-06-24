import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { reorderLocalProjects } from "@/lib/local-portfolio";
import type { ReorderItem, ReorderScope } from "@/lib/reorder-payload";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { revalidateLiveSite } from "@/lib/revalidate-site";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let items: ReorderItem[];
  let scope: ReorderScope = "default";
  try {
    const body = await request.json();
    if (!Array.isArray(body?.items)) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }
    items = body.items;
    if (body.scope === "homepage") scope = "homepage";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      await reorderLocalProjects(items, scope);
      revalidateLiveSite();
      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    const supabase = await tryCreateClient();
    if (!supabase) {
      await reorderLocalProjects(items, scope);
      revalidateLiveSite();
      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    for (const item of items) {
      const patch: { sort_order?: number; metadata?: ReorderItem["metadata"] } = {};
      if (scope === "default" && item.sort_order !== undefined) {
        patch.sort_order = item.sort_order;
      }
      if (item.metadata) patch.metadata = item.metadata;
      if (Object.keys(patch).length === 0) continue;

      const { error } = await supabase.from("projects").update(patch).eq("id", item.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    revalidateLiveSite();
    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
