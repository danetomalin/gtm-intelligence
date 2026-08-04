// ============================================================
// POST /api/connectors/hubspot/sync
//
// Decrypts the saved credentials, runs the HubSpot sync into the
// Integration Test org, and records the outcome on the credential
// row (status connected/error, counts, timestamps).
// ============================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptJson, type EncryptedPayload } from "@/lib/connectors/crypto";
import { syncHubSpot } from "@/features/cs-health/connectors/hubspot";
import { INTEGRATION_TEST_ORG_ID } from "@/lib/demo-context";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // sync is API-latency-bound; allow slow portals

export async function POST() {
  const admin = await createAdminClient();

  const { data: cred, error: credErr } = await admin
    .from("connector_credentials")
    .select("base_url, encrypted")
    .eq("organization_id", INTEGRATION_TEST_ORG_ID)
    .eq("source_id", "hubspot")
    .maybeSingle();
  if (credErr) return NextResponse.json({ error: credErr.message }, { status: 500 });
  if (!cred) {
    return NextResponse.json(
      { error: "No HubSpot credentials saved. Add them in the connector panel first." },
      { status: 400 },
    );
  }

  const mark = (fields: Record<string, unknown>) =>
    admin
      .from("connector_credentials")
      .update(fields)
      .eq("organization_id", INTEGRATION_TEST_ORG_ID)
      .eq("source_id", "hubspot");

  try {
    const { token } = decryptJson<{ token: string }>(cred.encrypted as EncryptedPayload);
    const result = await syncHubSpot(
      admin,
      { baseUrl: cred.base_url, token },
      INTEGRATION_TEST_ORG_ID,
    );
    await mark({
      status: "connected",
      last_synced_at: new Date().toISOString(),
      last_result: result,
      last_error: null,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await mark({ status: "error", last_error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
