/** Set when a Blob write fails with suspension/quota — skip Blob until TTL expires. */
let blobWritesBlockedUntil = 0;
let blobBlockReason = "";

export function markBlobWritesBlocked(reason: string, ttlMs = 300_000) {
  blobWritesBlockedUntil = Date.now() + ttlMs;
  blobBlockReason = reason;
}

export function clearBlobWriteBlock() {
  blobWritesBlockedUntil = 0;
  blobBlockReason = "";
}

export function isBlobWritesBlocked() {
  return Date.now() < blobWritesBlockedUntil;
}

export function getBlobBlockReason() {
  return isBlobWritesBlocked() ? blobBlockReason : "";
}
