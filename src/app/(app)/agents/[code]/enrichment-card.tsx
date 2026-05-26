// CustomerEnrichmentCard — renders R-CE output. R-CE has no HITL gate so the
// card is read-only (no ApprovalButtons). Shows the firmographic clusters,
// technographic signals, and trigger events the agent extracted from the
// approved super-user cohort.

export type EnrichmentClusterEntry = {
  label?: string | null;
  account_count?: number | null;
  pct?: number | null;
};

export type EnrichmentTechSignal = {
  tool?: string | null;
  account_count?: number | null;
  pct?: number | null;
};

export type EnrichmentTrigger = {
  trigger_type?: string | null;
  description?: string | null;
  observed_in_accounts?: number | null;
  confidence?: string | null;
};

export type CustomerEnrichment = {
  id: string;
  super_user_cohort_id: string | null;
  firmographic_clusters: Record<string, EnrichmentClusterEntry[]> | null;
  technographic_signals: {
    uses?: EnrichmentTechSignal[];
    missing?: EnrichmentTechSignal[];
    integrations?: EnrichmentTechSignal[];
  } | null;
  trigger_signals: EnrichmentTrigger[] | null;
  enrichment_sources: { provider?: string; request_url?: string }[] | null;
  total_accounts_enriched: number | null;
  coverage_pct: number | null;
  notes: string | null;
  created_at?: string | null;
};

function ClusterList({
  title,
  entries,
}: {
  title: string;
  entries: EnrichmentClusterEntry[];
}) {
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
        {title}
      </div>
      <ul className="space-y-1 text-sm">
        {entries.slice(0, 6).map((e, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="text-text truncate">{e.label ?? "—"}</span>
            <span className="text-text-dim text-xs tabular-nums whitespace-nowrap">
              {e.account_count ?? 0}
              {e.pct != null ? ` · ${e.pct.toFixed(0)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CustomerEnrichmentCard({
  enrichment,
  compact = false,
}: {
  enrichment: CustomerEnrichment;
  compact?: boolean;
}) {
  const firmographics = enrichment.firmographic_clusters ?? {};
  const tech = enrichment.technographic_signals ?? {};
  const triggers = enrichment.trigger_signals ?? [];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-surface/40">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5 font-mono">
              R-CE
            </span>
            <span className="text-text-dim">Customer enrichment</span>
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            Cohort enrichment
            {enrichment.created_at && (
              <span className="text-text-dim font-normal ml-2 text-xs">
                {enrichment.created_at.slice(0, 10)}
              </span>
            )}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-text-dim">
            Coverage
          </div>
          <div className="text-2xl font-semibold tabular-nums text-text">
            {enrichment.coverage_pct == null
              ? "—"
              : `${enrichment.coverage_pct.toFixed(0)}%`}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-text-dim mt-0.5">
            {enrichment.total_accounts_enriched ?? 0} accounts
          </div>
        </div>
      </div>

      {!compact && Object.keys(firmographics).length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-3">
            Firmographic clusters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(firmographics).map(([dimension, entries]) => (
              <ClusterList
                key={dimension}
                title={dimension.replace(/_/g, " ")}
                entries={entries}
              />
            ))}
          </div>
        </div>
      )}

      {!compact && (tech.uses?.length || tech.missing?.length) && (
        <div className="px-5 py-4 border-b border-border">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-3">
            Technographic signals
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tech.uses && tech.uses.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-win font-semibold mb-1">
                  In stack
                </div>
                <ul className="space-y-1 text-sm">
                  {tech.uses.slice(0, 6).map((u, i) => (
                    <li
                      key={i}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="text-text">{u.tool ?? "—"}</span>
                      <span className="text-text-dim text-xs tabular-nums">
                        {u.pct != null ? `${u.pct.toFixed(0)}%` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tech.missing && tech.missing.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-warn font-semibold mb-1">
                  Missing
                </div>
                <ul className="space-y-1 text-sm">
                  {tech.missing.slice(0, 6).map((u, i) => (
                    <li
                      key={i}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="text-text">{u.tool ?? "—"}</span>
                      <span className="text-text-dim text-xs tabular-nums">
                        {u.pct != null ? `${u.pct.toFixed(0)}%` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {triggers.length > 0 && (
        <div className="px-5 py-4">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Trigger signals
          </div>
          <ul className="space-y-2">
            {triggers.slice(0, compact ? 3 : 8).map((t, i) => (
              <li
                key={i}
                className="rounded-md border border-border/60 bg-surface/40 px-3 py-2 text-sm"
              >
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-text font-medium">
                    {t.trigger_type ?? "Trigger"}
                  </span>
                  <div className="flex items-center gap-2">
                    {t.confidence && (
                      <span className="text-[10px] uppercase tracking-wider text-text-dim">
                        {t.confidence}
                      </span>
                    )}
                    {t.observed_in_accounts != null && (
                      <span className="text-text-dim text-xs tabular-nums">
                        {t.observed_in_accounts} accts
                      </span>
                    )}
                  </div>
                </div>
                {t.description && (
                  <p className="text-text-muted leading-relaxed">
                    {t.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
