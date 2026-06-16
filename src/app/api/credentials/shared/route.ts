// ============================================================
// GET /api/credentials/shared
//
// Returns the list of shared LLM credentials available to the
// caller's org. Metadata only — key values stay server-side,
// resolved by /api/llm at call time via x-llm-shared-id.
// ============================================================

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/supabase/session";
import { listShared } from "@/lib/llm/sharedCredentials";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;
  return NextResponse.json({ shared: listShared() });
}
