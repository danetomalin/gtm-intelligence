import Link from "next/link";
import { topCostDrivers, totalCogs } from "@/lib/cost-model-defaults";

export type CostModelTier = {
  id: string;
  tier_name: string;
  tier_order: number;
  cogs_compute_usd: number;
  cogs_storage_usd: number;
  cogs_llm_usd: number;
  cogs_third_party_usd: number;
  cogs_payments_pct: number;
  cogs_payments_fixed_usd: number;
  cogs_support_usd: number;
  cogs_other_usd: number;
  list_price_usd: number;
  effective_price_usd: number;
  gross_margin_pct: number | null;
  margin_floor_pct: number | null;
};

export function MarginOverview({ tiers }: { tiers: CostModelTier[] }) {
  if (tiers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 px-6 py-8 text-center text-sm text-text-muted">
        No cost model yet.{" "}
        <Link href="/cost-model" className="text-accent hover:underline">
          Set it up
        </Link>{" "}
        so R-PP can compute gross margin and compare against competitor estimates.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {tiers.map((t) => {
        const gm = t.gross_margin_pct == null ? null : Number(t.gross_margin_pct);
        const floor = t.margin_floor_pct == null ? null : Number(t.margin_floor_pct);
        const belowFloor = gm != null && floor != null && gm < floor;
        const cogs = totalCogs({
          ...t,
          cogs_compute_usd: Number(t.cogs_compute_usd),
          cogs_storage_usd: Number(t.cogs_storage_usd),
          cogs_llm_usd: Number(t.cogs_llm_usd),
          cogs_third_party_usd: Number(t.cogs_third_party_usd),
          cogs_payments_pct: Number(t.cogs_payments_pct),
          cogs_payments_fixed_usd: Number(t.cogs_payments_fixed_usd),
          cogs_support_usd: Number(t.cogs_support_usd),
          cogs_other_usd: Number(t.cogs_other_usd),
          effective_price_usd: Number(t.effective_price_usd),
        });
        const drivers = topCostDrivers({
          cogs_compute_usd: Number(t.cogs_compute_usd),
          cogs_storage_usd: Number(t.cogs_storage_usd),
          cogs_llm_usd: Number(t.cogs_llm_usd),
          cogs_third_party_usd: Number(t.cogs_third_party_usd),
          cogs_support_usd: Number(t.cogs_support_usd),
          cogs_other_usd: Number(t.cogs_other_usd),
        });
        const top = drivers[0];

        return (
          <div
            key={t.id}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border bg-surface/40 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                  Tier
                </div>
                <div className="text-base font-semibold text-text">
                  {t.tier_name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                  Gross margin
                </div>
                <div
                  className={`text-2xl font-semibold tabular-nums ${
                    gm == null
                      ? "text-text-dim"
                      : belowFloor
                        ? "text-danger"
                        : "text-win"
                  }`}
                >
                  {gm == null ? "—" : `${gm.toFixed(1)}%`}
                </div>
                {gm != null && floor != null && (
                  <div
                    className={`text-[10px] uppercase tracking-wider mt-0.5 ${
                      belowFloor ? "text-danger" : "text-text-dim"
                    }`}
                  >
                    Floor {floor}%
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-dim">Revenue / user / mo</span>
                <span className="text-text tabular-nums">
                  ${Number(t.effective_price_usd).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Total COGS</span>
                <span className="text-text tabular-nums">
                  ${cogs.toFixed(2)}
                </span>
              </div>
              {top && (
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="text-text-dim">Top driver</span>
                  <span className="text-text">
                    {top.label}{" "}
                    <span className="text-text-dim tabular-nums">
                      ${top.value.toFixed(2)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
