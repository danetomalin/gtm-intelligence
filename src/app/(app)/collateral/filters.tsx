"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Counts = {
  all: number;
  // Top-level source counts
  messaging: number;
  sales_collateral: number;
  counter_narrative: number;
  enablement: number;
  deployment_fork: number;
  // Enablement sub-types (selected via source filter values)
  objection_handler: number;
  qbr_template: number;
  customer_health_playbook: number;
  win_wire: number;
  expansion_play: number;
  renewal_talk_track: number;
  // Enablement audience + freshness
  sales: number;
  customer_success: number;
  current: number;
  stale: number;
};

export function CollateralLibraryFilters({
  sourceFilter,
  audienceFilter,
  freshnessFilter,
  counts,
}: {
  sourceFilter: string;
  audienceFilter: string;
  freshnessFilter: string;
  counts: Counts;
}) {
  function urlFor(source: string, audience: string, freshness: string) {
    const params = new URLSearchParams();
    if (source !== "all") params.set("source", source);
    if (audience !== "all") params.set("audience", audience);
    if (freshness !== "all") params.set("freshness", freshness);
    const qs = params.toString();
    return qs ? `/collateral?${qs}` : "/collateral";
  }

  // Enablement audience + freshness only apply when an enablement asset type
  // is selected. Hide those rows otherwise to keep the UI cleaner.
  const showEnablementSubFilters =
    sourceFilter === "all" ||
    sourceFilter === "enablement" ||
    [
      "objection_handler",
      "qbr_template",
      "customer_health_playbook",
      "win_wire",
      "expansion_play",
      "renewal_talk_track",
    ].includes(sourceFilter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Source
        </span>
        <FilterPill
          label={`All (${counts.all})`}
          href={urlFor("all", audienceFilter, freshnessFilter)}
          active={sourceFilter === "all"}
        />
        <FilterPill
          label={`Messaging (${counts.messaging})`}
          href={urlFor("messaging", audienceFilter, freshnessFilter)}
          active={sourceFilter === "messaging"}
        />
        <FilterPill
          label={`Sales narrative (${counts.sales_collateral})`}
          href={urlFor("sales_collateral", audienceFilter, freshnessFilter)}
          active={sourceFilter === "sales_collateral"}
        />
        <FilterPill
          label={`Counter-narrative (${counts.counter_narrative})`}
          href={urlFor("counter_narrative", audienceFilter, freshnessFilter)}
          active={sourceFilter === "counter_narrative"}
        />
        <FilterPill
          label={`Enablement (${counts.enablement})`}
          href={urlFor("enablement", audienceFilter, freshnessFilter)}
          active={sourceFilter === "enablement"}
        />
        <FilterPill
          label={`Deployment forks (${counts.deployment_fork})`}
          href={urlFor("deployment_fork", audienceFilter, freshnessFilter)}
          active={sourceFilter === "deployment_fork"}
        />
      </div>

      {showEnablementSubFilters && counts.enablement > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
            Enablement type
          </span>
          <FilterPill
            label={`Objection (${counts.objection_handler})`}
            href={urlFor("objection_handler", audienceFilter, freshnessFilter)}
            active={sourceFilter === "objection_handler"}
          />
          <FilterPill
            label={`QBR (${counts.qbr_template})`}
            href={urlFor("qbr_template", audienceFilter, freshnessFilter)}
            active={sourceFilter === "qbr_template"}
          />
          <FilterPill
            label={`Health playbook (${counts.customer_health_playbook})`}
            href={urlFor("customer_health_playbook", audienceFilter, freshnessFilter)}
            active={sourceFilter === "customer_health_playbook"}
          />
          <FilterPill
            label={`Win wire (${counts.win_wire})`}
            href={urlFor("win_wire", audienceFilter, freshnessFilter)}
            active={sourceFilter === "win_wire"}
          />
          <FilterPill
            label={`Expansion (${counts.expansion_play})`}
            href={urlFor("expansion_play", audienceFilter, freshnessFilter)}
            active={sourceFilter === "expansion_play"}
          />
          <FilterPill
            label={`Renewal (${counts.renewal_talk_track})`}
            href={urlFor("renewal_talk_track", audienceFilter, freshnessFilter)}
            active={sourceFilter === "renewal_talk_track"}
          />
        </div>
      )}

      {showEnablementSubFilters && counts.enablement > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
            Audience
          </span>
          <FilterPill
            label="All"
            href={urlFor(sourceFilter, "all", freshnessFilter)}
            active={audienceFilter === "all"}
          />
          <FilterPill
            label={`Sales (${counts.sales})`}
            href={urlFor(sourceFilter, "sales", freshnessFilter)}
            active={audienceFilter === "sales"}
          />
          <FilterPill
            label={`CS (${counts.customer_success})`}
            href={urlFor(sourceFilter, "customer_success", freshnessFilter)}
            active={audienceFilter === "customer_success"}
          />
        </div>
      )}

      {showEnablementSubFilters && counts.enablement > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
            Freshness
          </span>
          <FilterPill
            label="All"
            href={urlFor(sourceFilter, audienceFilter, "all")}
            active={freshnessFilter === "all"}
          />
          <FilterPill
            label={`Current (${counts.current})`}
            href={urlFor(sourceFilter, audienceFilter, "current")}
            active={freshnessFilter === "current"}
            tone="win"
          />
          <FilterPill
            label={`Stale (${counts.stale})`}
            href={urlFor(sourceFilter, audienceFilter, "stale")}
            active={freshnessFilter === "stale"}
            tone="warn"
          />
        </div>
      )}
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
  tone?: "win" | "warn";
}) {
  const activeTone =
    tone === "win"
      ? "bg-win-bg text-win"
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
