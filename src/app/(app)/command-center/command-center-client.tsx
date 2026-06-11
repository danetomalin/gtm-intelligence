"use client";

// ============================================================
// COMMAND CENTER — the operational cockpit for the workflow system.
// The browser is the orchestrator (credentials are BYOK and live in
// localStorage, so sequencing can't happen server-side).
//
// Behavior contract (Dane, 2026-06-11):
// - Manual advance between stages; a stage unlocks Advance only when
//   every workflow in it is success or skipped.
// - "Run stage" executes the stage's remaining workflows sequentially
//   with a pause between runs. Failures don't stop the sequence; they
//   block Advance at the end (retry or skip each one).
// - Stale runs (running > 3 min) get a Cancel; a Sweep button clears
//   all of them at once.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSearchApiKey, resolveCredential } from "@/lib/llm/apiConfig";
import { classifyRunError } from "@/lib/run-errors";
import { CredentialAssign } from "../settings/credential-assign";
import { InstructionsEditor } from "../settings/instructions-editor";
import {
  CS_TRACK,
  PIPELINE_STAGES,
  isStaleRun,
  type PipelineStage,
} from "@/lib/workflows/pipeline";

type RunRow = {
  id: string;
  agent_code: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  summary: string | null;
};

type PersistedState = {
  activeStage: number; // 1-6
  skipped: Record<string, boolean>;
  pauseSeconds: number;
};

const STORAGE_KEY = "throughline.commandCenter";
const DEFAULT_STATE: PersistedState = { activeStage: 1, skipped: {}, pauseSeconds: 30 };
const POLL_MS = 4000;
const RUN_TIMEOUT_MS = 3 * 60 * 1000;

function loadState(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s: PersistedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // localStorage unavailable — state stays in memory
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function CommandCenterClient({
  names,
  purposes,
}: {
  names: Record<string, string>;
  purposes: Record<string, string>;
}) {
  const [runs, setRuns] = useState<Record<string, RunRow>>({});
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [runningStage, setRunningStage] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [stageLog, setStageLog] = useState<string[]>([]);
  const [sweeping, setSweeping] = useState(false);
  // Which tile has its Manage panel open (credentials / model /
  // instructions / full error) — one at a time; the open tile spans
  // the full grid row so the editor has room.
  const [managing, setManaging] = useState<string | null>(null);
  // Bumped when a credential assignment changes so the resolved
  // provider · model line re-renders.
  const [credBump, setCredBump] = useState(0);
  const stopRef = useRef(false);

  // ── status polling ────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/runs/pipeline-status");
      if (!res.ok) return;
      const body = (await res.json()) as { runs: Record<string, RunRow> };
      setRuns(body.runs ?? {});
    } catch {
      // transient network failure — next poll retries
    }
  }, []);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
    void refresh();
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  function update(partial: Partial<PersistedState>) {
    setState((prev) => {
      const next = { ...prev, ...partial };
      saveState(next);
      return next;
    });
  }

  // ── derived status per workflow ───────────────────────────────
  type CellStatus = "idle" | "running" | "stale" | "success" | "error" | "canceled" | "skipped";
  function cellStatus(code: string): CellStatus {
    if (state.skipped[code]) return "skipped";
    const run = runs[code];
    if (!run) return "idle";
    if (run.status === "running") return isStaleRun(run.status, run.started_at) ? "stale" : "running";
    if (run.status === "success") return "success";
    if (run.status === "canceled") return "canceled";
    if (run.status === "error") return "error";
    return "idle";
  }

  function stageComplete(stage: PipelineStage): boolean {
    return stage.codes.every((c) => cellStatus(c) === "success" || cellStatus(c) === "skipped");
  }

  function stageHasBlockers(stage: PipelineStage): boolean {
    return stage.codes.some((c) => ["error", "stale", "canceled"].includes(cellStatus(c)));
  }

  // ── single run, awaited to terminal status ────────────────────
  async function runOne(code: string): Promise<"success" | "error"> {
    setActiveCode(code);
    const cred = resolveCredential(code);
    const searchKey = getSearchApiKey();
    let runId: string | null = null;
    try {
      const res = await fetch(`/api/agents/${code.toLowerCase()}/run`, {
        method: "POST",
        headers: {
          ...(cred
            ? {
                "x-llm-provider": cred.provider,
                "x-llm-key": cred.apiKey,
                "x-llm-model": cred.model,
                "x-llm-base-url": cred.baseUrl,
              }
            : {}),
          ...(searchKey ? { "x-search-key": searchKey } : {}),
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStageLog((l) => [...l, `✗ ${code}: ${body.error ?? `HTTP ${res.status}`}`]);
        await refresh();
        return "error";
      }
      runId = body.runId ?? null;
    } catch (err) {
      setStageLog((l) => [...l, `✗ ${code}: ${err instanceof Error ? err.message : "network error"}`]);
      return "error";
    }

    // Distribution adapters and some natives return synchronously.
    if (!runId) {
      await refresh();
      return "success";
    }

    const deadline = Date.now() + RUN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_MS);
      try {
        const res = await fetch(`/api/agents/${code.toLowerCase()}/status?runId=${runId}`);
        const row = (await res.json()) as { status?: string; error_message?: string };
        if (row.status === "success") {
          setStageLog((l) => [...l, `✓ ${code} finished`]);
          await refresh();
          return "success";
        }
        if (row.status === "error" || row.status === "canceled") {
          setStageLog((l) => [...l, `✗ ${code}: ${row.error_message ?? row.status}`]);
          await refresh();
          return "error";
        }
      } catch {
        // poll hiccup — keep waiting
      }
    }
    // Timed out client-side: cancel the row so it can't block the stage.
    await fetch(`/api/runs/${runId}/cancel`, { method: "POST" }).catch(() => null);
    setStageLog((l) => [...l, `✗ ${code}: timed out after 3 minutes — run canceled`]);
    await refresh();
    return "error";
  }

  // ── sequential stage runner (finish stage, then block) ────────
  async function runStage(stage: PipelineStage) {
    if (runningStage) return;
    setRunningStage(stage.id);
    setStageLog([`Stage ${stage.index || "CS"} · ${stage.title} — sequential run, ${state.pauseSeconds}s pause`]);
    stopRef.current = false;

    if (stage.needsSearchKey && !getSearchApiKey()) {
      setStageLog((l) => [
        ...l,
        "✗ This stage needs web research but no Tavily key is saved — add one in Settings → API credentials → Search API.",
      ]);
      setRunningStage(null);
      return;
    }

    const remaining = stage.codes.filter(
      (c) => !["success", "skipped"].includes(cellStatus(c)),
    );
    let failures = 0;
    for (let i = 0; i < remaining.length; i++) {
      if (stopRef.current) {
        setStageLog((l) => [...l, "■ Stopped — remaining workflows not started."]);
        break;
      }
      const code = remaining[i];
      setStageLog((l) => [...l, `▶ Running ${code} (${names[code] ?? code})…`]);
      const result = await runOne(code);
      if (result === "error") failures += 1;
      setActiveCode(null);
      if (i < remaining.length - 1 && !stopRef.current) {
        setStageLog((l) => [...l, `… pausing ${state.pauseSeconds}s`]);
        await sleep(state.pauseSeconds * 1000);
      }
    }
    setStageLog((l) => [
      ...l,
      failures === 0
        ? "Stage run complete — all green."
        : `Stage run complete — ${failures} failure${failures === 1 ? "" : "s"} need attention before Advance.`,
    ]);
    setRunningStage(null);
    setActiveCode(null);
  }

  async function cancelRun(runId: string) {
    await fetch(`/api/runs/${runId}/cancel`, { method: "POST" }).catch(() => null);
    await refresh();
  }

  async function sweepStale() {
    setSweeping(true);
    try {
      const res = await fetch("/api/runs/sweep-stale", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      setStageLog((l) => [...l, `Sweep: ${body.swept ?? 0} stale run(s) marked timed out.`]);
    } finally {
      setSweeping(false);
      await refresh();
    }
  }

  if (!hydrated) {
    return <div className="text-sm text-text-muted">Loading pipeline state…</div>;
  }

  const staleCount = Object.values(runs).filter((r) => isStaleRun(r.status, r.started_at)).length;

  // ── render helpers ────────────────────────────────────────────
  const chip: Record<CellStatus, { label: string; cls: string }> = {
    idle: { label: "Not run", cls: "bg-card text-text-muted border-border" },
    running: { label: "Running", cls: "bg-info/10 text-info border-info/30 animate-pulse" },
    stale: { label: "Stale", cls: "bg-warning/10 text-warning border-warning/40" },
    success: { label: "Success", cls: "bg-success/10 text-success border-success/30" },
    error: { label: "Failed", cls: "bg-danger/10 text-danger border-danger/30" },
    canceled: { label: "Canceled", cls: "bg-card text-text-muted border-border" },
    skipped: { label: "Skipped", cls: "bg-card text-text-muted border-border line-through" },
  };

  function WorkflowTile({ code, unlocked }: { code: string; unlocked: boolean }) {
    const status = cellStatus(code);
    const run = runs[code];
    const c = chip[status];
    const isActive = activeCode === code;
    const diagnosis =
      status === "error" && run?.error_message ? classifyRunError(run.error_message) : null;
    const btn = "text-xs rounded border border-border px-2 py-0.5 text-text hover:bg-card";
    const isManaging = managing === code;
    // credBump is read so the resolved provider/model line refreshes
    // after an assignment change. eslint: intentional.
    void credBump;
    const cred = resolveCredential(code);
    return (
      <li
        className={`flex flex-col gap-1.5 rounded-md border bg-card/40 px-3 py-2.5 ${
          isManaging ? "col-span-full" : ""
        } ${
          isActive ? "border-info/60" : status === "error" ? "border-danger/40" : "border-border"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-text-muted">{code}</span>
          <span className={`text-xs rounded-full border px-2 py-0.5 ${c.cls}`}>{c.label}</span>
        </div>
        <Link
          href={`/agents/${code.toLowerCase()}`}
          className="text-sm font-medium leading-tight text-text hover:underline line-clamp-2"
        >
          {names[code] ?? code}
        </Link>
        {isActive && <span className="text-xs text-info">running now…</span>}
        {status === "error" && run?.error_message && (
          <div className="text-xs text-text-muted" title={`${run.error_message}${diagnosis?.hint ? `\n\n${diagnosis.hint}` : ""}`}>
            {diagnosis && (
              <span className="mr-1.5 rounded bg-danger/10 px-1.5 py-0.5 text-danger">{diagnosis.label}</span>
            )}
            <span className="break-words line-clamp-2">{run.error_message}</span>
          </div>
        )}
        {status === "success" && run?.summary && (
          <p className="text-xs text-text-muted line-clamp-2" title={run.summary}>{run.summary}</p>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-0.5">
          {status === "error" && !runningStage && unlocked && (
            <>
              <button onClick={() => void runOne(code).then(() => setActiveCode(null))} className={btn}>
                Retry
              </button>
              <button
                onClick={() => update({ skipped: { ...state.skipped, [code]: true } })}
                className={`${btn} text-text-muted`}
                title="Mark as intentionally skipped so the stage can advance without it"
              >
                Skip
              </button>
            </>
          )}
          {status === "skipped" && (
            <button
              onClick={() => {
                const next = { ...state.skipped };
                delete next[code];
                update({ skipped: next });
              }}
              className={`${btn} text-text-muted`}
            >
              Unskip
            </button>
          )}
          {(status === "stale" || status === "running") && run && (
            <button
              onClick={() => void cancelRun(run.id)}
              className="text-xs rounded border border-danger/40 px-2 py-0.5 text-danger hover:bg-danger/10"
            >
              Cancel
            </button>
          )}
          {status === "idle" && !runningStage && unlocked && (
            <button onClick={() => void runOne(code).then(() => setActiveCode(null))} className={btn}>
              Run
            </button>
          )}
          <button
            onClick={() => setManaging(isManaging ? null : code)}
            className={`ml-auto text-xs rounded border px-2 py-0.5 transition ${
              isManaging
                ? "border-accent/50 text-accent bg-accent-bg/30"
                : "border-border text-text-muted hover:text-text hover:bg-card"
            }`}
            title="Credentials, model, instructions, and errors for this workflow"
          >
            {isManaging ? "Close" : "Manage"}
          </button>
        </div>

        {isManaging && (
          <div className="mt-2 space-y-4 border-t border-border pt-3">
            {/* Credentials + LLM selection — assignment picks the profile,
                the profile carries provider + model. */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
                Credentials & model
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <CredentialAssign workflowCode={code} onChanged={() => setCredBump((n) => n + 1)} />
                <span className="text-xs text-text-muted">
                  {cred
                    ? `Runs on ${cred.provider} · ${cred.model || "default model"}`
                    : "No credential profile saved yet"}
                </span>
                <Link href="/settings" className="text-xs text-accent hover:underline">
                  Manage profiles & models in Settings →
                </Link>
              </div>
            </div>

            {/* Operating instructions — same workflow_configs row Settings edits. */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
                Instructions
              </p>
              <InstructionsEditor
                code={code}
                defaultInstructions={purposes[code] ?? "Behave per the workflow's built-in brief."}
              />
            </div>

            {/* Last error in full, with the classified diagnosis. */}
            {run?.error_message && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
                  Last error
                </p>
                {diagnosis && (
                  <p className="text-xs">
                    <span className="rounded bg-danger/10 px-1.5 py-0.5 text-danger">{diagnosis.label}</span>
                    <span className="ml-2 text-text-muted">{diagnosis.hint}</span>
                  </p>
                )}
                <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted max-h-48 overflow-y-auto">
                  {run.error_message}
                </pre>
              </div>
            )}
          </div>
        )}
      </li>
    );
  }

  function StageCard({ stage, isCs }: { stage: PipelineStage; isCs?: boolean }) {
    const unlocked = isCs || stage.index <= state.activeStage;
    const complete = stageComplete(stage);
    const blocked = stageHasBlockers(stage);
    const isCurrent = !isCs && stage.index === state.activeStage;
    const isRunningThis = runningStage === stage.id;
    return (
      <section
        className={`rounded-lg border px-4 py-4 space-y-3 ${
          isCurrent
            ? "border-accent/60 bg-card/60"
            : unlocked
              ? "border-border bg-card/30"
              : "border-border/50 bg-card/10 opacity-60"
        }`}
      >
        <header className="flex items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text">
              {isCs ? stage.title : `Stage ${stage.index} · ${stage.title}`}
              {complete && <span className="ml-2 text-xs text-success">✓ complete</span>}
              {blocked && <span className="ml-2 text-xs text-danger">needs attention</span>}
            </h2>
            <p className="mt-1 text-xs text-text-muted">{stage.description}</p>
            {stage.gateNote && (
              <p className="mt-1 text-xs text-warning/90">
                Gate: {stage.gateNote}{" "}
                <Link href="/review-queue" className="underline hover:text-warning">
                  Review Queue →
                </Link>
              </p>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {unlocked && !complete && (
              <button
                onClick={() => (isRunningThis ? (stopRef.current = true) : void runStage(stage))}
                disabled={!!runningStage && !isRunningThis}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  isRunningThis
                    ? "border border-danger/40 text-danger hover:bg-danger/10"
                    : "bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-40"
                }`}
              >
                {isRunningThis ? "Stop after current" : "Run stage"}
              </button>
            )}
            {isCurrent && stage.index < PIPELINE_STAGES.length && (
              <button
                onClick={() => update({ activeStage: stage.index + 1 })}
                disabled={!complete || !!runningStage}
                title={
                  complete
                    ? "Unlock the next stage"
                    : "Every workflow must be Success or Skipped first"
                }
                className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-card disabled:opacity-40"
              >
                Advance →
              </button>
            )}
          </div>
        </header>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {stage.codes.map((code) => (
            <WorkflowTile key={code} code={code} unlocked={unlocked} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* control strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/40 px-5 py-3 text-sm">
        <span className="text-text-muted">
          Active stage: <strong className="text-text">{state.activeStage} of {PIPELINE_STAGES.length}</strong>
        </span>
        <label className="flex items-center gap-2 text-text-muted">
          Pause between runs
          <select
            value={state.pauseSeconds}
            onChange={(e) => update({ pauseSeconds: Number(e.target.value) })}
            disabled={!!runningStage}
            className="rounded border border-border bg-card px-2 py-1 text-text"
          >
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
        </label>
        <span className="ml-auto flex items-center gap-3">
          {staleCount > 0 && (
            <button
              onClick={() => void sweepStale()}
              disabled={sweeping}
              className="rounded-md border border-warning/40 px-3 py-1.5 text-warning hover:bg-warning/10 disabled:opacity-50"
            >
              {sweeping ? "Sweeping…" : `Sweep ${staleCount} stale run${staleCount === 1 ? "" : "s"}`}
            </button>
          )}
          <button
            onClick={() => update({ activeStage: 1, skipped: {} })}
            disabled={!!runningStage}
            title="Reset advance progress and skips (run history is untouched)"
            className="text-xs text-text-muted underline hover:text-text disabled:opacity-40"
          >
            Reset pipeline
          </button>
        </span>
      </div>

      {/* live log while a stage runs (and after, until next run) */}
      {stageLog.length > 0 && (
        <div className="rounded-lg border border-border bg-card/40 px-5 py-3">
          <p className="text-xs font-medium text-text-muted mb-1">Run log</p>
          <ul className="space-y-0.5 font-mono text-xs text-text-muted max-h-40 overflow-y-auto">
            {stageLog.map((line, i) => (
              <li key={i} className={line.startsWith("✗") ? "text-danger" : line.startsWith("✓") ? "text-success" : ""}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stage sections, each holding a grid of per-workflow tiles
          (Dane 2026-06-11: every workflow is its own tile). */}
      {PIPELINE_STAGES.map((stage) => (
        <StageCard key={stage.id} stage={stage} />
      ))}
      <StageCard stage={CS_TRACK} isCs />
    </div>
  );
}
