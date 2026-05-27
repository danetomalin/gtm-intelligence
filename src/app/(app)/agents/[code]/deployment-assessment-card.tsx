"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ApprovalButtons } from "./approval-buttons";

export type DeploymentAssessment = {
  id: string;
  source_artifact_table: string | null;
  source_artifact_id: string | null;
  recommended_formats: RecommendedFormat[] | string | null;
  skipped_formats: SkippedFormat[] | string | null;
  headline: string | null;
  rationale: string | null;
  approval_status: string | null;
  risk_tier?: string | null;
  created_at?: string | null;
};

export type RecommendedFormat = {
  format: string;
  audience?: string;
  channel?: string;
  fit_score?: number | string;
  rationale?: string;
  priority?: string;
};

export type SkippedFormat = {
  format: string;
  reason?: string;
};

const FORMAT_LABEL: Record<string, string> = {
  one_pager: "One-pager",
  slide_deck: "Slide deck",
  email_sequence: "Email sequence",
  linkedin_post: "LinkedIn post",
  linkedin_carousel: "LinkedIn carousel",
  video_script: "Video script",
  faq: "FAQ",
  infographic: "Infographic",
};

const PRIORITY_TONE: Record<string, string> = {
  high: "bg-danger-bg text-danger",
  medium: "bg-warn-bg text-warn",
  low: "bg-card text-text-dim",
};

function normalize<T>(raw: T[] | string | null | undefined): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function DeploymentAssessmentCard({
  assessment,
}: {
  assessment: DeploymentAssessment;
}) {
  const recommended = normalize<RecommendedFormat>(assessment.recommended_formats);
  const skipped = normalize<SkippedFormat>(assessment.skipped_formats);
  const isPending =
    assessment.approval_status === "pending_review" ||
    assessment.approval_status === "needs_revision";

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
              Deployment assessment · D-DA
            </div>
            {assessment.headline && (
              <h3 className="text-base font-semibold text-text leading-snug">
                {assessment.headline}
              </h3>
            )}
            <div className="text-xs text-text-dim mt-1 font-mono">
              from {assessment.source_artifact_table}
            </div>
          </div>
          {assessment.risk_tier && (
            <span
              className={cn(
                "flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5",
                assessment.risk_tier === "high"
                  ? "bg-danger-bg text-danger"
                  : assessment.risk_tier === "medium"
                    ? "bg-warn-bg text-warn"
                    : "bg-card text-text-dim",
              )}
            >
              {assessment.risk_tier}
            </span>
          )}
        </div>

        {assessment.rationale && (
          <p className="text-sm text-text-muted leading-relaxed">
            {assessment.rationale}
          </p>
        )}

        {recommended.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-2">
              Recommended formats ({recommended.length})
            </div>
            <div className="space-y-2">
              {recommended.map((r, i) => (
                <RecommendedRow
                  key={`${r.format}-${i}`}
                  rec={r}
                  assessment={assessment}
                  canProduce={isPending}
                />
              ))}
            </div>
          </div>
        )}

        {skipped.length > 0 && (
          <details className="border-t border-border pt-3">
            <summary className="text-[10px] uppercase tracking-wider text-text-dim font-semibold cursor-pointer hover:text-text">
              Skipped formats ({skipped.length})
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-text-muted">
              {skipped.map((s, i) => (
                <li key={`${s.format}-${i}`} className="leading-relaxed">
                  <span className="font-mono">
                    {FORMAT_LABEL[s.format] ?? s.format}
                  </span>
                  {s.reason && <span> — {s.reason}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}

        {isPending && (
          <div className="border-t border-border pt-3">
            <ApprovalButtons table="deployment_assessments" id={assessment.id} />
          </div>
        )}
      </div>
    </div>
  );
}

// One recommendation row with its own "Produce" button. Firing it kicks off
// D-DP with the assessment + format pre-filled.
function RecommendedRow({
  rec,
  assessment,
  canProduce,
}: {
  rec: RecommendedFormat;
  assessment: DeploymentAssessment;
  canProduce: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "firing" | "fired" | "error">(
    "idle",
  );
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function produce() {
    setStatus("firing");
    try {
      const resp = await fetch("/api/agents/d-dp/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assessmentId: assessment.id,
          sourceArtifactTable: assessment.source_artifact_table,
          sourceArtifactId: assessment.source_artifact_id,
          formatType: rec.format,
        }),
      });
      if (!resp.ok) {
        setStatus("error");
        return;
      }
      setStatus("fired");
      startTransition(() => router.refresh());
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
    }
  }

  const label = FORMAT_LABEL[rec.format] ?? rec.format;
  const fit = rec.fit_score != null ? Number(rec.fit_score) : null;
  const priorityTone = rec.priority
    ? PRIORITY_TONE[rec.priority] ?? "bg-card text-text-dim"
    : null;

  return (
    <div className="rounded-md border border-border bg-surface/40 px-3 py-2.5 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-text">{label}</span>
          {fit != null && (
            <span className="text-[10px] uppercase tracking-wider text-text-dim font-mono">
              {fit.toFixed(0)}/10 fit
            </span>
          )}
          {rec.priority && priorityTone && (
            <span
              className={cn(
                "rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5",
                priorityTone,
              )}
            >
              {rec.priority}
            </span>
          )}
        </div>
        {(rec.audience || rec.channel) && (
          <div className="text-[11px] text-text-dim">
            {[rec.audience, rec.channel].filter(Boolean).join(" · ")}
          </div>
        )}
        {rec.rationale && (
          <p className="text-xs text-text-muted leading-relaxed">
            {rec.rationale}
          </p>
        )}
      </div>
      {canProduce && (
        <button
          type="button"
          onClick={produce}
          disabled={status === "firing"}
          className={cn(
            "flex-shrink-0 inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition",
            status === "fired"
              ? "bg-win-bg text-win"
              : status === "error"
                ? "bg-danger-bg text-danger"
                : "bg-accent-bg text-accent hover:bg-accent-bg/80",
            status === "firing" && "opacity-60",
          )}
        >
          {status === "firing"
            ? "Producing…"
            : status === "fired"
              ? "Queued ✓"
              : status === "error"
                ? "Retry"
                : "Produce"}
        </button>
      )}
    </div>
  );
}
