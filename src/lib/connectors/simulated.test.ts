import { describe, it, expect } from "vitest";
import { buildSimulationPrompt } from "./simulated";

describe("simulated connector prompt", () => {
  const seed = {
    brandLine: "Deputy (https://www.deputy.com/)",
    competitors: ["When I Work", "Homebase"],
    personas: ["Multi-location ops lead (VP Operations)"],
  };

  it("threads the pull instructions, brand, and demo-world facts", () => {
    const p = buildSimulationPrompt("Salesforce (CRM & Revenue)", "closed-lost opps last quarter with competitor fields", seed);
    expect(p).toContain("simulating the Salesforce (CRM & Revenue) API for Deputy");
    expect(p).toContain("closed-lost opps last quarter");
    expect(p).toContain("When I Work");
    expect(p).toContain("Multi-location ops lead");
    expect(p).toContain("Output ONLY the data");
  });

  it("falls back to a sensible default pull when instructions are empty", () => {
    const p = buildSimulationPrompt("Gong", "", seed);
    expect(p).toContain("representative sample");
  });
});
