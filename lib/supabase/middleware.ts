import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isLocalAuthConfigured } from "@/lib/local-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

async function isLocallyAuthenticated(request: NextRequest) {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value === "1";
}

export async function updateSession(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  const isApiAdmin =
    request.nextUrl.pathname.startsWith("/api/projects") &&
    request.method !== "GET";
  const isProtectedApi =
    request.nextUrl.pathname.startsWith("/api/upload") ||
    request.nextUrl.pathname.startsWith("/api/media") ||
    request.nextUrl.pathname.startsWith("/api/settings") ||
    request.nextUrl.pathname.startsWith("/api/stats") ||
    request.nextUrl.pathname.startsWith("/api/seed") ||
    (request.nextUrl.pathname.startsWith("/api/categories") &&
      request.method !== "GET");

  const needsAuth = (isAdminRoute && !isLoginPage) || isApiAdmin || isProtectedApi;

  if (!isSupabaseConfigured()) {
    if (!needsAuth) return NextResponse.next({ request });

    const localOk = await isLocallyAuthenticated(request);

    if (!localOk) {
      if (isAdminRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (needsAuth) {
    const localOk = isLocalAuthConfigured() && (await isLocallyAuthenticated(request));

    if (!user && !localOk) {
      if (isAdminRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user) {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && user.email !== adminEmail) {
        if (isAdminRoute) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin/login";
          url.searchParams.set("error", "unauthorized");
          return NextResponse.redirect(url);
        }
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  if (isLoginPage && (user || (isLocalAuthConfigured() && (await isLocallyAuthenticated(request))))) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
