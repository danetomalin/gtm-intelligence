"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Counts = {
  all: number;
  objection_handler: number;
  qbr_template: number;
  customer_health_playbook: number;
  win_wire: number;
  expansion_play: number;
  renewal_talk_track: number;
  sales: number;
  customer_success: number;
  current: number;
  stale: number;
};

export function CollateralLibraryFilters({
  typeFilter,
  audienceFilter,
  freshnessFilter,
  counts,
}: {
  typeFilter: string;
  audienceFilter: string;
  freshnessFilter: string;
  counts: Counts;
}) {
  function urlFor(type: string, audience: string, freshness: string) {
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (audience !== "all") params.set("audience", audience);
    if (freshness !== "all") params.set("freshness", freshness);
    const qs = params.toString();
    return qs ? `/collateral?${qs}` : "/collateral";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Asset
        </span>
        <FilterPill
          label={`All (${counts.all})`}
          href={urlFor("all", audienceFilter, freshnessFilter)}
          active={typeFilter === "all"}
        />
        <FilterPill
          label={`Objection (${counts.objection_handler})`}
          href={urlFor("objection_handler", audienceFilter, freshnessFilter)}
          active={typeFilter === "objection_handler"}
        />
        <FilterPill
          label={`QBR (${counts.qbr_template})`}
          href={urlFor("qbr_template", audienceFilter, freshnessFilter)}
          active={typeFilter === "qbr_template"}
        />
        <FilterPill
          label={`Health playbook (${counts.customer_health_playbook})`}
          href={urlFor("customer_health_playbook", audienceFilter, freshnessFilter)}
          active={typeFilter === "customer_health_playbook"}
        />
        <FilterPill
          label={`Win wire (${counts.win_wire})`}
          href={urlFor("win_wire", audienceFilter, freshnessFilter)}
          active={typeFilter === "win_wire"}
        />
        <FilterPill
          label={`Expansion (${counts.expansion_play})`}
          href={urlFor("expansion_play", audienceFilter, freshnessFilter)}
          active={typeFilter === "expansion_play"}
        />
        <FilterPill
          label={`Renewal (${counts.renewal_talk_track})`}
          href={urlFor("renewal_talk_track", audienceFilter, freshnessFilter)}
          active={typeFilter === "renewal_talk_track"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Audience
        </span>
        <FilterPill
          label="All"
          href={urlFor(typeFilter, "all", freshnessFilter)}
          active={audienceFilter === "all"}
        />
        <FilterPill
          label={`Sales (${counts.sales})`}
          href={urlFor(typeFilter, "sales", freshnessFilter)}
          active={audienceFilter === "sales"}
        />
        <FilterPill
          label={`CS (${counts.customer_success})`}
          href={urlFor(typeFilter, "customer_success", freshnessFilter)}
          active={audienceFilter === "customer_success"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Freshness
        </span>
        <FilterPill
          label="All"
          href={urlFor(typeFilter, audienceFilter, "all")}
          active={freshnessFilter === "all"}
        />
        <FilterPill
          label={`Current (${counts.current})`}
          href={urlFor(typeFilter, audienceFilter, "current")}
          active={freshnessFilter === "current"}
          tone="win"
        />
        <FilterPill
          label={`Stale (${counts.stale})`}
          href={urlFor(typeFilter, audienceFilter, "stale")}
          active={freshnessFilter === "stale"}
          tone="warn"
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
