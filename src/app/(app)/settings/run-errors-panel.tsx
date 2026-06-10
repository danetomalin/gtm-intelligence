"use client";
// Settings → Troubleshooting. Recent failed/canceled runs with a
// classified cause, plain-language fix, the full provider message,
// and one-click Retry on the workflow's assigned credentials.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { classifyRunError, type RunErrorCategory } from "@/lib/run-errors";
import { resolveCredential } from "@/lib/llm/apiConfig";

type ErrorRun = {
  id: string;
  agentCode: string | null;
  brandName: string;
  status: string;
  startedAt: string | null;
  errorMessage: string | null;
};

const CATEGORY_STYLE: Record<RunErrorCategory, string> = {
  credentials: "bg-danger-bg text-danger",
  rate_limit: "bg-warn-bg text-warn",
  timeout: "bg-warn-bg text-warn",
  n8n: "bg-accent-bg text-accent",
  model: "bg-danger-bg text-danger",
  data: "bg-danger-bg text-danger",
  canceled: "bg-card-hover text-text-dim",
  unknown: "bg-card-hover text-text-muted",
};

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function RunErrorsPanel() {
  const [runs, setRuns] = useState<ErrorRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [retry, setRetry] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/runs/errors");
      const body = await res.json();
      if (Array.isArray(body.runs)) setRuns(body.runs);
    } catch {
      // keep whatever we have
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function retryRun(run: ErrorRun) {
    if (!run.agentCode) return;
    const code = run.agentCode;
    setRetry((r) => ({ ...r, [run.id]: "retrying…" }));
    try {
      const cred = resolveCredential(code);
      const res = await fetch(`/api/agents/${code.toLowerCase()}/run`, {
        method: "POST",
        headers: cred
          ? {
              "x-llm-provider": cred.provider,
              "x-llm-key": cred.apiKey,
              "x-llm-model": cred.model,
              "x-llm-base-url": cred.baseUrl,
            }
          : {},
      });
      const body = await res.json().catch(() => ({}));
      setRetry((r) => ({
        ...r,
        [run.id]: res.ok
          ? "✓ retry succeeded — new run recorded"
          : `✗ retry failed: ${body.error ?? `HTTP ${res.status}`}`,
      }));
    } catch (e) {
      setRetry((r) => ({ ...r, [run.id]: `✗ ${e instanceof Error ? e.message : "network error"}` }));
    }
    refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="text-xs uppercase tracking-wider text-text-muted">
          {loaded ? `${runs.length} failed or canceled runs (recent 50)` : "loading…"}
        </div>
        <button
          type="button"
          onClick={() => { setLoaded(false); refresh(); }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text"
        >
          Refresh
        </button>
      </div>

      {loaded && runs.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-text-muted">
          No failed runs on record. When a workflow run errors, it lands here
          with a diagnosis and a retry button.
        </div>
      )}

      <ul className="divide-y divide-border">
        {runs.map((run) => {
          const diag = classifyRunError(run.errorMessage);
          const open = openId === run.id;
          return (
            <li key={run.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : run.id)}
                  className="min-w-0 text-left flex-1"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold">{run.agentCode ?? "—"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${CATEGORY_STYLE[diag.category]}`}>
                      {diag.label}
                    </span>
                    <span className="text-xs text-text-dim">
                      {run.brandName} · {relTime(run.startedAt)} · {run.status}
                    </span>
                    <span className="text-text-dim text-xs">{open ? "▾" : "▸"}</span>
                  </div>
                  <div className="text-sm text-text-muted mt-1 truncate">
                    {run.errorMessage ?? "no message recorded"}
                  </div>
                </button>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {run.agentCode && (
                    <button
                      type="button"
                      disabled={retry[run.id] === "retrying…"}
                      onClick={() => retryRun(run)}
                      className="rounded-md border border-accent/40 bg-accent-bg px-3 py-1.5 text-xs font-medium text-accent hover:opacity-80 disabled:opacity-50"
                    >
                      {retry[run.id] === "retrying…" ? "Retrying…" : "Retry"}
                    </button>
                  )}
                </div>
              </div>

              {retry[run.id] && retry[run.id] !== "retrying…" && (
                <div className={`text-xs mt-1 ${retry[run.id].startsWith("✓") ? "text-win" : "text-danger"}`}>
                  {retry[run.id]}
                </div>
              )}

              {open && (
                <div className="mt-3 rounded-md border border-border bg-surface p-4 space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                      Diagnosis
                    </div>
                    <p className="text-sm text-text leading-relaxed">{diag.hint}</p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                      Full message
                    </div>
                    <pre className="text-xs text-text-muted whitespace-pre-wrap break-words font-mono bg-card rounded-md border border-border p-3">
                      {run.errorMessage ?? "no message recorded"}
                    </pre>
                  </div>
                  {run.agentCode && (
                    <div className="text-xs text-text-dim">
                      <Link href={`/agents/${run.agentCode.toLowerCase()}`} className="text-accent">
                        Open {run.agentCode} workflow page →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
