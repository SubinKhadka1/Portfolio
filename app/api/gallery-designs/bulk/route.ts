import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  bulkUpdateLocalGalleryDesigns,
  deleteLocalGalleryDesigns,
} from "@/lib/design-modules-store";
import type { GalleryDesignInput } from "@/lib/types/database";
import { parseRequestJson } from "@/lib/parse-response";
import { revalidateLiveSite } from "@/lib/revalidate-site";

type BulkBody =
  | { action: "delete"; ids: string[] }
  | { action: "update"; ids: string[]; patch: Partial<GalleryDesignInput> };

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: BulkBody;
  try {
    body = await parseRequestJson<BulkBody>(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  if (body.ids.length > 100) {
    return NextResponse.json({ error: "Maximum 100 designs per bulk action" }, { status: 400 });
  }

  if (body.action === "delete") {
    const deleted = await deleteLocalGalleryDesigns(body.ids);
    revalidateLiveSite();
    return NextResponse.json({ deleted });
  }

  if (body.action === "update") {
    const updated = await bulkUpdateLocalGalleryDesigns(body.ids, body.patch);
    revalidateLiveSite();
    return NextResponse.json({ updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
