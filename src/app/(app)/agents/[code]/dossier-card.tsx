export type Dossier = {
  id: string;
  competitor_name: string | null;
  run_date: string | null;
  strategic_move: string | null;
  messaging_drift: string | null;
  pricing_intelligence: string | null;
  product_signals: string | null;
  talent_signals: string | null;
  competitive_landmines: string | null;
  risk_assessment: string | null;
  risk_justification: string | null;
  sources: string | null;
  created_at?: string | null;
};

const SECTIONS: { key: keyof Dossier; label: string }[] = [
  { key: "strategic_move", label: "Strategic move" },
  { key: "messaging_drift", label: "Messaging drift" },
  { key: "pricing_intelligence", label: "Pricing intelligence" },
  { key: "product_signals", label: "Product signals" },
  { key: "talent_signals", label: "Talent signals" },
  { key: "competitive_landmines", label: "Competitive landmines" },
];

export function DossierCard({
  dossier,
  compact = false,
}: {
  dossier: Dossier;
  compact?: boolean;
}) {
  const riskTone =
    dossier.risk_assessment === "HIGH"
      ? "bg-danger-bg text-danger"
      : dossier.risk_assessment === "MEDIUM"
        ? "bg-warn-bg text-warn"
        : dossier.risk_assessment === "LOW"
          ? "bg-win-bg text-win"
          : "bg-white/5 text-text-muted";

  const visibleSections = compact ? SECTIONS.slice(0, 2) : SECTIONS;

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-text-dim mb-1">
            {dossier.run_date ?? "—"}
          </div>
          <h3 className="text-lg font-semibold text-text leading-snug">
            {dossier.competitor_name}
          </h3>
        </div>
        <div className="flex-shrink-0">
          {dossier.risk_assessment && (
            <span
              className={`rounded-full text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 ${riskTone}`}
            >
              {dossier.risk_assessment} risk
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {visibleSections.map((section) => {
          const value = dossier[section.key];
          if (!value || typeof value !== "string" || !value.trim()) return null;
          return (
            <div key={section.key}>
              <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                {section.label}
              </div>
              <p className="text-sm text-text leading-relaxed whitespace-pre-line">
                {value}
              </p>
            </div>
          );
        })}

        {!compact && dossier.risk_justification && (
          <div className="border-l-2 border-accent pl-3 mt-3">
            <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
              Risk rationale
            </div>
            <p className="text-sm text-text leading-relaxed">
              {dossier.risk_justification}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
