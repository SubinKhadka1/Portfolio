import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createLocalProjectsBatch } from "@/lib/local-portfolio";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProjectInput } from "@/lib/types/database";
import { parseRequestJson } from "@/lib/parse-response";
import { revalidateLiveSite } from "@/lib/revalidate-site";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

const MAX_BATCH = 50;

function jsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers || {}),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { items?: ProjectInput[] };
  try {
    body = await parseRequestJson<{ items?: ProjectInput[] }>(request);
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
  if (items.some((item) => !item.type || !item.media_url)) {
    return NextResponse.json({ error: "Each item needs type and media_url" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      const projects = await createLocalProjectsBatch(items);
      revalidateLiveSite();
      return jsonResponse(projects, { status: 201 });
    }

    const supabase = await tryCreateClient();
    if (!supabase) {
      const projects = await createLocalProjectsBatch(items);
      revalidateLiveSite();
      return jsonResponse(projects, { status: 201 });
    }

    const { data: maxOrder } = await supabase
      .from("projects")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (maxOrder?.sort_order ?? 0) + 1;
    const rows = items.map((item) => {
      const row = {
        type: item.type,
        title: item.title || "",
        description: item.description || "",
        media_url: item.media_url,
        thumbnail_url: item.thumbnail_url || null,
        category_id: item.category_id || null,
        featured: item.featured ?? false,
        published: item.published ?? true,
        sort_order: item.sort_order ?? nextOrder,
        metadata: item.metadata || {},
      };
      nextOrder += 1;
      return row;
    });

    const { data, error } = await supabase
      .from("projects")
      .insert(rows)
      .select("*, categories(*)");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateLiveSite();
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
