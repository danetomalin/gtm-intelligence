export type CampaignPerformance = {
  id: string;
  scope: string | null;
  scope_value: string | null;
  window_label: string | null;
  sends_count: number | null;
  open_rate_pct: number | null;
  click_through_rate_pct: number | null;
  reply_rate_pct: number | null;
  attributed_pipeline_usd: number | null;
  outperforms_baseline_pct: number | null;
  winning_theme: string | null;
  losing_theme: string | null;
  narrative: string | null;
  recommendation: string | null;
  sources: string | null;
  created_at?: string | null;
};

const SCOPE_LABEL: Record<string, string> = {
  messaging_theme: "Messaging theme",
  channel: "Channel",
  persona: "Persona",
  positioning_element: "Positioning element",
  overall: "Overall",
};

function pct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function PerformanceCard({
  perf,
  compact = false,
}: {
  perf: CampaignPerformance;
  compact?: boolean;
}) {
  const scopeLabel = perf.scope
    ? SCOPE_LABEL[perf.scope] ?? perf.scope
    : "—";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {scopeLabel}
            </span>
            {perf.window_label && (
              <span className="text-text-dim">{perf.window_label}</span>
            )}
            {perf.sends_count != null && (
              <span className="text-text-dim">· {perf.sends_count} sends</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {perf.scope_value ?? "Untitled rollup"}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <Stat label="Open" value={pct(perf.open_rate_pct)} />
        <Stat label="CTR" value={pct(perf.click_through_rate_pct)} />
        <Stat label="Reply" value={pct(perf.reply_rate_pct)} />
        <Stat
          label="vs baseline"
          value={
            perf.outperforms_baseline_pct == null
              ? "—"
              : `${perf.outperforms_baseline_pct > 0 ? "+" : ""}${perf.outperforms_baseline_pct.toFixed(1)}%`
          }
        />
      </div>

      {!compact && (perf.winning_theme || perf.losing_theme) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          {perf.winning_theme && (
            <div className="rounded-md border border-win/30 bg-win-bg/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-win font-semibold mb-1">
                Winning theme
              </div>
              <p className="text-sm text-text leading-relaxed">{perf.winning_theme}</p>
            </div>
          )}
          {perf.losing_theme && (
            <div className="rounded-md border border-danger/30 bg-danger-bg/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-danger font-semibold mb-1">
                Underperforming theme
              </div>
              <p className="text-sm text-text leading-relaxed">{perf.losing_theme}</p>
            </div>
          )}
        </div>
      )}

      {perf.narrative && (
        <p className={`text-sm text-text leading-relaxed mb-2 ${compact ? "line-clamp-2" : ""}`}>
          {perf.narrative}
        </p>
      )}

      {!compact && perf.recommendation && (
        <div className="border-l-2 border-accent pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Recommendation
          </div>
          <p className="text-sm text-text leading-relaxed">{perf.recommendation}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
        {label}
      </div>
      <div className="text-base font-semibold text-text tabular-nums">{value}</div>
    </div>
  );
}
