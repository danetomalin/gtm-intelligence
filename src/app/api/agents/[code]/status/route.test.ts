import { describe, it, expect, beforeEach, vi } from "vitest";

const maybeSingle = vi.fn();

// The status route does a different chain depending on whether runId is set:
// with runId: from("run_history").select(...).eq("id", runId).maybeSingle()
// without:    from("run_history").select(...).eq("brand_id", ...).eq("agent_code", ...).order(...).limit(1).maybeSingle()
// We model both chains with the same terminal maybeSingle mock.
const queryBuilder = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle,
};
queryBuilder.select.mockReturnValue(queryBuilder);
queryBuilder.eq.mockReturnValue(queryBuilder);
queryBuilder.order.mockReturnValue(queryBuilder);
queryBuilder.limit.mockReturnValue(queryBuilder);

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(async () => ({
    from: vi.fn(() => queryBuilder),
  })),
}));

import { GET } from "./route";

describe("GET /api/agents/[code]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.order.mockReturnValue(queryBuilder);
    queryBuilder.limit.mockReturnValue(queryBuilder);
  });

  it("returns the run row when a runId is provided", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: "run-1",
        status: "success",
        agent_code: "R-CI",
      },
      error: null,
    });

    const response = await GET(
      new Request("http://test/status?runId=run-1"),
      { params: Promise.resolve({ code: "R-CI" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ id: "run-1", status: "success" });
  });

  it("falls back to the latest run for the brand+agent when no runId is given", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { id: "latest-run", status: "running", agent_code: "R-MS" },
      error: null,
    });

    const response = await GET(new Request("http://test/status"), {
      params: Promise.resolve({ code: "R-MS" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("latest-run");

    // Ordering and limiting only happen on the fallback path.
    expect(queryBuilder.order).toHaveBeenCalledWith("started_at", {
      ascending: false,
    });
    expect(queryBuilder.limit).toHaveBeenCalledWith(1);
  });

  it("returns { status: null } when no run row exists", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const response = await GET(new Request("http://test/status"), {
      params: Promise.resolve({ code: "R-CI" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: null });
  });

  it("returns 500 on Supabase error", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "RLS denied" },
    });

    const response = await GET(new Request("http://test/status"), {
      params: Promise.resolve({ code: "R-CI" }),
    });

    expect(response.status).toBe(500);
  });
});
