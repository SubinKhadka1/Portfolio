import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  createLocalProject,
  getLocalProjects,
} from "@/lib/local-portfolio";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProjectInput, ProjectType } from "@/lib/types/database";
import { parseRequestJson } from "@/lib/parse-response";
import { revalidateLiveSite } from "@/lib/revalidate-site";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

function jsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers || {}),
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as ProjectType | null;
  const admin = searchParams.get("admin") === "true";

  if (admin) {
    try {
      await requireAdminUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isSupabaseConfigured()) {
    if (type) {
      const projects = await getLocalProjects(type);
      const filtered = !admin ? projects.filter((p) => p.published) : projects;
      return admin ? jsonResponse(filtered) : NextResponse.json(filtered);
    }

    const all = await Promise.all(
      (["design", "video", "client"] as ProjectType[]).map((t) => getLocalProjects(t))
    );
    let projects = all.flat();
    if (!admin) projects = projects.filter((p) => p.published);
    return admin ? jsonResponse(projects) : NextResponse.json(projects);
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let query = supabase
    .from("projects")
    .select("*, categories(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (!admin) query = query.eq("published", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ProjectInput;
  try {
    body = await parseRequestJson<ProjectInput>(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!body.type || !body.media_url) {
    return NextResponse.json({ error: "type and media_url are required" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      const project = await createLocalProject(body);
      revalidateLiveSite();
      return jsonResponse(project, { status: 201 });
    }

    const supabase = await tryCreateClient();
    if (!supabase) {
      const project = await createLocalProject(body);
      revalidateLiveSite();
      return jsonResponse(project, { status: 201 });
    }

    const { data: maxOrder } = await supabase
      .from("projects")
      .select("sort_order")
      .eq("type", body.type)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        type: body.type,
        title: body.title || "",
        description: body.description || "",
        media_url: body.media_url,
        thumbnail_url: body.thumbnail_url || null,
        category_id: body.category_id || null,
        featured: body.featured ?? false,
        published: body.published ?? true,
        sort_order: body.sort_order ?? (maxOrder?.sort_order ?? 0) + 1,
        metadata: body.metadata || {},
      })
      .select("*, categories(*)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateLiveSite();
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
