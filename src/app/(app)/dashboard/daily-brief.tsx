"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RelatedArtifact = {
  table?: string | null;
  id?: string | null;
  label?: string | null;
};

type FocusItem = {
  rank?: number | null;
  title?: string | null;
  why?: string | null;
  action?: string | null;
  related_artifact?: RelatedArtifact | null;
};

export type BriefSnapshot = {
  id: string;
  generated_at: string | null;
  headline: string | null;
  focus_items: FocusItem[] | null;
};

type RunStatus =
  | { state: "idle" }
  | { state: "running"; runId: string }
  | { state: "error"; message: string };

function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function safeParseFocusItems(value: unknown): FocusItem[] {
  if (Array.isArray(value)) return value as FocusItem[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as FocusItem[];
    } catch {
      // fall through
    }
  }
  return [];
}

export function DailyBrief({ initialBrief }: { initialBrief: BriefSnapshot | null }) {
  const [brief, setBrief] = useState<BriefSnapshot | null>(initialBrief);
  const [run, setRun] = useState<RunStatus>({ state: "idle" });

  async function trigger() {
    setRun({ state: "running", runId: "" });
    try {
      const res = await fetch("/api/agents/s-db/run", { method: "POST" });
      if (!res.ok) {
        throw new Error(`Run failed: ${res.status}`);
      }
      const { runId } = await res.json();
      setRun({ state: "running", runId });
    } catch (err) {
      setRun({
        state: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Poll status while a run is in flight. When the run finishes, refetch the
  // latest brief from /api/daily-brief and replace the state.
  useEffect(() => {
    if (run.state !== "running" || !run.runId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/agents/s-db/status?runId=${run.runId}`);
        if (!statusRes.ok) return;
        const { status } = await statusRes.json();
        if (cancelled) return;
        if (status === "success") {
          // Pull the freshly written brief
          const briefRes = await fetch("/api/daily-brief");
          if (briefRes.ok) {
            const { brief: latest } = await briefRes.json();
            if (latest) setBrief(latest);
          }
          setRun({ state: "idle" });
        } else if (status === "error") {
          setRun({ state: "error", message: "S-DB run errored. Check Observability." });
        }
      } catch {
        // transient; keep polling
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [run]);

  const focusItems =
    brief && brief.focus_items ? safeParseFocusItems(brief.focus_items) : [];
  const isRunning = run.state === "running";

  // Compact empty state when there's no brief yet
  if (!brief) {
    return (
      <section className="rounded-xl border border-accent/30 bg-accent-bg/20 px-6 py-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
              Daily brief · S-DB
            </div>
            <h2 className="text-xl font-semibold text-text leading-snug">
              What should you focus on today?
            </h2>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">
              Throughline reads pending approvals, high-impact signals,
              launches in flight, and margin health, then ranks the 3-5 things
              that actually need your attention.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={trigger}
              disabled={isRunning}
              className={
                isRunning
                  ? "rounded-md bg-card text-text-dim px-4 py-2 text-sm font-semibold cursor-not-allowed"
                  : "rounded-md bg-accent text-bg px-4 py-2 text-sm font-semibold hover:bg-accent/90 transition"
              }
            >
              {isRunning ? "Briefing…" : "Brief me"}
            </button>
            {run.state === "error" && (
              <div className="text-xs text-danger">{run.message}</div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-accent/30 bg-accent-bg/20 px-6 py-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Daily brief · {relTime(brief.generated_at)}
          </div>
          <h2 className="text-lg font-semibold text-text leading-snug">
            {brief.headline ?? "What to focus on today"}
          </h2>
        </div>
        <button
          type="button"
          onClick={trigger}
          disabled={isRunning}
          className={
            isRunning
              ? "rounded-md bg-card text-text-dim px-3 py-1.5 text-xs font-semibold cursor-not-allowed whitespace-nowrap"
              : "rounded-md border border-border bg-card text-text px-3 py-1.5 text-xs font-semibold hover:border-text-dim transition whitespace-nowrap"
          }
        >
          {isRunning ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {focusItems.length === 0 ? (
        <p className="text-sm text-text-muted">
          No focus items yet. Brief generated but parsing failed — try refreshing.
        </p>
      ) : (
        <ol className="space-y-3">
          {focusItems.map((item, i) => (
            <FocusRow key={i} item={item} />
          ))}
        </ol>
      )}

      {run.state === "error" && (
        <div className="text-xs text-danger mt-3">{run.message}</div>
      )}
    </section>
  );
}

function FocusRow({ item }: { item: FocusItem }) {
  const rank = item.rank ?? "•";
  const related = item.related_artifact;
  // If the action contains a slash path, surface it as a clickable link.
  const actionLinkMatch = item.action?.match(/(\/(?:agents|workspace|review-queue|launches|cost-model|command-center|positioning|brand-voice|market-context|collateral)\/?[a-z0-9-_/]*)/i);
  const actionPath = actionLinkMatch?.[1];

  return (
    <li className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-mono text-xs text-accent tabular-nums">
          {String(rank).padStart(2, "0")}
        </span>
        <span className="text-sm font-semibold text-text leading-snug">
          {item.title ?? "—"}
        </span>
      </div>
      {item.why && (
        <p className="text-sm text-text-muted leading-relaxed ml-7">
          {item.why}
        </p>
      )}
      {item.action && (
        <div className="ml-7 mt-2 flex items-baseline gap-2 text-xs">
          <span className="uppercase tracking-wider text-text-dim font-semibold">
            Action
          </span>
          <span className="text-text">{item.action}</span>
          {actionPath && (
            <Link
              href={actionPath}
              className="text-accent hover:underline whitespace-nowrap"
            >
              Open →
            </Link>
          )}
        </div>
      )}
      {related && related.label && (
        <div className="ml-7 mt-1 text-[11px] text-text-dim">
          Related: {related.label}
        </div>
      )}
    </li>
  );
}
