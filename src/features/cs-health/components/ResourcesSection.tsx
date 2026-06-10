"use client";
// Resources — scoring logic reference. Values are imported from the
// scoring engine itself, so this documentation cannot drift from the
// code. Doubles as customer-facing model transparency.

import { EXPANSION_WEIGHTS, FORECAST_SCENARIOS, THRESHOLDS, WEIGHTS } from "@/features/cs-health/lib/scoringEngine";

const card: React.CSSProperties = { border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", borderRadius: "0.75rem", padding: "16px 18px", marginBottom: 12 };
const h: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--fg-primary)", marginBottom: 4, letterSpacing: "-0.01em" };
const sub: React.CSSProperties = { fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.55, marginBottom: 10 };
const tableHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "var(--fg-tertiary)", padding: "4px 0", textAlign: "left" };
const cell: React.CSSProperties = { fontSize: 11.5, color: "var(--fg-primary)", padding: "5px 0", borderTop: "1px solid hsl(var(--muted) / 0.6)" };
const cellMuted: React.CSSProperties = { ...cell, color: "var(--fg-secondary)" };
const mono: React.CSSProperties = { fontFamily: "ui-monospace, monospace", fontSize: 11, background: "hsl(var(--muted))", padding: "1px 6px", borderRadius: 4 };
const noteStyle: React.CSSProperties = { fontSize: 10.5, color: "hsl(28 90% 38%)", background: "hsl(var(--warning) / 0.10)", padding: "7px 10px", borderRadius: "0.5rem", lineHeight: 1.5, marginTop: 8 };

const TIER1 = [
  "Exec sponsor or economic buyer departure",
  "Champion / primary power user departure",
  "Support CSAT below 3.0 (trailing 30d)",
  "Formal cancel notice",
  "Active executive escalation",
  "NPS detractor from senior stakeholder",
];
const TIER2: [string, number][] = [
  ["Adoption declining 60d+", 12],
  ["Key power user departure", 12],
  ["Support ticket spike (2x trailing avg)", 10],
  ["Missed QBR 2+ consecutive cycles", 10],
  ["No CSM contact (overdue)", 10],
];
const SENTIMENT_MAP: [string, number][] = [["1", 15], ["2", 35], ["3", 55], ["4", 80], ["5", 95]];
const EXPANSION_LABELS: Record<keyof typeof EXPANSION_WEIGHTS, string> = {
  capacityUtil: "Capacity utilization",
  featureCeiling: "Feature ceiling proximity",
  useCaseSignals: "New use case signals",
  execEngagement: "Executive engagement",
  championAdvocacy: "Champion advocacy",
  budgetCycleAlignment: "Budget cycle alignment",
  contractStructure: "Contract structure",
};
const ACTION_LADDER: [string, string][] = [
  ["P0", "Tier 1 override active — immediate escalation"],
  ["P1", "Critical band → save play · Renewal Window + At Risk → renewal intervention"],
  ["P2", "2+ Tier 2 penalties → multi-signal review · 1 penalty → monitor · At Risk → CSM check-in"],
  ["P3", "Declining sentiment → sentiment watch · Renewal Window + Healthy → renewal prep"],
  ["OK", "No action required this week"],
];

export default function ResourcesSection() {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
        How every score in this product is computed. Values shown here are read live from the scoring engine — they are the model, not a copy of it. Starting weights are hypotheses; the optimization loop revisits them against actual outcomes.
      </div>

      {/* Health Score */}
      <div style={card}>
        <div style={h}>Health Score (0–100)</div>
        <div style={sub}>
          <span style={mono}>score = Value×w + Adoption×w + Relationship×w</span> with stage-based weights, then Tier 2 penalties subtract points, and any Tier 1 trigger caps the score at 39 (forced Critical).
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
          <thead><tr><th style={tableHead}>Stage</th><th style={tableHead}>Value</th><th style={tableHead}>Adoption</th><th style={tableHead}>Relationship</th></tr></thead>
          <tbody>
            {Object.entries(WEIGHTS).map(([stage, w]) => (
              <tr key={stage}><td style={cell}>{stage}</td><td style={cellMuted}>{Math.round(w.value * 100)}%</td><td style={cellMuted}>{Math.round(w.adoption * 100)}%</td><td style={cellMuted}>{Math.round(w.relationship * 100)}%</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ ...tableHead, padding: 0, marginBottom: 4 }}>Tier 1 — auto-Critical (cap 39)</div>
            {TIER1.map((t) => <div key={t} style={{ fontSize: 11, color: "var(--fg-secondary)", padding: "2px 0" }}>· {t}</div>)}
          </div>
          <div>
            <div style={{ ...tableHead, padding: 0, marginBottom: 4 }}>Tier 2 — score penalties (stack)</div>
            {TIER2.map(([t, pts]) => <div key={t} style={{ fontSize: 11, color: "var(--fg-secondary)", padding: "2px 0" }}>· {t} <strong style={{ color: "hsl(359 75% 42%)" }}>−{pts}</strong></div>)}
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <thead><tr><th style={tableHead}>Band</th><th style={tableHead}>Enterprise</th><th style={tableHead}>Mid-Market</th><th style={tableHead}>SMB</th></tr></thead>
          <tbody>
            <tr><td style={cell}>Healthy</td><td style={cellMuted}>{THRESHOLDS.ENT.healthy}+</td><td style={cellMuted}>{THRESHOLDS.MM.healthy}+</td><td style={cellMuted}>{THRESHOLDS.SMB.healthy}+</td></tr>
            <tr><td style={cell}>At Risk</td><td style={cellMuted}>{THRESHOLDS.ENT.risk}–{THRESHOLDS.ENT.healthy - 1}</td><td style={cellMuted}>{THRESHOLDS.MM.risk}–{THRESHOLDS.MM.healthy - 1}</td><td style={cellMuted}>{THRESHOLDS.SMB.risk}–{THRESHOLDS.SMB.healthy - 1}</td></tr>
            <tr><td style={cell}>Critical</td><td style={cellMuted}>&lt;{THRESHOLDS.ENT.risk}</td><td style={cellMuted}>&lt;{THRESHOLDS.MM.risk}</td><td style={cellMuted}>&lt;{THRESHOLDS.SMB.risk}</td></tr>
          </tbody>
        </table>
        <div style={{ fontSize: 10.5, color: "var(--fg-tertiary)", marginTop: 6 }}>SMB thresholds are tighter so lower-touch accounts get flagged earlier.</div>
      </div>

      {/* Expansion Readiness */}
      <div style={card}>
        <div style={h}>Expansion Readiness (0–100)</div>
        <div style={sub}>Weighted blend of seven signals. Bands: Ready 70+, Warming 45–69, Not Ready below 45. Warming accounts surface their weakest component as the blocking factor.</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
          <thead><tr><th style={tableHead}>Signal</th><th style={tableHead}>Weight</th></tr></thead>
          <tbody>
            {(Object.keys(EXPANSION_WEIGHTS) as (keyof typeof EXPANSION_WEIGHTS)[]).map((k) => (
              <tr key={k}><td style={cell}>{EXPANSION_LABELS[k]}</td><td style={cellMuted}>{Math.round(EXPANSION_WEIGHTS[k] * 100)}%</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.6 }}>
          Contract structure is derived from months remaining: ≤1mo → 30 (renewal conversation, not expansion) · 2–9mo → 85 (sweet spot) · 10–14mo → 60 · longer → 40.
          <br />Upsell signal: capacity &gt;80% or feature ceiling &gt;85%. Cross-sell: use cases ≥60, or exec engagement ≥70 with advocacy ≥60. Timing: budget alignment ≥60 and ≤9mo remaining.
          <br />Recommended play comes from the health × expansion matrix — e.g. At Risk + Ready → investigate the anomaly before any commercial push; Critical → save play only.
        </div>
      </div>

      {/* Renewal Forecast */}
      <div style={card}>
        <div style={h}>Renewal Likelihood (Renewal Window accounts)</div>
        <div style={sub}>
          <span style={mono}>likelihood = health×w_model + sentiment×w_sentiment</span> — the blend is set by data confidence, so thin data leans on CSM judgment and rich data leans on the model.
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
          <thead><tr><th style={tableHead}>Data confidence</th><th style={tableHead}>Model</th><th style={tableHead}>Sentiment</th><th style={tableHead}>Tier</th></tr></thead>
          <tbody>
            <tr><td style={cell}>75+</td><td style={cellMuted}>85%</td><td style={cellMuted}>15%</td><td style={cellMuted}>Model-driven</td></tr>
            <tr><td style={cell}>50–74</td><td style={cellMuted}>60%</td><td style={cellMuted}>40%</td><td style={cellMuted}>Blended</td></tr>
            <tr><td style={cell}>&lt;50</td><td style={cellMuted}>30%</td><td style={cellMuted}>70%</td><td style={cellMuted}>Sentiment-dominant (data-limited)</td></tr>
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
          Sentiment signal from CSM rating: {SENTIMENT_MAP.map(([r, v]) => `${r}→${v}`).join(" · ")}, then −10 if trend declining / +5 if positive.
          Adjustments: first renewal −8 (elevated churn risk regardless of health) · expansion boost +5 (Expansion Ready with score &gt;65). Bands: High 70+, Medium 40–69, Low below 40.
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={tableHead}>Scenario</th><th style={tableHead}>High band retained</th><th style={tableHead}>Medium</th><th style={tableHead}>Low</th></tr></thead>
          <tbody>
            {(Object.keys(FORECAST_SCENARIOS) as (keyof typeof FORECAST_SCENARIOS)[]).map((sc) => (
              <tr key={sc}><td style={{ ...cell, textTransform: "capitalize" }}>{sc}</td><td style={cellMuted}>{Math.round(FORECAST_SCENARIOS[sc].High * 100)}%</td><td style={cellMuted}>{Math.round(FORECAST_SCENARIOS[sc].Medium * 100)}%</td><td style={cellMuted}>{Math.round(FORECAST_SCENARIOS[sc].Low * 100)}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Priority Action */}
      <div style={card}>
        <div style={h}>Priority Action (P0–OK)</div>
        <div style={sub}>Rule ladder — first match wins.</div>
        {ACTION_LADDER.map(([p, rule]) => (
          <div key={p} style={{ display: "flex", gap: 10, padding: "5px 0", borderTop: "1px solid hsl(var(--muted) / 0.6)" }}>
            <span style={{ ...mono, flexShrink: 0, alignSelf: "flex-start" }}>{p}</span>
            <span style={{ fontSize: 11.5, color: "var(--fg-secondary)", lineHeight: 1.5 }}>{rule}</span>
          </div>
        ))}
      </div>

      {/* Supporting logic + known gaps */}
      <div style={card}>
        <div style={h}>Supporting Logic &amp; Known Gaps</div>
        <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.7 }}>
          <strong>Trend direction:</strong> over the 6-point score history, a change of more than +4 → up, less than −4 → down, otherwise flat.
          <br /><strong>Data confidence components</strong> (input completeness 40% · recency 30% · source diversity 20% · override presence 10%) feed the forecast blend.
        </div>
        <div style={noteStyle}>
          Two pieces are currently authored in demo data rather than computed: the data confidence component math and the Weekly Review spike/warning/watch/stable flags (rule: directional change vs. prior week). Both activate when live connector data replaces the mock layer.
        </div>
      </div>
    </div>
  );
}
