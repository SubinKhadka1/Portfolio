import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/projects";

export async function GET() {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getDashboardStats();
  return NextResponse.json(stats);
}
