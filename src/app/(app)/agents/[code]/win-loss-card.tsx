export type WinLoss = {
  id: string;
  deal_id: string | null;
  deal_date: string | null;
  outcome: string | null;
  account_name: string | null;
  account_segment: string | null;
  account_size: string | null;
  competitor: string | null;
  primary_factors: string | null;
  key_quotes: string | null;
  patterns_observed: string | null;
  recommendation: string | null;
  sources: string | null;
  created_at?: string | null;
};

const OUTCOME_LABEL: Record<string, string> = {
  win: "Win",
  loss: "Loss",
  no_decision: "No decision",
  closed_lost_to_competitor: "Lost to competitor",
  closed_lost_to_status_quo: "Lost to status quo",
};

const OUTCOME_TONE: Record<string, string> = {
  win: "bg-win-bg text-win",
  loss: "bg-danger-bg text-danger",
  no_decision: "bg-warn-bg text-warn",
  closed_lost_to_competitor: "bg-danger-bg text-danger",
  closed_lost_to_status_quo: "bg-warn-bg text-warn",
};

export function WinLossCard({
  analysis,
  compact = false,
}: {
  analysis: WinLoss;
  compact?: boolean;
}) {
  const outcomeKey = analysis.outcome ?? "no_decision";
  const outcomeLabel = OUTCOME_LABEL[outcomeKey] ?? outcomeKey;
  const outcomeTone = OUTCOME_TONE[outcomeKey] ?? "bg-card text-text-dim";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="text-text-dim">{analysis.deal_date ?? "—"}</span>
            {analysis.account_segment && (
              <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
                {analysis.account_segment}
              </span>
            )}
            {analysis.competitor && (
              <span className="text-text-dim">vs {analysis.competitor}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {analysis.account_name ?? "Unnamed account"}
          </h3>
        </div>
        <span
          className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${outcomeTone}`}
        >
          {outcomeLabel}
        </span>
      </div>
      {analysis.primary_factors && (
        <p
          className={`text-sm text-text-muted leading-relaxed mb-2 ${compact ? "line-clamp-2" : ""}`}
        >
          {analysis.primary_factors}
        </p>
      )}
      {!compact && analysis.key_quotes && (
        <div className="border-l-2 border-accent pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            From the rep
          </div>
          <p className="text-sm text-text leading-relaxed italic">{analysis.key_quotes}</p>
        </div>
      )}
      {!compact && analysis.patterns_observed && (
        <div className="border-l-2 border-warn pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-warn font-semibold mb-1">
            Pattern
          </div>
          <p className="text-sm text-text leading-relaxed">{analysis.patterns_observed}</p>
        </div>
      )}
      {!compact && analysis.recommendation && (
        <div className="border-l-2 border-accent pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Recommendation
          </div>
          <p className="text-sm text-text leading-relaxed">{analysis.recommendation}</p>
        </div>
      )}
    </div>
  );
}
