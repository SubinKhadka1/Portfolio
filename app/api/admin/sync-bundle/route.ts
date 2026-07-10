import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAdminUser } from "@/lib/auth";
import { writeJsonFile } from "@/lib/json-store";
import { revalidateLiveSite } from "@/lib/revalidate-site";
import { isBlobStorageEnabled } from "@/lib/storage-mode";
import { isGithubJsonEnabled, isSupabaseJsonEnabled } from "@/lib/storage-backends";

/** Copy the deployed data/*.json files (from GitHub) into Vercel Blob live storage. */
export async function POST() {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBlobStorageEnabled() && !isSupabaseJsonEnabled() && !isGithubJsonEnabled()) {
    return NextResponse.json(
      {
        error:
          "Remote storage is required. Connect Vercel Blob, Supabase, or GITHUB_TOKEN on Vercel.",
      },
      { status: 503 }
    );
  }

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
        "Live storage updated (portfolio, gallery categories, and settings). Hard-refresh /designs to see changes.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
