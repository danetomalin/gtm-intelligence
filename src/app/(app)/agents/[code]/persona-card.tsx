export type BuyerPersona = {
  id: string;
  persona_name: string | null;
  title: string | null;
  segment: string | null;
  pain_points: string | null;
  goals: string | null;
  triggers: string | null;
  watering_holes: string | null;
  decision_criteria: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function PersonaCard({
  persona,
  compact = false,
}: {
  persona: BuyerPersona;
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start gap-4 mb-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-bg text-accent flex items-center justify-center text-sm font-mono font-semibold">
          {(persona.persona_name ?? "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text leading-snug">
            {persona.persona_name ?? "Unnamed persona"}
          </h3>
          {(persona.title || persona.segment) && (
            <div className="text-xs text-text-dim mt-0.5">
              {persona.title}
              {persona.title && persona.segment ? " · " : ""}
              {persona.segment}
            </div>
          )}
        </div>
      </div>
      {persona.pain_points && (
        <div className="border-l-2 border-danger pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-danger font-semibold mb-1">
            Pain points
          </div>
          <p
            className={`text-sm text-text leading-relaxed ${compact ? "line-clamp-2" : ""}`}
          >
            {persona.pain_points}
          </p>
        </div>
      )}
      {!compact && persona.goals && (
        <div className="border-l-2 border-accent pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Goals
          </div>
          <p className="text-sm text-text leading-relaxed">{persona.goals}</p>
        </div>
      )}
      {!compact && persona.triggers && (
        <div className="border-l-2 border-warn pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-warn font-semibold mb-1">
            Triggers
          </div>
          <p className="text-sm text-text leading-relaxed">{persona.triggers}</p>
        </div>
      )}
      {!compact && persona.decision_criteria && (
        <div className="border-l-2 border-text-dim pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
            Decision criteria
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            {persona.decision_criteria}
          </p>
        </div>
      )}
    </div>
  );
}
