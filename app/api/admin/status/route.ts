import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/lib/persistence-status";
import {
  getBlobAuthMode,
  isBlobStorageEnabled,
  isVercelProduction,
} from "@/lib/storage-mode";

export async function GET() {
  const status = getPersistenceStatus();
  const blobAuth = getBlobAuthMode();
  return NextResponse.json({
    ...status,
    vercel: isVercelProduction(),
    blob: isBlobStorageEnabled(),
    blobAuth,
    blobTokenPresent: blobAuth === "token",
    blobStoreIdPresent: Boolean(process.env.BLOB_STORE_ID?.trim()),
  });
}
