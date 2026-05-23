export type RoadmapItem = {
  id: string;
  item_date: string | null;
  title: string | null;
  category: string | null;
  summary: string | null;
  evidence: string | null;
  usable_score: number | null;
  usable_rationale: string | null;
  valuable_score: number | null;
  valuable_rationale: string | null;
  feasible_score: number | null;
  feasible_rationale: string | null;
  viable_score: number | null;
  viable_rationale: string | null;
  overall_score: number | null;
  recommendation: string | null;
  priority: string | null;
  tags: string | null;
  sources: string | null;
  created_at?: string | null;
};

const RECOMMENDATION_TONE: Record<string, string> = {
  build: "bg-win-bg text-win",
  investigate: "bg-accent-bg text-accent",
  defer: "bg-warn-bg text-warn",
  kill: "bg-danger-bg text-danger",
};

const PRIORITY_TONE: Record<string, string> = {
  critical: "bg-danger-bg text-danger",
  high: "bg-warn-bg text-warn",
  medium: "bg-accent-bg text-accent",
  low: "bg-white/5 text-text-muted",
};

const UVFV: { key: keyof RoadmapItem; rationaleKey: keyof RoadmapItem; label: string }[] = [
  { key: "usable_score", rationaleKey: "usable_rationale", label: "Usable" },
  { key: "valuable_score", rationaleKey: "valuable_rationale", label: "Valuable" },
  { key: "feasible_score", rationaleKey: "feasible_rationale", label: "Feasible" },
  { key: "viable_score", rationaleKey: "viable_rationale", label: "Viable" },
];

export function RoadmapCard({
  item,
  compact = false,
}: {
  item: RoadmapItem;
  compact?: boolean;
}) {
  const recTone =
    (item.recommendation && RECOMMENDATION_TONE[item.recommendation]) ??
    "bg-white/5 text-text-muted";
  const prioTone =
    (item.priority && PRIORITY_TONE[item.priority]) ?? "bg-white/5 text-text-muted";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="text-text-dim">{item.item_date ?? "—"}</span>
            {item.category && (
              <span className="rounded-full bg-card-hover text-text-muted px-2 py-0.5">
                {item.category}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {item.title}
          </h3>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {item.overall_score !== null && (
            <span className="rounded-full bg-accent-bg text-accent text-[11px] font-semibold px-2 py-0.5">
              {item.overall_score}/10
            </span>
          )}
          {item.recommendation && (
            <span
              className={`rounded-full text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 ${recTone}`}
            >
              {item.recommendation}
            </span>
          )}
          {item.priority && (
            <span
              className={`rounded-full text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 ${prioTone}`}
            >
              {item.priority}
            </span>
          )}
        </div>
      </div>

      {item.summary && (
        <p className="text-sm text-text-muted leading-relaxed mb-3">
          {item.summary}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {UVFV.map((dim) => {
          const score = item[dim.key] as number | null;
          const passed = score !== null && score >= 5;
          return (
            <div
              key={dim.label}
              className={`rounded-md border px-3 py-2 ${passed ? "border-win/30 bg-win-bg/30" : "border-border bg-card"}`}
            >
              <div className="flex items-baseline justify-between mb-0.5">
                <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">
                  {dim.label}
                </div>
                <div className={`text-sm font-semibold tabular-nums ${passed ? "text-win" : "text-text"}`}>
                  {score ?? "—"}/10
                </div>
              </div>
              {!compact && item[dim.rationaleKey] && (
                <p className="text-[11px] text-text-muted leading-snug mt-1">
                  {item[dim.rationaleKey] as string}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!compact && item.evidence && (
        <div className="border-l-2 border-accent pl-3 mt-3">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Evidence
          </div>
          <p className="text-sm text-text leading-relaxed">{item.evidence}</p>
        </div>
      )}
    </div>
  );
}
