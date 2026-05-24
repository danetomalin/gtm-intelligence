"use client";

import { useMemo, useState } from "react";
import { DossierCard, type Dossier } from "./dossier-card";
import { cn } from "@/lib/utils";

type RiskFilter = "all" | "LOW" | "MEDIUM" | "HIGH";

export function PastDossiersArchive({ dossiers }: { dossiers: Dossier[] }) {
  const [risk, setRisk] = useState<RiskFilter>("all");

  const counts = useMemo(() => {
    const c = { LOW: 0, MEDIUM: 0, HIGH: 0 } as Record<string, number>;
    for (const d of dossiers) {
      const r = d.risk_assessment ?? "";
      if (r in c) c[r] += 1;
    }
    return c;
  }, [dossiers]);

  const filtered = useMemo(() => {
    return dossiers.filter((d) => {
      if (risk !== "all" && d.risk_assessment !== risk) return false;
      return true;
    });
  }, [dossiers, risk]);

  if (dossiers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
        No past dossiers yet. Run R-CI a few times to build up the archive.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Risk
        </span>
        <FilterPill
          label={`All (${dossiers.length})`}
          active={risk === "all"}
          onClick={() => setRisk("all")}
        />
        <FilterPill
          label={`Low (${counts.LOW})`}
          active={risk === "LOW"}
          onClick={() => setRisk("LOW")}
          tone="win"
        />
        <FilterPill
          label={`Medium (${counts.MEDIUM})`}
          active={risk === "MEDIUM"}
          onClick={() => setRisk("MEDIUM")}
          tone="warn"
        />
        <FilterPill
          label={`High (${counts.HIGH})`}
          active={risk === "HIGH"}
          onClick={() => setRisk("HIGH")}
          tone="danger"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-text-dim pt-1">
        <span>
          Showing {filtered.length} of {dossiers.length}
        </span>
        {risk !== "all" && (
          <button
            type="button"
            onClick={() => setRisk("all")}
            className="text-accent hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
          No dossiers match this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <DossierCard key={d.id} dossier={d} compact />
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
