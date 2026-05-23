export type FeedbackTheme = {
  id: string;
  theme_name: string | null;
  category: string | null;
  summary: string | null;
  representative_quotes: string | null;
  frequency: string | null;
  urgency: string | null;
  revenue_impact: string | null;
  strategic_alignment: string | null;
  recommended_action: string | null;
  created_at?: string | null;
};

const URGENCY_TONE: Record<string, string> = {
  critical: "bg-danger-bg text-danger",
  high: "bg-warn-bg text-warn",
  medium: "bg-accent-bg text-accent",
  low: "bg-white/5 text-text-muted",
};

const FREQUENCY_TONE: Record<string, string> = {
  high: "bg-danger-bg text-danger",
  medium: "bg-warn-bg text-warn",
  low: "bg-white/5 text-text-muted",
};

export function ThemeCard({
  theme,
  compact = false,
}: {
  theme: FeedbackTheme;
  compact?: boolean;
}) {
  const urgencyTone =
    (theme.urgency && URGENCY_TONE[theme.urgency]) ?? "bg-white/5 text-text-muted";
  const frequencyTone =
    (theme.frequency && FREQUENCY_TONE[theme.frequency]) ?? "bg-white/5 text-text-muted";
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            {theme.category && (
              <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
                {theme.category}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {theme.theme_name}
          </h3>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {theme.urgency && (
            <span className={`rounded-full text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 ${urgencyTone}`}>
              {theme.urgency} urgency
            </span>
          )}
          {theme.frequency && (
            <span className={`rounded-full text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 ${frequencyTone}`}>
              {theme.frequency} freq
            </span>
          )}
        </div>
      </div>

      {theme.summary && (
        <p className="text-sm text-text-muted leading-relaxed mb-3">{theme.summary}</p>
      )}

      {!compact && theme.representative_quotes && (
        <div className="rounded-md bg-surface/50 border border-border px-3 py-2 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
            Representative quotes
          </div>
          <p className="text-sm text-text-muted italic leading-relaxed whitespace-pre-line">
            {theme.representative_quotes}
          </p>
        </div>
      )}

      {!compact && theme.recommended_action && (
        <div className="border-l-2 border-accent pl-3">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Recommended action
          </div>
          <p className="text-sm text-text leading-relaxed">{theme.recommended_action}</p>
        </div>
      )}
    </div>
  );
}
