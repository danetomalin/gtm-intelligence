// ============================================================
// /api/connectors/[source]/credentials — generic over the
// connector registry (review follow-up: no per-source routes).
//
// PUT  — validate credentials live via the connector's validate(),
//        encrypt, save. GET — metadata only; never the token.
//
// Writes are scoped to the Integration Test org (migration 0036)
// until real multi-tenant sessions land.
// ============================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { encryptJson } from "@/lib/connectors/crypto";
import { connectorLog } from "@/lib/connectors/logger";
import { getConnector } from "@/features/cs-health/connectors/registry";
import { INTEGRATION_TEST_ORG_ID } from "@/lib/demo-context";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  if (!getConnector(source)) {
    return NextResponse.json({ error: `Unknown connector: ${source}` }, { status: 404 });
  }
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("connector_credentials")
    .select("base_url, status, last_synced_at, last_result, last_error, updated_at")
    .eq("organization_id", INTEGRATION_TEST_ORG_ID)
    .eq("source_id", source)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configured: data !== null, connection: data });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  const connector = getConnector(source);
  if (!connector) {
    return NextResponse.json({ error: `Unknown connector: ${source}` }, { status: 404 });
  }

  let body: { token?: string; baseUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const token = (body.token ?? "").trim();
  const baseUrl = (body.baseUrl ?? connector.defaultBaseUrl).trim().replace(/\/$/, "");
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // Validate live before saving — a saved-but-broken token is the worst state.
  connectorLog.info(source, "credentials.validate.start", { baseUrl });
  const check = await connector.validate({ baseUrl, token });
  if (!check.ok) {
    connectorLog.warn(source, "credentials.validate.failed", { baseUrl, message: check.message });
    return NextResponse.json({ error: check.message }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.from("connector_credentials").upsert(
    {
      organization_id: INTEGRATION_TEST_ORG_ID,
      source_id: source,
      base_url: baseUrl,
      encrypted: encryptJson({ token }),
      status: "configured",
      last_error: null,
    },
    { onConflict: "organization_id,source_id" },
  );
  if (error) {
    connectorLog.error(source, "credentials.save.failed", { message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  connectorLog.info(source, "credentials.saved", { baseUrl, tokenConfigured: true });
  return NextResponse.json({ ok: true });
}
