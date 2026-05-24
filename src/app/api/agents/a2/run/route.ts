// DEPRECATED — superseded by the dynamic `/api/agents/[code]/run` route.
// Kept as a 410 stub so any stale clients fail loudly with a forwarding hint.
// Safe to delete from the local filesystem (the sandbox can't unlink it).
import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      error:
        "This route is deprecated. Use /api/agents/r-ms/run (the dynamic [code] route).",
    },
    { status: 410 },
  );
}
