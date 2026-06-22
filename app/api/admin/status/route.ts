import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/lib/persistence-status";
import { isBlobStorageEnabled, isVercelProduction } from "@/lib/storage-mode";

export async function GET() {
  const status = getPersistenceStatus();
  return NextResponse.json({
    ...status,
    vercel: isVercelProduction(),
    blob: isBlobStorageEnabled(),
    blobTokenPresent: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });
}
