import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  DEMO_TENANT_ID,
  DEMO_BRAND_ID,
  DEMO_BRAND_NAME,
  DEMO_BRAND_WEBSITE,
} from "@/lib/demo-context";
import { normalizeAgentCode, webhookPathFor } from "@/lib/agent-config";
import { buildDailyBriefSnapshot } from "@/lib/daily-brief-snapshot";
import { isNativeCsCode, runNativeCsWorkflow } from "@/lib/workflows/cs-runner";
import { runWorkflowSpec } from "@/lib/workflows/engine";
import { WORKFLOW_REGISTRY, isRegistryCode } from "@/lib/workflows/registry";
import { isDistributionCode, runDistribution } from "@/lib/workflows/distribution-runner";

// Native runs execute the LLM call inside this function — keep it alive.
export const maxDuration = 60;

const N8N_BASE_URL =
  process.env.N8N_WEBHOOK_BASE_URL ?? "https://gtmintelligence.app.n8n.cloud";

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
        ...(result.ok ? {} : { error_message: result.error }),
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
        ...(result.ok ? {} : { error_message: result.error }),
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

  const webhookPath = code ? webhookPathFor(code) : null;

  if (!code || !webhookPath) {
    return NextResponse.json(
      { error: `Agent ${rawCode} is not live yet.` },
      { status: 404 },
    );
  }

  // Optional JSON body. Two reserved keys:
  //   brandId: target a brand other than the demo Throughline brand (used by
  //     the end-to-end orchestrator script for cold-start tests on new brands)
  //   organizationId: matching tenant override
  // Everything else gets passed through to n8n via extras.
  let extras: Record<string, unknown> = {};
  let targetBrandId = DEMO_BRAND_ID;
  let targetOrgId = DEMO_TENANT_ID;
  let targetBrandName = DEMO_BRAND_NAME;
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        extras = body as Record<string, unknown>;
        if (typeof extras.brandId === "string") {
          targetBrandId = extras.brandId;
        }
        if (typeof extras.organizationId === "string") {
          targetOrgId = extras.organizationId;
        }
        if (typeof extras.brandName === "string") {
          targetBrandName = extras.brandName;
        }
      }
    } catch {
      // Empty / malformed body is fine; agents that don't need extras still work.
    }
  }

  const admin = await createAdminClient();

  const { data: run, error: runErr } = await admin
    .from("run_history")
    .insert({
      organization_id: targetOrgId,
      brand_id: targetBrandId,
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

  // S-DB compiles the platform snapshot server-side and feeds it to n8n as
  // extras. The simplified S-DB workflow only has to call Gemini and write
  // the brief — no Supabase reads inside n8n.
  if (code === "S-DB") {
    try {
      const snapshot = await buildDailyBriefSnapshot(admin, targetBrandId);
      extras = { ...extras, snapshot, today: new Date().toISOString().slice(0, 10) };
    } catch (err) {
      await admin
        .from("run_history")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_message:
            "snapshot build failed: " +
            (err instanceof Error ? err.message : String(err)),
        })
        .eq("id", run.id);
      return NextResponse.json(
        { error: "Snapshot build failed" },
        { status: 500 },
      );
    }
  }

  const payload = {
    tenantId: targetOrgId,
    brandId: targetBrandId,
    runId: run.id,
    brandName: targetBrandName,
    websiteUrl: DEMO_BRAND_WEBSITE,
    category: null as string | null,
    ...extras,
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
          error_message: `n8n webhook returned ${res.status}: ${await res.text().catch(() => "")}`,
        })
        .eq("id", run.id);
      return NextResponse.json(
        { error: `n8n webhook returned ${res.status}` },
        { status: 502 },
      );
    }
  } catch (err) {
    await admin
      .from("run_history")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq("id", run.id);
    return NextResponse.json(
      { error: "Failed to reach n8n" },
      { status: 502 },
    );
  }

  return NextResponse.json({ runId: run.id });
}
