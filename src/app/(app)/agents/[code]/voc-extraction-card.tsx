// VoCExtractionCard — renders R-VC output (Voice of Customer). HITL Gate 2.
// Drift indicator surfaced inline: % of top-pain text drawn from a single
// customer transcript. Trigger > 25% flags "verify this represents the
// cohort, not a vocal outlier" so PMM can scrub before S-IC consumes.

import { ApprovalButtons, type ApprovalStatus } from "./approval-buttons";

export type VoCPain = {
  rank?: number | null;
  pain?: string | null;
  vocabulary_examples?: string[] | null;
  severity?: string | null;
  frequency_pct?: number | null;
  source_transcript_count?: number | null;
  single_customer_concentration_pct?: number | null;
};

export type CompellingEvent = {
  event?: string | null;
  frequency_pct?: number | null;
  time_to_purchase_days?: number | null;
  sample_quote?: string | null;
};

export type CommitteeRole = {
  role?: string | null;
  influence_weight?: number | null;
  typical_pain_focus?: string | null;
  observed_in_pct?: number | null;
};

export type VoCExtraction = {
  id: string;
  super_user_cohort_id: string | null;
  top_pains: VoCPain[] | null;
  pain_vocabulary: Record<string, string[]> | null;
  compelling_events: CompellingEvent[] | null;
  buying_committee: CommitteeRole[] | null;
  source_transcript_count: number | null;
  single_customer_pct: number | null;
  cohort_coverage_pct: number | null;
  sources: string | null;
  approval_status?: ApprovalStatus | null;
  risk_tier?: string | null;
  created_at?: string | null;
};

const SINGLE_CUSTOMER_DRIFT_THRESHOLD = 25;

export function VoCExtractionCard({
  extraction,
  compact = false,
}: {
  extraction: VoCExtraction;
  compact?: boolean;
}) {
  const pains = extraction.top_pains ?? [];
  const events = extraction.compelling_events ?? [];
  const committee = extraction.buying_committee ?? [];
  const singleCustomerPct = extraction.single_customer_pct;
  const driftWarn =
    singleCustomerPct != null &&
    singleCustomerPct > SINGLE_CUSTOMER_DRIFT_THRESHOLD;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-surface/40">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5 font-mono">
              R-VC
            </span>
            <span className="text-text-dim">Voice of Customer · Gate 2</span>
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            VoC extraction
            {extraction.created_at && (
              <span className="text-text-dim font-normal ml-2 text-xs">
                {extraction.created_at.slice(0, 10)}
              </span>
            )}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-text-dim">
            Transcripts
          </div>
          <div className="text-2xl font-semibold tabular-nums text-text">
            {extraction.source_transcript_count ?? 0}
          </div>
          {extraction.cohort_coverage_pct != null && (
            <div className="text-[10px] uppercase tracking-wider text-text-dim mt-0.5">
              {extraction.cohort_coverage_pct.toFixed(0)}% coverage
            </div>
          )}
        </div>
      </div>

      {/* Drift indicator — the Gate 2 explicit check */}
      {singleCustomerPct != null && (
        <div className="px-5 py-3 border-b border-border bg-surface/20">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wider text-text-dim">
              Single-customer concentration
            </span>
            <span
              className={
                driftWarn
                  ? "text-warn font-semibold tabular-nums text-sm"
                  : "text-text tabular-nums text-sm"
              }
            >
              {singleCustomerPct.toFixed(0)}%
              {driftWarn && (
                <span className="ml-2 text-[10px] uppercase tracking-wider">
                  Verify, may be a vocal outlier
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {pains.length > 0 && (
        <div className="px-5 py-4">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Top pains
          </div>
          <ol className="space-y-3">
            {pains.slice(0, compact ? 2 : 6).map((p, i) => (
              <li
                key={i}
                className="rounded-md border border-border/60 bg-surface/40 px-4 py-3"
              >
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-mono text-[10px] text-text-dim tabular-nums">
                    {String(p.rank ?? i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold text-text leading-snug">
                    {p.pain ?? "—"}
                  </span>
                  {p.severity && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-text-dim">
                      {p.severity}
                    </span>
                  )}
                </div>
                {p.vocabulary_examples && p.vocabulary_examples.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.vocabulary_examples.slice(0, 4).map((v, j) => (
                      <span
                        key={j}
                        className="rounded-full bg-card border border-border text-xs text-text-muted px-2 py-0.5 italic"
                      >
                        &ldquo;{v}&rdquo;
                      </span>
                    ))}
                  </div>
                )}
                {(p.frequency_pct != null || p.source_transcript_count != null) && (
                  <div className="text-[11px] text-text-dim mt-2">
                    {p.frequency_pct != null && (
                      <span>{p.frequency_pct.toFixed(0)}% of transcripts</span>
                    )}
                    {p.source_transcript_count != null && (
                      <span>
                        {p.frequency_pct != null ? " · " : ""}
                        {p.source_transcript_count} transcripts
                      </span>
                    )}
                    {p.single_customer_concentration_pct != null &&
                      p.single_customer_concentration_pct >
                        SINGLE_CUSTOMER_DRIFT_THRESHOLD && (
                        <span className="text-warn ml-2">
                          · {p.single_customer_concentration_pct.toFixed(0)}% from one customer
                        </span>
                      )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!compact && events.length > 0 && (
        <div className="px-5 py-4 border-t border-border bg-surface/20">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Compelling events
          </div>
          <ul className="space-y-2">
            {events.slice(0, 6).map((e, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-text">{e.event ?? "—"}</span>
                  <span className="text-text-dim text-xs tabular-nums">
                    {e.frequency_pct != null && `${e.frequency_pct.toFixed(0)}%`}
                    {e.time_to_purchase_days != null &&
                      ` · ${e.time_to_purchase_days}d to buy`}
                  </span>
                </div>
                {e.sample_quote && (
                  <p className="text-text-muted text-xs italic mt-1">
                    &ldquo;{e.sample_quote}&rdquo;
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && committee.length > 0 && (
        <div className="px-5 py-4 border-t border-border">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Buying committee
          </div>
          <ul className="space-y-1.5">
            {committee.map((c, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <div>
                  <span className="text-text font-medium">{c.role ?? "—"}</span>
                  {c.typical_pain_focus && (
                    <span className="text-text-dim ml-2 text-xs">
                      · {c.typical_pain_focus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-dim tabular-nums">
                  {c.observed_in_pct != null && `${c.observed_in_pct.toFixed(0)}%`}
                  {c.influence_weight != null && (
                    <span>
                      · weight {c.influence_weight.toFixed(1)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (
        <ApprovalButtons
          artifactId={extraction.id}
          tableName="voc_extractions"
          status={extraction.approval_status ?? null}
        />
      )}
    </div>
  );
}
