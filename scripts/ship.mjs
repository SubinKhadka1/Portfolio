#!/usr/bin/env node
/**
 * Commit all changes and push to GitHub → Vercel auto-redeploys (~1 min).
 * Usage: npm run ship
 * Optional message: npm run ship -- "updated hero section"
 */
import { execSync } from "child_process";

const message =
  process.argv.slice(2).join(" ").trim() ||
  `update: ${new Date().toLocaleString("en-NP", { timeZone: "Asia/Kathmandu" })}`;

try {
  const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  if (!dirty) {
    console.log("Nothing to ship — working tree is clean.");
    process.exit(0);
  }

  console.log("Staging changes...");
  execSync("git add -A", { stdio: "inherit" });

  console.log(`Committing: ${message}`);
  execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: "inherit" });

  console.log("Pushing to origin/main...");
  execSync("git push origin main", { stdio: "inherit" });

  console.log("\n✓ Shipped! Vercel will rebuild in ~1–2 minutes.");
  console.log("  Local preview: http://localhost:4001");
  console.log("  Live site updates after the Vercel deploy finishes.");
} catch (error) {
  console.error("\nShip failed:", error.message);
  process.exit(1);
}
