import { describe, it, expect } from "vitest";
import { extractJson } from "./engine";
import { WORKFLOW_REGISTRY } from "./registry";

describe("extractJson", () => {
  it("parses bare JSON objects and arrays", () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
    expect(extractJson("[1, 2]")).toEqual([1, 2]);
  });

  it("strips markdown fences", () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extractJson('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("skips leading prose before the JSON", () => {
    expect(extractJson('Here is the output you asked for:\n{"signals": []}')).toEqual({ signals: [] });
  });

  it("handles nested braces and trailing prose", () => {
    expect(extractJson('{"a": {"b": [1, {"c": 2}]}} hope that helps!')).toEqual({
      a: { b: [1, { c: 2 }] },
    });
  });

  it("throws on no JSON at all", () => {
    expect(() => extractJson("sorry, I cannot do that")).toThrow();
  });
});

describe("workflow registry", () => {
  it("registers tranches 1 + 2", () => {
    expect(Object.keys(WORKFLOW_REGISTRY).sort()).toEqual([
      "D-MG", "R-CI", "R-MS", "R-PP", "R-WL", "S-RM",
    ]);
  });

  it("research-tier specs all declare search queries and valid sample outputs", () => {
    const dossier = {
      dossiers: [{
        competitor_name: "When I Work",
        strategic_move: "Launched AI auto-scheduling for SMB teams.",
        messaging_drift: "first dossier — baseline",
        pricing_intelligence: "Per-user pricing holding at $2.50/user.",
        product_signals: "AI scheduling beta announced.",
        talent_signals: "Hiring ML engineers.",
        competitive_landmines: "1. How do they handle fair-workweek compliance? 2. What is the audit trail? 3. Multi-location support?",
        risk_assessment: "HIGH",
        risk_justification: "Direct SMB pressure.",
        sources: "https://example.com/a, https://example.com/b",
      }],
    };
    expect(() => WORKFLOW_REGISTRY["R-CI"].outputSchema.parse(dossier)).not.toThrow();
    expect(WORKFLOW_REGISTRY["R-CI"].buildSearchQueries).toBeDefined();
    expect(WORKFLOW_REGISTRY["R-PP"].buildSearchQueries).toBeDefined();
    expect(WORKFLOW_REGISTRY["R-WL"].buildSearchQueries).toBeDefined();
    expect(WORKFLOW_REGISTRY["S-RM"].buildSearchQueries).toBeDefined();
  });

  it("S-RM enforces UVFV score bounds and verdict enums", () => {
    const item = {
      title: "Demand-based labor forecasting v2",
      category: "scheduling AI",
      summary: "Forecast accuracy gap vs Legion.",
      evidence: "G2 reviews cite forecast misses; Legion ships v3.",
      usable_score: 7, usable_rationale: "Familiar UX pattern.",
      valuable_score: 8, valuable_rationale: "Cited in churn reasons.",
      feasible_score: 6, feasible_rationale: "Builds on existing pipeline.",
      viable_score: 7, viable_rationale: "Enterprise pull.",
      recommendation: "build", priority: "high",
      tags: "forecasting,ml", sources: "https://example.com",
    };
    expect(() => WORKFLOW_REGISTRY["S-RM"].outputSchema.parse({ items: [item, item] })).not.toThrow();
    expect(() => WORKFLOW_REGISTRY["S-RM"].outputSchema.parse({ items: [{ ...item, usable_score: 11 }, item] })).toThrow();
    expect(() => WORKFLOW_REGISTRY["S-RM"].outputSchema.parse({ items: [{ ...item, recommendation: "ship" }, item] })).toThrow();
  });

  it("R-MS validates a well-formed signal set and rejects junk", () => {
    const spec = WORKFLOW_REGISTRY["R-MS"];
    const good = {
      signals: [
        {
          category: "competitive_positioning",
          headline: "Homebase expands free tier",
          summary: "Homebase announced an expanded free plan for small teams.",
          strategic_commentary: "Direct pressure on SMB acquisition; counter with compliance depth.",
          impact_score: 7,
          sentiment: "bearish",
          sentiment_reason: "Threatens SMB funnel economics.",
          tags: "smb,pricing",
          sources: "https://example.com/news",
        },
      ],
    };
    expect(() => spec.outputSchema.parse(good)).not.toThrow();
    expect(() => spec.outputSchema.parse({ signals: [] })).toThrow();
    expect(() =>
      spec.outputSchema.parse({ signals: [{ ...good.signals[0], impact_score: 14 }] }),
    ).toThrow();
  });

  it("D-MG validates content pieces and enforces channel enum", () => {
    const spec = WORKFLOW_REGISTRY["D-MG"];
    const piece = {
      channel: "linkedin",
      topic: "Fair workweek compliance",
      target_persona: "VP Operations, multi-location retail",
      content: "Scheduling chaos isn't a staffing problem — it's a systems problem. Here's what compliant scheduling looks like at scale.",
      messaging_refs: "differentiated_value: compliance automation",
      proof_pending: true,
    };
    expect(() => spec.outputSchema.parse({ pieces: [piece] })).not.toThrow();
    expect(() => spec.outputSchema.parse({ pieces: [{ ...piece, channel: "tiktok" }] })).toThrow();
  });
});
