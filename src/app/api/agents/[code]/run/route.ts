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
