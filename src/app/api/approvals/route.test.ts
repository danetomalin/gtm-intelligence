import { describe, it, expect, beforeEach, vi } from "vitest";

const updateSingle = vi.fn();

// Mock the admin client. The route does
//   admin.from(table).update(patch).eq("id", id).select(...).single()
const fromMock = vi.fn(() => ({
  update: vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({ single: updateSingle })),
    })),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(async () => ({ from: fromMock })),
}));

import { POST } from "./route";

function jsonReq(body: Record<string, unknown>): Request {
  return new Request("http://test/approvals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/approvals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSingle.mockResolvedValue({
      data: { id: "art-1", approval_status: "approved" },
      error: null,
    });
  });

  it("rejects an unknown table name", async () => {
    const response = await POST(
      jsonReq({ table: "users", id: "x", action: "approve" }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/disallowed/);
  });

  it("rejects a missing artifact id", async () => {
    const response = await POST(
      jsonReq({ table: "content_outputs", action: "approve" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects an unknown action", async () => {
    const response = await POST(
      jsonReq({ table: "content_outputs", id: "art-1", action: "yeet" }),
    );
    expect(response.status).toBe(400);
  });

  it("transitions to approved on approve action", async () => {
    const response = await POST(
      jsonReq({ table: "content_outputs", id: "art-1", action: "approve" }),
    );
    expect(response.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("content_outputs");
    const body = await response.json();
    expect(body.approval_status).toBe("approved");
  });

  it("returns 400 on non-JSON body", async () => {
    const badReq = new Request("http://test/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const response = await POST(badReq);
    expect(response.status).toBe(400);
  });

  it("returns 500 when Supabase update errors", async () => {
    updateSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "RLS denied" },
    });
    const response = await POST(
      jsonReq({ table: "sales_collateral", id: "art-2", action: "reject" }),
    );
    expect(response.status).toBe(500);
  });
});
