import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAdminUser } from "@/lib/auth";
import { writeJsonFile } from "@/lib/json-store";
import { revalidateLiveSite } from "@/lib/revalidate-site";
import { isSupabaseStorageEnabled } from "@/lib/supabase/env";
import { getSupabaseStorageDiagnostics } from "@/lib/supabase/keys";

/** Copy bundled data/*.json into Supabase site-data storage. */
export async function POST() {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseStorageEnabled()) {
    return NextResponse.json(
      {
        error:
          "Supabase Storage is required. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel.",
      },
      { status: 503 }
    );
  }

  console.info("[sync-bundle] starting", getSupabaseStorageDiagnostics());

  try {
    const portfolioPath = path.join(process.cwd(), "data", "portfolio.json");
    const categoriesPath = path.join(process.cwd(), "data", "categories.json");
    const settingsPath = path.join(process.cwd(), "data", "site-settings.json");

    const portfolio = JSON.parse(await fs.readFile(portfolioPath, "utf8"));
    const categories = JSON.parse(await fs.readFile(categoriesPath, "utf8"));
    const settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));

    await writeJsonFile("data/portfolio.json", portfolio);
    await writeJsonFile("data/categories.json", categories);
    await writeJsonFile("data/site-settings.json", settings);
    revalidateLiveSite();

    return NextResponse.json({
      success: true,
      message:
        "Supabase site-data updated (portfolio, categories, and settings). Hard-refresh the homepage to see changes.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
