import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  deleteLocalProject,
  getLocalProject,
  updateLocalProject,
} from "@/lib/local-portfolio";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProjectInput } from "@/lib/types/database";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    const project = await getLocalProject(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    const project = await getLocalProject(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*, categories(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<ProjectInput>;

  if (!isSupabaseConfigured()) {
    const project = await updateLocalProject(id, body);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    const project = await updateLocalProject(id, body);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  }

  const { data, error } = await supabase
    .from("projects")
    .update({
      ...(body.type !== undefined && { type: body.type }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.media_url !== undefined && { media_url: body.media_url }),
      ...(body.thumbnail_url !== undefined && { thumbnail_url: body.thumbnail_url }),
      ...(body.category_id !== undefined && { category_id: body.category_id }),
      ...(body.featured !== undefined && { featured: body.featured }),
      ...(body.published !== undefined && { published: body.published }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
      ...(body.metadata !== undefined && { metadata: body.metadata }),
    })
    .eq("id", id)
    .select("*, categories(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    const deleted = await deleteLocalProject(id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    const deleted = await deleteLocalProject(id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
