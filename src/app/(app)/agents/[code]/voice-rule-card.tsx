export type VoiceRule = {
  id: string;
  rule_type: string | null;
  rule: string | null;
  rationale: string | null;
  example_before: string | null;
  example_after: string | null;
  sources: string | null;
  created_at?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  tone: "Tone",
  banned_phrase: "Banned",
  preferred_term: "Preferred",
  formatting: "Formatting",
  do_not_say: "Don't say",
  always_say: "Always say",
  reading_level: "Reading level",
};

const TYPE_TONE: Record<string, string> = {
  banned_phrase: "bg-danger-bg text-danger",
  do_not_say: "bg-danger-bg text-danger",
  preferred_term: "bg-win-bg text-win",
  always_say: "bg-win-bg text-win",
  tone: "bg-accent-bg text-accent",
  formatting: "bg-card text-text-dim",
  reading_level: "bg-card text-text-dim",
};

export function VoiceRuleCard({
  rule,
  compact = false,
}: {
  rule: VoiceRule;
  compact?: boolean;
}) {
  const typeKey = rule.rule_type ?? "tone";
  const typeLabel = TYPE_LABEL[typeKey] ?? typeKey;
  const typeTone = TYPE_TONE[typeKey] ?? "bg-card text-text-dim";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start gap-3 mb-2">
        <span
          className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 mt-0.5 ${typeTone}`}
        >
          {typeLabel}
        </span>
        <p className="text-sm text-text leading-relaxed font-medium flex-1">
          {rule.rule}
        </p>
      </div>
      {!compact && rule.rationale && (
        <p className="text-xs text-text-muted leading-relaxed pl-[4.25rem] mb-2">
          {rule.rationale}
        </p>
      )}
      {!compact && (rule.example_before || rule.example_after) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pl-[4.25rem]">
          {rule.example_before && (
            <div className="rounded-md border border-danger/30 bg-danger-bg/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-danger font-semibold mb-1">
                Before
              </div>
              <p className="text-xs text-text leading-relaxed italic">
                {rule.example_before}
              </p>
            </div>
          )}
          {rule.example_after && (
            <div className="rounded-md border border-win/30 bg-win-bg/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-win font-semibold mb-1">
                After
              </div>
              <p className="text-xs text-text leading-relaxed italic">
                {rule.example_after}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
