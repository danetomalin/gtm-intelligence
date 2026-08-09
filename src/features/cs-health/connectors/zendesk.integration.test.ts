// @vitest-environment node
// ============================================================
// INTEGRATION TEST — Zendesk fetch path against the prototype
// mock server (faithful: cursor export, 429s, Basic auth).
//
//   # terminal 1 (gtm-ingest-prototype):
//   python -m uvicorn mocks.server:app --port 8900
//   # terminal 2:
//   CONNECTOR_IT_ZENDESK_URL=http://127.0.0.1:8900/zendesk npm test
//
// Skipped silently when the env var is not set.
// ============================================================

import { describe, it, expect } from "vitest";
import { validateZendesk } from "./zendesk";

const IT_URL = process.env.CONNECTOR_IT_ZENDESK_URL;
const d = IT_URL ? describe : describe.skip;

d("zendesk connector integration (vs prototype mock server)", () => {
  const cfg = {
    baseUrl: IT_URL as string,
    values: {
      baseUrl: IT_URL as string,
      email: "demo@throughline.test",
      token: "mock-zd-token",
    },
  };

  it("validates good credentials against the live-shaped API", async () => {
    const res = await validateZendesk(cfg);
    expect(res).toEqual({ ok: true });
  });

  it("rejects bad credentials with a readable error", async () => {
    const res = await validateZendesk({
      ...cfg,
      values: { ...cfg.values, token: "wrong" },
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/401/);
  });
});
