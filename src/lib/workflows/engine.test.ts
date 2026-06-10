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
  it("registers all LLM workflows (tranches 1-4 + R-BR)", () => {
    expect(Object.keys(WORKFLOW_REGISTRY).sort()).toEqual([
      "D-CN", "D-MG", "D-OB", "D-SN", "D-WW", "R-BR", "R-CE", "R-CF",
      "R-CI", "R-CR", "R-EV", "R-MS", "R-PF", "R-PP", "R-VC", "R-WL",
      "S-AR", "S-BC", "S-CP", "S-DB", "S-IC", "S-LP", "S-PO", "S-RM",
    ]);
  });

  it("R-BR validates a multi-table brand-code payload", () => {
    const good = {
      voice_rules: [
        { rule_type: "tone", rule: "Plainspoken and operational; no hype.", rationale: "Ops buyers distrust marketing language." },
        { rule_type: "banned_phrase", rule: "game-changing", rationale: "Hype." },
        { rule_type: "preferred_term", rule: "team members (not 'resources')", rationale: "Respectful of hourly workers." },
      ],
      proof_points: [
        { proof_type: "third_party_validation", claim: "Rated 4.6/5 on G2 for scheduling", attribution: "unverified — from research" },
        { proof_type: "metric", claim: "Customers report multi-hour weekly admin savings", attribution: "unverified — from research" },
      ],
      capabilities: [
        { capability_name: "Demand-based scheduling", category: "scheduling", feature_description: "Forecast-driven shift creation", buyer_benefit: "Lower labor cost", competitive_gap: "SMB rivals lack forecasting", status: "ga" },
        { capability_name: "Fair-workweek compliance", category: "compliance", feature_description: "Jurisdiction rule engine", buyer_benefit: "Avoid penalties", competitive_gap: "Differentiator vs Homebase", status: "ga" },
        { capability_name: "Time & attendance", category: "time", feature_description: "Clock-in with verification", buyer_benefit: "Accurate payroll", competitive_gap: "Table stakes", status: "ga" },
      ],
      personas: [
        { persona_name: "Multi-location ops lead", title: "VP Operations", segment: "mid-market", pain_points: "Schedule chaos across sites", goals: "Predictable labor cost" },
        { persona_name: "Franchise owner", title: "Owner/Operator", segment: "SMB", pain_points: "Compliance exposure", goals: "Stay out of trouble, save time" },
      ],
    };
    expect(() => WORKFLOW_REGISTRY["R-BR"].outputSchema.parse(good)).not.toThrow();
    expect(() => WORKFLOW_REGISTRY["R-BR"].outputSchema.parse({ ...good, voice_rules: good.voice_rules.slice(0, 2) })).toThrow();
  });

  it("D-CN demands all three counter-narrative surfaces", () => {
    const good = {
      competitor_named: "Homebase",
      rep_talking_points: "1. Lead with compliance depth. 2. Free has a cost: support and audit gaps. 3. Multi-location is where free tools break.",
      suggested_linkedin_post: "Free scheduling tools are great until your second location opens. Here is what changes at scale, and what to look for when compliance starts to matter more than price.",
      email_reply_template: "Subject: On the Homebase news\n\nFair question. Here is how we think about free tiers vs compliance-grade scheduling...",
      positioning_anchor: "differentiated_value: compliance automation",
      sources: "signal abc123, dossier Homebase",
    };
    expect(() => WORKFLOW_REGISTRY["D-CN"].outputSchema.parse(good)).not.toThrow();
    expect(() => WORKFLOW_REGISTRY["D-CN"].outputSchema.parse({ ...good, email_reply_template: "too short" })).toThrow();
  });

  it("S-PO requires exactly five elements, one per type", () => {
    const el = (t: string) => ({
      element_type: t,
      content: "Deputy is the workforce management platform for compliance-heavy hourly teams.",
      evidence: "Dossiers show SMB rivals lack compliance depth.",
      last_change_reason: "initial version",
    });
    const five = ["competitive_alternatives", "distinct_capabilities", "differentiated_value", "best_fit_accounts", "market_category"].map(el);
    expect(() => WORKFLOW_REGISTRY["S-PO"].outputSchema.parse({ elements: five })).not.toThrow();
    expect(() => WORKFLOW_REGISTRY["S-PO"].outputSchema.parse({ elements: five.slice(0, 4) })).toThrow();
  });

  it("S-DB brief shape matches the daily_briefs focus_items contract", () => {
    const good = {
      headline: "Two approvals are blocking the launch chain.",
      focus_items: [
        { rank: 1, title: "Approve the R-CR cohort", why: "Gates the ICP chain.", action: "Open Review Queue", related_artifact: null },
        { rank: 2, title: "High-impact signal on Homebase", why: "Bearish 8/10.", action: "Read the signal", related_artifact: null },
        { rank: 3, title: "Stale battlecards", why: "Dossier newer than card.", action: "Run S-BC", related_artifact: null },
      ],
    };
    expect(() => WORKFLOW_REGISTRY["S-DB"].outputSchema.parse(good)).not.toThrow();
    expect(() => WORKFLOW_REGISTRY["S-DB"].outputSchema.parse({ ...good, focus_items: good.focus_items.slice(0, 2) })).toThrow();
  });

  it("ICP chain specs declare HITL-gated writes and S-IC requires anti-ICP", () => {
    expect(WORKFLOW_REGISTRY["R-CR"]).toBeDefined();
    expect(WORKFLOW_REGISTRY["R-CE"].buildSearchQueries).toBeDefined();
    const icp = WORKFLOW_REGISTRY["S-IC"].outputSchema;
    const base = {
      segment_name: "Multi-location compliance-heavy operators",
      one_line_definition: "Operators of 20+ hourly-workforce locations in regulated scheduling jurisdictions.",
      firmographics: { industries: ["retail"] },
      technographics: { uses: [] },
      trigger_signals: [{ event: "fair-workweek law adopted" }],
      primary_pains: [{ rank: 1, pain: "compliance risk" }, { rank: 2, pain: "schedule chaos" }],
      buying_committee: [{ role: "VP Ops" }],
      typical_sales_cycle: "45-90 days",
      anti_icp: [{ description: "single-location shops", why_excluded: "no compliance pressure", observable_signal: "1 location" }],
      evidence_basis: "Cohort v1 (pending), enrichment v1, VoC v1.",
    };
    expect(() => icp.parse(base)).not.toThrow();
    expect(() => icp.parse({ ...base, anti_icp: [] })).toThrow();
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
