export type PricingTier = {
  name?: string;
  price?: string | number;
  unit?: string;
  features?: string[];
};

export type PricingIntel = {
  id: string;
  competitor_name: string | null;
  snapshot_date: string | null;
  pricing_model: string | null;
  // n8n's $fromAI writes jsonb values as JSON-encoded strings rather than
  // native arrays. The render code normalizes either shape into a real array.
  tiers: PricingTier[] | string | null;
  packaging_observations: string | null;
  pricing_velocity: string | null;
  recent_changes: string | null;
  positioning_implications: string | null;
  sources: string | null;
  created_at?: string | null;
};

// Tolerate three shapes from the DB:
//   1. proper jsonb array — return as-is
//   2. JSON-encoded string (n8n $fromAI quirk) — parse and use
//   3. null / undefined / malformed — return empty
function normalizeTiers(raw: PricingTier[] | string | null | undefined): PricingTier[] {
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

const MODEL_LABEL: Record<string, string> = {
  tiered: "Tiered",
  usage: "Usage-based",
  seat: "Per-seat",
  flat: "Flat",
  hybrid: "Hybrid",
  custom: "Custom / quote",
  unknown: "Unknown",
};

const VELOCITY_TONE: Record<string, string> = {
  stable: "bg-card text-text-dim",
  changing: "bg-warn-bg text-warn",
  recently_changed: "bg-danger-bg text-danger",
  unknown: "bg-card text-text-dim",
};

const VELOCITY_LABEL: Record<string, string> = {
  stable: "Stable",
  changing: "Changing",
  recently_changed: "Just changed",
  unknown: "Unknown",
};

export function PricingIntelCard({
  intel,
  compact = false,
}: {
  intel: PricingIntel;
  compact?: boolean;
}) {
  const modelLabel = intel.pricing_model
    ? MODEL_LABEL[intel.pricing_model] ?? intel.pricing_model
    : "—";
  const velocityKey = intel.pricing_velocity ?? "unknown";
  const velocityLabel = VELOCITY_LABEL[velocityKey] ?? velocityKey;
  const velocityTone = VELOCITY_TONE[velocityKey] ?? "bg-card text-text-dim";
  const tiers = normalizeTiers(intel.tiers);

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="text-text-dim">{intel.snapshot_date ?? "—"}</span>
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {modelLabel}
            </span>
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {intel.competitor_name ?? "Unknown competitor"}
          </h3>
        </div>
        <span
          className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${velocityTone}`}
        >
          {velocityLabel}
        </span>
      </div>

      {!compact && tiers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className="rounded-md border border-border bg-surface/40 px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-text">
                  {tier.name ?? `Tier ${idx + 1}`}
                </span>
                {(tier.price !== undefined || tier.unit) && (
                  <span className="text-xs font-mono text-text-muted tabular-nums">
                    {tier.price ?? "—"}
                    {tier.unit ? ` / ${tier.unit}` : ""}
                  </span>
                )}
              </div>
              {tier.features && tier.features.length > 0 && (
                <ul className="text-[11px] text-text-muted leading-relaxed space-y-0.5">
                  {tier.features.slice(0, compact ? 2 : 4).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {intel.packaging_observations && (
        <p
          className={`text-sm text-text-muted leading-relaxed mb-2 ${compact ? "line-clamp-2" : ""}`}
        >
          {intel.packaging_observations}
        </p>
      )}

      {!compact && intel.recent_changes && (
        <div className="border-l-2 border-warn pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-warn font-semibold mb-1">
            Recent changes
          </div>
          <p className="text-sm text-text leading-relaxed">
            {intel.recent_changes}
          </p>
        </div>
      )}

      {!compact && intel.positioning_implications && (
        <div className="border-l-2 border-accent pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            So what
          </div>
          <p className="text-sm text-text leading-relaxed">
            {intel.positioning_implications}
          </p>
        </div>
      )}
    </div>
  );
}
