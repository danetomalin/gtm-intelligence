// ============================================================
// CHAT CONTEXT — builds a compact portfolio snapshot that is
// injected as the system prompt for Ask Jon. The model
// answers from the same data the dashboard renders.
// ============================================================

import type { ScoredAccount } from "./types";
import { DATA } from "./generateData";

export function buildSystemPrompt(allScored: ScoredAccount[]): string {
  const lines: string[] = [];

  lines.push(
    "You are Jon, a veteran Customer Success leader embedded in the Customer Health workspace of Throughline. You serve the CS team at Halcyon, a workforce management platform (~$13M ARR) whose customer portfolio appears below. You designed the VAR health framework this dashboard runs on, and you help Halcyon's CS leaders interpret portfolio health, prioritize actions, and prepare for renewals and expansion conversations. Speak in first person, plainly and confidently, like a trusted operator — not like a generic assistant.",
    "Answer from the portfolio data below. Be specific: name accounts, cite scores and ARR. Keep answers concise and action-oriented. If asked something the data cannot answer, say so plainly.",
    "Model reference: VAR health score 0-100 (Value/Adoption/Relationship, stage-weighted; Tier 1 overrides force Critical). Expansion readiness 0-100 (Ready 70+, Warming 45-69). Renewal likelihood blends model + CSM sentiment weighted by data confidence; first renewals carry a -8 adjustment.",
    "",
    "=== PORTFOLIO SNAPSHOT ==="
  );

  // Accounts (ENT + MM)
  lines.push("ACCOUNTS (id | name | segment | stage | ARR | health/band | V/A/R | priority action | expansion | renewal likelihood | confidence):");
  for (const a of allScored) {
    const f = a.forecast ? `${a.forecast.likelihood}% ${a.forecast.likelihoodBand}${a.renewal?.isFirstRenewal ? " (first renewal)" : ""} renews ${a.renewal?.renewalDate}` : "-";
    lines.push(
      `${a.id} | ${a.name} | ${a.segment} | ${a.stage} | $${Math.round(a.arr / 1000)}K | ${a.scoring.score}/${a.scoring.band}${a.scoring.tier1 ? ` [TIER1: ${a.scoring.tier1}]` : ""} | ${a.valueScore}/${a.adoptionScore}/${a.relationshipScore} | ${a.action.priority}: ${a.action.label} | ${a.expansionScoring.score}/${a.expansionScoring.band} | ${f} | conf ${a.dataConfidence.score}`
    );
  }

  // SMB cohort
  const smb = DATA.smbCohort;
  lines.push(
    "",
    `SMB COHORT (aggregate): ${smb.total} accounts, ${smb.healthy} healthy / ${smb.atRisk} at risk / ${smb.critical} critical, avg score ${smb.avgScore}, $${Math.round(smb.totalARR / 1000)}K total ARR, $${Math.round(smb.arrAtRisk / 1000)}K at risk. Flags: ${smb.topFlags.join("; ")}`
  );

  // Churn history
  lines.push("", "CHURN EVENTS (TTM — ground truth for the model):");
  for (const e of DATA.churnEvents) {
    lines.push(`${e.name} (${e.segment}, $${Math.round(e.arr / 1000)}K, ${e.date}): ${e.primaryReason}${e.secondaryReason ? `+${e.secondaryReason}` : ""}. Health 90/60/30d prior: ${e.healthScore90d}/${e.healthScore60d}/${e.healthScore30d}. Learnings: ${e.learnings}`);
  }

  // Segment trend signals
  lines.push("", "AGGREGATE TREND SIGNALS (4-week):");
  for (const [seg, metrics] of Object.entries(DATA.aggregateTrends)) {
    const flagged = Object.values(metrics).filter((m) => m.signal !== "stable");
    for (const m of flagged) {
      lines.push(`${seg} ${m.label}: ${m.signal.toUpperCase()} — ${m.note}`);
    }
  }

  lines.push("", "Churn reason codes: CR-01 Value Not Realized, CR-02 Product Gap, CR-03 Champion Loss, CR-04 Competitive, CR-05 Budget/Economic, CR-06 Implementation Failure, CR-07 Strategic Change.");

  return lines.join("\n");
}

export const SUGGESTED_PROMPTS = [
  "What should I focus on this week?",
  "Which renewals are most at risk and why?",
  "Where are our best expansion opportunities?",
  "What patterns connect our recent churn?",
];
