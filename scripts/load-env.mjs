#!/usr/bin/env node
/**
 * Load .env.local for Node scripts without overwriting existing process.env values.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.join(__dirname, "..");

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;

  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

/** Load .env.local — never overwrites variables already set in the environment. */
export function loadEnvLocal() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!existsSync(envPath)) {
    return { loaded: false, path: envPath, keys: [] };
  }

  const content = readFileSync(envPath, "utf8");
  const keys = [];

  for (const line of content.split("\n")) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;

    if (process.env[parsed.key] === undefined || !process.env[parsed.key]?.trim()) {
      process.env[parsed.key] = parsed.value;
      keys.push(parsed.key);
    }
  }

  return { loaded: true, path: envPath, keys };
}

function isPlaceholderValue(value) {
  const v = value.trim().toLowerCase();
  return (
    !v ||
    v.includes("your_sb_") ||
    v.includes("your_") ||
    v.includes("your-") ||
    v.includes("placeholder") ||
    v.includes("changeme") ||
    v === "xxx" ||
    v === "https://your-project.supabase.co"
  );
}

function maskSecret(value) {
  const v = value.trim();
  if (v.length <= 12) return "(set)";
  return `${v.slice(0, 8)}…${v.slice(-4)}`;
}

/**
 * Validate Supabase env vars for scripts.
 * @param {{ requireAnon?: boolean, requireServiceRole?: boolean }} options
 */
export function validateSupabaseEnv(options = {}) {
  const { requireAnon = true, requireServiceRole = true } = options;
  const envPath = path.join(projectRoot, ".env.local");
  const problems = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!url) {
    problems.push({
      name: "NEXT_PUBLIC_SUPABASE_URL",
      issue: "missing",
      hint: "Supabase Dashboard → Settings → API → Project URL (e.g. https://xxxx.supabase.co)",
    });
  } else if (isPlaceholderValue(url)) {
    problems.push({
      name: "NEXT_PUBLIC_SUPABASE_URL",
      issue: "placeholder",
      hint: "Replace the placeholder with your Project URL from Supabase Dashboard → Settings → API.",
    });
  }

  if (requireAnon) {
    if (!anon) {
      problems.push({
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        issue: "missing",
        hint: 'Supabase Dashboard → Settings → API Keys → "anon" / "publishable" key (starts with sb_publishable_ or eyJ…)',
      });
    } else if (isPlaceholderValue(anon)) {
      problems.push({
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        issue: "placeholder",
        current: anon,
        hint: 'Replace your_sb_publishable_key with the real publishable key (sb_publishable_…).',
      });
    }
  }

  if (requireServiceRole) {
    if (!service) {
      problems.push({
        name: "SUPABASE_SERVICE_ROLE_KEY",
        issue: "missing",
        hint: 'Supabase Dashboard → Settings → API Keys → "secret" key (sb_secret_…) or legacy service_role JWT (eyJ…).',
      });
    } else if (isPlaceholderValue(service)) {
      problems.push({
        name: "SUPABASE_SERVICE_ROLE_KEY",
        issue: "placeholder",
        current: service,
        hint: 'Replace your_sb_secret_key with the real secret key (sb_secret_…).',
      });
    } else if (service.startsWith("sb_publishable_")) {
      problems.push({
        name: "SUPABASE_SERVICE_ROLE_KEY",
        issue: "wrong-key-type",
        hint: 'You pasted the publishable key here. Use sb_secret_… or legacy service_role JWT instead.',
      });
    }
  }

  if (problems.length > 0) {
    console.error("\n✗ Supabase environment is not ready for this script.\n");
    console.error(`Checked: ${envPath}`);
    console.error("Loaded .env.local without overwriting variables already set in your shell.\n");

    for (const p of problems) {
      console.error(`  • ${p.name}: ${p.issue}`);
      if (p.current) console.error(`    Current value: ${p.current}`);
      console.error(`    → ${p.hint}\n`);
    }

    console.error("Paste these three lines into .env.local (with your real keys):\n");
    console.error("  NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co");
    console.error("  NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...");
    console.error("  SUPABASE_SERVICE_ROLE_KEY=sb_secret_...\n");
    console.error("Then run: npm run seed:supabase\n");
    process.exit(1);
  }

  return {
    url,
    anonKey: anon,
    serviceRoleKey: service,
    summary: {
      url,
      anonKey: maskSecret(anon),
      serviceRoleKey: maskSecret(service),
    },
  };
}
