// ============================================================
// SCORING ENGINE — pure functions, no UI dependencies.
// Implements Customer Health Model Framework v2.0:
//   - VAR composite with stage weights + two-tier overrides
//   - Expansion Readiness score (Section 2A)
//   - Renewal forecast with confidence-weighted blend (Section 5)
// Designed to run identically against mock data or a real
// Snowflake/Supabase data layer.
// ============================================================

import type {
  Account,
  Action,
  ConfidenceTier,
  ExpansionScoring,
  HealthBand,
  HealthScoring,
  RenewalForecast,
  ScoredAccount,
  Segment,
  Stage,
} from "./types";

// ---------- Stage weights (Section 3) ----------

export const WEIGHTS: Record<string, { value: number; adoption: number; relationship: number }> = {
  Implementation: { value: 0.2, adoption: 0.5, relationship: 0.3 },
  Launch: { value: 0.3, adoption: 0.4, relationship: 0.3 },
  "Steady State": { value: 0.35, adoption: 0.35, relationship: 0.3 },
  "Renewal Window": { value: 0.3, adoption: 0.3, relationship: 0.4 },
};

// ---------- Health band thresholds by segment (Section 3) ----------

export const THRESHOLDS: Record<Segment, { healthy: number; risk: number }> = {
  ENT: { healthy: 75, risk: 50 },
  MM: { healthy: 70, risk: 45 },
  SMB: { healthy: 65, risk: 40 },
};

export function healthBand(score: number, seg: Segment): HealthBand {
  const t = THRESHOLDS[seg];
  if (score >= t.healthy) return "Healthy";
  if (score >= t.risk) return "At Risk";
  return "Critical";
}

// ---------- VAR composite + override system ----------

export function scoringEngine(account: Account): HealthScoring {
  const w = WEIGHTS[account.stage] ?? WEIGHTS["Steady State"];
  let composite =
    account.valueScore * w.value +
    account.adoptionScore * w.adoption +
    account.relationshipScore * w.relationship;

  // Tier 2: score penalties (10-15 pts), no auto-downgrade
  let penalty = 0;
  const penaltyReasons: string[] = [];
  const f = account.flags;
  if (f.adoptionNegative60d) { penalty += 12; penaltyReasons.push("Adoption declining 60d+"); }
  if (f.ticketSpike) { penalty += 10; penaltyReasons.push("Support ticket spike (2x)"); }
  if (f.missedQBR) { penalty += 10; penaltyReasons.push("Missed QBR 2+ cycles"); }
  if (f.noContactLate) { penalty += 10; penaltyReasons.push("No CSM contact (overdue)"); }
  if (f.powerUserDeparture) { penalty += 12; penaltyReasons.push("Key power user departure"); }
  composite = Math.max(0, composite - penalty);

  // Tier 1: auto-downgrade to Critical regardless of composite
  let tier1: string | null = null;
  if (f.execSponsorDeparture) tier1 = "Exec sponsor departed — 48hr response required";
  if (f.championDeparture) tier1 = "Champion departed — 24hr outreach required";
  if (f.supportCSATLow) tier1 = "Support CSAT < 3.0 trailing 30d";
  if (f.formalCancelNotice) tier1 = "Formal cancel notice — CCO/CRO escalation";
  if (f.execEscalationOpen) tier1 = "Active exec escalation open";
  if (f.npsDetractor) tier1 = "NPS Detractor — senior stakeholder";

  const finalScore = tier1 ? Math.min(Math.round(composite), 39) : Math.round(composite);
  return { score: finalScore, band: healthBand(finalScore, account.segment), tier1, penaltyReasons, weights: w };
}

// ---------- Expansion Readiness engine (Section 2A) ----------
// Weighted signal blend. Weights are starting hypotheses —
// the optimization loop revisits them quarterly.

export const EXPANSION_WEIGHTS = {
  capacityUtil: 0.2,
  featureCeiling: 0.15,
  useCaseSignals: 0.2,
  execEngagement: 0.2,
  championAdvocacy: 0.1,
  budgetCycleAlignment: 0.1,
  contractStructure: 0.05,
};

function contractStructureScore(monthsLeft: number): number {
  // Sweet spot: 3-9 months out (renewal-adjacent or mid-term flexible).
  if (monthsLeft <= 1) return 30; // too late — renewal conversation, not expansion
  if (monthsLeft <= 9) return 85;
  if (monthsLeft <= 14) return 60;
  return 40; // long runway, low urgency
}

export function expansionEngine(account: Account, health: HealthScoring): ExpansionScoring {
  const e = account.expansion;
  const components = [
    { label: "Capacity Utilization", value: e.capacityUtil, weight: EXPANSION_WEIGHTS.capacityUtil },
    { label: "Feature Ceiling Proximity", value: e.featureCeiling, weight: EXPANSION_WEIGHTS.featureCeiling },
    { label: "New Use Case Signals", value: e.useCaseSignals, weight: EXPANSION_WEIGHTS.useCaseSignals },
    { label: "Executive Engagement", value: e.execEngagement, weight: EXPANSION_WEIGHTS.execEngagement },
    { label: "Champion Advocacy", value: e.championAdvocacy, weight: EXPANSION_WEIGHTS.championAdvocacy },
    { label: "Budget Cycle Alignment", value: e.budgetCycleAlignment, weight: EXPANSION_WEIGHTS.budgetCycleAlignment },
    { label: "Contract Structure", value: contractStructureScore(e.contractMonthsLeft), weight: EXPANSION_WEIGHTS.contractStructure },
  ];
  const score = Math.round(components.reduce((s, c) => s + c.value * c.weight, 0));
  const band = score >= 70 ? "Expansion Ready" : score >= 45 ? "Warming" : "Not Ready";

  // Signal classification (Section 2A)
  const upsellSignal = e.capacityUtil > 80 || e.featureCeiling > 85;
  const crossSellSignal = e.useCaseSignals >= 60 || (e.execEngagement >= 70 && e.championAdvocacy >= 60);
  const timingSignal = e.budgetCycleAlignment >= 60 && e.contractMonthsLeft <= 9;

  // Blocking factor: weakest weighted component for Warming accounts
  let blockingFactor: string | null = null;
  if (band === "Warming") {
    const weakest = [...components].sort((a, b) => a.value - b.value)[0];
    blockingFactor = weakest.label;
  }

  // Recommended play: health band x expansion band matrix (Section 2A)
  let recommendedPlay: string;
  if (health.band === "Critical") {
    recommendedPlay = "No commercial conversation. Save play only.";
  } else if (health.band === "At Risk" && band === "Expansion Ready") {
    recommendedPlay = "Flag anomaly — investigate whether expansion signal is real or masking dissatisfaction. Proceed with caution.";
  } else if (health.band === "At Risk") {
    recommendedPlay = "Stabilize health before any commercial conversation.";
  } else if (band === "Expansion Ready") {
    recommendedPlay = "Priority expansion target. CSM + AE joint account plan.";
  } else if (band === "Warming") {
    recommendedPlay = `Nurture expansion signals. CSM leads, AE on standby.${blockingFactor ? ` Blocking factor: ${blockingFactor.toLowerCase()} — set 60-day plan.` : ""}`;
  } else {
    recommendedPlay = "Protect and grow. No commercial push.";
  }

  return { score, band, upsellSignal, crossSellSignal, timingSignal, blockingFactor, recommendedPlay, components };
}

// ---------- Renewal Forecast engine (Section 5) ----------
// Confidence-weighted blend: model drives when data is rich,
// CSM sentiment compensates when data is thin.

export const FORECAST_SCENARIOS = {
  base: { High: 0.95, Medium: 0.7, Low: 0.25 },
  upside: { High: 0.98, Medium: 0.82, Low: 0.45 },
  downside: { High: 0.88, Medium: 0.5, Low: 0.1 },
} as const;

function blendWeights(confidence: number): { model: number; sentiment: number; tier: ConfidenceTier } {
  if (confidence >= 75) return { model: 0.85, sentiment: 0.15, tier: "model-driven" };
  if (confidence >= 50) return { model: 0.6, sentiment: 0.4, tier: "blended" };
  return { model: 0.3, sentiment: 0.7, tier: "sentiment-dominant" };
}

/** Map CSM 1-5 rating + sentiment trend to a 0-100 renewal signal */
function sentimentSignal(account: Account): number {
  const ratingMap: Record<number, number> = { 1: 15, 2: 35, 3: 55, 4: 80, 5: 95 };
  let s = ratingMap[account.sentiment.csmRating] ?? 55;
  if (account.sentimentTrend === "declining") s -= 10;
  if (account.sentimentTrend === "positive") s += 5;
  return Math.max(0, Math.min(100, s));
}

export function renewalForecastEngine(
  account: Account,
  health: HealthScoring,
  expansion: ExpansionScoring
): RenewalForecast | null {
  if (!account.renewal) return null;

  const conf = account.dataConfidence.score;
  const { model, sentiment, tier } = blendWeights(conf);
  const modelComponent = health.score;
  const sentimentComponent = sentimentSignal(account);

  let likelihood = modelComponent * model + sentimentComponent * sentiment;

  // First-renewal adjustment: elevated churn risk regardless of health
  const firstRenewalAdjustment = account.renewal.isFirstRenewal ? -8 : 0;
  likelihood += firstRenewalAdjustment;

  // Expansion boost: expansion signal correlates with renewal confidence
  const expansionBoost = expansion.band === "Expansion Ready" && expansion.score > 65 ? 5 : 0;
  likelihood += expansionBoost;

  likelihood = Math.round(Math.max(0, Math.min(100, likelihood)));
  const likelihoodBand = likelihood >= 70 ? "High" : likelihood >= 40 ? "Medium" : "Low";

  return {
    likelihood,
    likelihoodBand,
    modelComponent,
    sentimentComponent,
    modelWeight: model,
    sentimentWeight: sentiment,
    confidenceTier: tier,
    firstRenewalAdjustment,
    expansionBoost,
  };
}

// ---------- Trend + priority action ----------

export function trendDir(arr: number[]): "up" | "down" | "flat" {
  if (!arr || arr.length < 2) return "flat";
  const diff = arr[arr.length - 1] - arr[0];
  if (diff > 4) return "up";
  if (diff < -4) return "down";
  return "flat";
}

export function getAction(account: Account, scoring: HealthScoring): Action {
  if (scoring.tier1) return { priority: "P0", label: "Immediate escalation", detail: scoring.tier1 };
  if (scoring.band === "Critical")
    return { priority: "P1", label: "Save play", detail: "Activate save protocol — CS leadership + AE alignment required" };
  if (account.stage === "Renewal Window" && scoring.band === "At Risk")
    return { priority: "P1", label: "Renewal risk intervention", detail: "Executive alignment call + success review before renewal window closes" };
  if (scoring.penaltyReasons.length >= 2)
    return { priority: "P2", label: "Multi-signal review", detail: scoring.penaltyReasons.join("; ") };
  if (scoring.penaltyReasons.length === 1)
    return { priority: "P2", label: "Monitor + action", detail: scoring.penaltyReasons[0] };
  if (scoring.band === "At Risk")
    return { priority: "P2", label: "CSM check-in", detail: "Review adoption trajectory and schedule value milestone conversation" };
  if (account.sentimentTrend === "declining")
    return { priority: "P3", label: "Sentiment watch", detail: "AI signal: communication tone declining — proactive outreach recommended" };
  if (account.stage === "Renewal Window")
    return { priority: "P3", label: "Renewal prep", detail: "Confirm exec alignment and prepare commercial conversation" };
  return { priority: "OK", label: "On track", detail: "No action required this week" };
}

// ---------- Composition ----------

export function buildScoredAccounts(accounts: Account[]): ScoredAccount[] {
  return accounts.map((a) => {
    const scoring = scoringEngine(a);
    const expansionScoring = expansionEngine(a, scoring);
    const forecast = renewalForecastEngine(a, scoring, expansionScoring);
    const action = getAction(a, scoring);
    return { ...a, scoring, expansionScoring, forecast, action, trendDir: trendDir(a.scoreTrend) };
  });
}

export const STAGES: Stage[] = ["Implementation", "Launch", "Steady State", "Renewal Window"];
