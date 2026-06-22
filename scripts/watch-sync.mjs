#!/usr/bin/env node
/**
 * Watches project folders; after you save, auto-commits and pushes to GitHub.
 * Vercel redeploys on every push — live site updates in ~1–2 min.
 *
 * Usage: npm run sync
 * Keep this running in a terminal while you edit in VS Code / Cursor.
 */
import { execSync, spawn } from "child_process";
import { watch } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WATCH_DIRS = ["app", "components", "lib", "public", "data", "proxy.ts", "next.config.ts"];

let timer = null;
let shipping = false;
let devProcess = null;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", cwd: root, shell: true, ...opts });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function ship() {
  if (shipping) return;
  const dirty = execSync("git status --porcelain", { cwd: root, encoding: "utf8" }).trim();
  if (!dirty) return;

  shipping = true;
  const stamp = new Date().toLocaleString("en-NP", { timeZone: "Asia/Kathmandu" });

  try {
    console.log(`\n[sync] Shipping changes (${stamp})...`);
    await run("git", ["add", "-A"]);
    await run("git", ["commit", "-m", `auto-sync: ${stamp}`]);
    await run("git", ["push", "origin", "main"]);
    console.log("[sync] ✓ Pushed — Vercel is rebuilding your live site.\n");
  } catch (error) {
    console.error("[sync] Failed:", error.message);
  } finally {
    shipping = false;
  }
}

function scheduleShip() {
  clearTimeout(timer);
  timer = setTimeout(ship, 4000);
}

function watchPath(relative) {
  const target = path.join(root, relative);
  try {
    watch(target, { recursive: true }, (_, filename) => {
      if (!filename || filename.includes("node_modules") || filename.includes(".next")) return;
      console.log(`[sync] Changed: ${relative}/${filename}`);
      scheduleShip();
    });
    console.log(`[sync] Watching ${relative}`);
  } catch {
    // single file paths (proxy.ts, next.config.ts)
    watch(target, () => {
      console.log(`[sync] Changed: ${relative}`);
      scheduleShip();
    });
    console.log(`[sync] Watching ${relative}`);
  }
}

console.log("═══════════════════════════════════════════════════");
console.log("  Portfolio live-sync");
console.log("  • localhost:4001 — instant preview (hot reload)");
console.log("  • Vercel — updates ~1–2 min after each save");
console.log("  Press Ctrl+C to stop");
console.log("═══════════════════════════════════════════════════\n");

for (const dir of WATCH_DIRS) {
  watchPath(dir);
}

devProcess = spawn("npm", ["run", "dev"], { cwd: root, stdio: "inherit", shell: true });

devProcess.on("close", () => process.exit(0));
process.on("SIGINT", () => {
  clearTimeout(timer);
  devProcess?.kill();
  process.exit(0);
});
