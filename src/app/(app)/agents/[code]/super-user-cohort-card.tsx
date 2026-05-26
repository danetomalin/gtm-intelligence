import { ApprovalButtons, type ApprovalStatus } from "./approval-buttons";

export type CohortAccount = {
  name?: string | null;
  domain?: string | null;
  segment?: string | null;
  nrr_pct?: number | null;
  ltv_usd?: number | null;
  adoption_score?: number | null;
  support_ticket_volume?: number | null;
  included_reason?: string | null;
};

export type ExcludedAccount = {
  name?: string | null;
  domain?: string | null;
  excluded_reason?: string | null;
};

export type SuperUserCohort = {
  id: string;
  version: number | null;
  is_active: boolean | null;
  cohort_name: string | null;
  methodology: string | null;
  filter_criteria: Record<string, unknown> | string | null;
  // n8n's supabaseTool sometimes stringifies $fromAI JSON output rather than
  // sending it as nested JSON, so jsonb columns can come back as either an
  // array or a JSON-encoded string. The normalize helpers below handle both.
  cohort_accounts: CohortAccount[] | string | null;
  excluded_accounts: ExcludedAccount[] | string | null;
  legacy_concentration_pct: number | null;
  segment_dominance_pct: number | null;
  sources: string | null;
  approval_status?: ApprovalStatus | null;
  risk_tier?: string | null;
  created_at?: string | null;
};

function normalizeArray<T>(value: T[] | string | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toFixed(0)}%`;
}

export function SuperUserCohortCard({
  cohort,
  compact = false,
}: {
  cohort: SuperUserCohort;
  compact?: boolean;
}) {
  const accounts = normalizeArray<CohortAccount>(cohort.cohort_accounts);
  const excluded = normalizeArray<ExcludedAccount>(cohort.excluded_accounts);
  const visibleAccounts = compact ? accounts.slice(0, 5) : accounts;
  const legacyConcentration = cohort.legacy_concentration_pct;
  const segmentDominance = cohort.segment_dominance_pct;

  // Drift / sanity flags surfaced in the card. Per the Cap 10 design, Gate 1
  // exists specifically to catch the wrong starting cohort before downstream
  // R-CE / R-VC waste compute on it. These thresholds are the trigger lines.
  const legacyConcerning = legacyConcentration != null && legacyConcentration > 50;
  const segmentConcerning = segmentDominance != null && segmentDominance > 70;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-surface/40">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5 font-mono">
              R-CR
            </span>
            <span className="text-text-dim">Super user cohort</span>
            {cohort.is_active && (
              <span className="rounded-full bg-win-bg text-win px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                Active
              </span>
            )}
            {cohort.version != null && (
              <span className="text-text-dim font-mono">v{cohort.version}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {cohort.cohort_name ?? "Super user cohort"}
          </h3>
          {cohort.methodology && (
            <p className="text-xs text-text-muted leading-relaxed mt-1">
              {cohort.methodology}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-text-dim">
            Accounts
          </div>
          <div className="text-2xl font-semibold tabular-nums text-text">
            {accounts.length}
          </div>
        </div>
      </div>

      {/* Drift / sanity row — explicit per Gate 1 design */}
      {(legacyConcentration != null || segmentDominance != null) && (
        <div className="px-5 py-3 border-b border-border bg-surface/20 grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim mb-0.5">
              Legacy concentration
            </div>
            <div
              className={
                legacyConcerning
                  ? "text-warn font-semibold tabular-nums"
                  : "text-text tabular-nums"
              }
            >
              {fmtPct(legacyConcentration)}
              {legacyConcerning && (
                <span className="ml-2 text-[10px] uppercase tracking-wider">
                  Check for whale bias
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim mb-0.5">
              Single-segment dominance
            </div>
            <div
              className={
                segmentConcerning
                  ? "text-warn font-semibold tabular-nums"
                  : "text-text tabular-nums"
              }
            >
              {fmtPct(segmentDominance)}
              {segmentConcerning && (
                <span className="ml-2 text-[10px] uppercase tracking-wider">
                  May be too narrow
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cohort accounts list */}
      {visibleAccounts.length > 0 && (
        <div className="px-5 py-4">
          <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-2">
            Accounts in cohort
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-text-dim">
                <tr className="text-left">
                  <th className="pb-2 font-semibold">Account</th>
                  <th className="pb-2 font-semibold">Segment</th>
                  <th className="pb-2 font-semibold text-right">NRR</th>
                  <th className="pb-2 font-semibold text-right">LTV</th>
                  <th className="pb-2 font-semibold text-right">Adoption</th>
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.map((a, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="py-2">
                      <div className="text-text font-medium">{a.name ?? "—"}</div>
                      {a.domain && (
                        <div className="text-[11px] text-text-dim">{a.domain}</div>
                      )}
                    </td>
                    <td className="py-2 text-text-muted">{a.segment ?? "—"}</td>
                    <td className="py-2 text-right tabular-nums text-text">
                      {fmtPct(a.nrr_pct)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-text">
                      {fmtUsd(a.ltv_usd)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-text">
                      {a.adoption_score != null ? a.adoption_score.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {compact && accounts.length > visibleAccounts.length && (
            <div className="text-xs text-text-dim mt-2">
              + {accounts.length - visibleAccounts.length} more
            </div>
          )}
        </div>
      )}

      {/* Excluded accounts — explicit so PMM can spot over-filtering */}
      {!compact && excluded.length > 0 && (
        <div className="px-5 py-4 border-t border-border bg-surface/20">
          <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-2">
            Flagged but excluded ({excluded.length})
          </div>
          <ul className="space-y-1.5 text-xs">
            {excluded.map((a, i) => (
              <li key={i} className="text-text-muted">
                <span className="text-text">{a.name ?? "—"}</span>
                {a.excluded_reason && (
                  <span className="text-text-dim"> · {a.excluded_reason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (
        <ApprovalButtons
          artifactId={cohort.id}
          tableName="super_user_cohorts"
          status={cohort.approval_status ?? null}
        />
      )}
    </div>
  );
}
