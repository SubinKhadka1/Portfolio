import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function supabaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: "Supabase is not configured. Using local portfolio storage instead.",
      code: "SUPABASE_NOT_CONFIGURED",
    },
    { status: 503 }
  );
}

export function isUsingLocalStorage() {
  return !isSupabaseConfigured();
}
