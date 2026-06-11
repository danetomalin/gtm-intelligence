import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";

/**
 * Run-by-run cost ledger for the Command Center. ?days=1|7|30 filters
 * by start date; omitted = all history. Pre-tracking runs appear with
 * null token/cost fields.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? 0);

  const admin = await createAdminClient();
  let query = admin
    .from("run_history")
    .select("id, agent_code, status, started_at, finished_at, provider, model, input_tokens, output_tokens, cost_usd")
    .eq("brand_id", DEMO_BRAND_ID)
    .order("started_at", { ascending: false })
    .limit(300);
  if (days > 0) {
    query = query.gte("started_at", new Date(Date.now() - days * 86_400_000).toISOString());
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ runs: data ?? [] });
}
