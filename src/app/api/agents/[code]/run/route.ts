import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  DEMO_TENANT_ID,
  DEMO_BRAND_ID,
  DEMO_BRAND_NAME,
  DEMO_BRAND_WEBSITE,
} from "@/lib/demo-context";
import { normalizeAgentCode, webhookPathFor } from "@/lib/agent-config";

const N8N_BASE_URL =
  process.env.N8N_WEBHOOK_BASE_URL ?? "https://gtmintelligence.app.n8n.cloud";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  // Canonicalize. Accepts new codes ("R-CI", "r-ci") and legacy A1–A8.
  const code = normalizeAgentCode(rawCode);
  const webhookPath = code ? webhookPathFor(code) : null;

  if (!code || !webhookPath) {
    return NextResponse.json(
      { error: `Agent ${rawCode} is not live yet.` },
      { status: 404 },
    );
  }

  // Some agents (e.g. R-BR Brand Repository) need extra payload beyond the
  // default tenant/brand/run identifiers. Accept an optional JSON body whose
  // top-level fields get merged into the n8n payload.
  let extras: Record<string, unknown> = {};
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        extras = body as Record<string, unknown>;
      }
    } catch {
      // Empty / malformed body is fine; agents that don't need extras still work.
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
    return NextResponse.json(
      { error: runErr?.message ?? "Failed to create run row" },
      { status: 500 },
    );
  }

  const payload = {
    tenantId: DEMO_TENANT_ID,
    brandId: DEMO_BRAND_ID,
    runId: run.id,
    brandName: DEMO_BRAND_NAME,
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
