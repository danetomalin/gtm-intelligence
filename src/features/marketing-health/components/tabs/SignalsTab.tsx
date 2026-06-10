"use client";
// Emerging Signals — aggregate trend metrics grouped by severity,
// mirroring the CS dashboard's weekly-trends pattern.

import { SectionLabel, MiniSparkline, TOKENS } from "@/features/cs-health/components/ui";
import { SIGNAL_SEVERITY } from "@/features/marketing-health/lib/rollups";
import type { MarketingTrendMetric, TrendSignal } from "@/features/marketing-health/lib/types";
import { SignalPill, dirOf } from "../ui";

const GROUPS: { title: string; signals: TrendSignal[] }[] = [
  { title: "Requires Immediate Review", signals: ["spike"] },
  { title: "Monitor Closely", signals: ["warning"] },
  { title: "Watch List", signals: ["watch"] },
  { title: "Stable & Improving", signals: ["stable", "improving"] },
];

function fmtVal(m: MarketingTrendMetric): string {
  const v = m.weeks[m.weeks.length - 1];
  if (m.unit === "$") return `$${v}`;
  if (m.unit.includes("%")) return `${v}%`;
  return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`;
}

function delta(m: MarketingTrendMetric): string {
  const d = m.weeks[m.weeks.length - 1] - m.weeks[0];
  const sign = d >= 0 ? "+" : "";
  const num = Math.abs(d) >= 1000 ? `${(d / 1000).toFixed(0)}K` : `${Math.round(d * 10) / 10}`;
  return `${sign}${num} over 4w`;
}

export default function SignalsTab({ trends }: { trends: MarketingTrendMetric[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {GROUPS.map((g) => {
        const rows = trends
          .filter((m) => g.signals.includes(m.signal))
          .sort((a, b) => SIGNAL_SEVERITY[b.signal] - SIGNAL_SEVERITY[a.signal]);
        if (rows.length === 0) return null;
        return (
          <div key={g.title} style={{ background: TOKENS.surface, border: TOKENS.rim, borderRadius: "1rem", padding: 18 }}>
            <SectionLabel>{g.title}</SectionLabel>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px" }}>Metric</th>
                    <th style={{ padding: "6px 8px" }}>Unit</th>
                    <th style={{ padding: "6px 8px" }}>4-week trend</th>
                    <th style={{ padding: "6px 8px" }}>Interpretation</th>
                    <th style={{ padding: "6px 8px" }}>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.label} style={{ borderTop: TOKENS.rim }}>
                      <td style={{ padding: "8px", fontWeight: 600, color: "var(--fg-primary)", whiteSpace: "nowrap" }}>{m.label}</td>
                      <td style={{ padding: "8px", fontSize: 11, color: "var(--fg-tertiary)", whiteSpace: "nowrap" }}>{m.unit}</td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <MiniSparkline scores={m.weeks} dir={dirOf(m.weeks)} />
                          <span style={{ fontWeight: 600, color: "var(--fg-primary)" }}>{fmtVal(m)}</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px", color: "var(--fg-secondary)", minWidth: 260 }}>{m.note}</td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <SignalPill s={m.signal} />
                          <span style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>{delta(m)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
