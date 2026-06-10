"use client";
// Funnel & Conversion — stage table with conversion rates and trends.

import { SectionLabel, MiniSparkline, TOKENS } from "@/features/cs-health/components/ui";
import { funnelConversion } from "@/features/marketing-health/lib/rollups";
import type { FunnelStage } from "@/features/marketing-health/lib/types";
import { SignalPill, dirOf, fmtMoney, fmtNum, fmtPct } from "../ui";

export default function FunnelTab({ funnel }: { funnel: FunnelStage[] }) {
  const rows = funnelConversion(funnel);
  const maxLatest = Math.max(...rows.filter((r) => r.unit === "count").map((r) => r.latest));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: TOKENS.surface, border: TOKENS.rim, borderRadius: "1rem", padding: 18 }}>
        <SectionLabel>Stage-over-stage — latest week vs 4-week</SectionLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Stage</th>
                <th style={{ padding: "6px 8px" }}>Volume</th>
                <th style={{ padding: "6px 8px" }}>Latest week</th>
                <th style={{ padding: "6px 8px" }}>Conv (latest)</th>
                <th style={{ padding: "6px 8px" }}>Conv (4w)</th>
                <th style={{ padding: "6px 8px" }}>Trend</th>
                <th style={{ padding: "6px 8px" }}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} style={{ borderTop: TOKENS.rim }}>
                  <td style={{ padding: "8px", fontWeight: 600, color: "var(--fg-primary)", whiteSpace: "nowrap" }}>{s.label}</td>
                  <td style={{ padding: "8px", minWidth: 160 }}>
                    {s.unit === "count" ? (
                      <div style={{ height: 7, background: TOKENS.track, borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(2, Math.round((s.latest / maxLatest) * 100))}%`, height: "100%", background: "hsl(217 71% 45%)", borderRadius: 999 }} />
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>dollars</span>
                    )}
                  </td>
                  <td style={{ padding: "8px", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {s.unit === "dollars" ? fmtMoney(s.latest) : fmtNum(s.latest)}
                  </td>
                  <td style={{ padding: "8px" }}>{s.unit === "count" && s.convLatest !== null ? fmtPct(s.convLatest) : "—"}</td>
                  <td style={{ padding: "8px" }}>{s.unit === "count" && s.convTotal !== null ? fmtPct(s.convTotal) : "—"}</td>
                  <td style={{ padding: "8px" }}><MiniSparkline scores={s.weekly} dir={dirOf(s.weekly)} /></td>
                  <td style={{ padding: "8px" }}><SignalPill s={s.signal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: TOKENS.surface, border: TOKENS.rim, borderRadius: "1rem", padding: 18 }}>
        <SectionLabel>Reading the funnel</SectionLabel>
        <p style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.6, margin: 0 }}>
          Top-of-funnel volume is growing while SQL and Opportunity conversion soften — consistent with the
          MQL→SQL quality dip flagged in Emerging Signals. Launch-campaign leads are converting below the
          portfolio average; tightening MQL scoring criteria for the new lines should recover the mid-funnel
          rate before it hits pipeline.
        </p>
      </div>
    </div>
  );
}
