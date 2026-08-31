import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  deleteLocalTestimonial,
  getLocalTestimonial,
  updateLocalTestimonial,
} from "@/lib/testimonials-store";
import type { TestimonialInput } from "@/lib/types/database";
import { revalidateLiveSite } from "@/lib/revalidate-site";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const testimonial = await getLocalTestimonial(id);
  if (!testimonial) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(testimonial);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: Partial<TestimonialInput>;
  try {
    body = await request.json() as Partial<TestimonialInput>;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const testimonial = await updateLocalTestimonial(id, body);
  if (!testimonial) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidateLiveSite();
  return NextResponse.json(testimonial);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteLocalTestimonial(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidateLiveSite();
  return NextResponse.json({ success: true });
}
