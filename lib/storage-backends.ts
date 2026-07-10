import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";

function hasEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "";
}

export type JsonStorageBackend = "blob" | "supabase" | "github" | "disk";

export function isSupabaseJsonEnabled() {
  return isSupabaseConfigured() && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getGithubRepoConfig() {
  const raw = process.env.GITHUB_REPO?.trim() || "SubinKhadka1/Portfolio";
  const [owner, repo] = raw.split("/");
  if (!owner || !repo) return null;
  return {
    owner,
    repo,
    branch: process.env.GITHUB_BRANCH?.trim() || "main",
    token: process.env.GITHUB_TOKEN?.trim() || process.env.GITHUB_PAT?.trim() || "",
  };
}

export function isGithubJsonEnabled() {
  const config = getGithubRepoConfig();
  return Boolean(config?.token);
}

export function getJsonWriteBackends(): JsonStorageBackend[] {
  const backends: JsonStorageBackend[] = [];
  if (isBlobStorageEnabled()) backends.push("blob");
  if (isSupabaseJsonEnabled()) backends.push("supabase");
  if (isGithubJsonEnabled()) backends.push("github");
  if (!isVercelProduction()) backends.push("disk");
  return backends;
}

export function getJsonReadBackends(blobFileExists: boolean): JsonStorageBackend[] {
  const backends: JsonStorageBackend[] = [];
  if (isBlobStorageEnabled()) backends.push("blob");
  if (isSupabaseJsonEnabled()) backends.push("supabase");
  if (isGithubJsonEnabled()) backends.push("github");
  if (!isVercelProduction() || !blobFileExists) backends.push("disk");
  return backends;
}
