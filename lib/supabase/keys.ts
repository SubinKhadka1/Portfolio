/** Strip quotes/whitespace from env vars (common Vercel copy-paste issue). */
export function normalizeSupabaseKey(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^['"]|['"]$/g, "");
}

export function getSupabaseProjectUrl(): string {
  return normalizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return normalizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseServiceRoleKey(): string {
  return normalizeSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export type SupabaseKeyIssue = {
  field: string;
  message: string;
};

function isPlaceholderValue(value: string) {
  const v = value.toLowerCase();
  return (
    !v ||
    v.includes("your_sb_") ||
    v.includes("your_") ||
    v.includes("your-") ||
    v.includes("placeholder") ||
    v.includes("changeme") ||
    v === "xxx" ||
    v === "https://your-project.supabase.co"
  );
}

function jwtPayloadRole(key: string): string | null {
  if (!key.startsWith("eyJ")) return null;
  try {
    const segment = key.split(".")[1];
    if (!segment) return null;
    const json = Buffer.from(segment, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function validateSupabaseKeys(): SupabaseKeyIssue[] {
  const issues: SupabaseKeyIssue[] = [];
  const url = getSupabaseProjectUrl();
  const anon = getSupabaseAnonKey();
  const service = getSupabaseServiceRoleKey();

  if (!url || isPlaceholderValue(url)) {
    issues.push({
      field: "NEXT_PUBLIC_SUPABASE_URL",
      message: "Set your Project URL from Supabase → Settings → API.",
    });
  }

  if (!anon || isPlaceholderValue(anon)) {
    issues.push({
      field: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      message: "Set the publishable/anon key (sb_publishable_… or legacy eyJ… JWT).",
    });
  } else if (anon.startsWith("sb_secret_")) {
    issues.push({
      field: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      message:
        "This looks like a secret/service_role key. Put the publishable/anon key here instead.",
    });
  }

  if (!service || isPlaceholderValue(service)) {
    issues.push({
      field: "SUPABASE_SERVICE_ROLE_KEY",
      message: "Set the secret key (sb_secret_…) or legacy service_role JWT (eyJ…).",
    });
  } else if (service.startsWith("sb_publishable_")) {
    issues.push({
      field: "SUPABASE_SERVICE_ROLE_KEY",
      message:
        'You pasted the publishable key here. Use the secret key (sb_secret_…) or legacy "service_role" JWT from Supabase → Settings → API Keys.',
    });
  } else if (jwtPayloadRole(service) === "anon") {
    issues.push({
      field: "SUPABASE_SERVICE_ROLE_KEY",
      message:
        'This JWT has role "anon". Use the legacy service_role JWT (eyJ…) or the secret key (sb_secret_…) instead.',
    });
  }

  if (anon && service && anon === service) {
    issues.push({
      field: "SUPABASE_SERVICE_ROLE_KEY",
      message:
        "Service role key is identical to the anon/publishable key. They must be different values from Supabase → Settings → API Keys.",
    });
  }

  return issues;
}

export function assertSupabaseKeysForStorage(): void {
  const issues = validateSupabaseKeys();
  if (issues.length === 0) return;
  throw new Error(issues.map((issue) => `${issue.field}: ${issue.message}`).join(" "));
}

export function formatSupabaseKeyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/invalid compact jws|invalid jwt/i.test(message)) {
    return [
      "Invalid Compact JWS — the service role key was sent as a Bearer JWT but is not a valid JWT.",
      "Fix on Vercel: SUPABASE_SERVICE_ROLE_KEY must be the secret key (sb_secret_…) or legacy service_role JWT (eyJ…), NOT the publishable/anon key.",
      "If you use sb_secret_, do not put it in Authorization; only apikey is used (latest code). Redeploy, or paste the legacy service_role JWT from Supabase → Settings → API → Legacy API Keys.",
    ].join(" ");
  }
  if (/required property ['"]authorization['"]/i.test(message)) {
    return [
      "Supabase Storage requires a legacy service_role JWT in SUPABASE_SERVICE_ROLE_KEY for this project.",
      "Copy the service_role key (starts with eyJ) from Supabase → Settings → API → Legacy API Keys into Vercel, redeploy, then import again.",
    ].join(" ");
  }
  return message;
}

/** Safe diagnostics for logs/API — never prints secret values. */
export function getSupabaseStorageDiagnostics() {
  const url = getSupabaseProjectUrl();
  const anon = getSupabaseAnonKey();
  const service = getSupabaseServiceRoleKey();

  return {
    urlPresent: Boolean(url),
    urlHost: url ? new URL(url).host : null,
    anonKeyPresent: Boolean(anon),
    anonKeyType: anon.startsWith("sb_publishable_")
      ? "publishable"
      : anon.startsWith("sb_secret_")
        ? "secret-wrong-slot"
        : anon.startsWith("eyJ")
          ? "legacy-jwt"
          : anon
            ? "unknown"
            : "missing",
    serviceRoleKeyPresent: Boolean(service),
    serviceRoleKeyType: service.startsWith("sb_secret_")
      ? "secret"
      : service.startsWith("sb_publishable_")
        ? "publishable-wrong-slot"
        : service.startsWith("eyJ")
          ? "legacy-jwt"
          : service
            ? "unknown"
            : "missing",
    keysSwapped: anon.startsWith("sb_secret_") || service.startsWith("sb_publishable_"),
  };
}
