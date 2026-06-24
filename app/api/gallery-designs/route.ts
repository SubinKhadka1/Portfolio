import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  createLocalGalleryDesign,
  getLocalGalleryDesigns,
} from "@/lib/design-modules-store";
import type { GalleryDesignInput } from "@/lib/types/database";
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

  const designs = await getLocalGalleryDesigns({ admin });
  return admin ? jsonResponse(designs) : NextResponse.json(designs);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GalleryDesignInput;
  try {
    body = await parseRequestJson<GalleryDesignInput>(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!body.media_url) {
    return NextResponse.json({ error: "media_url is required" }, { status: 400 });
  }

  try {
    const design = await createLocalGalleryDesign(body);
    revalidateLiveSite();
    return jsonResponse(design, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create gallery design";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
