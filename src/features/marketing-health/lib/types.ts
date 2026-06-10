// ============================================================
// Marketing Health — shared types (Phase B.1)
// KPI/trend dashboard, no composite scoring (decision 2026-06-09).
// Campaigns are the base entity; channels are computed roll-ups.
// Data shapes are designed to be swappable for Supabase reads.
// ============================================================

export type Channel =
  | "email"
  | "lifecycle"
  | "linkedin"
  | "paid_search"
  | "paid_social"
  | "content_seo"
  | "webinars"
  | "partner";

export type Objective = "demand_gen" | "brand" | "lifecycle" | "launch";
export type CampaignStatus = "active" | "paused" | "completed";

// Trend signal on a 4-week series. "improving" is favorable movement;
// spike is the most adverse (mirrors the CS Emerging Signals scale).
export type TrendSignal = "improving" | "stable" | "watch" | "warning" | "spike";

// 4-week weekly series, oldest -> newest.
export interface WeeklySeries {
  spend: number[];
  impressions: number[];
  clicks: number[];
  mqls: number[];
  pipeline: number[]; // $ sourced
}

export interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  objective: Objective;
  status: CampaignStatus;
  owner: string;
  startedAt: string; // ISO date
  weekly: WeeklySeries;
  note?: string; // analyst annotation shown in attention lists
}

// Derived per-campaign KPIs (computed by rollups.ts, not stored).
export interface CampaignKpis {
  spend4w: number;
  impressions4w: number;
  clicks4w: number;
  mqls4w: number;
  pipeline4w: number;
  ctr: number; // clicks / impressions
  cpl: number | null; // spend / mqls (null when mqls = 0)
  pipelinePerDollar: number | null; // pipeline / spend
  cplTrend: number[]; // weekly cpl series
  signals: {
    mqls: TrendSignal;
    cpl: TrendSignal;
    pipeline: TrendSignal;
  };
  worstSignal: TrendSignal;
}

export interface ScoredCampaign extends Campaign {
  kpis: CampaignKpis;
}

export interface ChannelRollup {
  channel: Channel;
  campaignCount: number;
  activeCount: number;
  spend4w: number;
  mqls4w: number;
  pipeline4w: number;
  spendShare: number; // 0-1 of total spend
  pipelineShare: number; // 0-1 of total pipeline
  cpl: number | null;
  pipelinePerDollar: number | null;
  mqlWeekly: number[]; // summed weekly mqls
  signal: TrendSignal; // derived from aggregate mql + cpl movement
  topCampaign: string | null; // best pipeline/$ among active
  bottomCampaign: string | null; // worst pipeline/$ among active
}

// Funnel stage with a 4-week series; conversion computed against the
// previous stage.
export interface FunnelStage {
  id: string;
  label: string;
  weekly: number[]; // oldest -> newest
  unit: "count" | "dollars";
}

// Aggregate marketing trend metric (Emerging Signals tab) — mirrors the
// CS TrendMetric shape.
export interface MarketingTrendMetric {
  label: string;
  unit: string;
  weeks: number[]; // oldest -> newest
  higherIsBetter: boolean;
  signal: TrendSignal;
  note: string;
}
