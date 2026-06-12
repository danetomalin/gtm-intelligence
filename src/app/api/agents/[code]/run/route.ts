import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_TENANT_ID, DEMO_BRAND_ID } from "@/lib/demo-context";
import { normalizeAgentCode } from "@/lib/agent-config";
import { isNativeCsCode, runNativeCsWorkflow } from "@/lib/workflows/cs-runner";
import { runWorkflowSpec } from "@/lib/workflows/engine";
import { WORKFLOW_REGISTRY, isRegistryCode } from "@/lib/workflows/registry";
import { isDistributionCode, runDistribution } from "@/lib/workflows/distribution-runner";
import { costUsd } from "@/lib/llm/pricing";

/** run_history columns for a finished run's token usage + frozen cost. */
function usageColumns(usage?: { provider: string; model: string; inputTokens: number; outputTokens: number }) {
  if (!usage || (usage.inputTokens === 0 && usage.outputTokens === 0)) return {};
  return {
    provider: usage.provider,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cost_usd: costUsd(usage.model, usage),
  };
}

// Native runs execute the LLM call inside this function — keep it alive.
// 300s (Fluid compute): heavy synthesis runs (S-PO writes all five
// positioning elements + a possible corrective retry in one invocation)
// were 504ing at the old 60s ceiling.
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  // Canonicalize. Accepts new codes ("R-CI", "r-ci") and legacy A1–A8.
  const code = normalizeAgentCode(rawCode);

  // ── A0 is form-driven, not an agent run: brands are created through
  // Setup → New brand (/onboarding). Nothing to execute.
  if (code === "A0") {
    return NextResponse.json(
      { error: "A0 is form-driven — create brands via Setup → New brand. No agent run needed." },
      { status: 400 },
    );
  }

  // ── Native path: distribution adapters (deterministic mock sends,
  // no LLM). Optional extras: { artifactTable, artifactId }.
  if (code && isDistributionCode(code)) {
    let extras: { artifactTable?: string; artifactId?: string } = {};
    if (request.headers.get("content-type")?.includes("application/json")) {
      try {
        const body = await request.json();
        if (body && typeof body === "object") extras = body as typeof extras;
      } catch {
        // empty body is fine
      }
    }
    const admin = await createAdminClient();
    const { data: run, error: runErr } = await admin
      .from("run_history")
      .insert({
        organization_id: DEMO_TENANT_ID,
        brand_id: DEMO_BRAND_ID,
        agent_code: code,
        status: "running",
      })
      .select("id")
      .single();
    if (runErr || !run) {
      return NextResponse.json({ error: runErr?.message ?? "Failed to create run row" }, { status: 500 });
    }
    let result: Awaited<ReturnType<typeof runDistribution>>;
    try {
      result = await runDistribution(admin, code, extras);
    } catch (err) {
      result = { ok: false, error: err instanceof Error ? err.message : "Adapter failure", status: 500 };
    }
    await admin
      .from("run_history")
      .update({
        status: result.ok ? "success" : "error",
        finished_at: new Date().toISOString(),
        ...(result.ok ? {} : { error_message: result.error }),
      })
      .eq("id", run.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
    }
    return NextResponse.json({ runId: run.id, native: true, summary: result.summary });
  }

  // ── Native path (n8n migration): registry workflows run as Vercel
  // code through the generic engine. Credentials + optional Tavily key
  // arrive in headers from the browser credential store.
  if (code && isRegistryCode(code)) {
    const provider = request.headers.get("x-llm-provider") ?? "anthropic";
    let apiKey = request.headers.get("x-llm-key") ?? "";
    if (!apiKey && provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      apiKey = process.env.ANTHROPIC_API_KEY;
    }
    const cred = {
      provider,
      apiKey,
      model: request.headers.get("x-llm-model") ?? "",
      baseUrl: request.headers.get("x-llm-base-url") ?? "",
    };
    const searchKey = request.headers.get("x-search-key") ?? process.env.TAVILY_API_KEY ?? "";

    const admin = await createAdminClient();
    const { data: run, error: runErr } = await admin
      .from("run_history")
      .insert({
        organization_id: DEMO_TENANT_ID,
        brand_id: DEMO_BRAND_ID,
        agent_code: code,
        status: "running",
      })
      .select("id")
      .single();
    if (runErr || !run) {
      return NextResponse.json(
        { error: runErr?.message ?? "Failed to create run row" },
        { status: 500 },
      );
    }

    let result: Awaited<ReturnType<typeof runWorkflowSpec>>;
    try {
      result = await runWorkflowSpec(admin, WORKFLOW_REGISTRY[code], cred, searchKey || undefined);
    } catch (err) {
      result = { ok: false, error: err instanceof Error ? err.message : "Engine failure", status: 500 };
    }
    await admin
      .from("run_history")
      .update({
        status: result.ok ? "success" : "error",
        finished_at: new Date().toISOString(),
        ...(result.ok ? { summary: result.summary } : { error_message: result.error }),
        ...usageColumns(result.usage),
      })
      .eq("id", run.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
    }
    return NextResponse.json({ runId: run.id, native: true, summary: result.summary });
  }

  // ── Native path (Phase C): CS workflows run as Vercel code, not n8n.
  // Instructions come from workflow_configs, credentials from the
  // request headers (the assigned profile in Settings), data from the
  // live Customer Health tables.
  if (code && isNativeCsCode(code)) {
    const provider = request.headers.get("x-llm-provider") ?? "anthropic";
    let apiKey = request.headers.get("x-llm-key") ?? "";
    if (!apiKey && provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      apiKey = process.env.ANTHROPIC_API_KEY;
    }
    const cred = {
      provider,
      apiKey,
      model: request.headers.get("x-llm-model") ?? "",
      baseUrl: request.headers.get("x-llm-base-url") ?? "",
    };

    const admin = await createAdminClient();
    const { data: run, error: runErr } = await admin
      .from("run_history")
      .insert({
        organization_id: DEMO_TENANT_ID,
        brand_id: DEMO_BRAND_ID,
        agent_code: code,
        status: "running",
      })
      .select("id")
      .single();
    if (runErr || !run) {
      return NextResponse.json(
        { error: runErr?.message ?? "Failed to create run row" },
        { status: 500 },
      );
    }

    const result = await runNativeCsWorkflow(admin, code, cred);
    await admin
      .from("run_history")
      .update({
        status: result.ok ? "success" : "error",
        finished_at: new Date().toISOString(),
        ...(result.ok ? { summary: result.title } : { error_message: result.error }),
        ...usageColumns(result.usage),
      })
      .eq("id", run.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
    }
    return NextResponse.json({
      runId: run.id,
      native: true,
      assetId: result.assetId,
      title: result.title,
    });
  }

  // Every workflow runs natively (registry / CS runner / distribution
  // adapters; A0 is form-driven). Anything else is simply unknown — the
  // n8n webhook fallback was removed when the chain was decommissioned.
  return NextResponse.json(
    { error: `Unknown workflow code: ${rawCode}` },
    { status: 404 },
  );
}
