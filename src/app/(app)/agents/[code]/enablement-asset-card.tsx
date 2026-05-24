import { ApprovalButtons, type ApprovalStatus } from "./approval-buttons";

export type EnablementAsset = {
  id: string;
  asset_type: string | null;
  audience: string | null;
  title: string | null;
  body_markdown: string | null;
  source_refs: string | null;
  last_refreshed_at: string | null;
  freshness_state: string | null;
  version: number | null;
  produced_by: string | null;
  approval_status?: ApprovalStatus | null;
  risk_tier?: string | null;
  created_at?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  objection_handler: "Objection handler",
  qbr_template: "QBR template",
  customer_health_playbook: "Health playbook",
  win_wire: "Win wire",
  expansion_play: "Expansion play",
  renewal_talk_track: "Renewal talk track",
  battlecard: "Battlecard",
  one_pager: "One-pager",
  demo_script: "Demo script",
  onboarding_kit: "Onboarding kit",
  case_study_brief: "Case study brief",
  discovery_question_bank: "Discovery questions",
};

const AUDIENCE_LABEL: Record<string, string> = {
  sales: "Sales",
  customer_success: "CS",
  both: "Sales + CS",
  marketing: "Marketing",
  partner: "Partner",
};

const FRESHNESS_TONE: Record<string, string> = {
  current: "bg-win-bg text-win",
  stale: "bg-warn-bg text-warn",
  regenerating: "bg-accent-bg text-accent",
};

export function EnablementAssetCard({
  asset,
  compact = false,
}: {
  asset: EnablementAsset;
  compact?: boolean;
}) {
  const typeLabel = asset.asset_type
    ? TYPE_LABEL[asset.asset_type] ?? asset.asset_type
    : "—";
  const audienceLabel = asset.audience
    ? AUDIENCE_LABEL[asset.audience] ?? asset.audience
    : "—";
  const freshnessKey = asset.freshness_state ?? "current";
  const freshnessTone = FRESHNESS_TONE[freshnessKey] ?? "bg-card text-text-dim";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {typeLabel}
            </span>
            <span className="text-text-dim">{audienceLabel}</span>
            {asset.version != null && (
              <span className="text-text-dim font-mono">v{asset.version}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {asset.title ?? "Untitled asset"}
          </h3>
        </div>
        <span
          className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${freshnessTone}`}
        >
          {freshnessKey}
        </span>
      </div>
      {asset.body_markdown && (
        <p
          className={`text-sm text-text-muted leading-relaxed whitespace-pre-line mb-2 ${compact ? "line-clamp-4" : ""}`}
        >
          {asset.body_markdown}
        </p>
      )}
      {!compact && asset.source_refs && (
        <div className="border-l-2 border-accent pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Synthesized from
          </div>
          <p className="text-xs text-text-muted leading-relaxed">{asset.source_refs}</p>
        </div>
      )}
      {!compact && (
        <ApprovalButtons
          artifactId={asset.id}
          tableName="enablement_assets"
          status={asset.approval_status ?? null}
        />
      )}
    </div>
  );
}
