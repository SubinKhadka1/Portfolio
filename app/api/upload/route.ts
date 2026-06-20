import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { savePublicMedia, validateMediaFile } from "@/lib/public-media";
import { tryCreateClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProjectType } from "@/lib/types/database";

const BUCKET = "portfolio-media";

const folderMap: Record<ProjectType, string> = {
  design: "designs",
  video: "videos",
  client: "logos",
};

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

    if (!isSupabaseConfigured()) {
      const { url, filename } = await savePublicMedia(type, file);
      return NextResponse.json({ url, filename, storage: "local" });
    }

    const supabase = await tryCreateClient();
    if (!supabase) {
      const { url, filename } = await savePublicMedia(type, file);
      return NextResponse.json({ url, filename, storage: "local" });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${folderMap[type]}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: storagePath,
      filename: file.name,
      type: ext,
      storage: "supabase",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
