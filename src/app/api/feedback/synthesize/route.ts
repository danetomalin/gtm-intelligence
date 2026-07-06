import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_TENANT_ID, DEMO_BRAND_ID } from "@/lib/demo-context";
import { callProvider } from "@/lib/llm/providers";
import { costUsd } from "@/lib/llm/pricing";
import { resolveShared, isSharedId } from "@/lib/llm/sharedCredentials";
import { agentTooling } from "@/lib/demo-data";

// ============================================================
// INSTRUCTION SYNTHESIS — the third application layer.
//
// Merges a workflow's open feedback into a "USER STEERING NOTES"
// section appended to workflow_configs.instructions (the system
// prompt every run already uses). A cheap model distills raw
// comments into durable operating notes; existing steering notes
// are preserved and folded in. The applied feedback rows flip to
// status=applied so they stop riding run context verbatim.
//
// POST { workflowCode } + x-llm-* / x-llm-shared-id headers
// ============================================================

export const maxDuration = 60;

const MARKER = "=== USER STEERING NOTES ===";

function resolveCred(request: Request) {
  const sharedId = request.headers.get("x-llm-shared-id");
  if (sharedId && isSharedId(sharedId)) {
    const resolved = resolveShared(sharedId);
    if (resolved) return resolved;
  }
  const provider = request.headers.get("x-llm-provider") ?? "anthropic";
  let apiKey = request.headers.get("x-llm-key") ?? "";
  if (!apiKey && provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    apiKey = process.env.ANTHROPIC_API_KEY;
  }
  return {
    provider,
    apiKey,
    model: request.headers.get("x-llm-model") ?? "",
    baseUrl: request.headers.get("x-llm-base-url") ?? "",
  };
}

export async function POST(request: Request) {
  let body: { workflowCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const code = (body.workflowCode ?? "").toUpperCase();
  if (!code) return NextResponse.json({ error: "workflowCode required" }, { status: 400 });

  const cred = resolveCred(request);
  if (!cred.apiKey) {
    return NextResponse.json(
      { error: "No credential — assign a profile to this workflow in the Command Center Manage panel." },
      { status: 401 },
    );
  }

  const admin = await createAdminClient();
  const [{ data: rows, error: fbErr }, { data: cfg }] = await Promise.all([
    admin
      .from("workflow_feedback")
      .select("id, verdict, comment, scope")
      .eq("organization_id", DEMO_TENANT_ID)
      .eq("workflow_code", code)
      .eq("status", "new")
      .order("created_at", { ascending: true }),
    admin
      .from("workflow_configs")
      .select("instructions")
      .eq("organization_id", DEMO_TENANT_ID)
      .eq("workflow_code", code)
      .maybeSingle(),
  ]);
  if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 });
  const open = (rows ?? []).filter((r) => (r.comment ?? "").trim());
  if (open.length === 0) {
    return NextResponse.json({ error: "No open feedback with comments to apply." }, { status: 400 });
  }

  const current = cfg?.instructions ?? "";
  const markerIdx = current.indexOf(MARKER);
  const baseInstructions = (markerIdx >= 0 ? current.slice(0, markerIdx) : current).trimEnd();
  const existingNotes = markerIdx >= 0 ? current.slice(markerIdx + MARKER.length).trim() : "";
  const def = agentTooling.find((w) => w.code === code);

  const prompt = `You maintain the operating instructions for the "${def?.name ?? code}" workflow (${def?.purpose ?? "a GTM intelligence workflow"}).

EXISTING STEERING NOTES (keep what still applies, merge duplicates):
${existingNotes || "(none yet)"}

NEW USER FEEDBACK to fold in:
${open.map((f) => `- [${f.verdict}] ${f.comment}`).join("\n")}

Distill everything into 3-8 concise, imperative steering notes the workflow must follow on every future run. Each note on its own line starting with "- ". Merge overlapping notes, drop anything obsolete, keep the user's intent exactly — never soften a correction. Output ONLY the bullet list, no preamble.`;

  const result = await callProvider(
    { provider: cred.provider, apiKey: cred.apiKey, model: cred.model, baseUrl: cred.baseUrl },
    [{ role: "user", content: prompt }],
    { system: "You distill user feedback into precise operating notes. Output only the bullet list.", maxTokens: 800 },
  );
  if (!result.ok || !result.text.trim()) {
    return NextResponse.json({ error: result.error ?? "Synthesis model returned nothing." }, { status: result.status ?? 502 });
  }

  const notes = result.text.trim();
  const nextInstructions = `${baseInstructions}\n\n${MARKER}\n${notes}`.trim();

  const { error: upErr } = await admin.from("workflow_configs").upsert(
    {
      organization_id: DEMO_TENANT_ID,
      workflow_code: code,
      instructions: nextInstructions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,workflow_code" },
  );
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const ids = open.map((f) => f.id);
  await admin
    .from("workflow_feedback")
    .update({ status: "applied", applied_via: "instructions", resolved_at: new Date().toISOString() })
    .in("id", ids);

  // Bill the synthesis to the ledger like any other run.
  const usage = result.usage ?? { inputTokens: 0, outputTokens: 0 };
  await admin.from("run_history").insert({
    organization_id: DEMO_TENANT_ID,
    brand_id: DEMO_BRAND_ID,
    agent_code: code,
    status: "success",
    finished_at: new Date().toISOString(),
    summary: `Feedback synthesis: folded ${open.length} feedback item(s) into steering notes`,
    provider: cred.provider,
    model: cred.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cost_usd: costUsd(cred.model, { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }),
  });

  return NextResponse.json({ ok: true, appliedCount: open.length, steeringNotes: notes, instructions: nextInstructions });
}
