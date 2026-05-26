"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type ApprovalStatus =
  | "draft"
  | "pending_review"
  | "needs_revision"
  | "approved"
  | "published"
  | "rejected";

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  needs_revision: "Needs revision",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
};

const STATUS_TONE: Record<ApprovalStatus, string> = {
  draft: "bg-card text-text-dim",
  pending_review: "bg-warn-bg text-warn",
  needs_revision: "bg-warn-bg text-warn",
  approved: "bg-win-bg text-win",
  published: "bg-accent-bg text-accent",
  rejected: "bg-danger-bg text-danger",
};

/**
 * Minimal HITL approval controls for a delivery artifact (Phase 1 §6 cut).
 * Renders the current status plus Approve / Reject buttons when the artifact
 * is in `pending_review` or `needs_revision`. Full Review Queue (diff viewer,
 * edit-in-place, bulk approve) lands in Phase 5.
 */
export type ApprovalTable =
  | "content_outputs"
  | "sales_collateral"
  | "counter_narrative_memos"
  | "enablement_assets"
  | "super_user_cohorts";

export function ApprovalButtons({
  artifactId,
  tableName,
  status,
}: {
  artifactId: string;
  tableName: ApprovalTable;
  status: ApprovalStatus | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState<ApprovalStatus | null>(status);
  const [error, setError] = useState<string | null>(null);

  const current = localStatus ?? "draft";
  const showActions = current === "pending_review" || current === "needs_revision";

  async function transition(action: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/approvals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            table: tableName,
            id: artifactId,
            action,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Server returned ${res.status}`);
        }
        const body: { approval_status: ApprovalStatus } = await res.json();
        setLocalStatus(body.approval_status);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border">
      <span
        className={`rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${STATUS_TONE[current]}`}
      >
        {STATUS_LABEL[current]}
      </span>
      {showActions && (
        <>
          <button
            type="button"
            onClick={() => transition("approve")}
            disabled={pending}
            className="rounded-md bg-win-bg text-win text-xs font-semibold px-3 py-1 transition hover:bg-win hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => transition("reject")}
            disabled={pending}
            className="rounded-md bg-danger-bg text-danger text-xs font-semibold px-3 py-1 transition hover:bg-danger hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject
          </button>
          {pending && (
            <span className="inline-block h-3 w-3 rounded-full border-2 border-text-dim/40 border-t-text-dim animate-spin" />
          )}
        </>
      )}
      {error && (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
