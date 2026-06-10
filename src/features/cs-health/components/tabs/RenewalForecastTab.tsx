"use client";
// Renewal Forecast — confidence-weighted blend engine (Section 5).
// Model drives when data is rich; CSM sentiment compensates when thin.
// Surfaces forecast confidence composition so finance knows which
// part of the number to trust.

import { useState } from "react";
import type { ScoredAccount } from "@/features/cs-health/lib/types";
import { FORECAST_SCENARIOS } from "@/features/cs-health/lib/scoringEngine";
import { BandPill, ConfidenceBadge, ExpansionPill, MiniSparkline, SectionLabel, SentimentDot, StatCard, formatARR, sortRows } from "@/features/cs-health/components/ui";

const PIPELINE_SORTS: { id: string; label: string; value: (a: ScoredAccount) => number | string; dir: "asc" | "desc" }[] = [
  { id: "risk", label: "Risk", value: (a) => a.forecast!.likelihood, dir: "asc" },
  { id: "arr", label: "ARR", value: (a) => a.arr, dir: "desc" },
  { id: "date", label: "Renewal date", value: (a) => a.renewal?.renewalDate ?? "", dir: "asc" },
  { id: "conf", label: "Confidence", value: (a) => a.dataConfidence.score, dir: "asc" },
];

const LIKELIHOOD_COLORS: Record<string, { text: string; bg: string }> = {
  High: { text: "hsl(135 59% 32%)", bg: "hsl(var(--success) / 0.12)" },
  Medium: { text: "hsl(28 90% 38%)", bg: "hsl(var(--warning) / 0.14)" },
  Low: { text: "hsl(359 75% 42%)", bg: "hsl(var(--destructive) / 0.12)" },
};
const TIER_COLORS: Record<string, string> = {
  "model-driven": "#1e3a5f",
  blended: "hsl(28 90% 38%)",
  "sentiment-dominant": "hsl(359 75% 42%)",
};
const TIER_LABELS: Record<string, string> = {
  "model-driven": "Model-driven",
  blended: "Blended",
  "sentiment-dominant": "Sentiment-dominant",
};

export default function RenewalForecastTab({ allScored }: { allScored: ScoredAccount[] }) {
  const [pipelineSort, setPipelineSort] = useState("risk");
  const activeSort = PIPELINE_SORTS.find((s) => s.id === pipelineSort) ?? PIPELINE_SORTS[0];
  const pipeline = sortRows(allScored.filter((a) => a.forecast), activeSort.value, activeSort.dir);

  const totalARR = pipeline.reduce((s, a) => s + a.arr, 0);
  const arrByBand = (band: string) => pipeline.filter((a) => a.forecast!.likelihoodBand === band).reduce((s, a) => s + a.arr, 0);
  const bands = { High: arrByBand("High"), Medium: arrByBand("Medium"), Low: arrByBand("Low") };

  const scenarioARR = (scenario: keyof typeof FORECAST_SCENARIOS) => {
    const rates = FORECAST_SCENARIOS[scenario];
    return bands.High * rates.High + bands.Medium * rates.Medium + bands.Low * rates.Low;
  };

  // Confidence composition: which part of the number to trust
  const arrByTier = (tier: string) => pipeline.filter((a) => a.forecast!.confidenceTier === tier).reduce((s, a) => s + a.arr, 0);
  const composition = [
    { tier: "model-driven", arr: arrByTier("model-driven") },
    { tier: "blended", arr: arrByTier("blended") },
    { tier: "sentiment-dominant", arr: arrByTier("sentiment-dominant") },
  ];
  const dataLimited = pipeline.filter((a) => a.forecast!.confidenceTier === "sentiment-dominant").length;
  const firstRenewals = pipeline.filter((a) => a.renewal?.isFirstRenewal).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Renewal Pipeline (90d)" value={formatARR(totalARR)} sub={`${pipeline.length} accounts in window`} color="var(--fg-primary)" />
        <StatCard label="Base Case Forecast" value={formatARR(scenarioARR("base"))} sub={`${((scenarioARR("base") / totalARR) * 100).toFixed(0)}% of pipeline ARR retained`} color="hsl(135 59% 32%)" />
        <StatCard label="Scenario Range" value={`${formatARR(scenarioARR("downside"))} – ${formatARR(scenarioARR("upside"))}`} sub="Downside to upside" color="#6b21a8" />
        <StatCard label="Data-Limited Accounts" value={dataLimited} sub="Sentiment-dominant forecast — probe these" color="hsl(359 75% 42%)" />
      </div>

      {/* Scenario table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "18px 20px" }}>
          <SectionLabel style={{ fontWeight: 600, marginBottom: 14 }}>Forecast Scenarios — ARR Retained</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr 90px", padding: "6px 0", borderBottom: "1px solid hsl(var(--border))" }}>
            {["Scenario", "High band", "Medium band", "Low band", "Total"].map((h) => (
              <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-tertiary)" }}>{h}</div>
            ))}
          </div>
          {(Object.keys(FORECAST_SCENARIOS) as (keyof typeof FORECAST_SCENARIOS)[]).map((sc) => {
            const rates = FORECAST_SCENARIOS[sc];
            return (
              <div key={sc} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr 90px", padding: "10px 0", borderBottom: "1px solid hsl(var(--muted) / 0.5)", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: sc === "base" ? "var(--fg-primary)" : "var(--fg-secondary)", textTransform: "capitalize" }}>{sc}</div>
                {(["High", "Medium", "Low"] as const).map((b) => (
                  <div key={b} style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
                    {formatARR(bands[b] * rates[b])} <span style={{ color: "var(--fg-tertiary)", fontSize: 10 }}>({Math.round(rates[b] * 100)}%)</span>
                  </div>
                ))}
                <div style={{ fontSize: 13, fontWeight: 700, color: sc === "base" ? "hsl(135 59% 32%)" : "var(--fg-secondary)" }}>{formatARR(scenarioARR(sc))}</div>
              </div>
            );
          })}
          <div style={{ fontSize: 10, color: "var(--fg-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
            Retention rates per likelihood band: Base 95/70/25 · Upside 98/82/45 · Downside 88/50/10
          </div>
        </div>

        {/* Confidence composition */}
        <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "18px 20px" }}>
          <SectionLabel style={{ fontWeight: 600, marginBottom: 14 }}>Forecast Confidence Composition</SectionLabel>
          <div style={{ display: "flex", height: 22, borderRadius: "0.5rem", overflow: "hidden", marginBottom: 14 }}>
            {composition.map((c) => c.arr > 0 && (
              <div key={c.tier} style={{ width: `${(c.arr / totalARR) * 100}%`, background: TIER_COLORS[c.tier], opacity: 0.85 }} />
            ))}
          </div>
          {composition.map((c) => (
            <div key={c.tier} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid hsl(var(--muted) / 0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "0.5rem", background: TIER_COLORS[c.tier], display: "inline-block" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-primary)" }}>{TIER_LABELS[c.tier]}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                {formatARR(c.arr)} <span style={{ color: "var(--fg-tertiary)", fontSize: 10 }}>({totalARR ? Math.round((c.arr / totalARR) * 100) : 0}%)</span>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 10, color: "var(--fg-tertiary)", marginTop: 12, lineHeight: 1.6 }}>
            Model-driven (confidence 75+): model 85% / sentiment 15%. Blended (50-74): 60/40. Sentiment-dominant (&lt;50): 30/70 — flagged data-limited. This tells finance which part of the number to trust and which to probe.
          </div>
        </div>
      </div>

      {/* Per-account pipeline */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <SectionLabel style={{ fontWeight: 600, marginBottom: 0 }}>Renewal Window Accounts</SectionLabel>
        <span style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>sort by</span>
        {PIPELINE_SORTS.map((s) => (
          <button key={s.id} onClick={() => setPipelineSort(s.id)} style={{ padding: "4px 12px", fontSize: 11, fontWeight: 500, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: 999, background: pipelineSort === s.id ? "var(--fg-primary)" : "hsl(var(--card))", color: pipelineSort === s.id ? "white" : "var(--fg-secondary)", transition: "all 150ms ease-in-out" }}>
            {s.label}
          </button>
        ))}
      </div>
      {pipeline.map((a) => {
        const f = a.forecast!;
        const lc = LIKELIHOOD_COLORS[f.likelihoodBand];
        return (
          <div key={a.id} style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "16px 20px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                  {a.name}
                  {a.renewal?.isFirstRenewal && <span style={{ fontSize: 9, fontWeight: 700, background: "#ede9fe", color: "#6d28d9", padding: "2px 7px", borderRadius: "0.5rem", letterSpacing: "0.06em" }}>FIRST RENEWAL −8</span>}
                  {f.expansionBoost > 0 && <span style={{ fontSize: 9, fontWeight: 700, background: "hsl(var(--success) / 0.12)", color: "hsl(135 59% 32%)", padding: "2px 7px", borderRadius: "0.5rem", letterSpacing: "0.06em" }}>EXPANSION +5</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 2 }}>{a.csm} · {formatARR(a.arr)} ARR · {a.segment} · renews {a.renewal?.renewalDate}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ConfidenceBadge score={a.dataConfidence.score} />
                <BandPill band={a.scoring.band} />
                <span style={{ background: lc.bg, color: lc.text, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: "0.5rem" }}>{f.likelihood}% · {f.likelihoodBand}</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 4 }}>
                  Blend: model {Math.round(f.modelWeight * 100)}% ({f.modelComponent}) · sentiment {Math.round(f.sentimentWeight * 100)}% ({f.sentimentComponent})
                </div>
                <div style={{ display: "flex", height: 8, borderRadius: "0.5rem", overflow: "hidden", maxWidth: 280 }}>
                  <div style={{ width: `${f.modelWeight * 100}%`, background: "#1e3a5f", opacity: 0.8 }} />
                  <div style={{ width: `${f.sentimentWeight * 100}%`, background: "hsl(359 75% 42%)", opacity: 0.6 }} />
                </div>
              </div>
              <div><div style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 4 }}>6-Month Health Trend</div><MiniSparkline scores={a.scoreTrend} dir={a.trendDir} /></div>
              <div><div style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 4 }}>Exec Sentiment</div><div style={{ fontSize: 12, display: "flex", alignItems: "center" }}><SentimentDot t={a.sentimentTrend} /><span style={{ color: "var(--fg-secondary)" }}>{a.sentimentTrend}</span></div></div>
              <div><div style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 4 }}>Expansion</div><ExpansionPill band={a.expansionScoring.band} /></div>
            </div>
            {a.sentiment.verbatimTheme && <div style={{ marginTop: 12, fontSize: 11, color: "var(--fg-secondary)", background: "hsl(var(--muted))", padding: "8px 12px", fontStyle: "italic", borderLeft: "2px solid hsl(var(--border))" }}>&ldquo;{a.sentiment.verbatimTheme}&rdquo;</div>}
          </div>
        );
      })}
    </div>
  );
}
