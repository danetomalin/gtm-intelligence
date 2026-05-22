import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  DEMO_TENANT_ID,
  DEMO_BRAND_ID,
  DEMO_BRAND_NAME,
  DEMO_BRAND_WEBSITE,
} from "@/lib/demo-context";

const N8N_BASE_URL =
  process.env.N8N_WEBHOOK_BASE_URL ?? "https://gtmintelligence.app.n8n.cloud";
const A2_WEBHOOK_PATH = "/webhook/market-signals-supabase";

export async function POST(_request: Request) {
  const admin = await createAdminClient();

  // 1. Create the run_history row up-front so the UI has something to track
  // (and n8n's Mark Run Success node has a row to update).
  const { data: run, error: runErr } = await admin
    .from("run_history")
    .insert({
      organization_id: DEMO_TENANT_ID,
      brand_id: DEMO_BRAND_ID,
      agent_code: "A2",
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

  // 2. Fire-and-forget the n8n webhook. Don't await; n8n responds immediately
  // (onReceived mode) and the actual chain runs in the background.
  const payload = {
    tenantId: DEMO_TENANT_ID,
    brandId: DEMO_BRAND_ID,
    runId: run.id,
    brandName: DEMO_BRAND_NAME,
    websiteUrl: DEMO_BRAND_WEBSITE,
    category: null as string | null,
  };

  try {
    const res = await fetch(`${N8N_BASE_URL}${A2_WEBHOOK_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // Mark the run as error so the UI shows the failure
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
