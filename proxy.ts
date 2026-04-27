import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "./lib/auth/cookie-name";

// Optimistic, edge-friendly route gating. Reads ONLY the cookie's presence —
// real role checks happen in layouts / server actions / route handlers via
// lib/auth/guards.ts.

const PROTECTED_PREFIXES = ["/dashboard", "/portal"];
const AUTH_ONLY_PATHS = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSession && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + (request.nextUrl.search || ""))}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_ONLY_PATHS.includes(pathname)) {
    // We don't know the role at the edge — let the server-side layout pick the
    // right home and fix it up if the cookie is stale. Send to /dashboard by
    // default; staff land there directly, patients get redirected by the
    // dashboard layout's requireStaff() guard.
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, static assets, and the favicon. Run on every other route.
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
