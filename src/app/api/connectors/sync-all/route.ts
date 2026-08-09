// ============================================================
// POST /api/connectors/sync-all — run every configured connector
// SEQUENTIALLY (rate-limit friendly). Guards (cooldown, in-flight,
// crash self-heal) live in the shared executor; skipped sources
// are reported with reasons, not treated as failures.
// Powers the panel's "Sync all" and the dashboard Refresh control.
// ============================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { runSync, type SyncOutcome } from "@/lib/connectors/run-sync";
import { CONNECTORS } from "@/features/cs-health/connectors/registry";
import { INTEGRATION_TEST_ORG_ID } from "@/lib/demo-context";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // sequential run across all sources

export async function POST() {
  const admin = await createAdminClient();
  const outcomes: SyncOutcome[] = [];
  for (const source of Object.keys(CONNECTORS)) {
    outcomes.push(await runSync(admin, INTEGRATION_TEST_ORG_ID, source));
  }
  const synced = outcomes.filter((o) => o.status === "synced").length;
  const errors = outcomes.filter((o) => o.status === "error").length;
  return NextResponse.json(
    { outcomes, synced, errors },
    { status: errors > 0 && synced === 0 ? 502 : 200 },
  );
}
