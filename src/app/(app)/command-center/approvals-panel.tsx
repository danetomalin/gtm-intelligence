"use client";
// Command Center → Approvals. The HITL gates live in the pipeline, so
// the approvals act-surface lives here too: every artifact awaiting
// review, with one-click Approve / Revise / Reject (same /api/approvals
// transitions the Review Queue uses). Deep reading still happens on
// /review-queue — this panel is for keeping the pipeline moving.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type PendingItem = {
  table: string;
  id: string;
  kind: string;
  title: string;
  snippet: string;
  risk: string | null;
  status: string;
  created_at: string;
};

const RISK_CLS: Record<string, string> = {
  high: "bg-danger/10 text-danger border-danger/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-card text-text-muted border-border",
};

export function ApprovalsPanel() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // item id mid-action
  // Review modal: which item is open + its full row (fetched on open).
  const [reviewing, setReviewing] = useState<PendingItem | null>(null);
  const [fullRow, setFullRow] = useState<Record<string, unknown> | null>(null);

  async function openReview(item: PendingItem) {
    setReviewing(item);
    setFullRow(null);
    try {
      const res = await fetch(`/api/approvals/item?table=${item.table}&id=${item.id}`);
      const body = await res.json();
      setFullRow(body.row ?? null);
    } catch {
      setFullRow(null);
    }
  }

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals/pending");
      const body = await res.json();
      if (Array.isArray(body.items)) setItems(body.items);
    } catch {
      // keep whatever we have
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function act(item: PendingItem, action: "approve" | "reject" | "request_revision") {
    setBusy(item.id);
    try {
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: item.table, id: item.id, action }),
      });
    } finally {
      setBusy(null);
      if (reviewing?.id === item.id) setReviewing(null);
      await refresh();
    }
  }

  // Meta columns hidden from the review modal — everything else renders.
  const HIDDEN_KEYS = new Set([
    "id", "organization_id", "brand_id", "approval_status", "risk_tier",
    "assigned_reviewer_id", "reviewer_comment", "approved_at", "approved_by",
    "published_at", "created_at", "updated_at", "run_id",
  ]);

  function fieldLabel(key: string): string {
    return key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
  }

  function rel(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${Math.max(mins, 0)}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  if (!loaded || items.length === 0) {
    return loaded ? (
      <section>
        <h2 className="text-base font-semibold text-text">Approvals</h2>
        <p className="mt-1 text-xs text-text-muted">
          Nothing awaiting review. New delivery and gate artifacts land here automatically.
        </p>
      </section>
    ) : null;
  }

  return (
    <section className="space-y-3">
      <header className="flex items-baseline gap-3">
        <h2 className="text-base font-semibold text-text">Approvals</h2>
        <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs text-warning">
          {items.length} pending
        </span>
        <Link href="/review-queue" className="ml-auto text-xs text-accent hover:underline">
          Full Review Queue →
        </Link>
      </header>
      <ul className="space-y-1.5">
        {items.map((item) => {
          return (
            <li key={`${item.table}-${item.id}`} className="rounded-md border border-border bg-card/40 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-accent-bg/40 px-1.5 py-0.5 text-[11px] text-accent">{item.kind}</span>
                <button
                  onClick={() => void openReview(item)}
                  className="text-sm font-medium text-text hover:underline text-left truncate max-w-[40%]"
                  title="Open full review"
                >
                  {item.title}
                </button>
                <button
                  onClick={() => void openReview(item)}
                  className="text-[11px] text-accent hover:underline"
                >
                  Review
                </button>
                {item.risk && (
                  <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${RISK_CLS[item.risk] ?? RISK_CLS.low}`}>
                    {item.risk} risk
                  </span>
                )}
                {item.status === "needs_revision" && (
                  <span className="text-[10px] text-warning">revision requested</span>
                )}
                <span className="text-[11px] text-text-dim">{rel(item.created_at)}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => void act(item, "approve")}
                    disabled={busy === item.id}
                    className="rounded border border-success/40 bg-success/10 px-2.5 py-0.5 text-xs text-success hover:bg-success/20 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => void act(item, "request_revision")}
                    disabled={busy === item.id}
                    className="rounded border border-border px-2 py-0.5 text-xs text-text-muted hover:bg-card disabled:opacity-50"
                  >
                    Revise
                  </button>
                  <button
                    onClick={() => void act(item, "reject")}
                    disabled={busy === item.id}
                    className="rounded border border-danger/40 px-2 py-0.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </span>
              </div>
              <p className="mt-1 text-xs text-text-muted line-clamp-1">{item.snippet}</p>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-text-dim">
        Approvals here use the same lifecycle as the Review Queue. Stage 6 distributes only approved artifacts.
      </p>

      {/* Review modal — full artifact, then act */}
      {reviewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setReviewing(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-2 border-b border-border px-5 py-3">
              <span className="rounded bg-accent-bg/40 px-1.5 py-0.5 text-[11px] text-accent">{reviewing.kind}</span>
              <h3 className="truncate text-sm font-semibold text-text">{reviewing.title}</h3>
              {reviewing.risk && (
                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${RISK_CLS[reviewing.risk] ?? RISK_CLS.low}`}>
                  {reviewing.risk} risk
                </span>
              )}
              <button
                onClick={() => setReviewing(null)}
                className="ml-auto rounded border border-border px-2 py-0.5 text-xs text-text-muted hover:bg-card"
              >
                Close
              </button>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {fullRow === null ? (
                <p className="text-sm text-text-muted">Loading full artifact…</p>
              ) : (
                Object.entries(fullRow)
                  .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== "")
                  .map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">{fieldLabel(k)}</p>
                      {typeof v === "object" ? (
                        <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-card/40 px-3 py-2 text-xs text-text-muted">
                          {JSON.stringify(v, null, 2)}
                        </pre>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">{String(v)}</p>
                      )}
                    </div>
                  ))
              )}
            </div>
            <footer className="flex items-center gap-2 border-t border-border px-5 py-3">
              <button
                onClick={() => void act(reviewing, "approve")}
                disabled={busy === reviewing.id}
                className="rounded-md border border-success/40 bg-success/10 px-4 py-1.5 text-sm font-medium text-success hover:bg-success/20 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => void act(reviewing, "request_revision")}
                disabled={busy === reviewing.id}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-card disabled:opacity-50"
              >
                Request revision
              </button>
              <button
                onClick={() => void act(reviewing, "reject")}
                disabled={busy === reviewing.id}
                className="rounded-md border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                Reject
              </button>
              <span className="ml-auto text-[11px] text-text-dim">Esc/click outside to close without acting</span>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
