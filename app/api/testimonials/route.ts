import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  createLocalTestimonial,
  getLocalTestimonials,
} from "@/lib/testimonials-store";
import type { TestimonialInput } from "@/lib/types/database";
import { parseRequestJson } from "@/lib/parse-response";
import { revalidateLiveSite } from "@/lib/revalidate-site";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

function jsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...NO_STORE_HEADERS, ...(init?.headers || {}) },
  });
}

export async function GET(request: NextRequest) {
  const admin = request.nextUrl.searchParams.get("admin") === "true";
  if (admin) {
    try {
      await requireAdminUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const list = await getLocalTestimonials({ admin });
  return admin ? jsonResponse(list) : NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TestimonialInput;
  try {
    body = await parseRequestJson<TestimonialInput>(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!body.author || !body.quote) {
    return NextResponse.json({ error: "author and quote are required" }, { status: 400 });
  }

  try {
    const testimonial = await createLocalTestimonial(body);
    revalidateLiveSite();
    return jsonResponse(testimonial, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create testimonial";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
