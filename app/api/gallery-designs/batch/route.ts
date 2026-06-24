import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createLocalGalleryDesignsBatch } from "@/lib/design-modules-store";
import type { GalleryDesignInput } from "@/lib/types/database";
import { parseRequestJson } from "@/lib/parse-response";
import { revalidateLiveSite } from "@/lib/revalidate-site";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

const MAX_BATCH = 50;

function jsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...NO_STORE_HEADERS, ...(init?.headers || {}) },
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { items?: GalleryDesignInput[] };
  try {
    body = await parseRequestJson<{ items?: GalleryDesignInput[] }>(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const items = body.items ?? [];
  if (!items.length) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }
  if (items.length > MAX_BATCH) {
    return NextResponse.json({ error: `Maximum ${MAX_BATCH} items per batch` }, { status: 400 });
  }
  if (items.some((item) => !item.media_url)) {
    return NextResponse.json({ error: "Each item needs media_url" }, { status: 400 });
  }

  try {
    const designs = await createLocalGalleryDesignsBatch(items);
    revalidateLiveSite();
    return jsonResponse(designs, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create gallery designs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
