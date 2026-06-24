import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { reorderLocalHomepageDesigns } from "@/lib/design-modules-store";
import type { HomepageDesign } from "@/lib/types/database";
import { parseRequestJson } from "@/lib/parse-response";
import { revalidateLiveSite } from "@/lib/revalidate-site";

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    items?: { id: string; sort_order: number; metadata?: HomepageDesign["metadata"] }[];
  };
  try {
    body = await parseRequestJson<{
      items?: { id: string; sort_order: number; metadata?: HomepageDesign["metadata"] }[];
    }>(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const items = body.items ?? [];
  if (!items.length) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  try {
    await reorderLocalHomepageDesigns(items);
    revalidateLiveSite();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reorder homepage designs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
