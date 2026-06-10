import Link from "next/link";
import {
  PageHeader,
  SectionDivider,
  StatCard,
} from "../_components/page-header";
import { agentTooling } from "@/lib/demo-data";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID, DEMO_BRAND_NAME, DEMO_CS_COMPANY } from "@/lib/demo-context";
import { ActivePipeline } from "./active-pipeline";
import { DailyBrief, type BriefSnapshot } from "./daily-brief";
import { loadPortfolioData } from "@/features/cs-health/lib/loadPortfolio";
import { buildScoredAccounts } from "@/features/cs-health/lib/scoringEngine";
import { MARKETING_DATA } from "@/features/marketing-health/lib/generateData";
import { scoreCampaigns } from "@/features/marketing-health/lib/rollups";

export const dynamic = "force-dynamic";

const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

// Pipeline / marketing activity — computed from the Marketing Health
// mock portfolio (Phase B.1) so the overview and /marketing-health agree.
function marketingStats() {
  const scored = scoreCampaigns(MARKETING_DATA.campaigns);
  const active = scored.filter((c) => c.status === "active");
  const pipeline4w = scored.reduce((s, c) => s + c.kpis.pipeline4w, 0);
  const last = (xs: number[]) => xs[xs.length - 1] ?? 0;
  const mqlsWk = active.reduce((s, c) => s + last(c.weekly.mqls), 0);
  const spendWk = active.reduce((s, c) => s + last(c.weekly.spend), 0);
  return [
    { label: "Pipeline sourced (4w)", value: fmtM(pipeline4w), sublabel: "marketing campaigns" },
    { label: "MQLs (this week)", value: `${mqlsWk.toLocaleString()}`, sublabel: "all channels" },
    { label: "Campaigns in flight", value: `${active.length}`, sublabel: `across ${new Set(active.map((c) => c.channel)).size} channels` },
    { label: "Spend (this week)", value: `$${(spendWk / 1000).toFixed(0)}K`, sublabel: `blended CPL $${(spendWk / mqlsWk).toFixed(0)}` },
  ];
}

export default async function DashboardPage() {
  // Daily brief renders with content on first load when one exists.
  const admin = await createAdminClient();
  const [briefRowRes, brandRes, portfolio] = await Promise.all([
    admin
      .from("daily_briefs")
      .select("id, generated_at, headline, focus_items")
      .eq("brand_id", DEMO_BRAND_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("brands").select("name").eq("id", DEMO_BRAND_ID).maybeSingle(),
    loadPortfolioData(),
  ]);
  const initialBrief = (briefRowRes.data ?? null) as BriefSnapshot | null;
  const activeBrandName =
    (brandRes.data as { name: string | null } | null)?.name ||
    DEMO_BRAND_NAME ||
    "active brand";

  // Revenue + customer health, live from the VAR engine.
  const scored = buildScoredAccounts([...portfolio.enterprise, ...portfolio.midmarket]);
  const totalARR =
    scored.reduce((s, a) => s + a.arr, 0) + portfolio.smbCohort.totalARR;
  const arrAtRisk =
    scored.reduce((s, a) => s + (a.scoring.band !== "Healthy" ? a.arr : 0), 0) +
    portfolio.smbCohort.arrAtRisk;
  const renewalAtRisk = scored.filter(
    (a) => a.stage === "Renewal Window" && a.scoring.band !== "Healthy",
  );
  const renewalAtRiskARR = renewalAtRisk.reduce((s, a) => s + a.arr, 0);
  const bands = {
    Healthy:
      scored.filter((a) => a.scoring.band === "Healthy").length +
      portfolio.smbCohort.healthy,
    "At Risk":
      scored.filter((a) => a.scoring.band === "At Risk").length +
      portfolio.smbCohort.atRisk,
    Critical:
      scored.filter((a) => a.scoring.band === "Critical").length +
      portfolio.smbCohort.critical,
  };
  const totalAccounts = scored.length + portfolio.smbCohort.total;
  const priorityActions = scored
    .filter((a) => ["P0", "P1"].includes(a.action.priority))
    .sort((a, b) =>
      a.action.priority === b.action.priority
        ? b.arr - a.arr
        : a.action.priority.localeCompare(b.action.priority),
    )
    .slice(0, 4);

  const revenueStats = [
    { label: "Total ARR", value: fmtM(totalARR), sublabel: `${totalAccounts} accounts (${DEMO_CS_COMPANY} portfolio)` },
    { label: "ARR at risk", value: fmtM(arrAtRisk), sublabel: `${Math.round((arrAtRisk / totalARR) * 100)}% of portfolio` },
    { label: "Renewal window at risk", value: `${renewalAtRisk.length}`, sublabel: `${fmtM(renewalAtRiskARR)} ARR` },
    { label: "Net revenue retention", value: "104%", sublabel: "trailing 12 months" },
  ];

  const bandColor: Record<string, string> = {
    Healthy: "text-win",
    "At Risk": "text-warn",
    Critical: "text-danger",
  };

  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Overview"
        title="Company overview"
        subtitle={`Revenue and customer health from the live VAR model, alongside pipeline and marketing activity. Marketing intelligence runs against ${activeBrandName}; the customer portfolio is ${DEMO_CS_COMPANY}'s.`}
      />

      <DailyBrief initialBrief={initialBrief} />

      {/* Revenue / customer health — live */}
      <section>
        <SectionDivider title="Revenue & customer health" sub="Live · VAR model" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {revenueStats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-3">
              Health distribution — all segments
            </div>
            <div className="space-y-2">
              {(Object.keys(bands) as (keyof typeof bands)[]).map((b) => (
                <div key={b} className="flex items-center justify-between text-sm">
                  <span className={bandColor[b]}>{b}</span>
                  <span className="text-text-muted">
                    {bands[b]} ({Math.round((bands[b] / totalAccounts) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
            <Link href="/customer-health" className="text-accent text-sm mt-4 inline-block">
              Open Customer Health →
            </Link>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-3">
              Priority actions this week
            </div>
            <div className="space-y-2">
              {priorityActions.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm gap-3">
                  <span className="truncate">
                    <span className={a.action.priority === "P0" ? "text-danger font-semibold" : "text-warn font-semibold"}>
                      {a.action.priority}
                    </span>{" "}
                    {a.name}
                  </span>
                  <span className="text-text-dim whitespace-nowrap">{fmtM(a.arr).replace(".0", "")}</span>
                </div>
              ))}
            </div>
            <Link href="/customer-health" className="text-accent text-sm mt-4 inline-block">
              All accounts →
            </Link>
          </div>
        </div>
      </section>

      {/* Pipeline / marketing — Marketing Health mock portfolio */}
      <section>
        <SectionDivider title="Pipeline & marketing activity" sub="Demo data · 4-week window" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {marketingStats().map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
        <Link href="/marketing-health" className="text-accent text-sm inline-block mb-6">
          Open Marketing Health →
        </Link>
        <ActivePipeline workflows={agentTooling} />
      </section>
    </div>
  );
}
