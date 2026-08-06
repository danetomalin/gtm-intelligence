// @vitest-environment node
// ============================================================
// INTEGRATION TEST — runs the real fetch->map path against the
// prototype mock server (which faithfully replicates live
// HubSpot: pagination envelope, associations shape, 429s).
//
// Gated by env var so CI stays green with zero infrastructure:
//
//   # terminal 1 (gtm-ingest-prototype):
//   python -m uvicorn mocks.server:app --port 8900
//   # terminal 2:
//   CONNECTOR_IT_URL=http://127.0.0.1:8900/hubspot npm test
//
// Skipped silently when CONNECTOR_IT_URL is not set.
// ============================================================

import { describe, it, expect } from "vitest";
import { fetchPortfolio, mapToAccounts } from "./hubspot";

const IT_URL = process.env.CONNECTOR_IT_URL;
const d = IT_URL ? describe : describe.skip;

d("hubspot connector integration (vs prototype mock server)", () => {
  const cfg = { baseUrl: IT_URL as string, token: "mock-hs-token" };

  it("fetches the full seeded portfolio through real HTTP, pagination and 429s", async () => {
    const { companies, deals } = await fetchPortfolio(cfg);
    expect(companies.length).toBe(3); // Globex, Initech, Hooli
    expect(deals.length).toBe(4);     // 3 renewals + 1 expansion
    const names = companies.map((c) => c.properties.name).sort();
    expect(names).toEqual(["Globex Corp", "Hooli XYZ", "Initech Inc"]);
  });

  it("maps the live payload into account rows with correct segments and renewals", async () => {
    const { companies, deals } = await fetchPortfolio(cfg);
    const rows = mapToAccounts(companies, deals, "it-org");
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));

    expect(byName["Initech Inc"]).toMatchObject({ segment: "ENT", stage: "Renewal Window" });
    expect(byName["Initech Inc"].renewal_date).toBeTruthy();
    expect(byName["Globex Corp"].segment).toBe("ENT");
    expect(byName["Hooli XYZ"].segment).toBe("MM");
  });

  it("rejects bad credentials with a readable error", async () => {
    await expect(
      fetchPortfolio({ baseUrl: cfg.baseUrl, token: "wrong-token" }),
    ).rejects.toThrow(/401/);
  });
});
