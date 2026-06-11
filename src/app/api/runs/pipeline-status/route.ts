import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import { ALL_PIPELINE_CODES } from "@/lib/workflows/pipeline";

export type PipelineRunRow = {
  id: string;
  agent_code: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  summary: string | null;
};

/**
 * Latest run per workflow code for the demo brand — the Command
 * Center's single source of truth for status chips.
 */
export async function GET() {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("run_history")
    .select("id, agent_code, status, started_at, finished_at, error_message, summary")
    .eq("brand_id", DEMO_BRAND_ID)
    .in("agent_code", ALL_PIPELINE_CODES)
    .order("started_at", { ascending: false })
    .limit(400);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const latest: Record<string, PipelineRunRow> = {};
  for (const row of (data ?? []) as PipelineRunRow[]) {
    if (row.agent_code && !latest[row.agent_code]) latest[row.agent_code] = row;
  }
  return NextResponse.json({ runs: latest });
}
