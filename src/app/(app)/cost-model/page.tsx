import { PageHeader, SectionDivider } from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import { AI_SAAS_TIER_DEFAULTS } from "@/lib/cost-model-defaults";
import { CostModelEditor } from "./editor";

export const dynamic = "force-dynamic";

type StoredTier = {
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
  notes: string | null;
  effective_date: string;
  updated_at: string;
};

export default async function CostModelPage() {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("product_cost_model")
    .select(
      "id, tier_name, tier_order, cogs_compute_usd, cogs_storage_usd, cogs_llm_usd, cogs_third_party_usd, cogs_payments_pct, cogs_payments_fixed_usd, cogs_support_usd, cogs_other_usd, list_price_usd, effective_price_usd, gross_margin_pct, margin_floor_pct, notes, effective_date, updated_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .order("tier_order", { ascending: true });

  const stored = (data ?? []) as StoredTier[];
  // First-run experience: if no rows exist, seed the editor with the
  // AI-SaaS defaults so PMM has something to react to rather than a blank
  // form. The defaults are NOT persisted until the user saves.
  const initial =
    stored.length > 0
      ? stored.map((t, idx) => ({
          tier_name: t.tier_name,
          tier_order: t.tier_order ?? idx + 1,
          cogs_compute_usd: Number(t.cogs_compute_usd),
          cogs_storage_usd: Number(t.cogs_storage_usd),
          cogs_llm_usd: Number(t.cogs_llm_usd),
          cogs_third_party_usd: Number(t.cogs_third_party_usd),
          cogs_payments_pct: Number(t.cogs_payments_pct),
          cogs_payments_fixed_usd: Number(t.cogs_payments_fixed_usd),
          cogs_support_usd: Number(t.cogs_support_usd),
          cogs_other_usd: Number(t.cogs_other_usd),
          list_price_usd: Number(t.list_price_usd),
          effective_price_usd: Number(t.effective_price_usd),
          margin_floor_pct: t.margin_floor_pct == null ? null : Number(t.margin_floor_pct),
        }))
      : AI_SAAS_TIER_DEFAULTS;

  const isFirstRun = stored.length === 0;
  const lastSaved = stored.length > 0 ? stored[0].updated_at : null;

  return (
    <div className="px-8 py-10 max-w-5xl space-y-8">
      <PageHeader
        eyebrow="R-PP foundation · Cost model"
        title="Per-tier cost model"
        subtitle="What does each user cost you per month? R-PP uses these numbers to compute gross margin, flag pricing changes that breach the floor, and compare against competitor margin estimates. Defaults are calibrated for an AI-native B2B SaaS — adjust to match your finance numbers."
      />

      {isFirstRun && (
        <div className="rounded-lg border border-accent/40 bg-accent-bg/30 px-5 py-4 text-sm text-text leading-relaxed">
          <strong className="text-accent">Pre-filled with AI-SaaS defaults.</strong>{" "}
          Adjust each tier to match your actual numbers, then save. You can come back and re-confirm quarterly.
        </div>
      )}

      {!isFirstRun && lastSaved && (
        <div className="text-[11px] uppercase tracking-wider text-text-dim">
          Last saved {lastSaved.slice(0, 10)}
        </div>
      )}

      <CostModelEditor initial={initial} />

      <section>
        <SectionDivider title="How this data is used" sub="R-PP + downstream" />
        <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-3 text-sm text-text-muted leading-relaxed">
          <p>
            <strong className="text-text">R-PP page</strong> shows your per-tier
            gross margin alongside competitor pricing snapshots so you can see
            whether you have margin room to undercut on price.
          </p>
          <p>
            <strong className="text-text">HITL gating</strong> reads the margin
            floor when a D-* artifact proposes a pricing change. If the change
            would push margin below the floor, the artifact auto-promotes to
            <code className="text-accent text-xs mx-1">risk_tier=&apos;high&apos;</code>
            and the approval queue shows the margin impact.
          </p>
          <p>
            <strong className="text-text">Cost driver attribution</strong>{" "}
            surfaces the biggest cost on each tier (typically LLM tokens for AI
            SaaS) so you know which lever to pull when margin gets squeezed.
          </p>
        </div>
      </section>
    </div>
  );
}
