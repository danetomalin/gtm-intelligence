"use client";
// ============================================================
// FEEDBACK BUTTON — the entry point of the output→input loop.
// Sits on artifact cards (dossiers first). Verdict + comment +
// scope routing (this workflow vs the brand), plus the structured
// quick action where feedback maps to data: "not a competitor"
// deactivates the brand_competitors row directly — the correction
// becomes data, never prompt text.
// ============================================================

import { useState } from "react";

const VERDICTS = [
  { id: "keep", label: "Keep", hint: "Good output — reinforce it" },
  { id: "not_relevant", label: "Not relevant", hint: "This shouldn't have been produced" },
  { id: "needs_change", label: "Needs change", hint: "Right idea, wrong execution" },
] as const;

type Verdict = (typeof VERDICTS)[number]["id"];

export function FeedbackButton({
  workflowCode,
  artifactTable,
  artifactId,
  competitorName,
}: {
  workflowCode: string;
  artifactTable?: string;
  artifactId?: string;
  competitorName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [comment, setComment] = useState("");
  const [scope, setScope] = useState<"workflow" | "brand">("workflow");
  const [dropCompetitor, setDropCompetitor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!verdict || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowCode,
          artifactTable,
          artifactId,
          verdict,
          comment,
          scope,
          action:
            dropCompetitor && competitorName
              ? { type: "deactivate_competitor", competitorName }
              : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setDone(
        body.structuredResult ??
          (verdict === "keep" && !comment.trim()
            ? "Noted — thanks."
            : "Recorded. It rides the next run's context until applied in the Command Center."),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <span className="text-[11px] text-win">✓ {done}</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-text-dim hover:text-accent transition-colors"
        title="Steer this workflow — feedback feeds back into future runs"
      >
        ✦ Feedback
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-md border border-border bg-surface p-3 space-y-2 text-left">
      <div className="flex flex-wrap gap-1.5">
        {VERDICTS.map((v) => (
          <button
            key={v.id}
            onClick={() => setVerdict(v.id)}
            title={v.hint}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
              verdict === v.id
                ? "border-accent bg-accent-bg/40 text-accent font-medium"
                : "border-border text-text-muted hover:text-text"
            }`}
          >
            {v.label}
          </button>
        ))}
        <button
          onClick={() => setOpen(false)}
          className="ml-auto text-[11px] text-text-dim hover:text-text"
        >
          Cancel
        </button>
      </div>

      {verdict && verdict !== "keep" && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder={
              verdict === "not_relevant"
                ? "Why isn't this relevant? (e.g. 'we don't compete in this segment')"
                : "What should change? (e.g. 'never lead with price', 'wrong audience')"
            }
            className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={scope === "workflow"}
                onChange={() => setScope("workflow")}
              />
              Apply to this workflow
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer" title="Candidate for the brand code — reaches every workflow once promoted">
              <input type="radio" checked={scope === "brand"} onChange={() => setScope("brand")} />
              Apply to the brand
            </label>
            {competitorName && verdict === "not_relevant" && (
              <label className="flex items-center gap-1.5 cursor-pointer text-danger" title={`Deactivates ${competitorName} in the competitor list — research runs skip it from now on`}>
                <input
                  type="checkbox"
                  checked={dropCompetitor}
                  onChange={(e) => setDropCompetitor(e.target.checked)}
                />
                Not a competitor — stop tracking {competitorName}
              </label>
            )}
          </div>
        </>
      )}

      {error && <p className="text-[11px] text-danger">{error}</p>}

      {verdict && (
        <button
          onClick={() => void submit()}
          disabled={busy || (verdict !== "keep" && !comment.trim() && !dropCompetitor)}
          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Submit feedback"}
        </button>
      )}
    </div>
  );
}
