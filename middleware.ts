import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/projects/:path*",
    "/api/upload",
    "/api/media",
    "/api/settings",
    "/api/stats",
    "/api/seed",
    "/api/categories",
  ],
};
