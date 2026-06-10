// GET /api/runs/errors — recent failed/canceled runs across all brands
// (run failures are operational, not brand-scoped). Powers the
// Observability error panel. Demo-mode permissive.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("run_history")
    .select("id, agent_code, brand_id, status, started_at, finished_at, error_message")
    .in("status", ["error", "canceled"])
    .order("started_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve brand names for display.
  const brandIds = [...new Set((data ?? []).map((r) => r.brand_id).filter(Boolean))];
  const names = new Map<string, string>();
  if (brandIds.length > 0) {
    const { data: brands } = await admin
      .from("brands")
      .select("id, name")
      .in("id", brandIds);
    for (const b of brands ?? []) names.set(b.id, b.name);
  }

  return NextResponse.json({
    runs: (data ?? []).map((r) => ({
      id: r.id,
      agentCode: r.agent_code,
      brandName: r.brand_id ? names.get(r.brand_id) ?? "unknown brand" : "—",
      status: r.status,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      errorMessage: r.error_message,
    })),
  });
}
