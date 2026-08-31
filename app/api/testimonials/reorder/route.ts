import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { reorderLocalTestimonials } from "@/lib/testimonials-store";
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

  let items: { id: string; sort_order: number }[];
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
    await reorderLocalTestimonials(items);
    revalidateLiveSite();
    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
