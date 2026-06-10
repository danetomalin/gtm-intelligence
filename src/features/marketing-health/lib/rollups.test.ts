import { describe, it, expect } from "vitest";
import {
  deriveSignal,
  worstOf,
  computeKpis,
  scoreCampaigns,
  rollupChannels,
  funnelConversion,
} from "./rollups";
import { MARKETING_DATA } from "./generateData";
import type { Campaign } from "./types";

const mk = (over: Partial<Campaign> = {}): Campaign => ({
  id: "T1",
  name: "Test",
  channel: "email",
  objective: "demand_gen",
  status: "active",
  owner: "x",
  startedAt: "2026-01-01",
  weekly: {
    spend: [100, 100, 100, 100],
    impressions: [1000, 1000, 1000, 1000],
    clicks: [100, 100, 100, 100],
    mqls: [10, 10, 10, 10],
    pipeline: [1000, 1000, 1000, 1000],
  },
  ...over,
});

describe("deriveSignal", () => {
  it("flags a large adverse rise on a lower-is-better metric as spike", () => {
    expect(deriveSignal([100, 100, 100, 140], false)).toBe("spike");
  });

  it("flags a large adverse drop on a higher-is-better metric as spike", () => {
    expect(deriveSignal([100, 100, 100, 70], true)).toBe("spike");
  });

  it("grades moderate adverse movement as warning, mild as watch", () => {
    expect(deriveSignal([100, 100, 100, 85], true)).toBe("warning");
    expect(deriveSignal([100, 100, 100, 93], true)).toBe("watch");
  });

  it("recognizes favorable movement as improving and flat as stable", () => {
    expect(deriveSignal([100, 100, 100, 120], true)).toBe("improving");
    expect(deriveSignal([100, 100, 100, 101], true)).toBe("stable");
  });

  it("is stable on short or zero-base series", () => {
    expect(deriveSignal([5], true)).toBe("stable");
    expect(deriveSignal([0, 0, 0, 10], true)).toBe("stable");
  });
});

describe("worstOf", () => {
  it("returns the most severe signal", () => {
    expect(worstOf("stable", "warning", "watch")).toBe("warning");
    expect(worstOf("improving", "stable")).toBe("stable");
    expect(worstOf("spike", "warning")).toBe("spike");
  });
});

describe("computeKpis", () => {
  it("computes 4-week totals and ratios", () => {
    const k = computeKpis(mk());
    expect(k.spend4w).toBe(400);
    expect(k.mqls4w).toBe(40);
    expect(k.cpl).toBe(10);
    expect(k.ctr).toBeCloseTo(0.1);
    expect(k.pipelinePerDollar).toBe(10);
  });

  it("returns null cpl when there are no MQLs", () => {
    const k = computeKpis(
      mk({ weekly: { spend: [100, 100, 100, 100], impressions: [1, 1, 1, 1], clicks: [0, 0, 0, 0], mqls: [0, 0, 0, 0], pipeline: [0, 0, 0, 0] } }),
    );
    expect(k.cpl).toBeNull();
  });

  it("worstSignal reflects the most adverse of mqls/cpl/pipeline", () => {
    const k = computeKpis(
      mk({ weekly: { spend: [100, 100, 100, 100], impressions: [1000, 1000, 1000, 1000], clicks: [100, 100, 100, 100], mqls: [10, 10, 10, 6], pipeline: [1000, 1000, 1000, 1000] } }),
    );
    expect(k.signals.mqls).toBe("spike");
    expect(k.worstSignal).toBe("spike");
  });
});

describe("rollupChannels", () => {
  it("aggregates spend/mqls/pipeline per channel with shares summing to 1", () => {
    const scored = scoreCampaigns(MARKETING_DATA.campaigns);
    const rollups = rollupChannels(scored);
    const spendShare = rollups.reduce((s, r) => s + r.spendShare, 0);
    const pipeShare = rollups.reduce((s, r) => s + r.pipelineShare, 0);
    expect(spendShare).toBeCloseTo(1);
    expect(pipeShare).toBeCloseTo(1);
    // Sorted by pipeline desc
    for (let i = 1; i < rollups.length; i++) {
      expect(rollups[i - 1].pipeline4w).toBeGreaterThanOrEqual(rollups[i].pipeline4w);
    }
  });

  it("excludes paused campaigns from top/bottom ranking but not totals", () => {
    const scored = scoreCampaigns(MARKETING_DATA.campaigns);
    const li = rollupChannels(scored).find((r) => r.channel === "linkedin")!;
    expect(li.campaignCount).toBe(2);
    expect(li.activeCount).toBe(1);
    expect(li.topCampaign).toBe("Telehealth Access — Thought Leadership");
    expect(li.bottomCampaign).toBeNull(); // only one active campaign
  });
});

describe("funnelConversion", () => {
  it("computes stage-over-stage conversion", () => {
    const out = funnelConversion(MARKETING_DATA.funnel);
    expect(out[0].convLatest).toBeNull();
    const leads = out[1];
    expect(leads.convLatest).toBeCloseTo(15900 / 655000);
  });

  it("flags the weakening opportunity stage", () => {
    const out = funnelConversion(MARKETING_DATA.funnel);
    const opps = out.find((s) => s.id === "opps")!;
    expect(["watch", "warning", "spike"]).toContain(opps.signal);
  });
});

describe("demo narrative coherence", () => {
  it("branded defense campaign shows adverse CPL signal", () => {
    const scored = scoreCampaigns(MARKETING_DATA.campaigns);
    const c01 = scored.find((c) => c.id === "C01")!;
    expect(["warning", "spike"]).toContain(c01.kpis.signals.cpl);
  });

  it("women's health launch is improving", () => {
    const scored = scoreCampaigns(MARKETING_DATA.campaigns);
    const c03 = scored.find((c) => c.id === "C03")!;
    expect(c03.kpis.signals.mqls).toBe("improving");
  });
});
