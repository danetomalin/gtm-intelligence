// ============================================================
// GET /api/connectors — registry metadata + per-source connection
// status, for the registry-driven panel and the dashboard
// freshness control. Never includes credential values.
// ============================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { CONNECTORS } from "@/features/cs-health/connectors/registry";
import { INTEGRATION_TEST_ORG_ID } from "@/lib/demo-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("connector_credentials")
    .select("source_id, base_url, status, last_synced_at, last_result, last_error")
    .eq("organization_id", INTEGRATION_TEST_ORG_ID);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bySource = new Map((data ?? []).map((r) => [r.source_id, r]));
  const connectors = Object.values(CONNECTORS).map((c) => {
    const conn = bySource.get(c.id) ?? null;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      defaultBaseUrl: c.defaultBaseUrl,
      credentialFields: c.credentialFields,
      configured: conn !== null,
      connection: conn && {
        base_url: conn.base_url,
        status: conn.status,
        last_synced_at: conn.last_synced_at,
        last_result: conn.last_result,
        last_error: conn.last_error,
      },
    };
  });
  return NextResponse.json({ connectors });
}
