"use client";
// Expansion — tiered by readiness band, upsell vs cross-sell signal
// distinction, expandable rows with full signal breakdown and
// recommended play (Section 2A).

import { useState } from "react";
import type { ScoredAccount } from "@/features/cs-health/lib/types";
import { BandPill, ConfidenceBadge, SectionLabel, SortHeader, StatCard, formatARR, sortRows, useSort } from "@/features/cs-health/components/ui";

type ExpSortKey = "name" | "arr" | "escore" | "health" | "conf";
const EXP_SORT_VALUE: Record<ExpSortKey, (a: ScoredAccount) => number | string> = {
  name: (a) => a.name.toLowerCase(),
  arr: (a) => a.arr,
  escore: (a) => a.expansionScoring.score,
  health: (a) => a.scoring.score,
  conf: (a) => a.dataConfidence.score,
};
const EXP_HEADERS: { label: string; key?: ExpSortKey }[] = [
  { label: "" },
  { label: "Account", key: "name" },
  { label: "ARR", key: "arr" },
  { label: "Exp. Score", key: "escore" },
  { label: "Health", key: "health" },
  { label: "Signals" },
  { label: "Confidence", key: "conf" },
];

const TIER_META: Record<string, { color: string; desc: string }> = {
  "Expansion Ready": { color: "hsl(135 59% 32%)", desc: "Condition set present. Commercial conversation appropriate now — initiate CS-to-Sales handoff." },
  Warming: { color: "hsl(28 90% 38%)", desc: "Some signals present but not aligned. Identify the blocking factor and set a 60-day plan." },
  "Not Ready": { color: "var(--fg-secondary)", desc: "Premature for commercial conversation. Focus on health and value realization first." },
};

function SignalDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? "hsl(var(--success))" : "hsl(var(--muted))", display: "inline-block" }} />
      <span style={{ fontSize: 10, color: on ? "var(--fg-primary)" : "var(--fg-tertiary)", fontWeight: on ? 600 : 400 }}>{label}</span>
    </span>
  );
}

export default function ExpansionTab({ allScored }: { allScored: ScoredAccount[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sortKey, sortDir, toggle } = useSort<ExpSortKey>("escore", "desc");

  const tiers = (["Expansion Ready", "Warming", "Not Ready"] as const).map((band) => ({
    band,
    accounts: sortRows(
      allScored.filter((a) => a.expansionScoring.band === band),
      EXP_SORT_VALUE[sortKey],
      sortDir
    ),
  }));

  const ready = tiers[0].accounts;
  const readyARR = ready.reduce((s, a) => s + a.arr, 0);
  const anomalies = ready.filter((a) => a.scoring.band !== "Healthy");
  const upsellCount = allScored.filter((a) => a.expansionScoring.upsellSignal && a.expansionScoring.band !== "Not Ready").length;
  const crossSellCount = allScored.filter((a) => a.expansionScoring.crossSellSignal && a.expansionScoring.band !== "Not Ready").length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Expansion Ready" value={ready.length} sub={`${formatARR(readyARR)} base ARR in play`} color="hsl(135 59% 32%)" />
        <StatCard label="Upsell Signals" value={upsellCount} sub="Capacity >80% or feature ceiling >85%" color="#1e3a5f" />
        <StatCard label="Cross-Sell Signals" value={crossSellCount} sub="New use cases, exec breadth, advocacy" color="#6b21a8" />
        <StatCard label="Anomalies" value={anomalies.length} sub="Expansion-ready but not Healthy — investigate" color="hsl(var(--destructive))" />
      </div>

      {tiers.map(({ band, accounts }) => {
        const meta = TIER_META[band];
        return (
          <div key={band} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <SectionLabel color={meta.color} style={{ marginBottom: 0, letterSpacing: "0.12em" }}>{band} ({accounts.length})</SectionLabel>
              <span style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>{meta.desc}</span>
            </div>
            <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", marginTop: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "26px 180px 60px 80px 90px 1fr 120px", columnGap: 10, padding: "7px 14px", borderBottom: "1px solid hsl(var(--border))", alignItems: "center" }}>
                {EXP_HEADERS.map((hd, i) => hd.key ? (
                  <SortHeader key={i} label={hd.label} active={sortKey === hd.key} dir={sortDir} onClick={() => toggle(hd.key!, "desc")} />
                ) : (
                  <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-tertiary)" }}>{hd.label}</div>
                ))}
              </div>
              {accounts.length === 0 && <div style={{ padding: "14px 16px", fontSize: 11, color: "var(--fg-tertiary)" }}>No accounts in this tier.</div>}
              {accounts.map((a) => {
                const e = a.expansionScoring;
                const isExp = expandedId === a.id;
                const anomaly = band === "Expansion Ready" && a.scoring.band !== "Healthy";
                return (
                  <div key={a.id}>
                    <div onClick={() => setExpandedId(isExp ? null : a.id)} style={{ display: "grid", gridTemplateColumns: "26px 180px 60px 80px 90px 1fr 120px", columnGap: 10, padding: "11px 14px", borderBottom: "1px solid hsl(var(--border))", alignItems: "center", cursor: "pointer", background: isExp ? "hsl(var(--card))" : anomaly ? "hsl(var(--warning) / 0.06)" : "white" }}>
                      <div style={{ fontSize: 10, color: "var(--fg-tertiary)", fontWeight: 700 }}>{isExp ? "▼" : "▶"}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-primary)" }}>{a.name}{anomaly && <span style={{ fontSize: 9, fontWeight: 700, color: "hsl(var(--destructive))", marginLeft: 6 }}>⚠ ANOMALY</span>}</div>
                        <div style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>{a.csm} · {a.segment} · {a.stage}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>{formatARR(a.arr)}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>{e.score}</div>
                      <BandPill band={a.scoring.band} />
                      <div>
                        <SignalDot on={e.upsellSignal} label="Upsell" />
                        <SignalDot on={e.crossSellSignal} label="Cross-sell" />
                        <SignalDot on={e.timingSignal} label="Timing" />
                      </div>
                      <ConfidenceBadge score={a.dataConfidence.score} />
                    </div>
                    {isExp && (
                      <div style={{ padding: "16px 46px 20px", background: "hsl(var(--card))", borderBottom: "1px solid hsl(var(--border))" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                          <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 10 }}>Signal Breakdown — weighted blend</div>
                            {e.components.map((c) => (
                              <div key={c.label} style={{ display: "grid", gridTemplateColumns: "170px 1fr 60px 50px", gap: 10, alignItems: "center", marginBottom: 7 }}>
                                <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{c.label}</span>
                                <div style={{ height: 5, background: "hsl(var(--muted))", borderRadius: "0.5rem" }}>
                                  <div style={{ width: `${c.value}%`, height: "100%", background: c.value >= 70 ? "hsl(var(--success))" : c.value >= 45 ? "hsl(var(--warning))" : "hsl(var(--muted))", borderRadius: "0.5rem" }} />
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-primary)" }}>{c.value}</span>
                                <span style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>wt {Math.round(c.weight * 100)}%</span>
                              </div>
                            ))}
                            {e.blockingFactor && <div style={{ fontSize: 10, color: "hsl(28 90% 38%)", background: "hsl(var(--warning) / 0.14)", padding: "5px 8px", marginTop: 8 }}>Blocking factor: {e.blockingFactor}</div>}
                          </div>
                          <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 10 }}>Recommended Play</div>
                            <div style={{ fontSize: 12, color: "var(--fg-primary)", lineHeight: 1.6 }}>{e.recommendedPlay}</div>
                            <div style={{ fontSize: 10, color: "var(--fg-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
                              Play derived from health band ({a.scoring.band}) × expansion band ({e.band}) matrix. Contract: {a.expansion.contractMonthsLeft}mo remaining.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
