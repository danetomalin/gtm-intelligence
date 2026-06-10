// ============================================================
// Server-side portfolio loader (Phase B).
// Reads the Halcyon CS Health rows from Supabase and rebuilds the
// PortfolioData shape the dashboard was built on, so the UI and
// scoring engine stay untouched.
//
// Flag: CS_HEALTH_DATA_SOURCE = "mock" forces the generateData()
// portfolio. Default is Supabase with automatic mock fallback when
// tables are empty or unreachable.
//
// Still mock-backed for now (no tables yet): smbCohort,
// aggregateTrends, implLaunchAccounts. They normalize in a later
// phase.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_CS_ORG_ID } from "@/lib/demo-context";
import { DATA, type PortfolioData } from "./generateData";
import type { Account, Segment, Stage, SentimentTrend } from "./types";

const REASON_META: Record<string, { label: string; color: string }> = {
  "CR-01": { label: "Value Not Realized", color: "#dc2626" },
  "CR-02": { label: "Product Gap", color: "#f59e0b" },
  "CR-03": { label: "Champion Loss", color: "#7c3aed" },
  "CR-04": { label: "Competitive", color: "#2563eb" },
  "CR-05": { label: "Budget/Economic", color: "#0891b2" },
  "CR-06": { label: "Implementation Failure", color: "#db2777" },
  "CR-07": { label: "Strategic Change", color: "#64748b" },
};

export async function loadPortfolioData(): Promise<PortfolioData> {
  if (process.env.CS_HEALTH_DATA_SOURCE === "mock") return DATA;

  try {
    const supa = await createAdminClient();

    const [accountsRes, varRes, snapRes, churnRes] = await Promise.all([
      supa.from("accounts").select("*").eq("organization_id", DEMO_CS_ORG_ID),
      supa.from("var_metrics").select("*").eq("organization_id", DEMO_CS_ORG_ID)
        .order("as_of", { ascending: false }),
      supa.from("health_score_snapshots").select("account_id, as_of, score")
        .eq("organization_id", DEMO_CS_ORG_ID).order("as_of", { ascending: true }),
      supa.from("churn_events").select("*").eq("organization_id", DEMO_CS_ORG_ID)
        .order("churn_date", { ascending: true }),
    ]);

    const accounts = accountsRes.data ?? [];
    if (accountsRes.error || accounts.length === 0) return DATA;

    // Latest var_metrics row per account (rows arrive newest-first).
    const latestVar = new Map<string, NonNullable<typeof varRes.data>[number]>();
    for (const v of varRes.data ?? []) {
      if (!latestVar.has(v.account_id)) latestVar.set(v.account_id, v);
    }

    // Snapshot history per account, ascending as_of. The final row is
    // today's engine-computed score; the dashboard recomputes it live,
    // so the trend strip is every row except the last.
    const snapsByAccount = new Map<string, number[]>();
    for (const s of snapRes.data ?? []) {
      const arr = snapsByAccount.get(s.account_id) ?? [];
      arr.push(s.score);
      snapsByAccount.set(s.account_id, arr);
    }

    const toAccount = (row: (typeof accounts)[number]): Account | null => {
      const v = latestVar.get(row.id);
      if (!v) return null;
      const trend = snapsByAccount.get(row.id) ?? [];
      return {
        id: row.external_id ?? row.id,
        name: row.name,
        csm: row.csm ?? "",
        arr: Number(row.arr),
        segment: row.segment as Segment,
        stage: row.stage as Stage,
        valueScore: v.value_score,
        adoptionScore: v.adoption_score,
        relationshipScore: v.relationship_score,
        scoreTrend: trend.length > 1 ? trend.slice(0, -1) : trend,
        flags: row.flags ?? {},
        sentimentTrend: (row.sentiment_trend ?? "stable") as SentimentTrend,
        ttv: row.ttv ?? { daysToFirstValue: null, valueTrajectory: "", trajectoryScore: null },
        expansion: v.expansion_inputs,
        dataConfidence: v.data_confidence,
        renewal: row.renewal_date
          ? { renewalDate: row.renewal_date, isFirstRenewal: row.is_first_renewal }
          : undefined,
        sentiment: row.sentiment ?? {},
        adoptionSignals: row.adoption_signals ?? {},
      };
    };

    const all = accounts.map(toAccount).filter((a): a is Account => a !== null);
    const enterprise = all.filter((a) => a.segment === "ENT");
    const midmarket = all.filter((a) => a.segment === "MM");
    if (enterprise.length === 0 && midmarket.length === 0) return DATA;

    const churnEvents = (churnRes.data ?? []).map((c, i) => ({
      id: `CH${String(i + 1).padStart(2, "0")}`,
      name: c.account_name,
      segment: c.segment,
      arr: Number(c.arr),
      date: c.churn_date,
      primaryReason: c.primary_reason,
      secondaryReason: c.secondary_reason,
      healthScore90d: c.health_90d ?? 0,
      healthScore60d: c.health_60d ?? 0,
      healthScore30d: c.health_30d ?? 0,
      csmNotes: c.csm_notes ?? "",
      missedSignals: c.missed_signals ?? [],
      learnings: c.learnings ?? "",
    }));

    // Reason summary recomputed from the live events.
    const summary = new Map<string, { count: number; arrLost: number }>();
    for (const c of churnEvents) {
      const cur = summary.get(c.primaryReason) ?? { count: 0, arrLost: 0 };
      cur.count += 1;
      cur.arrLost += c.arr;
      summary.set(c.primaryReason, cur);
    }
    const churnReasonSummary = [...summary.entries()]
      .sort((a, b) => b[1].arrLost - a[1].arrLost)
      .map(([code, { count, arrLost }]) => ({
        code,
        label: REASON_META[code]?.label ?? code,
        count,
        arrLost,
        color: REASON_META[code]?.color ?? "#64748b",
      }));

    return {
      enterprise,
      midmarket,
      churnEvents: churnEvents.length > 0 ? churnEvents : DATA.churnEvents,
      churnReasonSummary: churnReasonSummary.length > 0 ? churnReasonSummary : DATA.churnReasonSummary,
      // Not yet normalized into tables — static demo data for now.
      smbCohort: DATA.smbCohort,
      aggregateTrends: DATA.aggregateTrends,
      implLaunchAccounts: DATA.implLaunchAccounts,
    };
  } catch {
    return DATA;
  }
}
