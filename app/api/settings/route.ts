import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { getSiteSettings, saveHeroImage, updateSiteSettings } from "@/lib/site-settings";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const settings = await updateSiteSettings(body);

  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const heroAlt = formData.get("heroAlt") as string | null;

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const heroImage = await saveHeroImage(file);
  const settings = await updateSiteSettings({
    heroImage,
    ...(heroAlt ? { heroAlt } : {}),
  });

  return NextResponse.json(settings);
}
