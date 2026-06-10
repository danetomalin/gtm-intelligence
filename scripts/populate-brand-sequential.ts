// ============================================================
// Sequential brand-population orchestrator (Phase C).
// Fires workflows ONE AT A TIME against the deployed app, waits for
// each run to reach a terminal status, pauses between runs, and
// backs off exponentially on 429/5xx — per Dane's rate-limit rule.
// Never schedules anything; one manual invocation, then it exits.
//
// Run:  node_modules/.bin/jiti scripts/populate-brand-sequential.ts
// Args: CODES="R-CI,R-MS" PAUSE_S=60 jiti scripts/populate-brand-sequential.ts
//
// All workflows are native now. Supply LLM_PROVIDER / LLM_KEY /
// LLM_MODEL (+ TAVILY_KEY for research codes) env vars, or trigger
// from the browser where the Settings credential assignments live.
// ============================================================

const BASE_URL = process.env.APP_URL ?? "https://gtm-intelligence-blush.vercel.app";

// Default first wave — research → synthesis → delivery, in dependency
// order so downstream agents find upstream rows.
const DEFAULT_CODES = ["R-CI", "R-MS", "R-PP", "S-PO", "D-MG", "S-BC", "S-DB"];

const CODES = (process.env.CODES ?? DEFAULT_CODES.join(","))
  .split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
const PAUSE_S = Number(process.env.PAUSE_S ?? 60);
const RUN_TIMEOUT_S = 300;

// Every workflow now executes natively — send BYOK/search headers to all.
const NATIVE_CODES = new Set([
  "D-QB", "D-RT", "D-HP", "D-XP", "R-MS", "D-MG", "R-CI", "R-PP", "R-WL", "S-RM",
  "S-PO", "S-BC", "R-CF", "R-PF", "R-EV", "S-AR", "S-LP", "S-CP", "S-DB",
  "R-CR", "R-CE", "R-VC", "S-IC",
  "D-SN", "D-CN", "D-OB", "D-WW", "R-BR", "X-EM", "X-LI", "X-OR", "X-AP",
]);

const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

function credHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (process.env.LLM_KEY) {
    h["x-llm-provider"] = process.env.LLM_PROVIDER ?? "anthropic";
    h["x-llm-key"] = process.env.LLM_KEY;
    h["x-llm-model"] = process.env.LLM_MODEL ?? "";
    h["x-llm-base-url"] = process.env.LLM_BASE_URL ?? "";
  }
  if (process.env.TAVILY_KEY) h["x-search-key"] = process.env.TAVILY_KEY;
  return h;
}

async function fireWithBackoff(code: string): Promise<{ runId?: string; error?: string }> {
  let delay = 30;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`${BASE_URL}/api/agents/${code.toLowerCase()}/run`, {
      method: "POST",
      headers: NATIVE_CODES.has(code) ? credHeaders() : {},
    });
    const body = await res.json().catch(() => ({} as Record<string, unknown>));
    if (res.ok) return { runId: (body as { runId?: string }).runId };
    const retryable = res.status === 429 || res.status >= 500;
    const msg = (body as { error?: string }).error ?? `HTTP ${res.status}`;
    if (!retryable || attempt === 4) return { error: msg };
    console.log(`  ${code}: ${msg} — backing off ${delay}s (attempt ${attempt}/4)`);
    await sleep(delay);
    delay *= 2;
  }
  return { error: "unreachable" };
}

async function waitForRun(code: string, runId: string): Promise<string> {
  const started = Date.now();
  while ((Date.now() - started) / 1000 < RUN_TIMEOUT_S) {
    await sleep(8);
    try {
      const res = await fetch(
        `${BASE_URL}/api/agents/${code.toLowerCase()}/status?runId=${runId}`,
      );
      if (!res.ok) continue;
      const body = await res.json();
      if (["success", "error", "canceled"].includes(body.status)) {
        if (body.status !== "success" && body.error_message) {
          console.log(`  ${code}: ${body.status} — ${body.error_message}`);
        }
        return body.status;
      }
    } catch {
      // transient — keep polling
    }
  }
  return "timeout";
}

async function main() {
  console.log(`Populating brand via ${BASE_URL}`);
  console.log(`Sequence: ${CODES.join(" → ")} · pause ${PAUSE_S}s between runs\n`);
  const results: Record<string, string> = {};

  for (const [i, code] of CODES.entries()) {
    process.stdout.write(`[${i + 1}/${CODES.length}] ${code}: firing… `);
    const fired = await fireWithBackoff(code);
    if (!fired.runId) {
      console.log(`FAILED to start — ${fired.error}`);
      results[code] = `start-failed: ${fired.error}`;
    } else {
      console.log(`run ${fired.runId}, waiting…`);
      results[code] = await waitForRun(code, fired.runId);
      console.log(`  ${code}: ${results[code]}`);
    }
    if (i < CODES.length - 1) {
      console.log(`  pausing ${PAUSE_S}s before the next workflow…\n`);
      await sleep(PAUSE_S);
    }
  }

  console.log("\n=== Summary ===");
  for (const [code, status] of Object.entries(results)) {
    console.log(`${code.padEnd(6)} ${status}`);
  }
  const failed = Object.values(results).filter((s) => s !== "success").length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
