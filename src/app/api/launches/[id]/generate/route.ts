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
  // LLM workflows run on browser-held BYOK credentials, which this
  // server route doesn't have (the n8n hop that used to absorb that is
  // decommissioned). Surface each needed workflow so the user fires it
  // from the Command Center; the slot flips to produced when its
  // artifact lands. Native server-side firing is on the backlog.
  const results: Array<{ agent_code: string; ok: boolean; runId?: string; error?: string }> = toFire.map((slot) => ({
    agent_code: slot.agent_code,
    ok: false,
    error: "Run this workflow from the Command Center (launch context noted) — server-side firing of LLM workflows is on the backlog.",
  }));

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
