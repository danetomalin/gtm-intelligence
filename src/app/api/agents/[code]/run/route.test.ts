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

// Pin to the registry path with a controllable engine: the engine itself
// has its own coverage; here we test the route's lifecycle handling.
const runWorkflowSpecMock = vi.fn();
vi.mock("@/lib/workflows/engine", () => ({
  runWorkflowSpec: (...args: unknown[]) => runWorkflowSpecMock(...args),
}));
vi.mock("@/lib/workflows/registry", () => ({
  WORKFLOW_REGISTRY: { "R-CI": { code: "R-CI" } },
  isRegistryCode: (c: string) => c === "R-CI",
}));
vi.mock("@/lib/workflows/cs-runner", () => ({
  isNativeCsCode: () => false,
  runNativeCsWorkflow: vi.fn(),
}));
vi.mock("@/lib/workflows/distribution-runner", () => ({
  isDistributionCode: () => false,
  runDistribution: vi.fn(),
}));

import { POST } from "./route";

function req(headers: Record<string, string> = {}) {
  return new Request("http://test/run", { method: "POST", headers });
}

describe("POST /api/agents/[code]/run (native-only, post-n8n)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertChain.mockResolvedValue({ data: { id: "run-abc-123" }, error: null });
    updateChain.mockResolvedValue({ data: null, error: null });
    runWorkflowSpecMock.mockResolvedValue({ ok: true, summary: "2 things written" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 for unknown codes — the n8n fallback is gone", async () => {
    const response = await POST(req(), { params: Promise.resolve({ code: "ZZ" }) });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("Unknown workflow");
  });

  it("returns 400 for A0 (form-driven, not an agent run)", async () => {
    const response = await POST(req(), { params: Promise.resolve({ code: "a0" }) });
    expect(response.status).toBe(400);
  });

  it("runs a registry workflow natively and returns the runId + summary", async () => {
    const response = await POST(req({ "x-llm-provider": "anthropic", "x-llm-key": "k" }), {
      params: Promise.resolve({ code: "r-ci" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.runId).toBe("run-abc-123");
    expect(body.native).toBe(true);
    expect(runWorkflowSpecMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes legacy A1 to R-CI and reaches the native path", async () => {
    const response = await POST(req({ "x-llm-provider": "anthropic", "x-llm-key": "k" }), {
      params: Promise.resolve({ code: "A1" }),
    });
    expect(response.status).toBe(200);
    expect(runWorkflowSpecMock).toHaveBeenCalledTimes(1);
  });

  it("marks the run as error when the engine fails", async () => {
    runWorkflowSpecMock.mockResolvedValue({ ok: false, error: "model exploded", status: 502 });
    const response = await POST(req({ "x-llm-provider": "anthropic", "x-llm-key": "k" }), {
      params: Promise.resolve({ code: "r-ci" }),
    });
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("model exploded");
    expect(updateChain).toHaveBeenCalled();
  });

  it("returns 500 if the run_history insert fails", async () => {
    insertChain.mockResolvedValue({ data: null, error: { message: "insert blew up" } });
    const response = await POST(req({ "x-llm-provider": "anthropic", "x-llm-key": "k" }), {
      params: Promise.resolve({ code: "r-ci" }),
    });
    expect(response.status).toBe(500);
  });
});
