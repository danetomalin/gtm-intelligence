export type PositioningElement = {
  id: string;
  element_type: string | null;
  content: string | null;
  evidence: string | null;
  last_change_reason: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const ELEMENT_LABEL: Record<string, { label: string; order: number }> = {
  competitive_alternatives: { label: "Competitive alternatives", order: 1 },
  distinct_capabilities: { label: "Distinct capabilities", order: 2 },
  differentiated_value: { label: "Differentiated value", order: 3 },
  best_fit_accounts: { label: "Best-fit accounts", order: 4 },
  market_category: { label: "Market category", order: 5 },
};

export function PositioningElementCard({
  element,
  index,
}: {
  element: PositioningElement;
  index?: number;
}) {
  const meta = element.element_type
    ? ELEMENT_LABEL[element.element_type]
    : undefined;
  const label = meta?.label ?? element.element_type ?? "Element";
  const order = index ?? meta?.order ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-5">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-bg text-accent flex items-center justify-center text-sm font-mono font-semibold">
          0{order}
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-[1.5px] text-accent font-semibold mb-1">
              {label}
            </div>
            {element.content && (
              <p className="text-base text-text leading-relaxed">
                {element.content}
              </p>
            )}
          </div>
          {element.evidence && (
            <div className="border-t border-border pt-3">
              <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                Evidence
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                {element.evidence}
              </p>
            </div>
          )}
          {element.last_change_reason && (
            <div className="border-l-2 border-accent pl-3">
              <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
                Last change
              </div>
              <p className="text-sm text-text leading-relaxed">
                {element.last_change_reason}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function sortPositioningElements(
  elements: PositioningElement[],
): PositioningElement[] {
  return [...elements].sort((a, b) => {
    const aOrder = ELEMENT_LABEL[a.element_type ?? ""]?.order ?? 99;
    const bOrder = ELEMENT_LABEL[b.element_type ?? ""]?.order ?? 99;
    return aOrder - bOrder;
  });
}

export function dedupeLatestPerType(
  elements: PositioningElement[],
): PositioningElement[] {
  // elements come in created_at DESC. First occurrence per element_type is the latest.
  const seen = new Set<string>();
  const out: PositioningElement[] = [];
  for (const e of elements) {
    const t = e.element_type ?? "";
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(e);
    }
  }
  return out;
}
