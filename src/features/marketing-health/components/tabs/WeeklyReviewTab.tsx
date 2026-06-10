"use client";
// Weekly Review — the default Marketing Health view. KPI cards, channel
// roll-up table, attention list, and a compact funnel strip.

import { StatCard, SectionLabel, MiniSparkline, TOKENS } from "@/features/cs-health/components/ui";
import { funnelConversion, SIGNAL_SEVERITY } from "@/features/marketing-health/lib/rollups";
import type { ChannelRollup, FunnelStage, ScoredCampaign } from "@/features/marketing-health/lib/types";
import { CHANNEL_LABEL, SignalPill, dirOf, fmtMoney, fmtNum, fmtPct } from "../ui";

const last = (xs: number[]) => xs[xs.length - 1] ?? 0;
const prev = (xs: number[]) => xs[xs.length - 2] ?? 0;

export default function WeeklyReviewTab({
  scored,
  rollups,
  funnel,
}: {
  scored: ScoredCampaign[];
  rollups: ChannelRollup[];
  funnel: FunnelStage[];
}) {
  const active = scored.filter((c) => c.status === "active");
  const pipeline4w = scored.reduce((s, c) => s + c.kpis.pipeline4w, 0);
  const mqlsWk = active.reduce((s, c) => s + last(c.weekly.mqls), 0);
  const mqlsPrevWk = active.reduce((s, c) => s + prev(c.weekly.mqls), 0);
  const spendWk = active.reduce((s, c) => s + last(c.weekly.spend), 0);
  const cplWk = mqlsWk > 0 ? spendWk / mqlsWk : null;
  const cplPrev = mqlsPrevWk > 0 ? active.reduce((s, c) => s + prev(c.weekly.spend), 0) / mqlsPrevWk : null;
  const cplDelta = cplWk !== null && cplPrev !== null ? (cplWk - cplPrev) / cplPrev : null;

  const attention = scored
    .filter((c) => ["spike", "warning"].includes(c.kpis.worstSignal) && c.status === "active")
    .sort((a, b) => SIGNAL_SEVERITY[b.kpis.worstSignal] - SIGNAL_SEVERITY[a.kpis.worstSignal]);

  const funnelRows = funnelConversion(funnel);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <StatCard label="Pipeline Sourced (4w)" value={fmtMoney(pipeline4w)} sub={`${active.length} active campaigns`} color={TOKENS.success} />
        <StatCard label="MQLs (this week)" value={fmtNum(mqlsWk)} sub={`${mqlsWk >= mqlsPrevWk ? "+" : ""}${mqlsWk - mqlsPrevWk} vs prior week`} color="hsl(217 71% 45%)" />
        <StatCard label="Spend (this week)" value={fmtMoney(spendWk)} sub="active campaigns" color={TOKENS.warning} />
        <StatCard
          label="Blended CPL (this week)"
          value={cplWk !== null ? `$${cplWk.toFixed(0)}` : "—"}
          sub={cplDelta !== null ? `${cplDelta >= 0 ? "+" : ""}${(cplDelta * 100).toFixed(0)}% wk/wk` : undefined}
          color={cplDelta !== null && cplDelta > 0.05 ? TOKENS.destructive : TOKENS.success}
        />
      </div>

      {/* Channel roll-up */}
      <div style={{ background: TOKENS.surface, border: TOKENS.rim, borderRadius: "1rem", padding: 18 }}>
        <SectionLabel>Channel Roll-Up — 4-week totals</SectionLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Channel</th>
                <th style={{ padding: "6px 8px" }}>Spend</th>
                <th style={{ padding: "6px 8px" }}>Pipeline</th>
                <th style={{ padding: "6px 8px" }}>Pipeline share</th>
                <th style={{ padding: "6px 8px" }}>MQLs</th>
                <th style={{ padding: "6px 8px" }}>CPL</th>
                <th style={{ padding: "6px 8px" }}>Pipe / $</th>
                <th style={{ padding: "6px 8px" }}>MQL trend</th>
                <th style={{ padding: "6px 8px" }}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {rollups.map((r) => (
                <tr key={r.channel} style={{ borderTop: TOKENS.rim }}>
                  <td style={{ padding: "8px", fontWeight: 600, color: "var(--fg-primary)", whiteSpace: "nowrap" }}>
                    {CHANNEL_LABEL[r.channel]}
                    <span style={{ color: "var(--fg-tertiary)", fontWeight: 400 }}> · {r.activeCount}/{r.campaignCount}</span>
                  </td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{fmtMoney(r.spend4w)}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", fontWeight: 600 }}>{fmtMoney(r.pipeline4w)}</td>
                  <td style={{ padding: "8px", minWidth: 110 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: TOKENS.track, borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round(r.pipelineShare * 100)}%`, height: "100%", background: "hsl(217 71% 45%)", borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--fg-secondary)", minWidth: 32, textAlign: "right" }}>{fmtPct(r.pipelineShare, 0)}</span>
                    </div>
                  </td>
                  <td style={{ padding: "8px" }}>{fmtNum(r.mqls4w)}</td>
                  <td style={{ padding: "8px" }}>{r.cpl !== null ? `$${r.cpl.toFixed(0)}` : "—"}</td>
                  <td style={{ padding: "8px" }}>{r.pipelinePerDollar !== null ? `${r.pipelinePerDollar.toFixed(1)}x` : "—"}</td>
                  <td style={{ padding: "8px" }}><MiniSparkline scores={r.mqlWeekly} dir={dirOf(r.mqlWeekly)} /></td>
                  <td style={{ padding: "8px" }}><SignalPill s={r.signal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attention list */}
      <div style={{ background: TOKENS.surface, border: TOKENS.rim, borderRadius: "1rem", padding: 18 }}>
        <SectionLabel>Requires Attention This Week</SectionLabel>
        {attention.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--fg-tertiary)" }}>No campaigns with adverse signals.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {attention.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, borderTop: TOKENS.rim, paddingTop: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--fg-primary)", fontSize: 13 }}>
                  {c.name}
                  <span style={{ color: "var(--fg-tertiary)", fontWeight: 400 }}> · {CHANNEL_LABEL[c.channel]} · {c.owner}</span>
                </div>
                {c.note && <div style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 3 }}>{c.note}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: "var(--fg-secondary)", whiteSpace: "nowrap" }}>{fmtMoney(c.kpis.pipeline4w)} pipe</span>
                <SignalPill s={c.kpis.worstSignal} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel strip */}
      <div style={{ background: TOKENS.surface, border: TOKENS.rim, borderRadius: "1rem", padding: 18 }}>
        <SectionLabel>Funnel — latest week</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${funnelRows.length}, 1fr)`, gap: 8 }}>
          {funnelRows.map((s) => (
            <div key={s.id} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg-primary)" }}>
                {s.unit === "dollars" ? fmtMoney(s.latest) : fmtNum(s.latest)}
              </div>
              <div style={{ fontSize: 10, color: "var(--fg-tertiary)", marginTop: 2 }}>
                {s.convLatest !== null ? `${(s.convLatest * 100).toFixed(1)}% conv` : "top"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
