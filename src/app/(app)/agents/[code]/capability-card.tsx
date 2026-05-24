export type ProductCapability = {
  id: string;
  capability_name: string | null;
  category: string | null;
  feature_description: string | null;
  buyer_benefit: string | null;
  competitive_gap: string | null;
  status: string | null;
  sources: string | null;
  created_at?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  ga: "GA",
  beta: "Beta",
  alpha: "Alpha",
  planned: "Planned",
  sunset: "Sunset",
};

const STATUS_TONE: Record<string, string> = {
  ga: "bg-win-bg text-win",
  beta: "bg-accent-bg text-accent",
  alpha: "bg-warn-bg text-warn",
  planned: "bg-card text-text-dim",
  sunset: "bg-danger-bg text-danger",
};

export function CapabilityCard({
  capability,
  compact = false,
}: {
  capability: ProductCapability;
  compact?: boolean;
}) {
  const statusKey = capability.status ?? "ga";
  const statusLabel = STATUS_LABEL[statusKey] ?? statusKey;
  const statusTone = STATUS_TONE[statusKey] ?? "bg-card text-text-dim";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            {capability.category && (
              <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
                {capability.category}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {capability.capability_name ?? "Unnamed capability"}
          </h3>
        </div>
        <span
          className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>
      {capability.feature_description && (
        <p
          className={`text-sm text-text-muted leading-relaxed mb-2 ${compact ? "line-clamp-2" : ""}`}
        >
          {capability.feature_description}
        </p>
      )}
      {!compact && capability.buyer_benefit && (
        <div className="border-l-2 border-accent pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Why a buyer cares
          </div>
          <p className="text-sm text-text leading-relaxed">
            {capability.buyer_benefit}
          </p>
        </div>
      )}
      {!compact && capability.competitive_gap && (
        <div className="border-l-2 border-warn pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-warn font-semibold mb-1">
            Competitive gap it closes
          </div>
          <p className="text-sm text-text leading-relaxed">
            {capability.competitive_gap}
          </p>
        </div>
      )}
    </div>
  );
}
