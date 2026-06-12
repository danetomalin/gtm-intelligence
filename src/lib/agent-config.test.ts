import { describe, it, expect } from "vitest";
import {
  KNOWN_AGENT_CODES,
  LEGACY_TO_NEW_CODE,
  LIVE_AGENTS,
  isLiveAgent,
  normalizeAgentCode,
} from "./agent-config";

describe("agent-config (post-n8n: code registry + normalization)", () => {
  it("contains all workflow codes under their layer-prefixed names", () => {
    const expectedCodes = [
      "R-CI", "R-MS", "R-CF", "S-RM", "S-PO", "S-BC", "D-MG", "D-SN",
      "R-PP", "R-WL", "R-EV", "R-PF", "S-AR", "S-LP",
      "R-BR", "D-CN",
      "X-EM", "X-LI", "X-OR", "X-AP", "S-CP",
      "D-OB", "D-QB", "D-HP", "D-WW", "D-XP", "D-RT",
      "R-CR", "R-CE", "R-VC", "S-IC", "S-DB",
    ];
    for (const code of expectedCodes) {
      expect(KNOWN_AGENT_CODES.has(code), code).toBe(true);
    }
  });

  it("LIVE_AGENTS aliases the known-codes set (historical name, same contents)", () => {
    expect(LIVE_AGENTS).toBe(KNOWN_AGENT_CODES);
  });

  describe("LEGACY_TO_NEW_CODE", () => {
    it("maps every A1-A8 to a corresponding known layer-prefixed code", () => {
      for (let i = 1; i <= 8; i++) {
        const legacy = `A${i}`;
        expect(LEGACY_TO_NEW_CODE).toHaveProperty(legacy);
        expect(KNOWN_AGENT_CODES.has(LEGACY_TO_NEW_CODE[legacy]!)).toBe(true);
      }
    });
  });

  describe("normalizeAgentCode", () => {
    it("returns the canonical code for new uppercase input", () => {
      expect(normalizeAgentCode("R-CI")).toBe("R-CI");
      expect(normalizeAgentCode("D-MG")).toBe("D-MG");
    });

    it("uppercases lowercase new-form input", () => {
      expect(normalizeAgentCode("r-ci")).toBe("R-CI");
      expect(normalizeAgentCode("s-po")).toBe("S-PO");
    });

    it("translates legacy A1-A8 codes to new codes (case-insensitive)", () => {
      expect(normalizeAgentCode("A1")).toBe("R-CI");
      expect(normalizeAgentCode("a1")).toBe("R-CI");
      expect(normalizeAgentCode("A8")).toBe("D-SN");
    });

    it("returns null for unknown codes", () => {
      expect(normalizeAgentCode("ZZ")).toBeNull();
      expect(normalizeAgentCode("")).toBeNull();
      expect(normalizeAgentCode(null)).toBeNull();
      expect(normalizeAgentCode(undefined)).toBeNull();
    });
  });

  describe("isLiveAgent", () => {
    it("returns true for known new codes (case-insensitive)", () => {
      expect(isLiveAgent("R-CI")).toBe(true);
      expect(isLiveAgent("r-ci")).toBe(true);
      expect(isLiveAgent("D-SN")).toBe(true);
    });

    it("returns true for legacy codes via the backward-compat path", () => {
      expect(isLiveAgent("A1")).toBe(true);
      expect(isLiveAgent("a8")).toBe(true);
    });

    it("returns false for unknown codes", () => {
      expect(isLiveAgent("A99")).toBe(false);
      expect(isLiveAgent("R-NEW")).toBe(false);
      expect(isLiveAgent("")).toBe(false);
    });
  });
});
