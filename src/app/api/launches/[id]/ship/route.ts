// POST /api/launches/[id]/ship
//
// Capability 7 Phase 9C — for every required X-* (distribution) slot in this
// launch's readiness pack, find the latest produced + approved D-* artifact
// for this brand and fire the corresponding distribution webhook with the
// artifact_table + artifact_id in extras. Marks the launch as 'shipped' when
// at least one distribution fires.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  DEMO_TENANT_ID,
  DEMO_BRAND_ID,
  DEMO_BRAND_NAME,
  DEMO_BRAND_WEBSITE,
} from "@/lib/demo-context";
import { webhookPathFor } from "@/lib/agent-config";

const N8N_BASE_URL =
  process.env.N8N_WEBHOOK_BASE_URL ?? "https://gtmintelligence.app.n8n.cloud";

// Each X-* channel pulls from a specific delivery table. v1 uses the most
// recent approved row from that table; v2 will use the launch_id-tagged row
// specifically once D-* outputs carry the link.
const CHANNEL_SOURCE: Record<
  string,
  { artifact_table: "content_outputs" | "sales_collateral" | "counter_narrative_memos"; default_audience: string; default_size: number }
> = {
  "X-EM": { artifact_table: "content_outputs", default_audience: "Marketing list · last 90 days", default_size: 480 },
  "X-LI": { artifact_table: "content_outputs", default_audience: "Company-page followers", default_size: 12500 },
  "X-OR": { artifact_table: "sales_collateral", default_audience: "Outreach sequence · launch ICP", default_size: 200 },
  "X-AP": { artifact_table: "sales_collateral", default_audience: "Apollo sequence · launch ICP", default_size: 300 },
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: launchId } = await params;
  const admin = await createAdminClient();

  // 1. Launch existence + status.
  const { data: launch, error: launchErr } = await admin
    .from("launches")
    .select("id, name, tier, status")
    .eq("brand_id", DEMO_BRAND_ID)
    .eq("id", launchId)
    .maybeSingle();
  if (launchErr || !launch) {
    return NextResponse.json(
      { error: launchErr?.message ?? "Launch not found" },
      { status: 404 },
    );
  }
  if (launch.status === "shipped" || launch.status === "post_mortem") {
    return NextResponse.json(
      { error: `Launch is already ${launch.status}.` },
      { status: 409 },
    );
  }

  // 2. Find required X-* slots that haven't fired yet.
  const { data: slotRows, error: slotErr } = await admin
    .from("launch_artifacts")
    .select("id, agent_code, required, produced")
    .eq("brand_id", DEMO_BRAND_ID)
    .eq("launch_id", launchId)
    .eq("required", true)
    .like("agent_code", "X-%");
  if (slotErr) {
    return NextResponse.json({ error: slotErr.message }, { status: 500 });
  }
  const channels = (slotRows ?? []).filter((s) => !s.produced);
  if (channels.length === 0) {
    return NextResponse.json({
      message: "No distribution channels left to ship.",
      fired: 0,
    });
  }

  // 3. Fire each X-* with the latest approved D-* artifact for its source table.
  const results: Array<{ agent_code: string; ok: boolean; error?: string; artifact_id?: string }> = [];

  for (const slot of channels) {
    const source = CHANNEL_SOURCE[slot.agent_code];
    if (!source) {
      results.push({ agent_code: slot.agent_code, ok: false, error: "unknown channel" });
      continue;
    }

    // Pick the most recent approved-or-published artifact from the source table.
    const { data: artifactRow } = await admin
      .from(source.artifact_table)
      .select("id, approval_status")
      .eq("brand_id", DEMO_BRAND_ID)
      .in("approval_status", ["approved", "published"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!artifactRow) {
      results.push({
        agent_code: slot.agent_code,
        ok: false,
        error: `No approved ${source.artifact_table} artifact to ship`,
      });
      continue;
    }

    const webhookPath = webhookPathFor(slot.agent_code);
    if (!webhookPath) {
      results.push({ agent_code: slot.agent_code, ok: false, error: "no webhook path" });
      continue;
    }

    // run_history bookkeeping per channel send.
    const { data: run, error: runErr } = await admin
      .from("run_history")
      .insert({
        organization_id: DEMO_TENANT_ID,
        brand_id: DEMO_BRAND_ID,
        agent_code: slot.agent_code,
        status: "running",
      })
      .select("id")
      .single();
    if (runErr || !run) {
      results.push({
        agent_code: slot.agent_code,
        ok: false,
        error: runErr?.message ?? "failed to create run",
      });
      continue;
    }

    const payload = {
      tenantId: DEMO_TENANT_ID,
      brandId: DEMO_BRAND_ID,
      runId: run.id,
      brandName: DEMO_BRAND_NAME,
      websiteUrl: DEMO_BRAND_WEBSITE,
      launch_id: launchId,
      launch_name: launch.name,
      artifactTable: source.artifact_table,
      artifactId: artifactRow.id,
      audienceDescriptor: source.default_audience,
      audienceSize: source.default_size,
    };

    try {
      const res = await fetch(`${N8N_BASE_URL}${webhookPath}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        await admin
          .from("run_history")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            error_message: `n8n returned ${res.status}`,
          })
          .eq("id", run.id);
        results.push({
          agent_code: slot.agent_code,
          ok: false,
          error: `n8n returned ${res.status}`,
        });
        continue;
      }
      results.push({ agent_code: slot.agent_code, ok: true, artifact_id: artifactRow.id });

      // Mark the slot produced + record the artifact_id link (we know it now).
      await admin
        .from("launch_artifacts")
        .update({
          produced: true,
          produced_at: new Date().toISOString(),
          artifact_id: artifactRow.id,
          status_when_produced: "running",
        })
        .eq("id", slot.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await admin
        .from("run_history")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_message: msg,
        })
        .eq("id", run.id);
      results.push({ agent_code: slot.agent_code, ok: false, error: msg });
    }
  }

  // 4. If anything fired, mark the launch shipped.
  const okCount = results.filter((r) => r.ok).length;
  if (okCount > 0) {
    await admin
      .from("launches")
      .update({
        status: "shipped",
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", launchId);
  }

  return NextResponse.json({
    fired: okCount,
    errors: results.length - okCount,
    shipped: okCount > 0,
    results,
  });
}
