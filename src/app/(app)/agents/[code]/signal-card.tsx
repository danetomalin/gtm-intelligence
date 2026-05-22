export type Signal = {
  id: string;
  signal_date: string | null;
  category: string | null;
  headline: string | null;
  summary: string | null;
  strategic_commentary: string | null;
  impact_score: number | null;
  sentiment: string | null;
  sentiment_reason: string | null;
  created_at?: string | null;
};

export function SignalCard({
  signal,
  compact = false,
}: {
  signal: Signal;
  compact?: boolean;
}) {
  const sentimentTone =
    signal.sentiment === "bullish"
      ? "bg-win-bg text-win"
      : signal.sentiment === "bearish"
        ? "bg-danger-bg text-danger"
        : "bg-warn-bg text-warn";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="text-text-dim">{signal.signal_date ?? "—"}</span>
            {signal.category && (
              <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
                {signal.category}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {signal.headline}
          </h3>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="rounded-full bg-accent-bg text-accent text-[11px] font-semibold px-2 py-0.5">
            {signal.impact_score ?? "—"}/10
          </span>
          {signal.sentiment && (
            <span
              className={`rounded-full text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 ${sentimentTone}`}
            >
              {signal.sentiment}
            </span>
          )}
        </div>
      </div>
      {signal.summary && (
        <p className="text-sm text-text-muted leading-relaxed mb-2">
          {signal.summary}
        </p>
      )}
      {!compact && signal.strategic_commentary && (
        <div className="border-l-2 border-accent pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            So what
          </div>
          <p className="text-sm text-text leading-relaxed">
            {signal.strategic_commentary}
          </p>
        </div>
      )}
    </div>
  );
}
