// ============================================================
// AUTH-ENFORCING MIDDLEWARE
//
// Replaces the previous src/proxy.ts no-op stub (which Next.js
// never actually invoked — proxy.ts is not a recognized
// middleware filename). The previous file has been deleted in
// the same commit.
//
// Behavior:
//   NEXT_PUBLIC_AUTH_ENFORCE != 'true'  → pass through. Demo
//     mode preserved exactly as it was before this commit. Flip
//     to 'true' on Vercel when ready to gate the app.
//   NEXT_PUBLIC_AUTH_ENFORCE == 'true' + no Supabase env vars
//     → pass through (safety so a misconfigured deploy doesn't
//     lock everyone out).
//   NEXT_PUBLIC_AUTH_ENFORCE == 'true' + no session on a
//     non-public path → redirect to /login?redirect=<original>.
//   Authenticated user on / or /login → redirect to /dashboard.
//
// /api/* paths pass through regardless of enforcement — every
// route handler owns its own auth via the session helper, and
// JSON 401s are friendlier to fetch() callers than HTML
// redirects.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/auth/")) return true;
  // API routes own their own auth via lib/supabase/session.
  if (pathname.startsWith("/api/")) return true;
  if (/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$/.test(pathname)) {
    return true;
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const enforce = process.env.NEXT_PUBLIC_AUTH_ENFORCE === "true";
  if (!enforce) return NextResponse.next();

  if (isPublic(req.nextUrl.pathname)) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Safety: don't lock everyone out if env vars aren't set.
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

  // Delegate to the existing updateSession helper, which already
  // handles cookie refresh, /login redirect for unauth'd users,
  // and /dashboard redirect for auth'd users hitting / or /login.
  return updateSession(req);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
