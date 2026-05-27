// Minimal HITL approval transition endpoint (Phase 1 §6 cut).
// Accepts { table, id, action, comment? } and moves the artifact through the
// lifecycle defined in PLAN §6a. Full Review Queue UI lands in Phase 5; this
// endpoint is the thin server-side surface that powers the two-button
// ApprovalButtons component embedded in delivery cards.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Whitelist of D-* / X-* tables the approval endpoint is allowed to mutate.
// Adding a new delivery agent: extend this set and ensure the table carries
// the HITL columns from migration 0009 (or later mirror migrations).
const APPROVAL_TABLES = new Set<string>([
  "content_outputs",
  "sales_collateral",
  "counter_narrative_memos",
  "enablement_assets",
  "super_user_cohorts",
  "voc_extractions",
  "icp_definitions",
  // Capability 12: deployment forking. Both tables HITL-gated.
  "deployment_assessments",
  "deployment_formats",
]);

type Action =
  | "approve"
  | "reject"
  | "request_revision"
  | "publish"
  | "unapprove";

const ACTION_TO_STATUS: Record<Action, string> = {
  approve: "approved",
  reject: "rejected",
  request_revision: "needs_revision",
  publish: "published",
  // Unapprove kicks the artifact back into the Review Queue so a reviewer
  // can re-examine. Clears the approved_at + published_at stamps so the
  // approval-state machine reads cleanly on the next pass.
  unapprove: "pending_review",
};

export async function POST(request: Request) {
  let body: {
    table?: string;
    id?: string;
    action?: Action;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body must be JSON" },
      { status: 400 },
    );
  }

  const { table, id, action, comment } = body;

  if (!table || !APPROVAL_TABLES.has(table)) {
    return NextResponse.json(
      { error: `Unknown or disallowed table: ${table}` },
      { status: 400 },
    );
  }
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing artifact id" },
      { status: 400 },
    );
  }
  if (!action || !(action in ACTION_TO_STATUS)) {
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    );
  }

  const nextStatus = ACTION_TO_STATUS[action];

  // Build the update patch. Approve/publish stamp timestamps; reject and
  // request_revision capture the reviewer comment. Unapprove clears both
  // approval stamps so the row reads as never-approved on the next pass.
  const patch: Record<string, unknown> = { approval_status: nextStatus };
  const nowIso = new Date().toISOString();
  if (action === "approve") {
    patch.approved_at = nowIso;
  } else if (action === "publish") {
    patch.published_at = nowIso;
  } else if (action === "unapprove") {
    patch.approved_at = null;
    patch.published_at = null;
    if (comment) patch.reviewer_comment = comment;
  }
  if ((action === "reject" || action === "request_revision") && comment) {
    patch.reviewer_comment = comment;
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from(table)
    .update(patch)
    .eq("id", id)
    .select("id, approval_status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 500 },
    );
  }

  // Decision 16 (2026-05-26): on approval of an icp_definitions row, the
  // approved version becomes the active canonical ICP and S-PO's
  // best-fit-accounts element is refreshed automatically so positioning
  // stays in sync. Both actions are best-effort — the approval itself is
  // already committed, so any post-hook failure surfaces in run_history
  // rather than blocking the approval response.
  let sideEffects: Record<string, unknown> | null = null;
  if (table === "icp_definitions" && action === "approve") {
    sideEffects = await activateIcpAndRefreshSpo(admin, id);
  }

  return NextResponse.json({
    id: data.id,
    approval_status: data.approval_status,
    side_effects: sideEffects,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function activateIcpAndRefreshSpo(admin: any, icpId: string) {
  const out: Record<string, unknown> = {};
  // Look up the approved ICP so we know which brand to scope the activation to
  const { data: icpRow } = await admin
    .from("icp_definitions")
    .select("id, brand_id, organization_id, version")
    .eq("id", icpId)
    .single();
  if (!icpRow) return { error: "icp_lookup_failed" };

  // Deactivate any other active ICP for this brand
  const { error: deactErr } = await admin
    .from("icp_definitions")
    .update({ is_active: false })
    .eq("brand_id", icpRow.brand_id)
    .neq("id", icpId)
    .eq("is_active", true);
  if (deactErr) out.deactivate_error = deactErr.message;

  // Mark this row active + stamp spo_refreshed_at as the trigger time
  const nowIso = new Date().toISOString();
  const { error: actErr } = await admin
    .from("icp_definitions")
    .update({ is_active: true, spo_refreshed_at: nowIso })
    .eq("id", icpId);
  if (actErr) out.activate_error = actErr.message;
  out.activated = !actErr;

  // Fire S-PO via the existing webhook map, passing icp_definition_id in
  // the payload so the workflow can read the approved ICP for the refresh.
  // Imported here to avoid a circular import at module load.
  try {
    const { AGENT_WEBHOOK_PATHS } = await import("@/lib/agent-config");
    const spoPath = AGENT_WEBHOOK_PATHS["S-PO"];
    if (spoPath && process.env.N8N_BASE_URL) {
      const url = `${process.env.N8N_BASE_URL.replace(/\/$/, "")}${spoPath}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: icpRow.brand_id,
          organization_id: icpRow.organization_id,
          icp_definition_id: icpId,
          source: "icp_approval_hook",
        }),
      });
      out.spo_refresh_status = resp.status;
    } else {
      out.spo_refresh_status = "skipped_no_webhook";
    }
  } catch (e) {
    out.spo_refresh_error = e instanceof Error ? e.message : String(e);
  }
  return out;
}
