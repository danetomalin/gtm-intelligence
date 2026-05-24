export type ProofPoint = {
  id: string;
  proof_type: string | null;
  claim: string | null;
  attribution: string | null;
  customer_name: string | null;
  customer_segment: string | null;
  positioning_alignment: string | null;
  legal_status: string | null;
  sources: string | null;
  created_at?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  metric: "Metric",
  customer_quote: "Customer quote",
  case_study_excerpt: "Case study",
  third_party_validation: "3rd-party",
  award: "Award",
  certification: "Certification",
};

const LEGAL_TONE: Record<string, string> = {
  approved: "bg-win-bg text-win",
  pending_legal: "bg-warn-bg text-warn",
  anonymize_only: "bg-warn-bg text-warn",
  do_not_use: "bg-danger-bg text-danger",
};

const LEGAL_LABEL: Record<string, string> = {
  approved: "Cleared",
  pending_legal: "Pending",
  anonymize_only: "Anonymize",
  do_not_use: "Do not use",
};

export function ProofPointCard({
  point,
  compact = false,
}: {
  point: ProofPoint;
  compact?: boolean;
}) {
  const typeKey = point.proof_type ?? "metric";
  const typeLabel = TYPE_LABEL[typeKey] ?? typeKey;
  const legalKey = point.legal_status ?? "pending_legal";
  const legalLabel = LEGAL_LABEL[legalKey] ?? legalKey;
  const legalTone = LEGAL_TONE[legalKey] ?? "bg-card text-text-dim";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider">
          <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
            {typeLabel}
          </span>
          {point.customer_segment && (
            <span className="text-text-dim">{point.customer_segment}</span>
          )}
        </div>
        <span
          className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${legalTone}`}
        >
          {legalLabel}
        </span>
      </div>
      {point.claim && (
        <p
          className={`text-base text-text leading-relaxed font-medium mb-2 ${compact ? "line-clamp-2" : ""}`}
        >
          {point.proof_type === "customer_quote" ||
          point.proof_type === "case_study_excerpt"
            ? `“${point.claim}”`
            : point.claim}
        </p>
      )}
      {(point.attribution || point.customer_name) && (
        <p className="text-xs text-text-dim">
          — {point.attribution || point.customer_name}
        </p>
      )}
      {!compact && point.positioning_alignment && (
        <div className="border-l-2 border-accent pl-3 mt-3">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Supports
          </div>
          <p className="text-sm text-text leading-relaxed">
            {point.positioning_alignment}
          </p>
        </div>
      )}
    </div>
  );
}
