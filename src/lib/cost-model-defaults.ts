// Sensible default COGS components for an AI-native B2B SaaS like Throughline.
// PMM doesn't own this data, so the onboarding flow presents these as
// pre-filled values they can adjust rather than blank fields they have to
// fill from scratch.
//
// Source assumptions (per user per month, USD):
// - Compute: Vercel + Supabase mid-tier, typical edge function + DB query load
// - Storage: ~5 GB per user including artifacts and run history
// - LLM tokens: heavy-use AI SaaS, Gemini Flash + occasional Sonnet/Pro
// - Third-party data: small allocation for web search / market data APIs
// - Support: blended across tier; Enterprise carries more
// - Payment processing: Stripe defaults (2.9% + $0.30 per transaction)
//
// Numbers calibrated against published SaaS COGS benchmarks. Customers
// should override these with their actual finance numbers; defaults exist
// so PMM has a baseline to react to rather than a blank form.

export type CostTierDefault = {
  tier_name: string;
  tier_order: number;
  list_price_usd: number;
  effective_price_usd: number;
  cogs_compute_usd: number;
  cogs_storage_usd: number;
  cogs_llm_usd: number;
  cogs_third_party_usd: number;
  cogs_payments_pct: number;
  cogs_payments_fixed_usd: number;
  cogs_support_usd: number;
  cogs_other_usd: number;
  margin_floor_pct: number | null;
};

export const AI_SAAS_TIER_DEFAULTS: CostTierDefault[] = [
  {
    tier_name: "Free",
    tier_order: 1,
    list_price_usd: 0,
    effective_price_usd: 0,
    // Free still carries real cost — Free CAC payback is a function of how
    // many free users convert, but margin on Free is intentionally negative
    // until conversion. We capture cost for visibility.
    cogs_compute_usd: 1.2,
    cogs_storage_usd: 0.4,
    cogs_llm_usd: 3.5,
    cogs_third_party_usd: 0.3,
    cogs_payments_pct: 0,
    cogs_payments_fixed_usd: 0,
    cogs_support_usd: 0.5,
    cogs_other_usd: 0.2,
    margin_floor_pct: null, // Free has no floor — strategic loss leader
  },
  {
    tier_name: "Pro",
    tier_order: 2,
    list_price_usd: 79,
    effective_price_usd: 65, // typical 15-20% discount after deal mechanics
    cogs_compute_usd: 3.5,
    cogs_storage_usd: 0.8,
    cogs_llm_usd: 11.0, // biggest variable line for AI SaaS
    cogs_third_party_usd: 1.5,
    cogs_payments_pct: 0.029,
    cogs_payments_fixed_usd: 0.3,
    cogs_support_usd: 2.0,
    cogs_other_usd: 0.5,
    margin_floor_pct: 70, // standard SaaS GM floor
  },
  {
    tier_name: "Enterprise",
    tier_order: 3,
    list_price_usd: 249,
    effective_price_usd: 199, // annual contracted, larger volume discount
    cogs_compute_usd: 6.0,
    cogs_storage_usd: 2.0,
    cogs_llm_usd: 22.0,
    cogs_third_party_usd: 4.0,
    cogs_payments_pct: 0.022, // negotiated processor rate at volume
    cogs_payments_fixed_usd: 0.3,
    cogs_support_usd: 8.0, // dedicated CSM allocation
    cogs_other_usd: 2.0,
    margin_floor_pct: 75, // Enterprise should run higher GM than Pro
  },
];

/**
 * Compute gross margin pct for a tier. Mirrors the generated SQL column so
 * we can preview margin in the onboarding UI before persisting.
 */
export function computeGrossMargin(t: {
  effective_price_usd: number;
  cogs_compute_usd: number;
  cogs_storage_usd: number;
  cogs_llm_usd: number;
  cogs_third_party_usd: number;
  cogs_payments_pct: number;
  cogs_payments_fixed_usd: number;
  cogs_support_usd: number;
  cogs_other_usd: number;
}): number | null {
  if (t.effective_price_usd <= 0) return null;
  const variableCogs =
    t.cogs_compute_usd +
    t.cogs_storage_usd +
    t.cogs_llm_usd +
    t.cogs_third_party_usd +
    t.cogs_support_usd +
    t.cogs_other_usd;
  const payments =
    t.effective_price_usd * t.cogs_payments_pct + t.cogs_payments_fixed_usd;
  const gm = ((t.effective_price_usd - variableCogs - payments) / t.effective_price_usd) * 100;
  return Math.round(gm * 100) / 100;
}

/**
 * Total per-user COGS for a tier (variable + payments). Used by the breakdown
 * card on the R-PP margin display.
 */
export function totalCogs(t: {
  effective_price_usd: number;
  cogs_compute_usd: number;
  cogs_storage_usd: number;
  cogs_llm_usd: number;
  cogs_third_party_usd: number;
  cogs_payments_pct: number;
  cogs_payments_fixed_usd: number;
  cogs_support_usd: number;
  cogs_other_usd: number;
}): number {
  const variable =
    t.cogs_compute_usd +
    t.cogs_storage_usd +
    t.cogs_llm_usd +
    t.cogs_third_party_usd +
    t.cogs_support_usd +
    t.cogs_other_usd;
  const payments =
    t.effective_price_usd > 0
      ? t.effective_price_usd * t.cogs_payments_pct + t.cogs_payments_fixed_usd
      : 0;
  return Math.round((variable + payments) * 100) / 100;
}

/**
 * Returns the COGS components ordered by size descending. Used to surface
 * "biggest cost driver" in the margin card.
 */
export function topCostDrivers(t: {
  cogs_compute_usd: number;
  cogs_storage_usd: number;
  cogs_llm_usd: number;
  cogs_third_party_usd: number;
  cogs_support_usd: number;
  cogs_other_usd: number;
}): { label: string; value: number }[] {
  const drivers = [
    { label: "LLM tokens", value: t.cogs_llm_usd },
    { label: "Compute", value: t.cogs_compute_usd },
    { label: "Support", value: t.cogs_support_usd },
    { label: "Third-party", value: t.cogs_third_party_usd },
    { label: "Storage", value: t.cogs_storage_usd },
    { label: "Other", value: t.cogs_other_usd },
  ];
  return drivers.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
}
