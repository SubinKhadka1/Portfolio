import { NextRequest, NextResponse } from "next/server";
import { verifyLocalAdmin, ADMIN_SESSION_COOKIE, localAdminCookieOptions } from "@/lib/local-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    if (!verifyLocalAdmin(email, password)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const response = NextResponse.json({ user: { email }, mode: "local" });
    response.cookies.set(ADMIN_SESSION_COOKIE, "1", localAdminCookieOptions());
    return response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (verifyLocalAdmin(email, password)) {
      const response = NextResponse.json({ user: { email }, mode: "local" });
      response.cookies.set(ADMIN_SESSION_COOKIE, "1", localAdminCookieOptions());
      return response;
    }
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && data.user?.email !== adminEmail) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Not authorized as admin" }, { status: 403 });
  }

  return NextResponse.json({ user: data.user, mode: "supabase" });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...localAdminCookieOptions(), maxAge: 0 });

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }

  return response;
}
