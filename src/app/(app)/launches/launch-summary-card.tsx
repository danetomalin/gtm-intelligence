import Link from "next/link";
import { TIER_LABEL, type LaunchTier } from "@/lib/launch-tiers";

export type LaunchSummary = {
  id: string;
  name: string;
  tier: LaunchTier;
  product_summary: string | null;
  launch_date_target: string | null;
  status: string;
  readiness_produced: number;
  readiness_required: number;
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-card text-text-dim",
  in_progress: "bg-warn-bg text-warn",
  ready: "bg-accent-bg text-accent",
  shipped: "bg-win-bg text-win",
  post_mortem: "bg-accent-bg text-accent",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_progress: "In progress",
  ready: "Ready",
  shipped: "Shipped",
  post_mortem: "Post-mortem",
};

export function LaunchSummaryCard({ launch }: { launch: LaunchSummary }) {
  const pct =
    launch.readiness_required > 0
      ? Math.round((launch.readiness_produced / launch.readiness_required) * 100)
      : 0;
  const statusKey = launch.status ?? "draft";
  return (
    <Link
      href={`/launches/${launch.id}`}
      className="block rounded-lg border border-border bg-card px-5 py-4 hover:border-text-dim transition"
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {TIER_LABEL[launch.tier]}
            </span>
            {launch.launch_date_target && (
              <span className="text-text-dim">{launch.launch_date_target}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {launch.name}
          </h3>
        </div>
        <span
          className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${STATUS_TONE[statusKey] ?? "bg-card text-text-dim"}`}
        >
          {STATUS_LABEL[statusKey] ?? statusKey}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-text-muted tabular-nums">
          {launch.readiness_produced} / {launch.readiness_required} ({pct}%)
        </span>
      </div>
    </Link>
  );
}
