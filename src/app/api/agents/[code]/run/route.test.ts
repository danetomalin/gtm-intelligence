import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock the Supabase admin client. The shape mimics the chained builder API
// the route uses: admin.from(table).insert(payload).select("id").single() and
// admin.from(table).update(payload).eq(field, value).
const insertChain = vi.fn();
const updateChain = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: insertChain,
        })),
      })),
      update: vi.fn(() => ({
        eq: updateChain,
      })),
    })),
  })),
}));

import { POST } from "./route";
import { DEMO_BRAND_NAME } from "@/lib/demo-context";

describe("POST /api/agents/[code]/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertChain.mockResolvedValue({
      data: { id: "run-abc-123" },
      error: null,
    });
    updateChain.mockResolvedValue({ data: null, error: null });
    global.fetch = vi.fn(async () =>
      new Response("ok", { status: 200 }),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 when the agent code is not live", async () => {
    const response = await POST(new Request("http://test/run"), {
      params: Promise.resolve({ code: "ZZ" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not live/);
  });

  it("creates a run_history row and fires the n8n webhook on happy path", async () => {
    const response = await POST(new Request("http://test/run"), {
      params: Promise.resolve({ code: "R-MS" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.runId).toBe("run-abc-123");
    expect(insertChain).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [fetchUrl, fetchInit] = (
      global.fetch as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(fetchUrl).toContain("/webhook/market-signals-supabase");
    const payload = JSON.parse(fetchInit.body);
    expect(payload).toMatchObject({
      runId: "run-abc-123",
      brandName: DEMO_BRAND_NAME,
    });
  });

  it("accepts lowercase new-form codes (case-insensitive)", async () => {
    const response = await POST(new Request("http://test/run"), {
      params: Promise.resolve({ code: "r-ms" }),
    });

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("accepts legacy A1-A8 codes via the backward-compat path", async () => {
    const response = await POST(new Request("http://test/run"), {
      params: Promise.resolve({ code: "A2" }),
    });

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // Should route to the same webhook as R-MS would.
    const [fetchUrl] = (
      global.fetch as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(fetchUrl).toContain("/webhook/market-signals-supabase");
  });

  it("marks the run as error when n8n returns non-2xx", async () => {
    global.fetch = vi.fn(async () =>
      new Response("upstream broke", { status: 500 }),
    ) as unknown as typeof fetch;

    const response = await POST(new Request("http://test/run"), {
      params: Promise.resolve({ code: "R-CI" }),
    });

    expect(response.status).toBe(502);
    expect(updateChain).toHaveBeenCalledTimes(1);
  });

  it("marks the run as error when fetch throws", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const response = await POST(new Request("http://test/run"), {
      params: Promise.resolve({ code: "R-CI" }),
    });

    expect(response.status).toBe(502);
    expect(updateChain).toHaveBeenCalledTimes(1);
  });

  it("returns 500 if Supabase insert fails", async () => {
    insertChain.mockResolvedValueOnce({
      data: null,
      error: { message: "RLS denied" },
    });

    const response = await POST(new Request("http://test/run"), {
      params: Promise.resolve({ code: "R-CI" }),
    });

    expect(response.status).toBe(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
