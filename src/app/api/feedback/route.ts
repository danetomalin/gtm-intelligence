import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_TENANT_ID, DEMO_BRAND_ID } from "@/lib/demo-context";

// ============================================================
// WORKFLOW FEEDBACK — the output→input loop (BACKLOG item 1).
//
// GET   ?workflow_code=&status=       → list feedback
// POST  { workflowCode, verdict, comment, scope, artifactTable?,
//         artifactId?, action? }      → record feedback
//   Structured action (strongest application layer): when
//   action = { type: "deactivate_competitor", competitorName } the
//   route flips brand_competitors.active = false in the same call
//   and the feedback lands already-applied — the correction becomes
//   DATA, never prompt text.
// PATCH { id, status: applied|dismissed, appliedVia? } → resolve
// ============================================================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowCode = searchParams.get("workflow_code");
  const status = searchParams.get("status");
  const admin = await createAdminClient();
  let q = admin
    .from("workflow_feedback")
    .select("id, workflow_code, artifact_table, artifact_id, verdict, comment, scope, status, applied_via, created_by, created_at, resolved_at")
    .eq("organization_id", DEMO_TENANT_ID)
    .order("created_at", { ascending: false })
    .limit(100);
  if (workflowCode) q = q.eq("workflow_code", workflowCode.toUpperCase());
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data ?? [] });
}

interface PostBody {
  workflowCode?: string;
  artifactTable?: string | null;
  artifactId?: string | null;
  verdict?: string;
  comment?: string;
  scope?: string;
  createdBy?: string;
  action?: { type: "deactivate_competitor"; competitorName: string } | null;
}

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (!body.workflowCode || !body.verdict) {
    return NextResponse.json({ error: "workflowCode and verdict are required" }, { status: 400 });
  }
  if (!["keep", "not_relevant", "needs_change"].includes(body.verdict)) {
    return NextResponse.json({ error: `Invalid verdict: ${body.verdict}` }, { status: 400 });
  }
  const scope = body.scope === "brand" ? "brand" : "workflow";
  const admin = await createAdminClient();

  // Structured action first — if it succeeds the feedback is applied
  // at birth (the data changed; no prompt text needed).
  let structuredResult: string | null = null;
  if (body.action?.type === "deactivate_competitor" && body.action.competitorName) {
    const { data: comp, error: compErr } = await admin
      .from("brand_competitors")
      .update({ active: false })
      .eq("organization_id", DEMO_TENANT_ID)
      .eq("brand_id", DEMO_BRAND_ID)
      .ilike("name", body.action.competitorName)
      .select("id, name");
    if (compErr) return NextResponse.json({ error: compErr.message }, { status: 500 });
    if (comp && comp.length > 0) {
      structuredResult = `Deactivated competitor "${comp[0].name}" — future research runs skip it.`;
    }
  }

  const { data, error } = await admin
    .from("workflow_feedback")
    .insert({
      organization_id: DEMO_TENANT_ID,
      brand_id: DEMO_BRAND_ID,
      workflow_code: body.workflowCode.toUpperCase(),
      artifact_table: body.artifactTable ?? null,
      artifact_id: body.artifactId ?? null,
      verdict: body.verdict,
      comment: body.comment ?? "",
      scope,
      created_by: body.createdBy ?? "",
      ...(structuredResult
        ? { status: "applied", applied_via: "structured_action", resolved_at: new Date().toISOString() }
        : {}),
    })
    .select("id, status")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, status: data.status, structuredResult });
}

export async function PATCH(request: Request) {
  let body: { id?: string; status?: string; appliedVia?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (!body.id || !body.status || !["applied", "dismissed"].includes(body.status)) {
    return NextResponse.json({ error: "id and status (applied|dismissed) required" }, { status: 400 });
  }
  const admin = await createAdminClient();
  const { error } = await admin
    .from("workflow_feedback")
    .update({
      status: body.status,
      applied_via: body.status === "dismissed" ? "dismissed" : (body.appliedVia ?? null),
      resolved_at: new Date().toISOString(),
    })
    .eq("organization_id", DEMO_TENANT_ID)
    .eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
