#!/usr/bin/env node
/**
 * Ensure Supabase Storage buckets exist and accept service-role uploads.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co node scripts/setup-supabase-storage.mjs
 */
import { loadEnvLocal, validateSupabaseEnv } from "./load-env.mjs";

const BUCKETS = [
  { id: "site-data", public: true },
  { id: "portfolio-media", public: true },
];

function storageHeaders(serviceKey) {
  const headers = { apikey: serviceKey };
  if (serviceKey.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }
  return headers;
}

async function listBuckets(baseUrl, serviceKey) {
  const res = await fetch(`${baseUrl}/storage/v1/bucket`, {
    headers: storageHeaders(serviceKey),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List buckets failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function createBucket(baseUrl, serviceKey, bucket) {
  const res = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...storageHeaders(serviceKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: bucket.id,
      name: bucket.id,
      public: bucket.public,
    }),
  });

  if (res.ok) return "created";
  const text = await res.text();
  if (/already exists|duplicate/i.test(text)) return "exists";
  throw new Error(`Create bucket ${bucket.id} failed (${res.status}): ${text}`);
}

async function probeUpload(baseUrl, serviceKey, bucketId) {
  const path = `_healthcheck/${Date.now()}.txt`;
  const res = await fetch(`${baseUrl}/storage/v1/object/${bucketId}/${path}`, {
    method: "POST",
    headers: {
      ...storageHeaders(serviceKey),
      "Content-Type": "text/plain",
      "x-upsert": "true",
    },
    body: "ok",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload probe to ${bucketId} failed (${res.status}): ${text}`);
  }

  return path;
}

async function main() {
  loadEnvLocal();
  const { url, serviceRoleKey, summary } = validateSupabaseEnv({
    requireAnon: false,
    requireServiceRole: true,
  });

  console.log("\nSupabase storage setup");
  console.log(`  URL:         ${summary.url}`);
  console.log(`  Service key: ${summary.serviceRoleKey}\n`);

  if (!serviceRoleKey.startsWith("eyJ")) {
    console.error(
      "✗ This project requires the legacy service_role JWT (eyJ…) for Storage uploads.\n" +
        "  Use Supabase → Settings → API → Legacy API Keys → service_role.\n"
    );
    process.exit(1);
  }

  const baseUrl = url.replace(/\/+$/, "");
  const existing = await listBuckets(baseUrl, serviceRoleKey);
  const existingIds = new Set(existing.map((b) => b.id));

  for (const bucket of BUCKETS) {
    if (existingIds.has(bucket.id)) {
      console.log(`✓ Bucket exists: ${bucket.id}`);
      continue;
    }
    const result = await createBucket(baseUrl, serviceRoleKey, bucket);
    console.log(`✓ Bucket ${result}: ${bucket.id}`);
  }

  for (const bucket of BUCKETS) {
    await probeUpload(baseUrl, serviceRoleKey, bucket.id);
    console.log(`✓ Upload probe OK: ${bucket.id}`);
  }

  console.log("\n✓ Supabase Storage is ready for site-data and portfolio-media.\n");
}

main().catch((err) => {
  console.error("\n✗ Setup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
