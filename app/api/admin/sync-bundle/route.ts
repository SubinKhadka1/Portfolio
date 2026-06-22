import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAdminUser } from "@/lib/auth";
import { writeJsonFile } from "@/lib/json-store";
import { revalidateLiveSite } from "@/lib/revalidate-site";
import { isBlobStorageEnabled } from "@/lib/storage-mode";

/** Copy the deployed data/*.json files (from GitHub) into Vercel Blob live storage. */
export async function POST() {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBlobStorageEnabled()) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob is required. Create a Blob store in Vercel → Storage, connect it, then redeploy.",
      },
      { status: 503 }
    );
  }

  try {
    const portfolioPath = path.join(process.cwd(), "data", "portfolio.json");
    const settingsPath = path.join(process.cwd(), "data", "site-settings.json");

    const portfolio = JSON.parse(await fs.readFile(portfolioPath, "utf8"));
    const settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));

    await writeJsonFile("data/portfolio.json", portfolio);
    await writeJsonFile("data/site-settings.json", settings);
    revalidateLiveSite();

    return NextResponse.json({
      success: true,
      message: "Live storage updated from the latest deployed site data.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
