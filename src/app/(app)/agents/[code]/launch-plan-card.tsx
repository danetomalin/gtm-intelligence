export type LaunchPlan = {
  id: string;
  launch_name: string | null;
  launch_type: string | null;
  launch_date_target: string | null;
  target_personas: string | null;
  messaging_pillars: string | null;
  channel_plan: string | null;
  success_metrics: string | null;
  positioning_anchor: string | null;
  sources: string | null;
  created_at?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  feature: "Feature launch",
  product: "Product launch",
  announcement: "Announcement",
  rebrand: "Rebrand",
  pricing_change: "Pricing change",
  partnership: "Partnership",
};

export function LaunchPlanCard({
  plan,
  compact = false,
}: {
  plan: LaunchPlan;
  compact?: boolean;
}) {
  const typeLabel = plan.launch_type
    ? TYPE_LABEL[plan.launch_type] ?? plan.launch_type
    : "—";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {typeLabel}
            </span>
            {plan.launch_date_target && (
              <span className="text-text-dim">Target {plan.launch_date_target}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {plan.launch_name ?? "Untitled launch"}
          </h3>
        </div>
      </div>
      {plan.messaging_pillars && (
        <div className="border-l-2 border-accent pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Messaging pillars
          </div>
          <p className={`text-sm text-text leading-relaxed whitespace-pre-line ${compact ? "line-clamp-3" : ""}`}>
            {plan.messaging_pillars}
          </p>
        </div>
      )}
      {!compact && plan.target_personas && (
        <div className="border-l-2 border-text-dim pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
            Target personas
          </div>
          <p className="text-sm text-text-muted leading-relaxed">{plan.target_personas}</p>
        </div>
      )}
      {!compact && plan.channel_plan && (
        <div className="border-l-2 border-text-dim pl-3 mt-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
            Channel plan
          </div>
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
            {plan.channel_plan}
          </p>
        </div>
      )}
      {!compact && plan.success_metrics && (
        <div className="border-l-2 border-win pl-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-win font-semibold mb-1">
            Success metrics
          </div>
          <p className="text-sm text-text leading-relaxed">{plan.success_metrics}</p>
        </div>
      )}
    </div>
  );
}
