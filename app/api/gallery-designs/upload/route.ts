import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createLocalGalleryDesignsBatch } from "@/lib/design-modules-store";
import { titleFromMediaUrl } from "@/lib/gallery-design-create";
import { saveMediaFile } from "@/lib/save-media";
import type { GalleryDesign, GalleryDesignInput } from "@/lib/types/database";
import { revalidateLiveSite } from "@/lib/revalidate-site";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

const MAX_FILES = 50;

type ManifestItem = {
  aspectRatio?: "square" | "portrait";
  width?: number;
  height?: number;
  title?: string;
};

function jsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...NO_STORE_HEADERS, ...(init?.headers || {}) },
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  const categoryId = String(formData.get("categoryId") || "").trim();
  const startSortOrder = Number(formData.get("startSortOrder") || 1_000);

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }
  if (!Number.isFinite(startSortOrder)) {
    return NextResponse.json({ error: "startSortOrder must be a number" }, { status: 400 });
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!files.length) {
    return NextResponse.json({ error: "Add at least one image file" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximum ${MAX_FILES} files per upload` }, { status: 400 });
  }

  let manifest: ManifestItem[] = [];
  const manifestRaw = formData.get("manifest");
  if (typeof manifestRaw === "string" && manifestRaw.trim()) {
    try {
      manifest = JSON.parse(manifestRaw) as ManifestItem[];
      if (!Array.isArray(manifest)) {
        return NextResponse.json({ error: "manifest must be a JSON array" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid manifest JSON" }, { status: 400 });
    }
  }

  const failed: { name: string; error: string }[] = [];
  const inputs: GalleryDesignInput[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const meta = manifest[i] ?? {};

    try {
      const { url } = await saveMediaFile("design", file);
      inputs.push({
        title: meta.title?.trim() || titleFromMediaUrl(url),
        description: "",
        media_url: url,
        category_id: categoryId,
        published: true,
        sort_order: startSortOrder + inputs.length * 1_000,
        metadata: {
          color: "from-purple-700 to-indigo-900",
          aspectRatio: meta.aspectRatio ?? "square",
          imageWidth: meta.width ?? 1080,
          imageHeight: meta.height ?? 1080,
        },
      });
    } catch (err) {
      failed.push({
        name: file.name,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  if (!inputs.length) {
    return jsonResponse({ designs: [], failed }, { status: 400 });
  }

  try {
    const designs = await createLocalGalleryDesignsBatch(inputs);
    revalidateLiveSite();
    return jsonResponse({ designs, failed } satisfies { designs: GalleryDesign[]; failed: typeof failed }, {
      status: 201,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save designs";
    return NextResponse.json({ error: message, failed }, { status: 500 });
  }
}
