import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_TENANT_ID, DEMO_BRAND_ID } from "@/lib/demo-context";

// ============================================================
// BRAND LEARNINGS — layer 5 of the brand code: durable operating
// intelligence about how the brand works. Active learnings reach
// EVERY workflow run via the engine's brand-code block.
//
// Governing rule: artifacts are hypotheses; brand code is accepted
// truth; feedback/approval are the promotion gates. This route IS
// the promotion gate's mechanism.
//
// GET                                  → list learnings
// POST  { statement, layer?, source?, confidence?, evidenceTable?,
//         evidenceId?, feedbackId? }   → promote a learning; when
//         feedbackId is set the source feedback flips to applied.
// PATCH { id, active }                 → retire / reinstate
// ============================================================

const LAYERS = ["identity", "strategy", "market", "customer", "operating"];
const SOURCES = ["feedback", "performance", "approval_pattern", "manual"];
const CONFIDENCE = ["confirmed", "probable", "tentative"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("include_inactive") === "1";
  const admin = await createAdminClient();
  let q = admin
    .from("brand_learnings")
    .select("id, statement, layer, source, confidence, evidence_table, evidence_id, active, created_by, created_at")
    .eq("organization_id", DEMO_TENANT_ID)
    .eq("brand_id", DEMO_BRAND_ID)
    .order("created_at", { ascending: false })
    .limit(200);
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ learnings: data ?? [] });
}

interface PostBody {
  statement?: string;
  layer?: string;
  source?: string;
  confidence?: string;
  evidenceTable?: string | null;
  evidenceId?: string | null;
  feedbackId?: string | null;
  createdBy?: string;
}

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const statement = (body.statement ?? "").trim();
  if (!statement) return NextResponse.json({ error: "statement is required" }, { status: 400 });
  const layer = LAYERS.includes(body.layer ?? "") ? body.layer! : "operating";
  const source = SOURCES.includes(body.source ?? "") ? body.source! : "feedback";
  const confidence = CONFIDENCE.includes(body.confidence ?? "") ? body.confidence! : "confirmed";

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("brand_learnings")
    .insert({
      organization_id: DEMO_TENANT_ID,
      brand_id: DEMO_BRAND_ID,
      statement,
      layer,
      source,
      confidence,
      evidence_table: body.evidenceTable ?? (body.feedbackId ? "workflow_feedback" : null),
      evidence_id: body.evidenceId ?? body.feedbackId ?? null,
      created_by: body.createdBy ?? "",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Promotion closes the loop on the source feedback.
  if (body.feedbackId) {
    await admin
      .from("workflow_feedback")
      .update({ status: "applied", applied_via: "brand_learning", resolved_at: new Date().toISOString() })
      .eq("organization_id", DEMO_TENANT_ID)
      .eq("id", body.feedbackId);
  }
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  let body: { id?: string; active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (!body.id || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "id and active (boolean) required" }, { status: 400 });
  }
  const admin = await createAdminClient();
  const { error } = await admin
    .from("brand_learnings")
    .update({ active: body.active })
    .eq("organization_id", DEMO_TENANT_ID)
    .eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
