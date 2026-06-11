import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { STALE_RUN_MS } from "@/lib/workflows/pipeline";

/**
 * Mark every run still `running` past the stale threshold as an error.
 * The engine's serverless ceiling is 60s, so a 3-minute-old `running`
 * row means the function died without updating it (deploy interrupt,
 * crash, or a legacy n8n row).
 */
export async function POST() {
  const admin = await createAdminClient();
  const cutoff = new Date(Date.now() - STALE_RUN_MS).toISOString();
  const { data, error } = await admin
    .from("run_history")
    .update({
      status: "error",
      finished_at: new Date().toISOString(),
      error_message:
        "Timed out: still marked running past the 3-minute stale threshold (engine ceiling is 60s). Marked stale by the Command Center sweep.",
    })
    .eq("status", "running")
    .lt("started_at", cutoff)
    .select("id, agent_code");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    swept: (data ?? []).length,
    codes: (data ?? []).map((r) => r.agent_code),
  });
}
