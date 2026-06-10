// ============================================================
// MARKETING CHAT CONTEXT — builds the system prompt for Mara, the
// Marketing Health workspace copilot. Mirrors the CS pattern: the
// model answers from the same data the dashboard renders.
// ============================================================

import type { ChannelRollup, FunnelStage, MarketingTrendMetric, ScoredCampaign } from "./types";
import { funnelConversion } from "./rollups";

const k = (n: number) => `$${Math.round(n / 1000)}K`;

export function buildMarketingSystemPrompt(
  scored: ScoredCampaign[],
  rollups: ChannelRollup[],
  funnel: FunnelStage[],
  trends: MarketingTrendMetric[],
  brandName = "the active brand",
): string {
  const lines: string[] = [];

  lines.push(
    `You are Mara, a veteran growth and demand-gen leader embedded in the Marketing Health workspace for ${brandName}. You read the campaign portfolio, channel roll-ups, funnel, and trend signals below and help marketing leaders decide where to push budget, what to fix, and what to tell the CMO. Speak in first person, plainly and confidently, like a trusted operator — not like a generic assistant.`,
    "Answer from the data below. Be specific: name campaigns and channels, cite spend, CPL, and pipeline numbers. Keep answers concise and action-oriented. If asked something the data cannot answer, say so plainly.",
    "Signal scale: improving | stable | watch | warning | spike (spike = most adverse). All totals are 4-week trailing unless noted.",
    "",
    "=== CAMPAIGN PORTFOLIO (4-week) ===",
    "id | name | channel | objective | status | spend | MQLs | CPL | CTR | pipeline | pipe/$ | signals (mql/cpl/pipe)",
  );
  for (const c of scored) {
    const cpl = c.kpis.cpl !== null ? `$${c.kpis.cpl.toFixed(0)}` : "-";
    const ppd = c.kpis.pipelinePerDollar !== null ? `${c.kpis.pipelinePerDollar.toFixed(1)}x` : "-";
    lines.push(
      `${c.id} | ${c.name} | ${c.channel} | ${c.objective} | ${c.status} | ${k(c.kpis.spend4w)} | ${c.kpis.mqls4w} | ${cpl} | ${(c.kpis.ctr * 100).toFixed(1)}% | ${k(c.kpis.pipeline4w)} | ${ppd} | ${c.kpis.signals.mqls}/${c.kpis.signals.cpl}/${c.kpis.signals.pipeline}${c.note ? ` | note: ${c.note}` : ""}`,
    );
  }

  lines.push("", "=== CHANNEL ROLL-UPS (4-week) ===");
  for (const r of rollups) {
    lines.push(
      `${r.channel}: spend ${k(r.spend4w)} (${Math.round(r.spendShare * 100)}% share) | pipeline ${k(r.pipeline4w)} (${Math.round(r.pipelineShare * 100)}%) | ${r.mqls4w} MQLs | CPL ${r.cpl !== null ? `$${r.cpl.toFixed(0)}` : "-"} | pipe/$ ${r.pipelinePerDollar !== null ? `${r.pipelinePerDollar.toFixed(1)}x` : "-"} | signal ${r.signal}${r.topCampaign ? ` | best: ${r.topCampaign}` : ""}`,
    );
  }

  lines.push("", "=== FUNNEL (latest week, conversion vs prior stage) ===");
  for (const s of funnelConversion(funnel)) {
    lines.push(
      `${s.label}: ${s.unit === "dollars" ? k(s.latest) : s.latest} | conv ${s.convLatest !== null && s.unit === "count" ? `${(s.convLatest * 100).toFixed(1)}%` : "-"} | signal ${s.signal}`,
    );
  }

  lines.push("", "=== AGGREGATE TREND SIGNALS (4-week) ===");
  for (const m of trends) {
    lines.push(`${m.label} (${m.unit}): ${m.weeks.join(" → ")} | ${m.signal.toUpperCase()} — ${m.note}`);
  }

  return lines.join("\n");
}

export const MARKETING_SUGGESTED_PROMPTS = [
  "Where should I move budget this month?",
  "What's driving CAC up and what do we do about it?",
  "Which campaigns should we pause or fix first?",
  "Summarize marketing performance for the CMO in 5 bullets.",
];
