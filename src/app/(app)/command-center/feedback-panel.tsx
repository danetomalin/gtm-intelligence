"use client";
// ============================================================
// FEEDBACK PANEL — Manage-panel section for the output→input loop.
//
// Shows a workflow's feedback and drives the application layers:
//   Apply to instructions — a cheap model distills open feedback
//     into the USER STEERING NOTES section of the workflow's
//     operating instructions (billed to the ledger).
//   Promote to brand code — a comment becomes a brand_learnings
//     row (layer 5) that reaches EVERY workflow's runs.
//   Dismiss — drop it without applying.
// Until applied/dismissed, open feedback rides the next run's
// context verbatim, so nothing is ever silently ignored.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { resolveCredential } from "@/lib/llm/apiConfig";

interface FeedbackRow {
  id: string;
  workflow_code: string;
  verdict: string;
  comment: string;
  scope: string;
  status: string;
  applied_via: string | null;
  created_at: string;
}

interface LearningRow {
  id: string;
  statement: string;
  layer: string;
  confidence: string;
  active: boolean;
}

const VERDICT_STYLE: Record<string, string> = {
  keep: "bg-win-bg text-win",
  not_relevant: "bg-danger/10 text-danger",
  needs_change: "bg-warn-bg text-warn",
};

export function FeedbackPanel({ workflowCode }: { workflowCode: string }) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [learnings, setLearnings] = useState<LearningRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // action key
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null); // feedback id
  const [promoteText, setPromoteText] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [fbRes, blRes] = await Promise.all([
        fetch(`/api/feedback?workflow_code=${encodeURIComponent(workflowCode)}`),
        fetch(`/api/brand-learnings`),
      ]);
      const fb = await fbRes.json();
      const bl = await blRes.json();
      if (Array.isArray(fb.feedback)) setRows(fb.feedback);
      if (Array.isArray(bl.learnings)) setLearnings(bl.learnings);
    } catch {
      /* keep current */
    } finally {
      setLoaded(true);
    }
  }, [workflowCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const open = rows.filter((r) => r.status === "new");
  const resolved = rows.filter((r) => r.status !== "new");

  async function applyToInstructions() {
    const cred = resolveCredential(workflowCode);
    if (!cred) {
      setError("Assign a credential profile first — synthesis needs a model.");
      return;
    }
    setBusy("synthesize");
    setError(null);
    setNotice(null);
    try {
      const headers: Record<string, string> =
        cred.source === "shared"
          ? { "Content-Type": "application/json", "x-llm-shared-id": cred.id, "x-llm-model": cred.model }
          : {
              "Content-Type": "application/json",
              "x-llm-provider": cred.provider,
              "x-llm-key": cred.apiKey,
              "x-llm-model": cred.model,
              "x-llm-base-url": cred.baseUrl,
            };
      const res = await fetch("/api/feedback/synthesize", {
        method: "POST",
        headers,
        body: JSON.stringify({ workflowCode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
      } else {
        setNotice(`Folded ${body.appliedCount} item(s) into the steering notes — see Instructions above.`);
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(id: string) {
    setBusy(`dismiss-${id}`);
    await fetch("/api/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "dismissed" }),
    });
    setBusy(null);
    await refresh();
  }

  async function promote(id: string) {
    if (!promoteText.trim()) return;
    setBusy(`promote-${id}`);
    setError(null);
    const res = await fetch("/api/brand-learnings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: promoteText.trim(), feedbackId: id, source: "feedback" }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(body.error ?? `HTTP ${res.status}`);
      return;
    }
    setPromoting(null);
    setPromoteText("");
    setNotice("Promoted into the brand code — every workflow inherits it from the next run.");
    await refresh();
  }

  async function retireLearning(id: string) {
    setBusy(`retire-${id}`);
    await fetch("/api/brand-learnings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: false }),
    });
    setBusy(null);
    await refresh();
  }

  const btn = "text-xs rounded border border-border px-2 py-0.5 text-text hover:bg-card disabled:opacity-50";

  if (!loaded) return <p className="text-xs text-text-muted">Loading feedback…</p>;

  return (
    <div className="space-y-3">
      {/* Open feedback */}
      {open.length === 0 ? (
        <p className="text-xs text-text-muted">
          No open feedback. Leave feedback on this workflow's outputs (✦ Feedback on any artifact card) and it lands here.
        </p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {open.map((r) => (
              <li key={r.id} className="rounded-md border border-border bg-surface px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${VERDICT_STYLE[r.verdict] ?? "bg-card text-text-muted"}`}>
                    {r.verdict.replace("_", " ")}
                  </span>
                  {r.scope === "brand" && (
                    <span className="rounded-full border border-accent/40 bg-accent-bg/30 px-1.5 py-0.5 text-[10px] text-accent">brand-wide</span>
                  )}
                  <span className="text-[10px] text-text-dim">{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <button
                      className={btn}
                      disabled={busy !== null}
                      onClick={() => {
                        setPromoting(promoting === r.id ? null : r.id);
                        setPromoteText(r.comment);
                      }}
                      title="Promote into the brand code (brand_learnings) — reaches every workflow"
                    >
                      {promoting === r.id ? "Close" : "→ Brand code"}
                    </button>
                    <button className={btn} disabled={busy !== null} onClick={() => void dismiss(r.id)}>
                      Dismiss
                    </button>
                  </span>
                </div>
                {r.comment && <p className="mt-1 text-xs text-text-muted">{r.comment}</p>}
                {promoting === r.id && (
                  <div className="mt-2 space-y-1.5">
                    <textarea
                      value={promoteText}
                      onChange={(e) => setPromoteText(e.target.value)}
                      rows={2}
                      placeholder="Phrase it as a durable operating rule (e.g. 'We never lead with price against enterprise incumbents')"
                      className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      onClick={() => void promote(r.id)}
                      disabled={busy !== null || !promoteText.trim()}
                      className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {busy === `promote-${r.id}` ? "Promoting…" : "Promote to brand code"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void applyToInstructions()}
              disabled={busy !== null || open.every((r) => !r.comment.trim())}
              className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
              title="A cheap model distills the open comments into the USER STEERING NOTES section of this workflow's instructions"
            >
              {busy === "synthesize" ? "Synthesizing…" : `Apply ${open.filter((r) => r.comment.trim()).length} to instructions`}
            </button>
            <span className="text-[11px] text-text-dim">
              Open feedback rides every run's context until applied or dismissed.
            </span>
          </div>
        </>
      )}

      {notice && <p className="text-xs text-win">✓ {notice}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}

      {/* Brand learnings (global, layer 5) */}
      {learnings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-text-dim">
            Brand code — operating learnings (reach every workflow):
          </p>
          <ul className="space-y-1">
            {learnings.slice(0, 8).map((l) => (
              <li key={l.id} className="flex items-start gap-2 text-xs text-text-muted">
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-text-dim shrink-0">{l.layer}</span>
                <span className="flex-1">{l.statement}</span>
                <button className={`${btn} shrink-0`} disabled={busy !== null} onClick={() => void retireLearning(l.id)} title="Retire this learning">
                  Retire
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resolved history */}
      {resolved.length > 0 && (
        <div>
          <button onClick={() => setShowResolved(!showResolved)} className="text-[11px] text-text-dim hover:text-text">
            {showResolved ? "Hide" : "Show"} resolved ({resolved.length})
          </button>
          {showResolved && (
            <ul className="mt-1.5 space-y-1">
              {resolved.slice(0, 10).map((r) => (
                <li key={r.id} className="text-[11px] text-text-dim">
                  <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${VERDICT_STYLE[r.verdict] ?? ""}`}>{r.verdict.replace("_", " ")}</span>
                  {r.comment || "(no comment)"} — {r.status}
                  {r.applied_via ? ` via ${r.applied_via.replace("_", " ")}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
