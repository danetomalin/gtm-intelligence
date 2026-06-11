import { describe, it, expect } from "vitest";
import {
  ALL_PIPELINE_CODES,
  WEB_RESEARCH_CODES,
  CS_TRACK,
  PIPELINE_STAGES,
  STALE_RUN_MS,
  isStaleRun,
} from "./pipeline";
import { WORKFLOW_REGISTRY } from "./registry";
import { DISTRIBUTION_CODES } from "./distribution-runner";

describe("command center pipeline config", () => {
  it("covers every workflow exactly once (no dupes, no strays)", () => {
    const sorted = [...ALL_PIPELINE_CODES].sort();
    expect(new Set(sorted).size).toBe(sorted.length);
    // 24 registry LLM specs + 4 distribution adapters + 4 CS natives = 32
    // (A0 is form-driven and intentionally absent).
    expect(sorted.length).toBe(32);
    expect(sorted).not.toContain("A0");
  });

  it("every pipeline code is actually executable (registry, adapter, or CS native)", () => {
    const csNative = new Set(["D-QB", "D-RT", "D-HP", "D-XP"]);
    for (const code of ALL_PIPELINE_CODES) {
      const executable =
        code in WORKFLOW_REGISTRY ||
        (DISTRIBUTION_CODES as readonly string[]).includes(code) ||
        csNative.has(code);
      expect(executable, `${code} has no native execution path`).toBe(true);
    }
  });

  it("respects data dependencies across stage boundaries", () => {
    const stageOf: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) for (const c of s.codes) stageOf[c] = s.index;
    // Foundation feeds everything.
    expect(stageOf["R-BR"]).toBe(1);
    // Research before the synthesis that reads it.
    expect(stageOf["R-CI"]).toBeLessThan(stageOf["S-PO"]);
    expect(stageOf["R-MS"]).toBeLessThan(stageOf["D-CN"]);
    // Battlecards before the objection handler that reads them.
    expect(stageOf["S-BC"]).toBeLessThan(stageOf["D-OB"]);
    // Win/loss before the win wire.
    expect(stageOf["R-WL"]).toBeLessThan(stageOf["D-WW"]);
    // Adapters produce the metrics S-CP analyzes — same stage, earlier order.
    const dist = PIPELINE_STAGES.find((s) => s.id === "distribution")!;
    expect(dist.codes.indexOf("X-EM")).toBeLessThan(dist.codes.indexOf("S-CP"));
    expect(dist.codes.indexOf("S-CP")).toBeLessThan(dist.codes.indexOf("S-DB"));
    // ICP chain keeps its strict internal order.
    const icp = PIPELINE_STAGES.find((s) => s.id === "icp")!;
    expect(icp.codes).toEqual(["R-CR", "R-CE", "R-VC", "S-IC"]);
  });

  it("WEB_RESEARCH_CODES exactly matches the specs that declare search queries", () => {
    for (const code of Object.keys(WORKFLOW_REGISTRY)) {
      const declares = Boolean(WORKFLOW_REGISTRY[code].buildSearchQueries);
      expect(WEB_RESEARCH_CODES.has(code), `${code}: registry/searchset mismatch`).toBe(declares);
    }
  });

  it("flags search-key requirements on the right stages", () => {
    const byId = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.id, s.needsSearchKey]));
    expect(byId["foundation"]).toBe(false); // R-BR is context-only for now
    expect(byId["research"]).toBe(true);
    expect(byId["icp"]).toBe(true); // R-CE researches via Tavily
    expect(byId["synthesis"]).toBe(false);
    expect(byId["delivery"]).toBe(false);
    expect(byId["distribution"]).toBe(false);
    expect(CS_TRACK.needsSearchKey).toBe(false);
  });

  it("isStaleRun fires only for old running rows", () => {
    const old = new Date(Date.now() - STALE_RUN_MS - 1000).toISOString();
    const fresh = new Date(Date.now() - 30_000).toISOString();
    expect(isStaleRun("running", old)).toBe(true);
    expect(isStaleRun("running", fresh)).toBe(false);
    expect(isStaleRun("success", old)).toBe(false);
    expect(isStaleRun("error", old)).toBe(false);
    expect(isStaleRun("running", null)).toBe(false);
    expect(isStaleRun("running", "not-a-date")).toBe(false);
  });
});
