// ============================================================
// POST /api/connectors/[source]/sync — generic over the registry.
// Decrypts saved credentials, runs the connector's sync into the
// Integration Test org, records the outcome + structured logs.
// ============================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptJson, type EncryptedPayload } from "@/lib/connectors/crypto";
import { connectorLog } from "@/lib/connectors/logger";
import { getConnector } from "@/features/cs-health/connectors/registry";
import { INTEGRATION_TEST_ORG_ID } from "@/lib/demo-context";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // syncs are API-latency-bound; allow slow portals

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  const connector = getConnector(source);
  if (!connector) {
    return NextResponse.json({ error: `Unknown connector: ${source}` }, { status: 404 });
  }

  const admin = await createAdminClient();
  const { data: cred, error: credErr } = await admin
    .from("connector_credentials")
    .select("base_url, encrypted")
    .eq("organization_id", INTEGRATION_TEST_ORG_ID)
    .eq("source_id", source)
    .maybeSingle();
  if (credErr) return NextResponse.json({ error: credErr.message }, { status: 500 });
  if (!cred) {
    return NextResponse.json(
      { error: `No ${connector.name} credentials saved. Add them in the connector panel first.` },
      { status: 400 },
    );
  }

  const mark = (fields: Record<string, unknown>) =>
    admin
      .from("connector_credentials")
      .update(fields)
      .eq("organization_id", INTEGRATION_TEST_ORG_ID)
      .eq("source_id", source);

  const started = Date.now();
  connectorLog.info(source, "sync.start", {
    org: INTEGRATION_TEST_ORG_ID,
    baseUrl: cred.base_url,
  });
  try {
    const { token } = decryptJson<{ token: string }>(cred.encrypted as EncryptedPayload);
    const result = await connector.sync(
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
    connectorLog.info(source, "sync.complete", { ...result, ms: Date.now() - started });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await mark({ status: "error", last_error: message });
    connectorLog.error(source, "sync.failed", {
      message: message.slice(0, 300),
      ms: Date.now() - started,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
