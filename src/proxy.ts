import { NextResponse, type NextRequest } from "next/server";

// Demo mode: auth is disabled while the team builds the UI.
// Restore by re-importing updateSession from @/lib/supabase/middleware
// and returning `await updateSession(request)`.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
