import { describe, it, expect } from "vitest";
import { classifyRunError } from "./run-errors";

describe("classifyRunError", () => {
  it("recognizes provider auth failures", () => {
    expect(classifyRunError("invalid x-api-key").category).toBe("credentials");
    expect(classifyRunError("401 Unauthorized").category).toBe("credentials");
    expect(classifyRunError("API key not valid. Please pass a valid API key.").category).toBe("credentials");
    expect(classifyRunError("No API key configured. Add credentials in Settings.").category).toBe("credentials");
  });

  it("recognizes rate limiting", () => {
    expect(classifyRunError("Provider error (HTTP 429)").category).toBe("rate_limit");
    expect(classifyRunError("RESOURCE_EXHAUSTED: Quota exceeded").category).toBe("rate_limit");
    expect(classifyRunError("rate limit reached for requests").category).toBe("rate_limit");
  });

  it("recognizes timeouts", () => {
    expect(classifyRunError("Run did not complete within 3 minutes.").category).toBe("timeout");
    expect(classifyRunError("upstream request timed out").category).toBe("timeout");
  });

  it("recognizes n8n webhook failures", () => {
    expect(classifyRunError("n8n webhook returned 500: workflow error").category).toBe("n8n");
  });

  it("recognizes model problems", () => {
    expect(classifyRunError("model claude-sonnet-99 not found").category).toBe("model");
    expect(classifyRunError("Model returned an empty response.").category).toBe("model");
  });

  it("recognizes data-layer failures", () => {
    expect(classifyRunError('relation "missing_table" does not exist').category).toBe("data");
    expect(classifyRunError("snapshot build failed: column x").category).toBe("data");
    expect(classifyRunError("Failed to write enablement asset.").category).toBe("data");
  });

  it("recognizes canceled runs", () => {
    expect(classifyRunError("stale run canceled (pre-native-runner cleanup)").category).toBe("canceled");
  });

  it("falls back to unknown with a usable hint", () => {
    const d = classifyRunError("something inexplicable");
    expect(d.category).toBe("unknown");
    expect(d.hint.length).toBeGreaterThan(10);
    expect(classifyRunError(null).category).toBe("unknown");
  });

  it("every diagnosis carries a label and hint", () => {
    for (const msg of ["429", "invalid x-api-key", "n8n webhook returned 502", "weird"]) {
      const d = classifyRunError(msg);
      expect(d.label).toBeTruthy();
      expect(d.hint).toBeTruthy();
    }
  });
});
