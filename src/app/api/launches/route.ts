// POST /api/launches — create a new launch + seed launch_artifacts rows per
// the tier matrix. Returns the created launch id.
//
// Phase 9A foundation surface. L-OR orchestration (Phase 9B) reads the seeded
// rows and fires the corresponding agents with `launch_id` in extras.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_TENANT_ID, DEMO_BRAND_ID } from "@/lib/demo-context";
import { TIER_MATRIX, isValidTier, type LaunchTier } from "@/lib/launch-tiers";

export async function POST(request: Request) {
  let body: {
    name?: string;
    tier?: string;
    product_summary?: string;
    launch_date_target?: string | null;
    linked_signal_id?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const tier = (body.tier ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!isValidTier(tier)) {
    return NextResponse.json(
      { error: `tier must be one of: flagship, feature, bugfix, revenue_growth, revenue_retention` },
      { status: 400 },
    );
  }

  const admin = await createAdminClient();

  // 1. Insert the launch row.
  const { data: launch, error: launchErr } = await admin
    .from("launches")
    .insert({
      organization_id: DEMO_TENANT_ID,
      brand_id: DEMO_BRAND_ID,
      name,
      tier,
      product_summary: body.product_summary ?? null,
      launch_date_target: body.launch_date_target ?? null,
      linked_signal_id: body.linked_signal_id ?? null,
      status: "draft",
    })
    .select("id, tier")
    .single();

  if (launchErr || !launch) {
    return NextResponse.json(
      { error: launchErr?.message ?? "Failed to create launch" },
      { status: 500 },
    );
  }

  // 2. Seed launch_artifacts rows from the tier matrix.
  const matrix = TIER_MATRIX[tier as LaunchTier];
  const rows = matrix.map((entry) => ({
    organization_id: DEMO_TENANT_ID,
    brand_id: DEMO_BRAND_ID,
    launch_id: launch.id,
    artifact_table: entry.artifact_table,
    agent_code: entry.agent_code,
    required: entry.required,
    produced: false,
    notes: entry.quantity ?? null,
  }));

  if (rows.length > 0) {
    const { error: rowsErr } = await admin
      .from("launch_artifacts")
      .insert(rows);
    if (rowsErr) {
      return NextResponse.json(
        { error: `Launch created but failed to seed artifacts: ${rowsErr.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ id: launch.id, tier: launch.tier, artifact_count: rows.length });
}
