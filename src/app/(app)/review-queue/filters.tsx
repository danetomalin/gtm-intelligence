"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Counts = {
  all: number;
  messaging: number;
  collateral: number;
  counter_narrative: number;
  icp_cohort: number;
  high: number;
  medium: number;
  low: number;
};

export function ReviewQueueFilters({
  artifactFilter,
  tierFilter,
  counts,
}: {
  artifactFilter: string;
  tierFilter: string;
  counts: Counts;
}) {
  function urlFor(artifact: string, tier: string) {
    const params = new URLSearchParams();
    if (artifact !== "all") params.set("artifact", artifact);
    if (tier !== "all") params.set("tier", tier);
    const qs = params.toString();
    return qs ? `/review-queue?${qs}` : "/review-queue";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Artifact
        </span>
        <FilterPill
          label={`All (${counts.all})`}
          href={urlFor("all", tierFilter)}
          active={artifactFilter === "all"}
        />
        <FilterPill
          label={`Messaging (${counts.messaging})`}
          href={urlFor("messaging", tierFilter)}
          active={artifactFilter === "messaging"}
        />
        <FilterPill
          label={`Sales collateral (${counts.collateral})`}
          href={urlFor("collateral", tierFilter)}
          active={artifactFilter === "collateral"}
        />
        <FilterPill
          label={`Counter-narrative (${counts.counter_narrative})`}
          href={urlFor("counter_narrative", tierFilter)}
          active={artifactFilter === "counter_narrative"}
        />
        <FilterPill
          label={`ICP cohort (${counts.icp_cohort})`}
          href={urlFor("icp_cohort", tierFilter)}
          active={artifactFilter === "icp_cohort"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Risk tier
        </span>
        <FilterPill
          label="All"
          href={urlFor(artifactFilter, "all")}
          active={tierFilter === "all"}
        />
        <FilterPill
          label={`High (${counts.high})`}
          href={urlFor(artifactFilter, "high")}
          active={tierFilter === "high"}
          tone="danger"
        />
        <FilterPill
          label={`Medium (${counts.medium})`}
          href={urlFor(artifactFilter, "medium")}
          active={tierFilter === "medium"}
          tone="warn"
        />
        <FilterPill
          label={`Low (${counts.low})`}
          href={urlFor(artifactFilter, "low")}
          active={tierFilter === "low"}
          tone="win"
        />
      </div>
    </div>
  );
}

function FilterPill({
  label,
  href,
  active,
  tone,
}: {
  label: string;
  href: string;
  active: boolean;
  tone?: "win" | "danger" | "warn";
}) {
  const activeTone =
    tone === "win"
      ? "bg-win-bg text-win"
      : tone === "danger"
        ? "bg-danger-bg text-danger"
        : tone === "warn"
          ? "bg-warn-bg text-warn"
          : "bg-accent-bg text-accent";
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition border",
        active
          ? `${activeTone} border-transparent`
          : "bg-card border-border text-text-muted hover:text-text hover:border-text-dim",
      )}
    >
      {label}
    </Link>
  );
}
