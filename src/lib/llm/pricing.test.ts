import { describe, it, expect } from "vitest";
import { costUsd, formatCost, formatTokens, priceFor } from "./pricing";

describe("llm pricing", () => {
  it("prices known models exactly", () => {
    // 10K in + 2K out on Sonnet: 10000*3/1M + 2000*15/1M = 0.03 + 0.03
    expect(costUsd("claude-sonnet-4-6", { inputTokens: 10_000, outputTokens: 2_000 })).toBeCloseTo(0.06, 6);
    // Gemini Flash is ~20x cheaper than Pro on input
    expect(costUsd("gemini-2.5-flash", { inputTokens: 1_000_000, outputTokens: 0 })).toBeCloseTo(0.3, 6);
  });

  it("matches dated/versioned model ids by prefix", () => {
    expect(priceFor("claude-haiku-4-5-20251001")).toEqual([1, 5]);
    expect(priceFor("gemini-2.5-flash-lite")).toEqual([0.1, 0.4]); // not swallowed by gemini-2.5-flash
  });

  it("returns null for unknown models (tokens display, dollars do not)", () => {
    expect(costUsd("mystery-model-9", { inputTokens: 5000, outputTokens: 100 })).toBeNull();
    expect(formatCost(null)).toBe("—");
  });

  it("formats costs and tokens for tile display", () => {
    expect(formatCost(0.0004)).toBe("<$0.001");
    expect(formatCost(0.0182)).toBe("$0.018");
    expect(formatCost(1.5)).toBe("$1.50");
    expect(formatTokens(12_400)).toBe("12.4K");
    expect(formatTokens(950)).toBe("950");
    expect(formatTokens(2_100_000)).toBe("2.10M");
  });
});
