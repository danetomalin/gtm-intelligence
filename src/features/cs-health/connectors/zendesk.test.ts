// ============================================================
// Zendesk connector unit tests — signal math + score formula
// (pure functions; design §4 numbers are asserted exactly so any
// tuning is a deliberate, visible diff).
// ============================================================

import { describe, it, expect } from "vitest";
import { computeSignals, relationshipScore, type TicketLite } from "./zendesk";

const NOW = new Date("2026-08-10T00:00:00Z");

function ticket(daysAgo: number, over: Partial<TicketLite> = {}): TicketLite {
  return {
    createdAt: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    priority: "normal",
    resolutionHours: 12,
    csat: null,
    ...over,
  };
}

describe("computeSignals", () => {
  it("windows tickets into recent/prior 30d and computes the volume ratio", () => {
    const tickets = [
      ...Array.from({ length: 10 }, (_, i) => ticket(i + 1)),   // 10 recent
      ...Array.from({ length: 5 }, (_, i) => ticket(i + 35)),   // 5 prior
      ticket(80),                                                // in 90d window only
    ];
    const s = computeSignals(tickets, NOW);
    expect(s.tickets30d).toBe(10);
    expect(s.ticketsPrior30d).toBe(5);
    expect(s.volumeRatio).toBe(2);
    expect(s.silent90d).toBe(false);
  });

  it("handles empty windows without dividing by zero", () => {
    const s = computeSignals([ticket(5)], NOW);
    expect(s.volumeRatio).toBe(1); // 1 recent / max(0,1)
    const empty = computeSignals([], NOW);
    expect(empty.silent90d).toBe(true);
    expect(empty.csatPct).toBeNull();
    expect(empty.avgResolutionHours).toBeNull();
    expect(empty.escalationPct).toBe(0);
  });

  it("computes CSAT, resolution, and escalation from recent tickets only", () => {
    const tickets = [
      ticket(2, { csat: "good", resolutionHours: 10, priority: "urgent" }),
      ticket(3, { csat: "bad", resolutionHours: 30 }),
      ticket(4, { csat: null, resolutionHours: null, priority: "high" }),
      ticket(40, { csat: "bad", resolutionHours: 500, priority: "urgent" }), // prior window
    ];
    const s = computeSignals(tickets, NOW);
    expect(s.csatPct).toBe(50);           // 1 good of 2 rated
    expect(s.avgResolutionHours).toBe(20); // (10+30)/2, unsolved excluded
    expect(Math.round(s.escalationPct)).toBe(67); // 2 of 3 recent
  });
});

describe("relationshipScore (design §4)", () => {
  it("healthy account: no penalties, CSAT bonus applies", () => {
    const { score, reasons } = relationshipScore({
      tickets30d: 5, ticketsPrior30d: 5, volumeRatio: 1,
      avgResolutionHours: 12, csatPct: 95, escalationPct: 0, silent90d: false,
    });
    expect(score).toBe(85); // 75 + 10 bonus
    expect(reasons).toEqual(["strong CSAT with stable volume"]);
  });

  it("distressed account: stacked penalties, clamped at floor 5", () => {
    const { score, reasons } = relationshipScore({
      tickets30d: 30, ticketsPrior30d: 10, volumeRatio: 3,
      avgResolutionHours: 70, csatPct: 40, escalationPct: 40, silent90d: false,
    });
    expect(score).toBe(5); // 75-20-25-15-10 = 5
    expect(reasons).toHaveLength(4);
  });

  it("volume spike needs a minimum ticket count (no spike penalty on 2 vs 1)", () => {
    const { score } = relationshipScore({
      tickets30d: 2, ticketsPrior30d: 1, volumeRatio: 2,
      avgResolutionHours: 10, csatPct: null, escalationPct: 0, silent90d: false,
    });
    expect(score).toBe(75); // tiny volumes never read as a spike
  });

  it("missing CSAT is neutral — neither penalty nor bonus", () => {
    const { score } = relationshipScore({
      tickets30d: 5, ticketsPrior30d: 5, volumeRatio: 1,
      avgResolutionHours: 12, csatPct: null, escalationPct: 0, silent90d: false,
    });
    expect(score).toBe(75);
  });
});
