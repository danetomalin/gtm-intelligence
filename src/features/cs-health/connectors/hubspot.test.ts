// ============================================================
// HubSpot connector tests. Response shapes mirror the prototype
// mock server (gtm-ingest-prototype/mocks/server.py), which was
// itself corrected against the LIVE HubSpot API during smoke
// testing — associations envelope, paging.next.after, 429s.
// ============================================================

import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPortfolio, mapToAccounts } from "./hubspot";

const CFG = { baseUrl: "https://mock.test", token: "mock-hs-token" };
const NOW = new Date("2026-08-01T00:00:00Z");

const company = (id: string, name: string, arr: string | null, domain = "x.com") => ({
  id,
  properties: { name, domain, annualrevenue: arr },
});

const deal = (
  id: string,
  dealname: string,
  companyId: string | null,
  closedate: string | null,
  pipeline = "default",
  amount = "1000",
) => ({
  id,
  properties: { dealname, amount, dealstage: "123", pipeline, closedate },
  associations: companyId
    ? { companies: { results: [{ id: companyId, type: "deal_to_company" }] } }
    : undefined,
});

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("mapToAccounts", () => {
  it("segments by ARR and derives stage from renewal proximity", () => {
    const rows = mapToAccounts(
      [company("1", "BigCo", "250000"), company("2", "MidCo", "60000"), company("3", "SmallCo", "5000")],
      [
        deal("d1", "BigCo - Renewal", "1", "2026-09-20T00:00:00Z"), // ~50 days out
        deal("d2", "MidCo - Renewal", "2", "2027-05-01T00:00:00Z"), // far out
      ],
      "org-1",
      NOW,
    );
    expect(rows[0]).toMatchObject({
      external_id: "1", segment: "ENT", stage: "Renewal Window", renewal_date: "2026-09-20",
    });
    expect(rows[1]).toMatchObject({ segment: "MM", stage: "Steady State" });
    expect(rows[2]).toMatchObject({ segment: "SMB", arr: 5000, renewal_date: null });
  });

  it("detects renewal deals by pipeline OR name, ignores expansion deals", () => {
    const rows = mapToAccounts(
      [company("1", "A", "50000")],
      [
        deal("d1", "A - Seats expansion", "1", "2026-08-15T00:00:00Z"),
        deal("d2", "Q3 contract", "1", "2026-10-01T00:00:00Z", "renewals"),
      ],
      "org-1",
      NOW,
    );
    expect(rows[0].renewal_date).toBe("2026-10-01"); // pipeline match, not the expansion
  });

  it("tolerates missing ARR, missing associations, and legacy list-shaped associations", () => {
    const legacyDeal = {
      id: "d9",
      properties: { dealname: "Legacy - Renewal", amount: null, dealstage: null, pipeline: null, closedate: "2026-09-01T00:00:00Z" },
      associations: { companies: [{ id: "7" }] }, // old mock shape
    };
    const rows = mapToAccounts(
      [company("7", "NoArrCo", null)],
      [legacyDeal, deal("d10", "Orphan - Renewal", null, "2026-09-05T00:00:00Z")],
      "org-1",
      NOW,
    );
    expect(rows[0]).toMatchObject({ arr: 0, segment: "SMB", renewal_date: "2026-09-01" });
  });
});

describe("fetchPortfolio", () => {
  it("follows paging.next.after across pages and requests explicit properties", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      calls.push(url.pathname + "?" + url.searchParams.toString());
      if (url.pathname.endsWith("/companies")) {
        return url.searchParams.get("after") === "2"
          ? jsonResponse({ results: [company("3", "C3", "1")] })
          : jsonResponse({
              results: [company("1", "C1", "1"), company("2", "C2", "1")],
              paging: { next: { after: "2" } },
            });
      }
      return jsonResponse({ results: [deal("d1", "C1 - Renewal", "1", "2026-09-01T00:00:00Z")] });
    }));

    const { companies, deals } = await fetchPortfolio(CFG);
    expect(companies).toHaveLength(3);
    expect(deals).toHaveLength(1);
    // pagination happened:
    expect(calls.filter((c) => c.includes("/companies"))).toHaveLength(2);
    // live-API requirement the mock doesn't enforce — explicit properties:
    expect(calls[0]).toContain("annualrevenue");
    expect(calls.find((c) => c.includes("/deals"))).toContain("associations=companies");
  });

  it("backs off on 429 using Retry-After, then succeeds", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) return jsonResponse({ error: "rate" }, 429, { "Retry-After": "0" });
      return jsonResponse({ results: [] });
    }));

    const promise = fetchPortfolio(CFG);
    await vi.runAllTimersAsync();
    const { companies } = await promise;
    expect(companies).toHaveLength(0);
    expect(attempts).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });

  it("throws a readable error on auth failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse({ category: "INVALID_AUTHENTICATION" }, 401),
    ));
    await expect(fetchPortfolio(CFG)).rejects.toThrow(/401/);
  });
});
