// ============================================================
// Marketing Health — pure derivation functions (Phase B.1)
// No composite health score by design: this module turns raw weekly
// series into KPIs, trend signals, channel roll-ups, and funnel
// conversion — all deterministic and unit-testable.
// ============================================================

import type {
  Campaign,
  CampaignKpis,
  Channel,
  ChannelRollup,
  FunnelStage,
  ScoredCampaign,
  TrendSignal,
} from "./types";

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

// Signal on a weekly series: compares the latest week against the mean
// of the prior weeks. `higherIsBetter` flips the adverse direction
// (e.g. CPL rising is adverse, MQLs rising is favorable).
// Thresholds: >25% adverse = spike, >12% = warning, >5% = watch,
// >12% favorable = improving, else stable.
export function deriveSignal(weeks: number[], higherIsBetter: boolean): TrendSignal {
  if (weeks.length < 2) return "stable";
  const prior = weeks.slice(0, -1);
  const base = sum(prior) / prior.length;
  if (base === 0) return "stable";
  const latest = weeks[weeks.length - 1];
  const change = (latest - base) / Math.abs(base);
  const adverse = higherIsBetter ? -change : change;
  if (adverse > 0.25) return "spike";
  if (adverse > 0.12) return "warning";
  if (adverse > 0.05) return "watch";
  if (adverse < -0.12) return "improving";
  return "stable";
}

export const SIGNAL_SEVERITY: Record<TrendSignal, number> = {
  spike: 4,
  warning: 3,
  watch: 2,
  stable: 1,
  improving: 0,
};

export function worstOf(...signals: TrendSignal[]): TrendSignal {
  return signals.reduce((worst, s) =>
    SIGNAL_SEVERITY[s] > SIGNAL_SEVERITY[worst] ? s : worst,
  );
}

export function computeKpis(c: Campaign): CampaignKpis {
  const { spend, impressions, clicks, mqls, pipeline } = c.weekly;
  const spend4w = sum(spend);
  const mqls4w = sum(mqls);
  const pipeline4w = sum(pipeline);
  const impressions4w = sum(impressions);
  const clicks4w = sum(clicks);
  const cplTrend = spend.map((s, i) => (mqls[i] > 0 ? s / mqls[i] : 0));
  const signals = {
    mqls: deriveSignal(mqls, true),
    cpl: deriveSignal(cplTrend.filter((x) => x > 0), false),
    pipeline: deriveSignal(pipeline, true),
  };
  return {
    spend4w,
    impressions4w,
    clicks4w,
    mqls4w,
    pipeline4w,
    ctr: impressions4w > 0 ? clicks4w / impressions4w : 0,
    cpl: mqls4w > 0 ? spend4w / mqls4w : null,
    pipelinePerDollar: spend4w > 0 ? pipeline4w / spend4w : null,
    cplTrend,
    signals,
    worstSignal: worstOf(signals.mqls, signals.cpl, signals.pipeline),
  };
}

export function scoreCampaigns(campaigns: Campaign[]): ScoredCampaign[] {
  return campaigns.map((c) => ({ ...c, kpis: computeKpis(c) }));
}

export function rollupChannels(scored: ScoredCampaign[]): ChannelRollup[] {
  const totalSpend = sum(scored.map((c) => c.kpis.spend4w));
  const totalPipeline = sum(scored.map((c) => c.kpis.pipeline4w));
  const byChannel = new Map<Channel, ScoredCampaign[]>();
  for (const c of scored) {
    byChannel.set(c.channel, [...(byChannel.get(c.channel) ?? []), c]);
  }

  const rollups: ChannelRollup[] = [];
  for (const [channel, list] of byChannel) {
    const spend4w = sum(list.map((c) => c.kpis.spend4w));
    const mqls4w = sum(list.map((c) => c.kpis.mqls4w));
    const pipeline4w = sum(list.map((c) => c.kpis.pipeline4w));
    const weeks = list[0].weekly.mqls.length;
    const mqlWeekly = Array.from({ length: weeks }, (_, i) =>
      sum(list.map((c) => c.weekly.mqls[i] ?? 0)),
    );
    const spendWeekly = Array.from({ length: weeks }, (_, i) =>
      sum(list.map((c) => c.weekly.spend[i] ?? 0)),
    );
    const cplWeekly = spendWeekly.map((s, i) => (mqlWeekly[i] > 0 ? s / mqlWeekly[i] : 0));
    const signal = worstOf(
      deriveSignal(mqlWeekly, true),
      deriveSignal(cplWeekly.filter((x) => x > 0), false),
    );

    const active = list.filter((c) => c.status === "active");
    const ranked = [...active].sort(
      (a, b) => (b.kpis.pipelinePerDollar ?? 0) - (a.kpis.pipelinePerDollar ?? 0),
    );

    rollups.push({
      channel,
      campaignCount: list.length,
      activeCount: active.length,
      spend4w,
      mqls4w,
      pipeline4w,
      spendShare: totalSpend > 0 ? spend4w / totalSpend : 0,
      pipelineShare: totalPipeline > 0 ? pipeline4w / totalPipeline : 0,
      cpl: mqls4w > 0 ? spend4w / mqls4w : null,
      pipelinePerDollar: spend4w > 0 ? pipeline4w / spend4w : null,
      mqlWeekly,
      signal,
      topCampaign: ranked[0]?.name ?? null,
      bottomCampaign: ranked.length > 1 ? ranked[ranked.length - 1].name : null,
    });
  }

  return rollups.sort((a, b) => b.pipeline4w - a.pipeline4w);
}

// Stage-over-stage conversion for the latest week and the 4-week total.
export function funnelConversion(stages: FunnelStage[]) {
  return stages.map((stage, i) => {
    const prev = i > 0 ? stages[i - 1] : null;
    const latest = stage.weekly[stage.weekly.length - 1];
    const total = sum(stage.weekly);
    const convLatest =
      prev && prev.weekly[prev.weekly.length - 1] > 0
        ? latest / prev.weekly[prev.weekly.length - 1]
        : null;
    const convTotal = prev && sum(prev.weekly) > 0 ? total / sum(prev.weekly) : null;
    return {
      ...stage,
      latest,
      total,
      convLatest,
      convTotal,
      signal: deriveSignal(stage.weekly, true),
    };
  });
}
