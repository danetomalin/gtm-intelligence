// ============================================================
// POST /api/connectors/[source]/sync — thin wrapper around the
// shared executor (guards + status lifecycle live there).
// Per-source button = explicit user intent, so cooldown is
// bypassed (force) but the in-flight guard still applies.
// ============================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { runSync } from "@/lib/connectors/run-sync";
import { INTEGRATION_TEST_ORG_ID } from "@/lib/demo-context";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  const admin = await createAdminClient();
  const outcome = await runSync(admin, INTEGRATION_TEST_ORG_ID, source, { force: true });

  if (outcome.status === "synced") {
    return NextResponse.json({ ok: true, result: outcome.result });
  }
  if (outcome.status === "skipped") {
    return NextResponse.json({ error: `Skipped: ${outcome.reason}` }, { status: 409 });
  }
  const status = outcome.error.startsWith("Unknown connector") ? 404 : 502;
  return NextResponse.json({ error: outcome.error }, { status });
}
