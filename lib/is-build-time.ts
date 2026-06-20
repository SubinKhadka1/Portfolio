/** True while `next build` is prerendering pages (read-only FS on Vercel). */
export function isNextBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}
