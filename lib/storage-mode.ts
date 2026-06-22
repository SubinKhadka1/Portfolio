function hasEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "";
}

export function getBlobAuthMode(): "token" | "oidc" | "none" {
  if (hasEnv("BLOB_READ_WRITE_TOKEN")) return "token";
  // Vercel links Blob stores via OIDC and injects BLOB_STORE_ID (not always a read-write token).
  if (isVercelProduction() && hasEnv("BLOB_STORE_ID")) return "oidc";
  return "none";
}

export function isBlobStorageEnabled() {
  return getBlobAuthMode() !== "none";
}

export function isVercelProduction() {
  return process.env.VERCEL === "1";
}

/** True when admin edits can persist outside the read-only deploy bundle. */
export function isRemotePersistenceEnabled() {
  return isBlobStorageEnabled();
}
