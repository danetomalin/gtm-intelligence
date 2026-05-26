"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  computeGrossMargin,
  totalCogs,
  topCostDrivers,
  type CostTierDefault,
} from "@/lib/cost-model-defaults";

type Tier = CostTierDefault;

const FIELD_DEFS: {
  key: keyof Tier;
  label: string;
  hint?: string;
  step: number;
  prefix?: string;
  suffix?: string;
}[] = [
  { key: "list_price_usd", label: "List price", step: 1, prefix: "$", suffix: "/user/mo" },
  {
    key: "effective_price_usd",
    label: "Effective price",
    hint: "After typical discounting",
    step: 1,
    prefix: "$",
    suffix: "/user/mo",
  },
  { key: "cogs_compute_usd", label: "Compute", step: 0.1, prefix: "$" },
  { key: "cogs_storage_usd", label: "Storage", step: 0.1, prefix: "$" },
  {
    key: "cogs_llm_usd",
    label: "LLM tokens",
    hint: "Biggest variable line for AI SaaS",
    step: 0.5,
    prefix: "$",
  },
  { key: "cogs_third_party_usd", label: "Third-party data", step: 0.1, prefix: "$" },
  { key: "cogs_support_usd", label: "Support allocation", step: 0.5, prefix: "$" },
  { key: "cogs_other_usd", label: "Other variable", step: 0.1, prefix: "$" },
];

const PAYMENT_FIELDS: {
  key: keyof Tier;
  label: string;
  step: number;
  prefix?: string;
  suffix?: string;
}[] = [
  { key: "cogs_payments_pct", label: "Payment rate", step: 0.001, suffix: " (e.g. 0.029 = 2.9%)" },
  { key: "cogs_payments_fixed_usd", label: "Per-txn fixed fee", step: 0.05, prefix: "$" },
];

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function CostModelEditor({ initial }: { initial: Tier[] }) {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function updateTier(idx: number, patch: Partial<Tier>) {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }

  function updateFloor(idx: number, value: string) {
    const trimmed = value.trim();
    if (trimmed === "") {
      updateTier(idx, { margin_floor_pct: null });
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return;
    updateTier(idx, { margin_floor_pct: n });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cost-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (HTTP ${res.status})`);
      }
      setSavedAt(new Date().toISOString());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {tiers.map((tier, idx) => (
          <TierCard
            key={tier.tier_name + idx}
            tier={tier}
            onChange={(patch) => updateTier(idx, patch)}
            onFloorChange={(v) => updateFloor(idx, v)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
        <div className="text-xs text-text-dim">
          {error ? (
            <span className="text-danger">{error}</span>
          ) : savedAt ? (
            <span className="text-win">
              Saved {new Date(savedAt).toLocaleTimeString()}
            </span>
          ) : (
            "Changes save to product_cost_model for the active brand."
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-semibold transition",
            saving
              ? "bg-card text-text-dim cursor-not-allowed"
              : "bg-accent text-bg hover:bg-accent/90",
          )}
        >
          {saving ? "Saving…" : "Save cost model"}
        </button>
      </div>
    </div>
  );
}

function TierCard({
  tier,
  onChange,
  onFloorChange,
}: {
  tier: Tier;
  onChange: (patch: Partial<Tier>) => void;
  onFloorChange: (value: string) => void;
}) {
  const gm = useMemo(() => computeGrossMargin(tier), [tier]);
  const cogs = useMemo(() => totalCogs(tier), [tier]);
  const drivers = useMemo(() => topCostDrivers(tier), [tier]);
  const floor = tier.margin_floor_pct;
  const belowFloor = gm != null && floor != null && gm < floor;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-surface/40">
        <div className="flex items-baseline gap-3">
          <input
            type="text"
            value={tier.tier_name}
            onChange={(e) => onChange({ tier_name: e.target.value })}
            className="bg-transparent text-lg font-semibold text-text outline-none border-b border-transparent focus:border-accent transition w-40"
          />
          <span className="text-[10px] uppercase tracking-wider text-text-dim">
            tier {tier.tier_order}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-text-dim">
            Gross margin
          </div>
          <div
            className={cn(
              "text-2xl font-semibold tabular-nums",
              gm == null
                ? "text-text-dim"
                : belowFloor
                  ? "text-danger"
                  : "text-win",
            )}
          >
            {gm == null ? "—" : `${gm.toFixed(1)}%`}
          </div>
          {gm != null && floor != null && (
            <div
              className={cn(
                "text-[10px] uppercase tracking-wider mt-0.5",
                belowFloor ? "text-danger" : "text-text-dim",
              )}
            >
              Floor {floor}%
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 py-4">
        {FIELD_DEFS.map((f) => (
          <div key={String(f.key)}>
            <label className="block text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
              {f.label}
            </label>
            <div className="flex items-center gap-2">
              {f.prefix && (
                <span className="text-text-dim text-sm">{f.prefix}</span>
              )}
              <input
                type="number"
                step={f.step}
                value={tier[f.key] as number}
                onChange={(e) =>
                  onChange({ [f.key]: Number(e.target.value) } as Partial<Tier>)
                }
                className="w-full bg-surface/40 border border-border rounded-md px-3 py-1.5 text-sm tabular-nums text-text focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {f.suffix && (
                <span className="text-text-dim text-xs whitespace-nowrap">
                  {f.suffix}
                </span>
              )}
            </div>
            {f.hint && (
              <div className="text-[10px] text-text-dim mt-1">{f.hint}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4 border-t border-border bg-surface/20">
        {PAYMENT_FIELDS.map((f) => (
          <div key={String(f.key)}>
            <label className="block text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
              {f.label}
            </label>
            <div className="flex items-center gap-2">
              {f.prefix && (
                <span className="text-text-dim text-sm">{f.prefix}</span>
              )}
              <input
                type="number"
                step={f.step}
                value={tier[f.key] as number}
                onChange={(e) =>
                  onChange({ [f.key]: Number(e.target.value) } as Partial<Tier>)
                }
                className="w-full bg-surface/40 border border-border rounded-md px-3 py-1.5 text-sm tabular-nums text-text focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {f.suffix && (
                <span className="text-text-dim text-[11px] whitespace-nowrap">
                  {f.suffix}
                </span>
              )}
            </div>
          </div>
        ))}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
            Margin floor
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={1}
              value={tier.margin_floor_pct ?? ""}
              placeholder="—"
              onChange={(e) => onFloorChange(e.target.value)}
              className="w-full bg-surface/40 border border-border rounded-md px-3 py-1.5 text-sm tabular-nums text-text focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="text-text-dim text-xs">%</span>
          </div>
          <div className="text-[10px] text-text-dim mt-1">
            Leave blank for tiers with no floor (e.g. Free)
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border bg-surface/40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
              Total COGS / user / mo
            </div>
            <div className="text-base font-semibold text-text tabular-nums">
              {fmtUsd(cogs)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
              Revenue / user / mo
            </div>
            <div className="text-base font-semibold text-text tabular-nums">
              {fmtUsd(tier.effective_price_usd)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
              Top cost driver
            </div>
            <div className="text-base font-semibold text-text">
              {drivers[0]
                ? `${drivers[0].label} ${fmtUsd(drivers[0].value)}`
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
