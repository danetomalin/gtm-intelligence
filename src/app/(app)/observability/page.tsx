import {
  PageHeader,
  SectionDivider,
  StatCard,
} from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import { AGENT_WEBHOOK_PATHS } from "@/lib/agent-config";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  agent_code: string | null;
  status: string | null;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  summary: string | null;
};

type SendSource = { source: string | null };

type Perf = {
  scope: string | null;
  scope_value: string | null;
  open_rate_pct: number | null;
  reply_rate_pct: number | null;
};

type ReviewItem = {
  table: string;
  count: number;
};

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default async function ObservabilityPage() {
  const admin = await createAdminClient();

  const [runsRes, sendsRes, perfRes, contentPendingRes, collatPendingRes, memoPendingRes, assetPendingRes, launchesRes] =
    await Promise.all([
      admin
        .from("run_history")
        .select("id, agent_code, status, started_at, finished_at, error_message, summary")
        .eq("brand_id", DEMO_BRAND_ID)
        .order("started_at", { ascending: false })
        .limit(120),
      admin
        .from("campaign_sends")
        .select("source")
        .eq("brand_id", DEMO_BRAND_ID),
      admin
        .from("campaign_performance")
        .select("scope, scope_value, open_rate_pct, reply_rate_pct")
        .eq("brand_id", DEMO_BRAND_ID)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("content_outputs")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", DEMO_BRAND_ID)
        .eq("approval_status", "pending_review"),
      admin
        .from("sales_collateral")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", DEMO_BRAND_ID)
        .eq("approval_status", "pending_review"),
      admin
        .from("counter_narrative_memos")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", DEMO_BRAND_ID)
        .eq("approval_status", "pending_review"),
      admin
        .from("enablement_assets")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", DEMO_BRAND_ID)
        .eq("approval_status", "pending_review"),
      admin
        .from("launches")
        .select("id, status, tier")
        .eq("brand_id", DEMO_BRAND_ID),
    ]);

  const launches = (launchesRes.data ?? []) as { id: string; status: string; tier: string }[];
  const launchesInFlight = launches.filter(
    (l) => l.status !== "shipped" && l.status !== "post_mortem",
  ).length;
  const launchesShipped = launches.filter((l) => l.status === "shipped").length;
  const launchesPostMortem = launches.filter((l) => l.status === "post_mortem").length;

  const runs = (runsRes.data ?? []) as RunRow[];
  const sends = (sendsRes.data ?? []) as SendSource[];
  const perf = (perfRes.data ?? []) as Perf[];

  // Per-agent rollup over the most recent 100 runs we got back.
  const byAgent = new Map<
    string,
    {
      code: string;
      total: number;
      success: number;
      error: number;
      running: number;
      lastStartedAt: string | null;
      lastStatus: string | null;
    }
  >();
  for (const r of runs) {
    const code = r.agent_code ?? "unknown";
    if (!byAgent.has(code)) {
      byAgent.set(code, {
        code,
        total: 0,
        success: 0,
        error: 0,
        running: 0,
        lastStartedAt: null,
        lastStatus: null,
      });
    }
    const rec = byAgent.get(code)!;
    rec.total++;
    if (r.status === "success") rec.success++;
    else if (r.status === "error") rec.error++;
    else if (r.status === "running") rec.running++;
    if (!rec.lastStartedAt || (r.started_at && r.started_at > rec.lastStartedAt)) {
      rec.lastStartedAt = r.started_at;
      rec.lastStatus = r.status;
    }
  }

  const agentRows = Array.from(byAgent.values()).sort((a, b) => b.total - a.total);

  // Live vs mock split (Cap 4 distribution).
  const mockSends = sends.filter((s) => s.source === "mock").length;
  const liveSends = sends.filter((s) => s.source === "live").length;

  const review: ReviewItem[] = [
    { table: "D-MG messaging", count: contentPendingRes.count ?? 0 },
    { table: "D-SN sales narrative", count: collatPendingRes.count ?? 0 },
    { table: "D-CN counter-narrative", count: memoPendingRes.count ?? 0 },
    { table: "Cap 5 collateral", count: assetPendingRes.count ?? 0 },
  ];

  const totalRuns = runs.length;
  const successRuns = runs.filter((r) => r.status === "success").length;
  const errorRuns = runs.filter((r) => r.status === "error").length;
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;
  const totalAgentsLive = Object.keys(AGENT_WEBHOOK_PATHS).length;
  const totalPending = review.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="px-8 py-10 max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Platform · Observability"
        title="Observability"
        subtitle="System health across agents, distribution, review queue, and the closed loop. Counts come from real Supabase data — refreshes on every page load."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Workflows wired"
          value={`${totalAgentsLive}`}
          sublabel="active webhooks"
        />
        <StatCard
          label="Runs (recent 120)"
          value={`${totalRuns}`}
          sublabel={`${successRate.toFixed(0)}% success`}
        />
        <StatCard
          label="Errored runs"
          value={`${errorRuns}`}
          sublabel="across all workflows"
        />
        <StatCard
          label="Pending HITL"
          value={`${totalPending}`}
          sublabel="across all D-*"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Launches in flight"
          value={`${launchesInFlight}`}
          sublabel="draft / in progress / ready"
        />
        <StatCard
          label="Launches shipped"
          value={`${launchesShipped}`}
          sublabel="distribution fired"
        />
        <StatCard
          label="Post-mortems run"
          value={`${launchesPostMortem}`}
          sublabel="retrospective complete"
        />
        <StatCard
          label="Total launches"
          value={`${launches.length}`}
          sublabel="all time"
        />
      </div>

      <section>
        <SectionDivider
          title="Per-agent run health"
          sub={`${agentRows.length} agents with run history`}
        />
        {agentRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
            No runs yet. Click <strong className="text-text">Run now</strong> on
            any agent to populate this dashboard.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/40 border-b border-border">
                <tr className="text-left text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="px-4 py-2 font-semibold">Agent</th>
                  <th className="px-4 py-2 font-semibold text-right">Total</th>
                  <th className="px-4 py-2 font-semibold text-right">Success</th>
                  <th className="px-4 py-2 font-semibold text-right">Errors</th>
                  <th className="px-4 py-2 font-semibold text-right">Running</th>
                  <th className="px-4 py-2 font-semibold">Last run</th>
                </tr>
              </thead>
              <tbody>
                {agentRows.map((r) => (
                  <tr key={r.code} className="border-b border-border/40">
                    <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.total}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-win">
                      {r.success}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-danger">
                      {r.error}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-warn">
                      {r.running}
                    </td>
                    <td className="px-4 py-2 text-xs text-text-muted">
                      {relTime(r.lastStartedAt)}
                      {r.lastStatus ? ` · ${r.lastStatus}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionDivider
          title="Distribution mix"
          sub={`${mockSends + liveSends} total sends`}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StatCard
            label="Mock sends"
            value={`${mockSends}`}
            sublabel="synthetic engagement"
          />
          <StatCard
            label="Live sends"
            value={`${liveSends}`}
            sublabel="real channel APIs"
          />
        </div>
      </section>

      <section>
        <SectionDivider
          title="Closed-loop signal"
          sub={`${perf.length} S-CP rollups in recent window`}
        />
        {perf.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-10 text-center text-sm text-text-muted">
            No campaign_performance rows yet. Run S-CP after the distribution
            adapters have fired so there's data to analyze.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/40 border-b border-border">
                <tr className="text-left text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="px-4 py-2 font-semibold">Scope</th>
                  <th className="px-4 py-2 font-semibold">Value</th>
                  <th className="px-4 py-2 font-semibold text-right">Open</th>
                  <th className="px-4 py-2 font-semibold text-right">Reply</th>
                </tr>
              </thead>
              <tbody>
                {perf.map((p, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-4 py-2 font-mono text-xs">{p.scope ?? "—"}</td>
                    <td className="px-4 py-2 text-sm text-text">{p.scope_value ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {p.open_rate_pct == null ? "—" : `${p.open_rate_pct.toFixed(1)}%`}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {p.reply_rate_pct == null ? "—" : `${p.reply_rate_pct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionDivider
          title="Review queue pressure"
          sub="Items pending approval per delivery surface"
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {review.map((r) => (
            <StatCard
              key={r.table}
              label={r.table}
              value={`${r.count}`}
              sublabel="pending"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
