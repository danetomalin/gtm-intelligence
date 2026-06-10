// ============================================================
// Shared types — CS Health Model v2.0
// Data shapes are designed to be swappable for Supabase reads.
// ============================================================

export type Segment = "ENT" | "MM" | "SMB";
export type Stage = "Implementation" | "Launch" | "Steady State" | "Renewal Window";
export type HealthBand = "Healthy" | "At Risk" | "Critical";
export type ExpansionBand = "Expansion Ready" | "Warming" | "Not Ready";
export type SentimentTrend = "positive" | "stable" | "declining";

export interface AccountFlags {
  // Tier 2 (score penalty)
  adoptionNegative60d?: boolean;
  ticketSpike?: boolean;
  missedQBR?: boolean;
  noContactLate?: boolean;
  powerUserDeparture?: boolean;
  // Tier 1 (auto-downgrade to Critical)
  execSponsorDeparture?: boolean;
  championDeparture?: boolean;
  supportCSATLow?: boolean;
  formalCancelNotice?: boolean;
  execEscalationOpen?: boolean;
  npsDetractor?: boolean;
}

/** Raw expansion readiness inputs — engine computes score + band (Section 2A) */
export interface ExpansionInputs {
  capacityUtil: number; // licensed seat utilization %
  featureCeiling: number; // % of contracted features in active use
  useCaseSignals: number; // 0-100 strength of new use case exploration
  execEngagement: number; // 0-100 exec-to-exec engagement level
  championAdvocacy: number; // 0-100 champion selling internally
  budgetCycleAlignment: number; // 0-100 near-term budget cycle fit
  contractMonthsLeft: number; // months remaining on contract
}

export interface DataConfidence {
  score: number;
  completeness: number;
  recency: number;
  sourceDiversity: number;
  note: string;
}

export interface RenewalInfo {
  renewalDate: string; // ISO date
  isFirstRenewal: boolean;
}

export interface Account {
  id: string;
  name: string;
  csm: string;
  arr: number;
  segment: Segment;
  stage: Stage;
  valueScore: number;
  adoptionScore: number;
  relationshipScore: number;
  scoreTrend: number[];
  flags: AccountFlags;
  sentimentTrend: SentimentTrend;
  ttv: {
    daysToFirstValue: number | null;
    valueTrajectory: string;
    trajectoryScore: number | null;
  };
  expansion: ExpansionInputs;
  dataConfidence: DataConfidence;
  renewal?: RenewalInfo;
  sentiment: {
    csmRating: number;
    emailResponseTrend: string;
    meetingTone: string;
    verbatimTheme: string;
  };
  adoptionSignals: {
    userPenetration: number;
    featureBreadth: number;
    trajectoryNote: string;
  };
}

export interface HealthScoring {
  score: number;
  band: HealthBand;
  tier1: string | null;
  penaltyReasons: string[];
  weights: { value: number; adoption: number; relationship: number };
}

export interface ExpansionScoring {
  score: number;
  band: ExpansionBand;
  upsellSignal: boolean;
  crossSellSignal: boolean;
  timingSignal: boolean;
  blockingFactor: string | null;
  recommendedPlay: string;
  components: { label: string; value: number; weight: number }[];
}

export type ConfidenceTier = "model-driven" | "blended" | "sentiment-dominant";

export interface RenewalForecast {
  likelihood: number; // 0-100 blended renewal likelihood
  likelihoodBand: "High" | "Medium" | "Low";
  modelComponent: number;
  sentimentComponent: number;
  modelWeight: number;
  sentimentWeight: number;
  confidenceTier: ConfidenceTier;
  firstRenewalAdjustment: number; // negative pts applied
  expansionBoost: number; // positive pts applied
}

export interface Action {
  priority: "P0" | "P1" | "P2" | "P3" | "OK";
  label: string;
  detail: string;
}

export interface ScoredAccount extends Account {
  scoring: HealthScoring;
  expansionScoring: ExpansionScoring;
  forecast: RenewalForecast | null; // only for Renewal Window accounts
  action: Action;
  trendDir: "up" | "down" | "flat";
}
