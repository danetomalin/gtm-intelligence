// POST /api/launches/[id]/retrospective
//
// Capability 7 Phase 9C — fires S-CP (campaign performance) + D-WW (win wire)
// scoped to this launch. Marks the launch 'post_mortem' on success.

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

const RETROSPECTIVE_AGENTS = ["S-CP", "D-WW"];

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: launchId } = await params;
  const admin = await createAdminClient();

  const { data: launch, error: launchErr } = await admin
    .from("launches")
    .select("id, name, tier, status, shipped_at")
    .eq("brand_id", DEMO_BRAND_ID)
    .eq("id", launchId)
    .maybeSingle();
  if (launchErr || !launch) {
    return NextResponse.json(
      { error: launchErr?.message ?? "Launch not found" },
      { status: 404 },
    );
  }
  if (launch.status !== "shipped" && launch.status !== "post_mortem") {
    return NextResponse.json(
      { error: "Launch must be shipped before running a retrospective." },
      { status: 409 },
    );
  }

  const results: Array<{ agent_code: string; ok: boolean; runId?: string; error?: string }> = [];

  for (const agentCode of RETROSPECTIVE_AGENTS) {
    const webhookPath = webhookPathFor(agentCode);
    if (!webhookPath) {
      results.push({ agent_code: agentCode, ok: false, error: "no webhook path" });
      continue;
    }

    const { data: run, error: runErr } = await admin
      .from("run_history")
      .insert({
        organization_id: DEMO_TENANT_ID,
        brand_id: DEMO_BRAND_ID,
        agent_code: agentCode,
        status: "running",
      })
      .select("id")
      .single();
    if (runErr || !run) {
      results.push({
        agent_code: agentCode,
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
      retrospective_mode: true,
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
          agent_code: agentCode,
          ok: false,
          error: `n8n returned ${res.status}`,
        });
        continue;
      }
      results.push({ agent_code: agentCode, ok: true, runId: run.id });
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
      results.push({ agent_code: agentCode, ok: false, error: msg });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  if (okCount > 0) {
    await admin
      .from("launches")
      .update({
        status: "post_mortem",
        post_mortem_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", launchId);
  }

  return NextResponse.json({
    fired: okCount,
    errors: results.length - okCount,
    results,
  });
}
