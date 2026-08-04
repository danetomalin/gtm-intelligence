// ============================================================
// /api/connectors/hubspot/credentials
//
// PUT  — save the private-app token (validated live against the
//        HubSpot API before saving, encrypted before insert).
// GET  — connection metadata for the panel. The token value is
//        NEVER returned; only status/timestamps/counts.
//
// Writes are scoped to the Integration Test org (migration 0036)
// until real multi-tenant sessions land.
// ============================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { encryptJson } from "@/lib/connectors/crypto";
import { INTEGRATION_TEST_ORG_ID } from "@/lib/demo-context";

export const dynamic = "force-dynamic";

const DEFAULT_BASE = "https://api.hubapi.com";

export async function GET() {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("connector_credentials")
    .select("base_url, status, last_synced_at, last_result, last_error, updated_at")
    .eq("organization_id", INTEGRATION_TEST_ORG_ID)
    .eq("source_id", "hubspot")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configured: data !== null, connection: data });
}

export async function PUT(request: Request) {
  let body: { token?: string; baseUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const token = (body.token ?? "").trim();
  const baseUrl = (body.baseUrl ?? DEFAULT_BASE).trim().replace(/\/$/, "");
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // Validate live before saving — same "test call before save" behavior
  // the prototype smoke tests established.
  try {
    const probe = await fetch(`${baseUrl}/crm/v3/objects/companies?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!probe.ok) {
      const text = await probe.text();
      return NextResponse.json(
        { error: `HubSpot rejected the credentials (${probe.status}): ${text.slice(0, 160)}` },
        { status: 400 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Could not reach ${baseUrl}: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  const admin = await createAdminClient();
  const { error } = await admin.from("connector_credentials").upsert(
    {
      organization_id: INTEGRATION_TEST_ORG_ID,
      source_id: "hubspot",
      base_url: baseUrl,
      encrypted: encryptJson({ token }),
      status: "configured",
      last_error: null,
    },
    { onConflict: "organization_id,source_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
