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
  }

  return issues;
}

export function formatSupabaseKeyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/invalid compact jws/i.test(message)) {
    return [
      "Invalid Compact JWS — your SUPABASE_SERVICE_ROLE_KEY is wrong for Storage.",
      "Fix: Supabase Dashboard → Settings → API Keys → copy the secret key (sb_secret_…) into SUPABASE_SERVICE_ROLE_KEY on Vercel.",
      "Or use the legacy service_role JWT (starts with eyJ) instead of sb_secret_.",
      "Make sure you did NOT paste the publishable key into the service role slot.",
    ].join(" ");
  }
  return message;
}
