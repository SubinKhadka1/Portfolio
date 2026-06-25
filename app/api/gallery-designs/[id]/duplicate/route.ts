import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { duplicateLocalGalleryDesign } from "@/lib/design-modules-store";
import { revalidateLiveSite } from "@/lib/revalidate-site";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const duplicate = await duplicateLocalGalleryDesign(id);
  if (!duplicate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidateLiveSite();
  return NextResponse.json(duplicate);
}
