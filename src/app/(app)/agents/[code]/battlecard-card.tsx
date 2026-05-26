import { InlineMd } from "@/lib/inline-md";

export type Battlecard = {
  id: string;
  competitor_name: string | null;
  elevator_pitch: string | null;
  value_prop: string | null;
  features_benefits: string | null;
  target_personas: string | null;
  pain_points: string | null;
  qualifying_questions: string | null;
  competitor_profile: string | null;
  competitor_strengths: string | null;
  competitor_weaknesses: string | null;
  kill_points: string | null;
  objections: string | null;
  success_stories: string | null;
  created_at?: string | null;
};

const SECTIONS: { key: keyof Battlecard; label: string; accent?: boolean }[] = [
  { key: "elevator_pitch", label: "Elevator pitch", accent: true },
  { key: "value_prop", label: "Value prop" },
  { key: "target_personas", label: "Target buyer" },
  { key: "pain_points", label: "Pain points" },
  { key: "qualifying_questions", label: "Qualifying questions" },
  { key: "competitor_profile", label: "Competitor profile" },
  { key: "competitor_strengths", label: "Their strengths" },
  { key: "competitor_weaknesses", label: "Their weaknesses" },
  { key: "kill_points", label: "Where we win", accent: true },
  { key: "objections", label: "Objection handling", accent: true },
];

export function BattlecardCard({
  card,
  compact = false,
}: {
  card: Battlecard;
  compact?: boolean;
}) {
  const visibleSections = compact ? SECTIONS.slice(0, 3) : SECTIONS;
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[1.5px] text-accent font-semibold mb-1">
          vs. {card.competitor_name}
        </div>
        <h3 className="text-lg font-semibold text-text leading-snug">
          <InlineMd>{card.elevator_pitch}</InlineMd>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleSections.slice(1).map((section) => {
          const value = card[section.key];
          if (!value || typeof value !== "string" || !value.trim()) return null;
          return (
            <div
              key={section.key}
              className={
                section.accent
                  ? "rounded-md border border-accent/30 bg-accent-bg/30 px-3 py-3"
                  : "rounded-md border border-border bg-surface/40 px-3 py-3"
              }
            >
              <div
                className={
                  section.accent
                    ? "text-[10px] uppercase tracking-wider text-accent font-semibold mb-1"
                    : "text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1"
                }
              >
                {section.label}
              </div>
              <p className="text-sm text-text leading-relaxed">
                <InlineMd>{value}</InlineMd>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
