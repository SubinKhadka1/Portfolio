#!/usr/bin/env node
/**
 * Upload bundled data/*.json files to the Supabase site-data bucket.
 *
 * Usage (from project root):
 *   npm run seed:supabase
 *
 * Loads .env.local automatically (does not overwrite shell env vars).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, projectRoot, validateSupabaseEnv } from "./load-env.mjs";

const BUCKET = "site-data";

const files = [
  "data/portfolio.json",
  "data/categories.json",
  "data/site-settings.json",
];

async function main() {
  const env = loadEnvLocal();
  if (!env.loaded) {
    console.error(`\n✗ .env.local not found at ${env.path}`);
    console.error("Create it in the project root with your Supabase keys, then retry.\n");
    process.exit(1);
  }

  if (env.keys.length > 0) {
    console.log(`Loaded from .env.local: ${env.keys.join(", ")}`);
  } else {
    console.log("Using environment variables already set in your shell (.env.local had no new keys).");
  }

  const { url, serviceRoleKey, summary } = validateSupabaseEnv({
    requireAnon: false,
    requireServiceRole: true,
  });

  console.log("\nSupabase config:");
  console.log(`  URL:          ${summary.url}`);
  console.log(`  Anon key:     ${summary.anonKey}`);
  console.log(`  Service key:  ${summary.serviceRoleKey}\n`);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const relativePath of files) {
    const fullPath = path.join(projectRoot, relativePath);
    const body = await readFile(fullPath, "utf8");
    JSON.parse(body);

    const { error } = await supabase.storage.from(BUCKET).upload(relativePath, body, {
      upsert: true,
      contentType: "application/json",
      cacheControl: "0",
    });

    if (error) {
      console.error(`\n✗ Failed to upload ${relativePath}: ${error.message}`);
      if (/bucket not found|does not exist/i.test(error.message)) {
        console.error(`\nCreate a public bucket named "${BUCKET}" in Supabase Dashboard → Storage.\n`);
      }
      process.exit(1);
    }

    console.log(`✓ Uploaded ${relativePath} → ${BUCKET}/${relativePath}`);
  }

  console.log("\n✓ Done. Hard-refresh your site or redeploy on Vercel.\n");
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
