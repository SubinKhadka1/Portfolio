#!/usr/bin/env node
/**
 * Copy Supabase env vars from .env.vercel.production into the linked Vercel project.
 * Usage: npx vercel link --project <name> --yes && node scripts/sync-vercel-supabase-env.mjs
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const TARGETS = ["production", "preview", "development"];

function parseEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function runVercel(args, input) {
  const result = spawnSync("npx", ["vercel", ...args], {
    input,
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`vercel ${args.join(" ")} failed (${result.status})`);
  }
}

const sourcePath = process.argv[2] || ".env.vercel.production";
const env = parseEnv(sourcePath);

for (const key of KEYS) {
  if (!env[key]?.trim()) {
    console.error(`✗ Missing ${key} in ${sourcePath}`);
    process.exit(1);
  }
}

console.log(`Syncing ${KEYS.join(", ")} to linked Vercel project...\n`);

for (const target of TARGETS) {
  console.log(`→ ${target}`);
  for (const key of KEYS) {
    spawnSync("npx", ["vercel", "env", "rm", key, target, "--yes"], {
      stdio: "ignore",
    });
    runVercel(["env", "add", key, target], env[key]);
    console.log(`  ✓ ${key}`);
  }
}

console.log("\n✓ Done. Redeploy with: npx vercel deploy --prod --yes\n");
