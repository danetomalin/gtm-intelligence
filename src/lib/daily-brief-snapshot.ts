// Builds the platform snapshot that S-DB reasons over.
//
// We compose this server-side in the Next.js app instead of inside the n8n
// workflow because n8n's chained 12+ Supabase reads in a single workflow
// repeatedly failed to execute. The app already has admin Supabase access
// and Postgres roundtrips from a Vercel Lambda are fast — gathering all 12
// reads in parallel via Promise.all takes well under a second.
//
// The shape returned here is what gets passed to the simplified S-DB n8n
// workflow as `extras.snapshot`. The workflow only has to feed that to
// Gemini and write the result; no data plumbing in n8n itself.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

type Row = Record<string, unknown>;

export type DailyBriefSnapshot = {
  totalPending: number;
  highRiskPending: number;
  reviewLines: string;
  erroredRunCount: number;
  oldestErrorHours: number | null;
  topSignalLines: string;
  launchLines: string;
  marginLines: string;
  perfLines: string;
  counts: {
    pendingContent: number;
    pendingCollateral: number;
    pendingCounter: number;
    pendingEnable: number;
    pendingCohort: number;
    pendingVoc: number;
    pendingIcp: number;
    activeLaunches: number;
    topSignals: number;
    marginBreaches: number;
    erroredRuns: number;
  };
};

function safeNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function buildDailyBriefSnapshot(
  admin: Client,
  brandId: string,
): Promise<DailyBriefSnapshot> {
  const PENDING = ["pending_review", "needs_revision"];

  const [
    contentRes,
    collateralRes,
    counterRes,
    enableRes,
    cohortRes,
    vocRes,
    icpRes,
    runRes,
    signalRes,
    launchRes,
    costRes,
    perfRes,
  ] = await Promise.all([
    admin
      .from("content_outputs")
      .select("id, risk_tier, approval_status")
      .eq("brand_id", brandId)
      .in("approval_status", PENDING),
    admin
      .from("sales_collateral")
      .select("id, risk_tier, approval_status")
      .eq("brand_id", brandId)
      .in("approval_status", PENDING),
    admin
      .from("counter_narrative_memos")
      .select("id, risk_tier, approval_status")
      .eq("brand_id", brandId)
      .in("approval_status", PENDING),
    admin
      .from("enablement_assets")
      .select("id, risk_tier, approval_status")
      .eq("brand_id", brandId)
      .in("approval_status", PENDING),
    admin
      .from("super_user_cohorts")
      .select("id, risk_tier, approval_status")
      .eq("brand_id", brandId)
      .in("approval_status", PENDING),
    admin
      .from("voc_extractions")
      .select("id, risk_tier, approval_status")
      .eq("brand_id", brandId)
      .in("approval_status", PENDING),
    admin
      .from("icp_definitions")
      .select("id, risk_tier, approval_status")
      .eq("brand_id", brandId)
      .in("approval_status", PENDING),
    admin
      .from("run_history")
      .select("id, agent_code, status, started_at, error_message")
      .eq("brand_id", brandId)
      .order("started_at", { ascending: false })
      .limit(30),
    admin
      .from("market_signals")
      .select("id, headline, summary, impact_score, sentiment, signal_date")
      .eq("brand_id", brandId)
      .gte("impact_score", 7)
      .order("impact_score", { ascending: false })
      .limit(10),
    admin
      .from("launches")
      .select("id, name, tier, status, launch_date_target")
      .eq("brand_id", brandId)
      .not("status", "in", "(shipped,post_mortem)"),
    admin
      .from("product_cost_model")
      .select("id, tier_name, gross_margin_pct, margin_floor_pct")
      .eq("brand_id", brandId),
    admin
      .from("campaign_performance")
      .select("id, scope, scope_value, open_rate_pct, reply_rate_pct, created_at")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const content = (contentRes.data ?? []) as Row[];
  const collateral = (collateralRes.data ?? []) as Row[];
  const counter = (counterRes.data ?? []) as Row[];
  const enable = (enableRes.data ?? []) as Row[];
  const cohort = (cohortRes.data ?? []) as Row[];
  const voc = (vocRes.data ?? []) as Row[];
  const icp = (icpRes.data ?? []) as Row[];
  const runs = (runRes.data ?? []) as Row[];
  const signals = (signalRes.data ?? []) as Row[];
  const launches = (launchRes.data ?? []) as Row[];
  const cost = (costRes.data ?? []) as Row[];
  const perf = (perfRes.data ?? []) as Row[];

  const totalPending =
    content.length +
    collateral.length +
    counter.length +
    enable.length +
    cohort.length +
    voc.length +
    icp.length;

  const allPending = [
    ...content,
    ...collateral,
    ...counter,
    ...enable,
    ...cohort,
    ...voc,
    ...icp,
  ];
  const highRiskPending = allPending.filter((r) => r.risk_tier === "high").length;

  const errored = runs.filter((r) => r.status === "error");
  const oldestErrorHours =
    errored.length && typeof errored[0].started_at === "string"
      ? Math.round(
          (Date.now() - new Date(errored[0].started_at as string).getTime()) /
            3600000,
        )
      : null;

  const reviewLineParts = [
    content.length ? `  D-MG messaging: ${content.length}` : null,
    collateral.length ? `  D-SN collateral: ${collateral.length}` : null,
    counter.length ? `  D-CN counter-narrative: ${counter.length}` : null,
    enable.length ? `  Enablement assets: ${enable.length}` : null,
    cohort.length ? `  ICP cohorts (Gate 1): ${cohort.length}` : null,
    voc.length ? `  VoC extractions (Gate 2): ${voc.length}` : null,
    icp.length ? `  ICP playbooks (final): ${icp.length}` : null,
  ].filter(Boolean) as string[];
  const reviewLines = reviewLineParts.length
    ? reviewLineParts.join("\n")
    : "  (nothing pending)";

  const topSignalLines = signals.length
    ? signals
        .slice(0, 5)
        .map(
          (s) =>
            `- [impact ${s.impact_score ?? "?"}/${s.sentiment ?? "?"}] ${(
              ((s.headline as string) || (s.summary as string) || "") + ""
            ).slice(0, 200)}`,
        )
        .join("\n")
    : "(no high-impact signals)";

  const launchLines = launches.length
    ? launches
        .map(
          (l) =>
            `- ${l.name ?? "?"} | tier=${l.tier ?? "?"} | status=${l.status ?? "?"} | target=${
              l.launch_date_target ?? "no date"
            }`,
        )
        .join("\n")
    : "(no active launches)";

  const marginBreaches = cost.filter((t) => {
    const gm = safeNumber(t.gross_margin_pct);
    const floor = safeNumber(t.margin_floor_pct);
    return gm != null && floor != null && gm < floor;
  });
  const marginLines = marginBreaches.length
    ? marginBreaches
        .map(
          (t) =>
            `- ${t.tier_name}: GM ${safeNumber(t.gross_margin_pct)?.toFixed(
              1,
            )}% below floor ${t.margin_floor_pct}%`,
        )
        .join("\n")
    : "(no margin floor breaches)";

  const perfLines = perf.length
    ? perf
        .slice(0, 6)
        .map(
          (p) =>
            `- ${p.scope ?? "?"}/${p.scope_value ?? "?"}: open ${
              safeNumber(p.open_rate_pct) != null
                ? safeNumber(p.open_rate_pct)?.toFixed(1) + "%"
                : "?"
            }, reply ${
              safeNumber(p.reply_rate_pct) != null
                ? safeNumber(p.reply_rate_pct)?.toFixed(1) + "%"
                : "?"
            }`,
        )
        .join("\n")
    : "(no campaign performance data)";

  return {
    totalPending,
    highRiskPending,
    reviewLines,
    erroredRunCount: errored.length,
    oldestErrorHours,
    topSignalLines,
    launchLines,
    marginLines,
    perfLines,
    counts: {
      pendingContent: content.length,
      pendingCollateral: collateral.length,
      pendingCounter: counter.length,
      pendingEnable: enable.length,
      pendingCohort: cohort.length,
      pendingVoc: voc.length,
      pendingIcp: icp.length,
      activeLaunches: launches.length,
      topSignals: signals.length,
      marginBreaches: marginBreaches.length,
      erroredRuns: errored.length,
    },
  };
}
