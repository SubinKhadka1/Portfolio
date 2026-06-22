export function isBlobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isVercelProduction() {
  return process.env.VERCEL === "1";
}

/** True when admin edits can persist outside the read-only deploy bundle. */
export function isRemotePersistenceEnabled() {
  return isBlobStorageEnabled();
}
