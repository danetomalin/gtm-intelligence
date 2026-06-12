import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";

// Lightweight pending-approvals feed for the Command Center panel.
// One normalized row per artifact awaiting review; the full cards live
// on /review-queue — this is the act-fast surface.

export type PendingItem = {
  table: string;
  id: string;
  kind: string;
  title: string;
  snippet: string;
  risk: string | null;
  status: string;
  created_at: string;
};

const PENDING = ["pending_review", "needs_revision"];

export async function GET() {
  const admin = await createAdminClient();
  const items: PendingItem[] = [];

  type Row = Record<string, unknown>;
  const grab = async (
    table: string,
    select: string,
    kind: string,
    map: (r: Row) => { title: string; snippet: string },
  ) => {
    const { data } = await admin
      .from(table)
      .select(`id, approval_status, risk_tier, created_at, ${select}`)
      .eq("brand_id", DEMO_BRAND_ID)
      .in("approval_status", PENDING)
      .order("created_at", { ascending: false })
      .limit(25);
    for (const r of (data ?? []) as unknown as Row[]) {
      const { title, snippet } = map(r);
      items.push({
        table,
        id: String(r.id),
        kind,
        title,
        snippet: snippet.slice(0, 220),
        risk: (r.risk_tier as string) ?? null,
        status: String(r.approval_status),
        created_at: String(r.created_at),
      });
    }
  };

  await Promise.all([
    grab("content_outputs", "channel, topic, content", "Messaging", (r) => ({
      title: `${r.channel} · ${r.topic}`,
      snippet: String(r.content ?? ""),
    })),
    grab("sales_collateral", "collateral_type, target_segment, content", "Collateral", (r) => ({
      title: `${String(r.collateral_type ?? "").replaceAll("_", " ")} · ${r.target_segment}`,
      snippet: String(r.content ?? ""),
    })),
    grab("counter_narrative_memos", "competitor_named, rep_talking_points", "Counter-narrative", (r) => ({
      title: `vs ${r.competitor_named}`,
      snippet: String(r.rep_talking_points ?? ""),
    })),
    grab("enablement_assets", "asset_type, title, body_markdown", "Enablement", (r) => ({
      title: `${String(r.asset_type ?? "").replaceAll("_", " ")} · ${r.title}`,
      snippet: String(r.body_markdown ?? ""),
    })),
    grab("super_user_cohorts", "cohort_name, methodology", "Cohort (Gate 1)", (r) => ({
      title: String(r.cohort_name ?? "Super-user cohort"),
      snippet: String(r.methodology ?? ""),
    })),
    grab("voc_extractions", "top_pains, sources", "VoC (Gate 2)", (r) => ({
      title: "Voice-of-customer extraction",
      snippet: JSON.stringify(r.top_pains ?? "").slice(0, 220),
    })),
    grab("icp_definitions", "segment_name, one_line_definition", "ICP", (r) => ({
      title: String(r.segment_name ?? "ICP definition"),
      snippet: String(r.one_line_definition ?? ""),
    })),
  ]);

  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return NextResponse.json({ items });
}
