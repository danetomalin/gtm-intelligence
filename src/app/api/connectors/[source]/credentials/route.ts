// ============================================================
// /api/connectors/[source]/credentials — generic over the
// registry, with credential fields DECLARED by each connector
// (design §6). PUT validates live via the connector's validate()
// before encrypting + saving. GET returns metadata only.
//
// Body shape:  { values: { <declared field key>: string, ... } }
// "baseUrl" is an optional declared field; when absent the
// connector's defaultBaseUrl applies. Legacy { token } bodies from
// the HubSpot-era panel are accepted for backward compatibility.
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

  let body: { values?: Record<string, string>; token?: string; baseUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  // Accept both the declared-fields shape and the legacy flat shape.
  const values: Record<string, string> = { ...(body.values ?? {}) };
  if (body.token && !values.token) values.token = body.token;
  if (body.baseUrl && !values.baseUrl) values.baseUrl = body.baseUrl;

  for (const field of connector.credentialFields) {
    if (field.key === "baseUrl") continue; // optional; default applies
    if (!(values[field.key] ?? "").trim()) {
      return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
    }
    values[field.key] = values[field.key].trim();
  }
  const baseUrl = (values.baseUrl ?? connector.defaultBaseUrl).trim().replace(/\/$/, "");
  values.baseUrl = baseUrl;

  connectorLog.info(source, "credentials.validate.start", { baseUrl });
  const check = await connector.validate({ baseUrl, values });
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
      encrypted: encryptJson({ values }),
      status: "configured",
      last_error: null,
    },
    { onConflict: "organization_id,source_id" },
  );
  if (error) {
    connectorLog.error(source, "credentials.save.failed", { message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  connectorLog.info(source, "credentials.saved", { baseUrl });
  return NextResponse.json({ ok: true });
}
