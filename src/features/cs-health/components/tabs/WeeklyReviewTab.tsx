"use client";
// Weekly Review — merged Overview + Segment Trends (v2.0).
// Flow is broad to narrow: portfolio risk snapshot → signal summary →
// metric-level trends by segment → priority actions → SMB cohort.

import { useState } from "react";
import type { TrendMetric } from "@/features/cs-health/lib/generateData";
import { usePortfolio } from "@/features/cs-health/components/PortfolioProvider";
import type { ScoredAccount } from "@/features/cs-health/lib/types";
import { BAND_COLORS, BandPill, PriorityPill, SectionLabel, StatCard, formatARR } from "@/features/cs-health/components/ui";

interface Stats {
  arrAtRisk: number;
  totalARR: number;
  criticalEnt: number;
  p0p1: number;
  renewalAtRisk: ScoredAccount[];
  entBands: Record<string, number>;
  mmBands: Record<string, number>;
}

const SIGNAL_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  spike: { bg: "hsl(var(--destructive) / 0.12)", text: "hsl(359 75% 42%)", label: "SPIKE" },
  warning: { bg: "hsl(var(--warning) / 0.14)", text: "hsl(28 90% 38%)", label: "WARNING" },
  watch: { bg: "hsl(var(--warning) / 0.08)", text: "hsl(28 90% 32%)", label: "WATCH" },
  stable: { bg: "hsl(var(--muted))", text: "var(--fg-secondary)", label: "STABLE" },
};
const SIGNAL_ORDER: Record<string, number> = { spike: 0, warning: 1, watch: 2, stable: 3 };

function TrendBars({ weeks, signal }: { weeks: number[]; signal: string }) {
  const max = Math.max(...weeks.map(Math.abs)) || 1;
  const color = signal === "spike" ? "hsl(var(--destructive))" : signal === "warning" ? "hsl(var(--warning))" : signal === "watch" ? "#eab308" : "var(--fg-tertiary)";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28 }}>
      {weeks.map((v, i) => {
        const h = Math.max(4, (Math.abs(v) / max) * 28);
        return <div key={i} style={{ width: 10, height: h, background: i === weeks.length - 1 ? color : "hsl(var(--muted))", borderRadius: "1px 1px 0 0", alignSelf: "flex-end" }} />;
      })}
      <span style={{ fontSize: 11, fontWeight: 700, color, marginLeft: 4 }}>{weeks[weeks.length - 1]}</span>
    </div>
  );
}

function MetricSection({ sectionLabel, items, color }: { sectionLabel: string; items: [string, TrendMetric][]; color: string }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel color={color} style={{ marginBottom: 8, letterSpacing: "0.12em" }}>{sectionLabel}</SectionLabel>
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 80px 120px 1fr 200px", padding: "7px 16px", borderBottom: "1px solid hsl(var(--border))" }}>
          {["Metric", "Unit", "4-Week Trend", "Interpretation", "Signal"].map((h) => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-tertiary)" }}>{h}</div>
          ))}
        </div>
        {items.map(([key, m]) => {
          const s = SIGNAL_STYLE[m.signal];
          const delta = m.weeks[m.weeks.length - 1] - m.weeks[0];
          return (
            <div key={key} style={{ display: "grid", gridTemplateColumns: "220px 80px 120px 1fr 200px", padding: "12px 16px", borderBottom: "1px solid hsl(var(--muted) / 0.5)", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-primary)" }}>{m.label}</div>
              <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{m.unit}</div>
              <TrendBars weeks={m.weeks} signal={m.signal} />
              <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5, paddingRight: 16 }}>{m.note}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: s.bg, color: s.text, fontSize: 9, fontWeight: 700, padding: "2px 8px", letterSpacing: "0.1em", borderRadius: "0.5rem" }}>{s.label}</span>
                <span style={{ fontSize: 11, color: delta > 0 ? "hsl(var(--destructive))" : delta < 0 ? "hsl(var(--success))" : "var(--fg-tertiary)", fontWeight: 700 }}>
                  {delta > 0 ? "+" : ""}{delta.toFixed(1)} over 4w
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WeeklyReviewTab({ allScored, stats }: { allScored: ScoredAccount[]; stats: Stats }) {
  const DATA_P = usePortfolio();
  const [activeSeg, setActiveSeg] = useState<"ENT" | "MM" | "SMB">("ENT");
  const segLabel = { ENT: "Enterprise", MM: "Mid-Market", SMB: "SMB" };
  const segTrends = DATA_P.aggregateTrends[activeSeg];
  const sorted = (Object.entries(segTrends) as [string, TrendMetric][]).sort(
    (a, b) => (SIGNAL_ORDER[a[1].signal] ?? 3) - (SIGNAL_ORDER[b[1].signal] ?? 3)
  );
  const spikes = sorted.filter(([, m]) => m.signal === "spike");
  const warnings = sorted.filter(([, m]) => m.signal === "warning");
  const watches = sorted.filter(([, m]) => m.signal === "watch");
  const stables = sorted.filter(([, m]) => m.signal === "stable");

  // Cross-segment signal counts for the summary strip
  const allSignals = Object.values(DATA_P.aggregateTrends).flatMap((seg) => Object.values(seg).map((m) => m.signal));
  const signalCount = (sig: string) => allSignals.filter((s) => s === sig).length;

  return (
    <div>
      {/* 1. Portfolio risk snapshot */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label="ARR at Risk" value={formatARR(stats.arrAtRisk)} sub={`${((stats.arrAtRisk / stats.totalARR) * 100).toFixed(0)}% of total portfolio`} color="hsl(var(--destructive))" />
        <StatCard label="Accounts Requiring Action" value={stats.p0p1} sub="P0 + P1 — Enterprise & MM" color="hsl(var(--warning))" />
        <StatCard label="Critical — Enterprise" value={stats.criticalEnt} sub="of 10 Enterprise accounts" color="hsl(359 75% 42%)" />
        <StatCard label="Renewal Window at Risk" value={stats.renewalAtRisk.length} sub={`${formatARR(stats.renewalAtRisk.reduce((s, a) => s + a.arr, 0))} ARR`} color="#6b21a8" />
      </div>

      {/* 2. Health band distribution by segment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Enterprise", bands: stats.entBands, total: 10 },
          { label: "Mid-Market", bands: stats.mmBands, total: 30 },
          { label: "SMB", bands: { Healthy: DATA_P.smbCohort.healthy, "At Risk": DATA_P.smbCohort.atRisk, Critical: DATA_P.smbCohort.critical }, total: DATA_P.smbCohort.total },
        ].map((seg) => (
          <div key={seg.label} style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "18px 20px" }}>
            <SectionLabel style={{ marginBottom: 14, fontWeight: 600 }}>{seg.label} — Health Distribution</SectionLabel>
            {(["Healthy", "At Risk", "Critical"] as const).map((band) => {
              const n = (seg.bands as Record<string, number>)[band] || 0;
              const pct = Math.round((n / seg.total) * 100);
              const c = BAND_COLORS[band];
              return (
                <div key={band} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{band}</span>
                    <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{n} <span style={{ color: "var(--fg-tertiary)" }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 5, background: "hsl(var(--muted))", borderRadius: "0.5rem", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: c.dot, borderRadius: "0.5rem" }} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 3. Cross-segment signal summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {([["spike", "Spikes", "hsl(var(--destructive) / 0.12)", "hsl(359 75% 42%)"], ["warning", "Warnings", "hsl(var(--warning) / 0.14)", "hsl(28 90% 38%)"], ["watch", "Watch", "hsl(var(--warning) / 0.08)", "hsl(28 90% 32%)"], ["stable", "Stable", "hsl(var(--muted))", "var(--fg-secondary)"]] as const).map(([sig, label, bg, color]) => (
          <div key={sig} style={{ background: bg, border: `1px solid ${color}22`, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.08em" }}>{label} <span style={{ fontWeight: 400, fontSize: 10 }}>· all segments</span></span>
            <span style={{ fontSize: 24, fontWeight: 700, color }}>{signalCount(sig)}</span>
          </div>
        ))}
      </div>

      {/* 4. Metric-level trends by segment */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["ENT", "MM", "SMB"] as const).map((s) => (
          <button key={s} onClick={() => setActiveSeg(s)} style={{ padding: "7px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", background: activeSeg === s ? "var(--fg-primary)" : "white", color: activeSeg === s ? "white" : "var(--fg-secondary)", letterSpacing: "0.06em" }}>
            {segLabel[s]}
          </button>
        ))}
        <span style={{ alignSelf: "center", marginLeft: 8, fontSize: 11, color: "var(--fg-tertiary)" }}>4-week trailing — flag threshold = directional change from prior week</span>
      </div>
      <MetricSection sectionLabel="Requires Immediate Review" items={spikes} color="hsl(359 75% 42%)" />
      <MetricSection sectionLabel="Monitor Closely" items={warnings} color="hsl(28 90% 38%)" />
      <MetricSection sectionLabel="Watch List" items={watches} color="hsl(28 90% 32%)" />
      <MetricSection sectionLabel="Stable" items={stables} color="var(--fg-tertiary)" />

      {/* 5. Priority actions */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "18px 20px", marginBottom: 14 }}>
        <SectionLabel style={{ marginBottom: 14, fontWeight: 600 }}>Priority Actions This Week</SectionLabel>
        {allScored.filter((a) => ["P0", "P1", "P2"].includes(a.action.priority)).slice(0, 8).map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid hsl(var(--muted))" }}>
            <PriorityPill p={a.action.priority} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-primary)" }}>{a.name}</div>
              <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 2 }}>{a.action.detail}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <BandPill band={a.scoring.band} />
              <span style={{ fontSize: 12, color: "var(--fg-secondary)", minWidth: 80 }}>{a.stage}</span>
              <span style={{ fontSize: 12, color: "var(--fg-tertiary)" }}>{formatARR(a.arr)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 6. SMB cohort */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "18px 20px" }}>
        <SectionLabel style={{ fontWeight: 600 }}>SMB Cohort — Aggregate View</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 14 }}>
          <div><div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>Total Accounts</div><div style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-primary)" }}>{DATA_P.smbCohort.total}</div></div>
          <div><div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>ARR at Risk</div><div style={{ fontSize: 20, fontWeight: 700, color: "hsl(var(--destructive))" }}>{formatARR(DATA_P.smbCohort.arrAtRisk)}</div></div>
          <div><div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>Avg Health Score</div><div style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-primary)" }}>{DATA_P.smbCohort.avgScore}</div></div>
        </div>
        {DATA_P.smbCohort.topFlags.map((f, i) => (
          <div key={i} style={{ fontSize: 11, color: "var(--fg-secondary)", padding: "5px 0", borderTop: "1px solid hsl(var(--muted))", display: "flex", gap: 8 }}>
            <span style={{ color: "hsl(var(--warning))", fontWeight: 700 }}>!</span> {f}
          </div>
        ))}
      </div>
    </div>
  );
}
