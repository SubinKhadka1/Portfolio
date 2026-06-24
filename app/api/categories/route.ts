import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  createCategory,
  getCategories,
  reorderCategories,
} from "@/lib/categories";
import { revalidateLiveSite } from "@/lib/revalidate-site";
import type { ProjectType } from "@/lib/types/database";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectType = searchParams.get("type") as ProjectType | null;
  const categories = await getCategories(projectType || undefined);
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (Array.isArray(body.ids)) {
      const categories = await reorderCategories(body.ids);
      revalidateLiveSite();
      return NextResponse.json(categories);
    }

    const category = await createCategory({
      name: body.name,
      description: body.description,
      project_type: body.project_type || "design",
    });
    revalidateLiveSite();
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create category" },
      { status: 400 }
    );
  }
}
