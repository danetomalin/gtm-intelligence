"use client";

import { useMemo, useState } from "react";
import { RoadmapCard, type RoadmapItem } from "./roadmap-card";
import { cn } from "@/lib/utils";

type RecFilter = "all" | "build" | "investigate" | "defer" | "kill";

export function PastRoadmapArchive({ items }: { items: RoadmapItem[] }) {
  const [rec, setRec] = useState<RecFilter>("all");

  const counts = useMemo(() => {
    const c = { build: 0, investigate: 0, defer: 0, kill: 0 } as Record<string, number>;
    for (const it of items) {
      const r = it.recommendation ?? "";
      if (r in c) c[r] += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter((it) => {
        if (rec !== "all" && it.recommendation !== rec) return false;
        return true;
      }),
    [items, rec],
  );

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
        No past roadmap items yet. Run A3 a few times to accumulate the archive.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Recommendation
        </span>
        <FilterPill label={`All (${items.length})`} active={rec === "all"} onClick={() => setRec("all")} />
        <FilterPill label={`Build (${counts.build})`} active={rec === "build"} onClick={() => setRec("build")} tone="win" />
        <FilterPill label={`Investigate (${counts.investigate})`} active={rec === "investigate"} onClick={() => setRec("investigate")} tone="accent" />
        <FilterPill label={`Defer (${counts.defer})`} active={rec === "defer"} onClick={() => setRec("defer")} tone="warn" />
        <FilterPill label={`Kill (${counts.kill})`} active={rec === "kill"} onClick={() => setRec("kill")} tone="danger" />
      </div>

      <div className="flex items-center justify-between text-xs text-text-dim pt-1">
        <span>
          Showing {filtered.length} of {items.length}
        </span>
        {rec !== "all" && (
          <button type="button" onClick={() => setRec("all")} className="text-accent hover:underline">
            Clear filter
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
          No items match this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((it) => (
            <RoadmapCard key={it.id} item={it} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "win" | "danger" | "warn" | "accent";
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition border",
        active
          ? `${activeTone} border-transparent`
          : "bg-card border-border text-text-muted hover:text-text hover:border-text-dim",
      )}
    >
      {label}
    </button>
  );
}
