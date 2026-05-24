import { ApprovalButtons, type ApprovalStatus } from "./approval-buttons";

export type CounterNarrative = {
  id: string;
  triggering_signal_id: string | null;
  triggering_signal_summary: string | null;
  competitor_named: string | null;
  category: string | null;
  rep_talking_points: string | null;
  suggested_linkedin_post: string | null;
  email_reply_template: string | null;
  positioning_anchor: string | null;
  sources: string | null;
  approval_status?: ApprovalStatus | null;
  risk_tier?: string | null;
  created_at?: string | null;
};

export function CounterNarrativeCard({
  memo,
  compact = false,
}: {
  memo: CounterNarrative;
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-warn-bg text-warn px-2 py-0.5">
              Counter-narrative
            </span>
            {memo.category && (
              <span className="text-text-dim">{memo.category}</span>
            )}
            {memo.competitor_named && (
              <span className="text-text-dim">· vs {memo.competitor_named}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {memo.triggering_signal_summary ?? "Counter-narrative memo"}
          </h3>
        </div>
      </div>

      {memo.rep_talking_points && (
        <div className="border-l-2 border-accent pl-3 mt-2 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Rep talking points
          </div>
          <p className={`text-sm text-text leading-relaxed whitespace-pre-line ${compact ? "line-clamp-3" : ""}`}>
            {memo.rep_talking_points}
          </p>
        </div>
      )}

      {!compact && memo.suggested_linkedin_post && (
        <div className="border-l-2 border-accent pl-3 mt-2 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Suggested LinkedIn post
          </div>
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line italic">
            {memo.suggested_linkedin_post}
          </p>
        </div>
      )}

      {!compact && memo.email_reply_template && (
        <div className="border-l-2 border-text-dim pl-3 mt-2 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
            Email reply template
          </div>
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
            {memo.email_reply_template}
          </p>
        </div>
      )}

      {!compact && memo.positioning_anchor && (
        <div className="text-xs text-text-dim mt-2">
          Anchored to: <span className="text-text">{memo.positioning_anchor}</span>
        </div>
      )}

      {!compact && (
        <ApprovalButtons
          artifactId={memo.id}
          tableName="counter_narrative_memos"
          status={memo.approval_status ?? null}
        />
      )}
    </div>
  );
}
