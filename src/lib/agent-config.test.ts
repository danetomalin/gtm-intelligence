import { describe, it, expect } from "vitest";
import {
  AGENT_WEBHOOK_PATHS,
  LEGACY_TO_NEW_CODE,
  LIVE_AGENTS,
  isLiveAgent,
  normalizeAgentCode,
  webhookPathFor,
} from "./agent-config";

describe("agent-config", () => {
  describe("AGENT_WEBHOOK_PATHS", () => {
    it("contains all the live agents under their new layer-prefixed codes", () => {
      const expectedCodes = [
        // Phase 1 baseline (A1–A8 rename).
        "R-CI",
        "R-MS",
        "R-CF",
        "S-RM",
        "S-PO",
        "S-BC",
        "D-MG",
        "D-SN",
        // Phase 3 additions.
        "R-PP",
        "R-WL",
        "R-EV",
        "R-PF",
        "S-AR",
        "S-LP",
        // Phase 4: Brand Repository.
        "R-BR",
      ];
      for (const code of expectedCodes) {
        expect(AGENT_WEBHOOK_PATHS).toHaveProperty(code);
      }
    });

    it("every webhook path is a non-empty string starting with /webhook/", () => {
      for (const [code, path] of Object.entries(AGENT_WEBHOOK_PATHS)) {
        expect(path, `${code} webhook path`).toMatch(/^\/webhook\/.+/);
      }
    });

    it("every webhook path is unique (no two agents share a webhook)", () => {
      const paths = Object.values(AGENT_WEBHOOK_PATHS);
      const unique = new Set(paths);
      expect(unique.size).toBe(paths.length);
    });
  });

  describe("LIVE_AGENTS", () => {
    it("matches the keys of AGENT_WEBHOOK_PATHS", () => {
      expect([...LIVE_AGENTS].sort()).toEqual(
        Object.keys(AGENT_WEBHOOK_PATHS).sort(),
      );
    });
  });

  describe("LEGACY_TO_NEW_CODE", () => {
    it("maps every A1-A8 to a corresponding new layer-prefixed code", () => {
      for (let i = 1; i <= 8; i++) {
        const legacy = `A${i}`;
        expect(LEGACY_TO_NEW_CODE).toHaveProperty(legacy);
        expect(LIVE_AGENTS.has(LEGACY_TO_NEW_CODE[legacy]!)).toBe(true);
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
      expect(isLiveAgent("D-CN")).toBe(false); // Phase 5
      expect(isLiveAgent("D-OB")).toBe(false); // Phase 6 collateral sub-agent
      expect(isLiveAgent("")).toBe(false);
    });
  });

  describe("webhookPathFor", () => {
    it("returns the webhook for new codes (case-insensitive)", () => {
      expect(webhookPathFor("R-CI")).toBe("/webhook/competitive-intel-supabase");
      expect(webhookPathFor("r-ms")).toBe("/webhook/market-signals-supabase");
      expect(webhookPathFor("D-SN")).toBe("/webhook/sales-narrative-supabase");
    });

    it("returns the same webhook when given a legacy code", () => {
      // Backward compat: old A1 must still resolve to the same webhook as R-CI.
      expect(webhookPathFor("A1")).toBe(webhookPathFor("R-CI"));
      expect(webhookPathFor("A8")).toBe(webhookPathFor("D-SN"));
    });

    it("returns null for unknown codes", () => {
      expect(webhookPathFor("A99")).toBeNull();
      expect(webhookPathFor("")).toBeNull();
    });
  });
});
