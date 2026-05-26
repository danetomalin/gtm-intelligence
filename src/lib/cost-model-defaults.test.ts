import { describe, it, expect } from "vitest";
import {
  AI_SAAS_TIER_DEFAULTS,
  computeGrossMargin,
  topCostDrivers,
  totalCogs,
} from "./cost-model-defaults";

describe("AI_SAAS_TIER_DEFAULTS", () => {
  it("contains three tiers in expected order", () => {
    expect(AI_SAAS_TIER_DEFAULTS.map((t) => t.tier_name)).toEqual([
      "Free",
      "Pro",
      "Enterprise",
    ]);
    expect(AI_SAAS_TIER_DEFAULTS.map((t) => t.tier_order)).toEqual([1, 2, 3]);
  });

  it("Free tier has zero price and zero payments", () => {
    const free = AI_SAAS_TIER_DEFAULTS[0];
    expect(free.list_price_usd).toBe(0);
    expect(free.effective_price_usd).toBe(0);
    expect(free.cogs_payments_pct).toBe(0);
  });

  it("Pro tier has Stripe-default 2.9% + $0.30 payments", () => {
    const pro = AI_SAAS_TIER_DEFAULTS[1];
    expect(pro.cogs_payments_pct).toBeCloseTo(0.029);
    expect(pro.cogs_payments_fixed_usd).toBeCloseTo(0.3);
  });

  it("margin floor scales up by tier (Pro 70%, Enterprise 75%, Free null)", () => {
    expect(AI_SAAS_TIER_DEFAULTS[0].margin_floor_pct).toBeNull();
    expect(AI_SAAS_TIER_DEFAULTS[1].margin_floor_pct).toBe(70);
    expect(AI_SAAS_TIER_DEFAULTS[2].margin_floor_pct).toBe(75);
  });
});

describe("computeGrossMargin", () => {
  it("returns null when effective_price is zero (Free tier)", () => {
    expect(computeGrossMargin(AI_SAAS_TIER_DEFAULTS[0])).toBeNull();
  });

  it("computes Pro tier margin around the floor", () => {
    // Pro: effective_price 65, variable 19.3, payments 65*0.029 + 0.30 = 2.185
    // GM = (65 - 19.3 - 2.185) / 65 = 66.95%
    const gm = computeGrossMargin(AI_SAAS_TIER_DEFAULTS[1]);
    expect(gm).not.toBeNull();
    expect(gm!).toBeGreaterThan(60);
    expect(gm!).toBeLessThan(75);
  });

  it("computes Enterprise tier margin higher than Pro", () => {
    const pro = computeGrossMargin(AI_SAAS_TIER_DEFAULTS[1])!;
    const ent = computeGrossMargin(AI_SAAS_TIER_DEFAULTS[2])!;
    expect(ent).toBeGreaterThan(pro);
  });

  it("returns a negative number when variable COGS exceeds price", () => {
    const upsideDown = {
      effective_price_usd: 10,
      cogs_compute_usd: 5,
      cogs_storage_usd: 3,
      cogs_llm_usd: 5,
      cogs_third_party_usd: 0,
      cogs_payments_pct: 0.029,
      cogs_payments_fixed_usd: 0.3,
      cogs_support_usd: 0,
      cogs_other_usd: 0,
    };
    const gm = computeGrossMargin(upsideDown);
    expect(gm).not.toBeNull();
    expect(gm!).toBeLessThan(0);
  });

  it("handles a tier with zero COGS as 100% margin minus payment fees", () => {
    const ideal = {
      effective_price_usd: 100,
      cogs_compute_usd: 0,
      cogs_storage_usd: 0,
      cogs_llm_usd: 0,
      cogs_third_party_usd: 0,
      cogs_payments_pct: 0.029,
      cogs_payments_fixed_usd: 0.3,
      cogs_support_usd: 0,
      cogs_other_usd: 0,
    };
    // Payments: 2.9 + 0.3 = 3.2. GM = (100 - 3.2) / 100 = 96.8
    expect(computeGrossMargin(ideal)).toBeCloseTo(96.8, 1);
  });
});

describe("totalCogs", () => {
  it("sums variable + payments for paid tiers", () => {
    const pro = AI_SAAS_TIER_DEFAULTS[1];
    const total = totalCogs(pro);
    // Pro variable: 3.5 + 0.8 + 11 + 1.5 + 2 + 0.5 = 19.3
    // Pro payments: 65 * 0.029 + 0.3 = 2.185
    // Total: 21.485 -> rounded to 21.49
    expect(total).toBeCloseTo(21.49, 1);
  });

  it("excludes payment processing for the Free tier (no transaction)", () => {
    const total = totalCogs(AI_SAAS_TIER_DEFAULTS[0]);
    // Free variable only: 1.2 + 0.4 + 3.5 + 0.3 + 0.5 + 0.2 = 6.1
    expect(total).toBeCloseTo(6.1, 1);
  });
});

describe("topCostDrivers", () => {
  it("ranks drivers from largest to smallest", () => {
    const drivers = topCostDrivers(AI_SAAS_TIER_DEFAULTS[1]);
    expect(drivers[0].label).toBe("LLM tokens"); // 11.0 dominates
    // Each subsequent driver should be smaller than the previous
    for (let i = 1; i < drivers.length; i++) {
      expect(drivers[i].value).toBeLessThanOrEqual(drivers[i - 1].value);
    }
  });

  it("omits zero-value drivers", () => {
    const drivers = topCostDrivers({
      cogs_compute_usd: 5,
      cogs_storage_usd: 0,
      cogs_llm_usd: 10,
      cogs_third_party_usd: 0,
      cogs_support_usd: 2,
      cogs_other_usd: 0,
    });
    expect(drivers.length).toBe(3);
    expect(drivers.map((d) => d.label)).toEqual(["LLM tokens", "Compute", "Support"]);
  });

  it("returns an empty array when every driver is zero", () => {
    const drivers = topCostDrivers({
      cogs_compute_usd: 0,
      cogs_storage_usd: 0,
      cogs_llm_usd: 0,
      cogs_third_party_usd: 0,
      cogs_support_usd: 0,
      cogs_other_usd: 0,
    });
    expect(drivers).toEqual([]);
  });
});
