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
]);

type Action = "approve" | "reject" | "request_revision" | "publish";

const ACTION_TO_STATUS: Record<Action, string> = {
  approve: "approved",
  reject: "rejected",
  request_revision: "needs_revision",
  publish: "published",
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
  // request_revision capture the reviewer comment.
  const patch: Record<string, unknown> = { approval_status: nextStatus };
  const nowIso = new Date().toISOString();
  if (action === "approve") {
    patch.approved_at = nowIso;
  } else if (action === "publish") {
    patch.published_at = nowIso;
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

  return NextResponse.json({ id: data.id, approval_status: data.approval_status });
}
