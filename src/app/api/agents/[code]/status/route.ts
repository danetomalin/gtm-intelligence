import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import { normalizeAgentCode } from "@/lib/agent-config";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  // Accepts new codes and legacy A1–A8; for legacy, returns rows under either
  // form since the run_history rename happens via migration not on read.
  const code = normalizeAgentCode(rawCode) ?? rawCode.toUpperCase();
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");
  const admin = await createAdminClient();

  const query = admin
    .from("run_history")
    .select(
      "id, status, started_at, finished_at, error_message, summary, agent_code",
    );

  const { data, error } = runId
    ? await query.eq("id", runId).maybeSingle()
    : await query
        .eq("brand_id", DEMO_BRAND_ID)
        .eq("agent_code", code)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? { status: null });
}
