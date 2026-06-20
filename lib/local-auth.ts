import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "portfolio_admin_session";

export function isLocalAuthConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}

export function verifyLocalAdmin(email: string, password: string) {
  if (!isLocalAuthConfigured()) return false;
  return email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD;
}

export async function isLocalAdminSession() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "1";
}

export function localAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
