import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { validateMediaFile } from "@/lib/public-media";
import { saveMediaFile } from "@/lib/save-media";
import { revalidateLiveSite } from "@/lib/revalidate-site";
import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
import type { ProjectType } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as ProjectType | null;

    if (!file || !type) {
      return NextResponse.json({ error: "file and type are required" }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Upload failed — file was empty. Try a smaller file or re-export as JPG/PNG." },
        { status: 400 }
      );
    }

    const validationError = validateMediaFile(type, file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { url, filename } = await saveMediaFile(type, file);
    revalidateLiveSite();

    return NextResponse.json({
      url,
      filename,
      storage: isSupabaseStorageEnabled() ? "supabase" : "local",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
