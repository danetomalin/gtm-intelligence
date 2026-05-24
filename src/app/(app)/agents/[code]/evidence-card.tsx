export type CustomerEvidence = {
  id: string;
  customer_name: string | null;
  customer_segment: string | null;
  evidence_type: string | null;
  content: string | null;
  attribution: string | null;
  evidence_date: string | null;
  positioning_alignment: string | null;
  legal_status: string | null;
  sources: string | null;
  created_at?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  quote: "Quote",
  case_study: "Case study",
  metric: "Metric",
  nps_verbatim: "NPS verbatim",
  review: "Review",
  reference_call_note: "Reference call",
};

const LEGAL_TONE: Record<string, string> = {
  approved: "bg-win-bg text-win",
  pending_legal: "bg-warn-bg text-warn",
  anonymize_only: "bg-warn-bg text-warn",
  do_not_use: "bg-danger-bg text-danger",
};

const LEGAL_LABEL: Record<string, string> = {
  approved: "Cleared",
  pending_legal: "Pending legal",
  anonymize_only: "Anonymize",
  do_not_use: "Do not use",
};

export function EvidenceCard({
  evidence,
  compact = false,
}: {
  evidence: CustomerEvidence;
  compact?: boolean;
}) {
  const typeLabel = evidence.evidence_type
    ? TYPE_LABEL[evidence.evidence_type] ?? evidence.evidence_type
    : "—";
  const legalKey = evidence.legal_status ?? "pending_legal";
  const legalLabel = LEGAL_LABEL[legalKey] ?? legalKey;
  const legalTone = LEGAL_TONE[legalKey] ?? "bg-card text-text-dim";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {typeLabel}
            </span>
            {evidence.customer_segment && (
              <span className="text-text-dim">{evidence.customer_segment}</span>
            )}
            {evidence.evidence_date && (
              <span className="text-text-dim">· {evidence.evidence_date}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {evidence.customer_name ?? "Anonymous customer"}
          </h3>
        </div>
        <span
          className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${legalTone}`}
        >
          {legalLabel}
        </span>
      </div>
      {evidence.content && (
        <p
          className={`text-sm text-text leading-relaxed italic mb-2 ${compact ? "line-clamp-3" : ""}`}
        >
          &ldquo;{evidence.content}&rdquo;
        </p>
      )}
      {evidence.attribution && (
        <p className="text-xs text-text-dim mb-2">— {evidence.attribution}</p>
      )}
      {!compact && evidence.positioning_alignment && (
        <div className="border-l-2 border-accent pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Supports
          </div>
          <p className="text-sm text-text leading-relaxed">
            {evidence.positioning_alignment}
          </p>
        </div>
      )}
    </div>
  );
}
