// POST /api/launches/[id]/generate
//
// Capability 7 orchestration. For every required launch_artifacts row that
// hasn't been produced yet, fires the corresponding agent webhook with the
// launch_id and brand context in extras. Updates launches.status to
// 'in_progress' once any generation has been kicked off.
//
// We orchestrate in the app rather than in an n8n L-OR workflow (PLAN §7d's
// L-OR concept) because the logic is short, traceable, and avoids another
// workflow surface to maintain. Functionally identical.

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

type ArtifactRow = {
  id: string;
  agent_code: string;
  required: boolean;
  produced: boolean;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: launchId } = await params;
  const admin = await createAdminClient();

  // 1. Verify the launch exists and grab its summary for downstream context.
  const { data: launch, error: launchErr } = await admin
    .from("launches")
    .select("id, name, tier, product_summary, status")
    .eq("brand_id", DEMO_BRAND_ID)
    .eq("id", launchId)
    .maybeSingle();
  if (launchErr || !launch) {
    return NextResponse.json(
      { error: launchErr?.message ?? "Launch not found" },
      { status: 404 },
    );
  }

  // 2. Read every artifact slot for the launch and pick the unproduced ones.
  const { data: artifactRows, error: rowsErr } = await admin
    .from("launch_artifacts")
    .select("id, agent_code, required, produced")
    .eq("brand_id", DEMO_BRAND_ID)
    .eq("launch_id", launchId);
  if (rowsErr) {
    return NextResponse.json({ error: rowsErr.message }, { status: 500 });
  }
  const slots = (artifactRows ?? []) as ArtifactRow[];
  const toFire = slots.filter((s) => s.required && !s.produced);
  if (toFire.length === 0) {
    return NextResponse.json({
      message: "Nothing to generate; all required artifacts already produced.",
      fired: 0,
    });
  }

  // 3. Fire each agent's webhook with launch_id + launch context in extras.
  //    We also create a run_history row per agent so the per-agent page can
  //    show the run that belongs to this launch. Firing is sequential by
  //    design (small launches; sequential makes downstream agents able to
  //    read earlier outputs).
  const results: Array<{ agent_code: string; ok: boolean; runId?: string; error?: string }> = [];
  for (const slot of toFire) {
    const webhookPath = webhookPathFor(slot.agent_code);
    if (!webhookPath) {
      results.push({ agent_code: slot.agent_code, ok: false, error: "no webhook path" });
      continue;
    }

    // Create the run row first so n8n's Mark Run Success can find it.
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
      launch_tier: launch.tier,
      launch_summary: launch.product_summary ?? "",
      // Some X-* adapters need an artifactTable + artifactId pair; for launch
      // generation they're filled by Phase 9C ship step, not generate. Leave
      // them absent — distribution agents will skip / error politely.
    };

    try {
      const res = await fetch(`${N8N_BASE_URL}${webhookPath}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        results.push({
          agent_code: slot.agent_code,
          ok: false,
          error: `n8n returned ${res.status}`,
        });
        await admin
          .from("run_history")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            error_message: `n8n webhook returned ${res.status}`,
          })
          .eq("id", run.id);
        continue;
      }
      results.push({ agent_code: slot.agent_code, ok: true, runId: run.id });

      // Optimistic launch_artifacts update — mark this slot as produced so the
      // readiness counter advances. v2 will wait for actual artifact_id and
      // backfill the link.
      await admin
        .from("launch_artifacts")
        .update({
          produced: true,
          produced_at: new Date().toISOString(),
          status_when_produced: "running",
        })
        .eq("id", slot.id);
    } catch (err) {
      results.push({
        agent_code: slot.agent_code,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
      await admin
        .from("run_history")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_message: err instanceof Error ? err.message : String(err),
        })
        .eq("id", run.id);
    }
  }

  // 4. Mark the launch as in_progress (if it was draft).
  if (launch.status === "draft") {
    await admin
      .from("launches")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", launchId);
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    fired: okCount,
    errors: results.length - okCount,
    results,
  });
}
