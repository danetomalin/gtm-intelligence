// IcpDefinitionCard — renders S-IC output. The canonical ICP playbook.
// Approval gate is the final ICP HITL checkpoint; on approval, S-PO's
// best-fit-accounts element auto-refreshes (handled in /api/approvals route).

import { ApprovalButtons, type ApprovalStatus } from "./approval-buttons";

type FirmographicsShape = {
  industries?: string[];
  employee_range?: { min?: number; max?: number };
  revenue_range?: { min?: number; max?: number; currency?: string };
  geographies?: string[];
  growth_stage?: string;
  business_model?: string;
};

type TechnographicsShape = {
  uses?: string[];
  has_in_stack?: string[];
  missing?: string[];
  integration_signals?: string[];
};

type ICPTrigger = {
  event?: string;
  frequency_pct?: number;
  typical_time_to_buy?: string;
};

type ICPPain = {
  rank?: number;
  pain?: string;
  vocabulary_examples?: string[];
  severity?: string;
};

type ICPCommittee = {
  role?: string;
  // Can be a numeric score or a qualitative string ("high"|"medium"|
  // "low") depending on the run — render guards on typeof.
  influence_weight?: number | string | null;
  primary_pain_focus?: string;
};

type AntiICPEntry = {
  description?: string;
  why_excluded?: string;
  observable_signal?: string;
};

export type ICPDefinition = {
  id: string;
  version: number | null;
  is_active: boolean | null;
  super_user_cohort_id: string | null;
  customer_enrichment_id: string | null;
  voc_extraction_id: string | null;
  segment_name: string | null;
  one_line_definition: string | null;
  firmographics: FirmographicsShape | null;
  technographics: TechnographicsShape | null;
  trigger_signals: ICPTrigger[] | null;
  primary_pains: ICPPain[] | null;
  buying_committee: ICPCommittee[] | null;
  typical_sales_cycle: string | null;
  anti_icp: AntiICPEntry[] | null;
  evidence_basis: string | null;
  sources: string | null;
  approval_status?: ApprovalStatus | null;
  risk_tier?: string | null;
  spo_refreshed_at: string | null;
  created_at?: string | null;
};

function chipList(items: string[] | undefined, tone: "accent" | "win" | "warn" = "accent") {
  if (!items || items.length === 0) return null;
  const toneClass =
    tone === "win"
      ? "bg-win-bg text-win"
      : tone === "warn"
        ? "bg-warn-bg text-warn"
        : "bg-accent-bg text-accent";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className={`rounded-full ${toneClass} text-xs px-2 py-0.5 font-medium`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function ICPDefinitionCard({
  icp,
  compact = false,
}: {
  icp: ICPDefinition;
  compact?: boolean;
}) {
  const f = icp.firmographics ?? {};
  const t = icp.technographics ?? {};
  const pains = icp.primary_pains ?? [];
  const triggers = icp.trigger_signals ?? [];
  const committee = icp.buying_committee ?? [];
  const antiIcp = icp.anti_icp ?? [];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface/40">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
              <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5 font-mono">
                S-IC
              </span>
              <span className="text-text-dim">ICP playbook</span>
              {icp.is_active && (
                <span className="rounded-full bg-win-bg text-win px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  Active
                </span>
              )}
              {icp.version != null && (
                <span className="text-text-dim font-mono">v{icp.version}</span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-text leading-snug">
              {icp.segment_name ?? "ICP segment"}
            </h3>
            {icp.one_line_definition && (
              <p className="text-sm text-text-muted leading-relaxed mt-1">
                {icp.one_line_definition}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Firmographics */}
      {!compact && f && Object.keys(f).length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Firmographics
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {f.industries && f.industries.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                  Industries
                </div>
                {chipList(f.industries)}
              </div>
            )}
            {f.employee_range && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                  Employees
                </div>
                <div className="text-text tabular-nums">
                  {f.employee_range.min ?? "—"} – {f.employee_range.max ?? "—"}
                </div>
              </div>
            )}
            {f.revenue_range && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                  Revenue
                </div>
                <div className="text-text tabular-nums">
                  {f.revenue_range.currency ?? "$"}
                  {f.revenue_range.min ?? "—"} – {f.revenue_range.max ?? "—"}
                </div>
              </div>
            )}
            {f.geographies && f.geographies.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                  Geographies
                </div>
                {chipList(f.geographies)}
              </div>
            )}
            {f.growth_stage && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                  Growth stage
                </div>
                <div className="text-text">{f.growth_stage}</div>
              </div>
            )}
            {f.business_model && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                  Business model
                </div>
                <div className="text-text">{f.business_model}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Technographics */}
      {!compact &&
        (t.uses?.length || t.has_in_stack?.length || t.missing?.length) && (
          <div className="px-5 py-4 border-b border-border">
            <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
              Technographics
            </div>
            <div className="space-y-2 text-sm">
              {t.uses && t.uses.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                    Uses
                  </div>
                  {chipList(t.uses)}
                </div>
              )}
              {t.has_in_stack && t.has_in_stack.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                    In stack
                  </div>
                  {chipList(t.has_in_stack)}
                </div>
              )}
              {t.missing && t.missing.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                    Missing
                  </div>
                  {chipList(t.missing, "warn")}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Trigger signals */}
      {triggers.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Trigger signals
          </div>
          <ul className="space-y-1.5 text-sm">
            {triggers.map((t, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-text">{t.event ?? "—"}</span>
                <span className="text-text-dim text-xs tabular-nums">
                  {t.frequency_pct != null && `${t.frequency_pct.toFixed(0)}%`}
                  {t.typical_time_to_buy && ` · ${t.typical_time_to_buy}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary pains */}
      {pains.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Primary pains
          </div>
          <ol className="space-y-2.5">
            {pains.slice(0, compact ? 2 : pains.length).map((p, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-[10px] text-text-dim tabular-nums">
                    {String(p.rank ?? i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-text font-medium">{p.pain ?? "—"}</span>
                  {p.severity && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-text-dim">
                      {p.severity}
                    </span>
                  )}
                </div>
                {p.vocabulary_examples && p.vocabulary_examples.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-6">
                    {p.vocabulary_examples.slice(0, 3).map((v, j) => (
                      <span
                        key={j}
                        className="rounded-full bg-card border border-border text-xs text-text-muted px-2 py-0.5 italic"
                      >
                        &ldquo;{v}&rdquo;
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Buying committee */}
      {!compact && committee.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <div className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Buying committee
            {icp.typical_sales_cycle && (
              <span className="text-text-dim font-normal ml-2 text-[10px]">
                · {icp.typical_sales_cycle}
              </span>
            )}
          </div>
          <ul className="space-y-1.5 text-sm">
            {committee.map((c, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3"
              >
                <div>
                  <span className="text-text font-medium">{c.role ?? "—"}</span>
                  {c.primary_pain_focus && (
                    <span className="text-text-dim ml-2 text-xs">
                      · cares about {c.primary_pain_focus}
                    </span>
                  )}
                </div>
                {c.influence_weight != null && (
                  <span className="text-text-dim text-xs tabular-nums">
                    weight {typeof c.influence_weight === "number" ? c.influence_weight.toFixed(1) : c.influence_weight}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Anti-ICP */}
      {!compact && antiIcp.length > 0 && (
        <div className="px-5 py-4 border-b border-border bg-warn-bg/10">
          <div className="text-xs uppercase tracking-wider text-warn font-semibold mb-2">
            Anti-ICP · who looks right but isn&apos;t
          </div>
          <ul className="space-y-2.5">
            {antiIcp.map((a, i) => (
              <li
                key={i}
                className="rounded-md border border-border/60 bg-card px-3 py-2.5 text-sm"
              >
                <div className="text-text font-medium mb-1">
                  {a.description ?? "—"}
                </div>
                {a.why_excluded && (
                  <p className="text-text-muted text-xs leading-relaxed">
                    <strong className="text-text-dim">Why:</strong>{" "}
                    {a.why_excluded}
                  </p>
                )}
                {a.observable_signal && (
                  <p className="text-text-muted text-xs leading-relaxed mt-1">
                    <strong className="text-text-dim">Tell:</strong>{" "}
                    {a.observable_signal}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lineage + S-PO sync */}
      {!compact && (
        <div className="px-5 py-3 bg-surface/40 border-b border-border text-[11px] text-text-dim grid grid-cols-1 md:grid-cols-2 gap-2">
          {icp.evidence_basis && (
            <div>
              <span className="uppercase tracking-wider mr-1">Built from</span>
              {icp.evidence_basis}
            </div>
          )}
          {icp.spo_refreshed_at && (
            <div className="md:text-right">
              <span className="uppercase tracking-wider mr-1">
                S-PO synced
              </span>
              {icp.spo_refreshed_at.slice(0, 10)}
            </div>
          )}
        </div>
      )}

      {!compact && (
        <ApprovalButtons
          artifactId={icp.id}
          tableName="icp_definitions"
          status={icp.approval_status ?? null}
        />
      )}
    </div>
  );
}
