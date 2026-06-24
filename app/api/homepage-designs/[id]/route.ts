import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  deleteLocalHomepageDesign,
  getLocalHomepageDesign,
  updateLocalHomepageDesign,
} from "@/lib/design-modules-store";
import type { HomepageDesignInput } from "@/lib/types/database";
import { parseRequestJson } from "@/lib/parse-response";
import { revalidateLiveSite } from "@/lib/revalidate-site";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const design = await getLocalHomepageDesign(id);
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
  let body: Partial<HomepageDesignInput>;
  try {
    body = await parseRequestJson<Partial<HomepageDesignInput>>(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updated = await updateLocalHomepageDesign(id, body);
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
  const deleted = await deleteLocalHomepageDesign(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidateLiveSite();
  return NextResponse.json({ ok: true });
}
