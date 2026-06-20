import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { listPublicMedia } from "@/lib/public-media";
import type { ProjectType } from "@/lib/types/database";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") as ProjectType | null;
  if (!type || !["design", "video", "client"].includes(type)) {
    return NextResponse.json({ error: "Valid type required" }, { status: 400 });
  }

  const files = await listPublicMedia(type);
  return NextResponse.json(files);
}
