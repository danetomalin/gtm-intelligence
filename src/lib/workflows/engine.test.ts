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
  it("registers the tranche-1 pilots", () => {
    expect(Object.keys(WORKFLOW_REGISTRY).sort()).toEqual(["D-MG", "R-MS"]);
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
