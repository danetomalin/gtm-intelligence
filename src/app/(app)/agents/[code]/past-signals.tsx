"use client";

import { useMemo, useState } from "react";
import { SignalCard, type Signal } from "./signal-card";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | string;
type SentimentFilter = "all" | "bullish" | "bearish" | "neutral";

const CATEGORY_LABEL: Record<string, string> = {
  regulatory: "Regulatory",
  inventory: "Inventory",
  competitive: "Competitive",
  ad_spend: "Ad Spend",
};

export function PastSignalsArchive({ signals }: { signals: Signal[] }) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sentiment, setSentiment] = useState<SentimentFilter>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of signals) {
      if (s.category) set.add(s.category);
    }
    return Array.from(set).sort();
  }, [signals]);

  const filtered = useMemo(() => {
    return signals.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (sentiment !== "all" && s.sentiment !== sentiment) return false;
      return true;
    });
  }, [signals, category, sentiment]);

  if (signals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
        No past signals yet. Once you run A2 a few times, the full history will
        accumulate here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Category
        </span>
        <FilterPill
          label={`All (${signals.length})`}
          active={category === "all"}
          onClick={() => setCategory("all")}
        />
        {categories.map((cat) => {
          const count = signals.filter((s) => s.category === cat).length;
          return (
            <FilterPill
              key={cat}
              label={`${CATEGORY_LABEL[cat] ?? cat} (${count})`}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mr-1">
          Sentiment
        </span>
        {(["all", "bullish", "bearish", "neutral"] as const).map((s) => (
          <FilterPill
            key={s}
            label={s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
            active={sentiment === s}
            tone={
              s === "bullish"
                ? "win"
                : s === "bearish"
                  ? "danger"
                  : s === "neutral"
                    ? "warn"
                    : undefined
            }
            onClick={() => setSentiment(s)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-text-dim pt-1">
        <span>
          Showing {filtered.length} of {signals.length}
        </span>
        {(category !== "all" || sentiment !== "all") && (
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setSentiment("all");
            }}
            className="text-accent hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
          No signals match those filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <SignalCard key={s.id} signal={s} compact />
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
