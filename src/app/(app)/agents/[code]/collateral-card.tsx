import { ApprovalButtons, type ApprovalStatus } from "./approval-buttons";

export type SalesCollateral = {
  id: string;
  collateral_type: string | null;
  target_account: string | null;
  target_segment: string | null;
  competitors: string | null;
  content: string | null;
  positioning_refs: string | null;
  messaging_refs: string | null;
  source_data_date: string | null;
  stale_flag: boolean | null;
  approval_status?: ApprovalStatus | null;
  created_at?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  narrative_arc: "5-Act Narrative",
  one_pager: "One-pager",
  sko_outline: "SKO Outline",
  exec_briefing: "Exec Briefing",
  discovery_call_guide: "Discovery Guide",
  board_update: "Board Update",
};

export function CollateralCard({
  piece,
  compact = false,
}: {
  piece: SalesCollateral;
  compact?: boolean;
}) {
  const typeLabel = piece.collateral_type
    ? TYPE_LABEL[piece.collateral_type] ?? piece.collateral_type
    : "—";
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {typeLabel}
            </span>
            {piece.target_segment && (
              <span className="text-text-dim">{piece.target_segment}</span>
            )}
          </div>
          {piece.target_account && (
            <h3 className="text-base font-semibold text-text leading-snug">
              {piece.target_account}
            </h3>
          )}
        </div>
        {piece.stale_flag && (
          <span className="flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-warn-bg text-warn">
            Stale
          </span>
        )}
      </div>
      {piece.content && (
        <p className={`text-sm text-text-muted leading-relaxed whitespace-pre-line ${compact ? "line-clamp-4" : ""}`}>
          {piece.content}
        </p>
      )}
      {!compact && piece.positioning_refs && (
        <div className="border-l-2 border-accent pl-3 mt-3">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Positioning anchors
          </div>
          <p className="text-sm text-text leading-relaxed">{piece.positioning_refs}</p>
        </div>
      )}
      {!compact && (
        <ApprovalButtons
          artifactId={piece.id}
          tableName="sales_collateral"
          status={piece.approval_status ?? null}
        />
      )}
    </div>
  );
}
