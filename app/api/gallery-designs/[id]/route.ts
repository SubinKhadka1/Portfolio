import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  deleteLocalGalleryDesign,
  getLocalGalleryDesign,
  updateLocalGalleryDesign,
} from "@/lib/design-modules-store";
import type { GalleryDesignInput } from "@/lib/types/database";
import { parseRequestJson } from "@/lib/parse-response";
import { revalidateLiveSite } from "@/lib/revalidate-site";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const design = await getLocalGalleryDesign(id);
  if (!design) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(design);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: Partial<GalleryDesignInput>;
  try {
    body = await parseRequestJson<Partial<GalleryDesignInput>>(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updated = await updateLocalGalleryDesign(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidateLiveSite();
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteLocalGalleryDesign(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidateLiveSite();
  return NextResponse.json({ ok: true });
}
