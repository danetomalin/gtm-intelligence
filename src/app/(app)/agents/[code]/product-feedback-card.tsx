export type ProductFeedback = {
  id: string;
  source: string | null;
  feedback_date: string | null;
  customer_segment: string | null;
  raw_excerpt: string | null;
  themed_summary: string | null;
  linked_roadmap_item_id: string | null;
  severity: string | null;
  recurrence_count: number | null;
  recommendation: string | null;
  sources: string | null;
  created_at?: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  support_ticket: "Support",
  sales_call: "Sales call",
  nps_open: "NPS",
  user_interview: "Interview",
  community: "Community",
  review: "Review",
};

const SEVERITY_TONE: Record<string, string> = {
  low: "bg-card text-text-dim",
  medium: "bg-warn-bg text-warn",
  high: "bg-danger-bg text-danger",
  critical: "bg-danger-bg text-danger",
};

export function ProductFeedbackCard({
  feedback,
  compact = false,
}: {
  feedback: ProductFeedback;
  compact?: boolean;
}) {
  const sourceLabel = feedback.source
    ? SOURCE_LABEL[feedback.source] ?? feedback.source
    : "—";
  const severityKey = feedback.severity ?? "low";
  const severityTone = SEVERITY_TONE[severityKey] ?? "bg-card text-text-dim";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {sourceLabel}
            </span>
            {feedback.customer_segment && (
              <span className="text-text-dim">{feedback.customer_segment}</span>
            )}
            {feedback.feedback_date && (
              <span className="text-text-dim">· {feedback.feedback_date}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {feedback.themed_summary ?? "Untitled feedback"}
          </h3>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {feedback.recurrence_count != null && feedback.recurrence_count > 0 && (
            <span className="rounded-full bg-accent-bg text-accent text-[11px] font-semibold px-2 py-0.5 tabular-nums">
              ×{feedback.recurrence_count}
            </span>
          )}
          {feedback.severity && (
            <span
              className={`rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${severityTone}`}
            >
              {feedback.severity}
            </span>
          )}
        </div>
      </div>
      {feedback.raw_excerpt && (
        <p
          className={`text-sm text-text-muted leading-relaxed italic mb-2 ${compact ? "line-clamp-2" : ""}`}
        >
          &ldquo;{feedback.raw_excerpt}&rdquo;
        </p>
      )}
      {!compact && feedback.recommendation && (
        <div className="border-l-2 border-accent pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Recommendation
          </div>
          <p className="text-sm text-text leading-relaxed">{feedback.recommendation}</p>
        </div>
      )}
    </div>
  );
}
