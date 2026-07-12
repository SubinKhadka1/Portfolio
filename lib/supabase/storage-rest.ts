import {
  formatSupabaseKeyError,
  getSupabaseProjectUrl,
  getSupabaseServiceRoleKey,
  getSupabaseStorageDiagnostics,
} from "@/lib/supabase/keys";

function storageHeaders(serviceKey: string, extra?: Record<string, string>) {
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  // Storage requires both apikey and Authorization.
  // For sb_secret_ keys, use the same value for both (Supabase API keys docs).
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...extra,
  };
}

function storageBaseUrl() {
  const url = getSupabaseProjectUrl().replace(/\/+$/, "");
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  return `${url}/storage/v1`;
}

async function parseStorageError(res: Response) {
  let message = `Storage request failed (${res.status})`;
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    message = body.message || body.error || message;
  } catch {
    // ignore
  }
  throw new Error(formatSupabaseKeyError(message));
}

export function publicStorageUrl(bucket: string, objectPath: string) {
  const base = getSupabaseProjectUrl().replace(/\/+$/, "");
  const path = objectPath.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadStorageObject(
  bucket: string,
  objectPath: string,
  body: string | Buffer | Uint8Array,
  options?: { contentType?: string; upsert?: boolean }
) {
  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  const path = objectPath.replace(/^\/+/, "");
  const url = `${storageBaseUrl()}/object/${bucket}/${path}`;

  console.info("[storage-rest] upload", {
    bucket,
    path,
    ...getSupabaseStorageDiagnostics(),
  });

  let payload: BodyInit;
  if (typeof body === "string") {
    payload = body;
  } else {
    const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
    payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: storageHeaders(serviceKey, {
      ...(options?.contentType ? { "Content-Type": options.contentType } : {}),
      ...(options?.upsert ? { "x-upsert": "true" } : {}),
    }),
    body: payload,
  });

  if (!res.ok) await parseStorageError(res);
}

export async function downloadStorageObject(bucket: string, objectPath: string) {
  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) return null;

  const path = objectPath.replace(/^\/+/, "");
  const url = `${storageBaseUrl()}/object/${bucket}/${path}`;

  const res = await fetch(url, {
    method: "GET",
    headers: storageHeaders(serviceKey),
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) await parseStorageError(res);

  return res.text();
}

export async function storageObjectExists(bucket: string, objectPath: string) {
  const text = await downloadStorageObject(bucket, objectPath);
  return Boolean(text?.trim());
}
