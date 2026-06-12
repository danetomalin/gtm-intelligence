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
  const [expanded, setExpanded] = useState<string | null>(null);

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
      await refresh();
    }
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
          const isOpen = expanded === item.id;
          return (
            <li key={`${item.table}-${item.id}`} className="rounded-md border border-border bg-card/40 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-accent-bg/40 px-1.5 py-0.5 text-[11px] text-accent">{item.kind}</span>
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="text-sm font-medium text-text hover:underline text-left truncate max-w-[40%]"
                  title={isOpen ? "Collapse" : "Expand preview"}
                >
                  {item.title}
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
              <p className={`mt-1 text-xs text-text-muted ${isOpen ? "whitespace-pre-wrap" : "line-clamp-1"}`}>
                {item.snippet}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-text-dim">
        Approvals here use the same lifecycle as the Review Queue. Stage 6 distributes only approved artifacts.
      </p>
    </section>
  );
}
