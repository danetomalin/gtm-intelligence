import { InlineMd } from "@/lib/inline-md";

export type AnalystBriefing = {
  id: string;
  analyst_firm: string | null;
  analyst_name: string | null;
  briefing_date: string | null;
  briefing_type: string | null;
  key_messages: string | null;
  proof_points: string | null;
  competitor_framing: string | null;
  questions_likely: string | null;
  positioning_anchor: string | null;
  sources: string | null;
  created_at?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  initial: "Initial briefing",
  update: "Update",
  inquiry: "Inquiry",
  quadrant_input: "Magic Quadrant input",
  wave_input: "Wave input",
};

export function AnalystBriefingCard({
  briefing,
  compact = false,
}: {
  briefing: AnalystBriefing;
  compact?: boolean;
}) {
  const typeLabel = briefing.briefing_type
    ? TYPE_LABEL[briefing.briefing_type] ?? briefing.briefing_type
    : "—";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {typeLabel}
            </span>
            {briefing.briefing_date && (
              <span className="text-text-dim">{briefing.briefing_date}</span>
            )}
            {briefing.analyst_name && (
              <span className="text-text-dim">· {briefing.analyst_name}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {briefing.analyst_firm ?? "Analyst briefing"}
          </h3>
        </div>
      </div>
      {briefing.key_messages && (
        <p
          className={`text-sm text-text leading-relaxed mb-3 ${compact ? "line-clamp-3" : ""}`}
        >
          <InlineMd>{briefing.key_messages}</InlineMd>
        </p>
      )}
      {!compact && briefing.proof_points && (
        <div className="border-l-2 border-accent pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Proof points
          </div>
          <p className="text-sm text-text leading-relaxed">
            <InlineMd>{briefing.proof_points}</InlineMd>
          </p>
        </div>
      )}
      {!compact && briefing.competitor_framing && (
        <div className="border-l-2 border-warn pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-warn font-semibold mb-1">
            Competitor framing
          </div>
          <p className="text-sm text-text leading-relaxed">
            <InlineMd>{briefing.competitor_framing}</InlineMd>
          </p>
        </div>
      )}
      {!compact && briefing.questions_likely && (
        <div className="border-l-2 border-text-dim pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
            Likely questions
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            <InlineMd>{briefing.questions_likely}</InlineMd>
          </p>
        </div>
      )}
    </div>
  );
}
