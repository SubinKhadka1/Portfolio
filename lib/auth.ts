import { createClient, tryCreateClient } from "@/lib/supabase/server";
import { isLocalAdminSession, isLocalAuthConfigured } from "@/lib/local-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function getAdminUser() {
  if (isSupabaseConfigured()) {
    const supabase = await tryCreateClient();
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email !== adminEmail) return null;

    return user;
  }

  if (isLocalAuthConfigured() && (await isLocalAdminSession())) {
    return { email: process.env.ADMIN_EMAIL!, id: "local-admin" };
  }

  return null;
}

export async function requireAdminUser() {
  const user = await getAdminUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminUser());
}
