// ============================================================
// Phase B seed: Halcyon org/brand + CS Health portfolio
// Run: node_modules/.bin/jiti scripts/seed-cs-health.ts
// Idempotent: wipes Halcyon's health rows, then re-inserts.
// Reads SUPABASE url + service-role key from .env.local.
// ============================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { DATA } from "../src/features/cs-health/lib/generateData";
import { buildScoredAccounts, healthBand } from "../src/features/cs-health/lib/scoringEngine";

const HALCYON_ORG_ID = "33333333-3333-3333-3333-333333333333";
const HALCYON_BRAND_ID = "44444444-4444-4444-4444-444444444444";

function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

async function main() {
  const e = env();
  const supa = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // created_by must reference a real auth user — borrow from an existing org.
  const { data: orgRow, error: orgErr } = await supa
    .from("organizations").select("created_by").limit(1).single();
  if (orgErr) throw orgErr;
  const createdBy = orgRow.created_by as string;

  // Org + brand (upsert by fixed id).
  let r = await supa.from("organizations").upsert(
    { id: HALCYON_ORG_ID, name: "Halcyon", created_by: createdBy }, { onConflict: "id" });
  if (r.error) throw r.error;
  r = await supa.from("brands").upsert({
    id: HALCYON_BRAND_ID,
    organization_id: HALCYON_ORG_ID,
    name: "Halcyon",
    website_url: "https://www.halcyonhq.com/",
    additional_context:
      "Halcyon is a workforce management platform (~$13M ARR) serving enterprise and mid-market companies across retail, healthcare, financial services, manufacturing, media, logistics, and education. Core product: scheduling, time & attendance, labor forecasting, and compliance for hourly and hybrid workforces. CS org: 4 CSMs covering 30 named accounts plus a tech-touch SMB cohort. This brand is the demo tenant for the Customer Health workspace (VAR model).",
    created_by: createdBy,
  }, { onConflict: "id" });
  if (r.error) throw r.error;

  // Wipe Halcyon health rows (FKs cascade from accounts).
  for (const t of ["churn_events", "accounts"]) {
    const d = await supa.from(t).delete().eq("organization_id", HALCYON_ORG_ID);
    if (d.error) throw d.error;
  }

  const accounts = [...DATA.enterprise, ...DATA.midmarket];
  const scored = buildScoredAccounts(accounts);
  const today = new Date().toISOString().slice(0, 10);
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  // Accounts
  const accountRows = accounts.map((a) => ({
    organization_id: HALCYON_ORG_ID,
    external_id: a.id,
    name: a.name,
    csm: a.csm,
    arr: a.arr,
    segment: a.segment,
    stage: a.stage,
    sentiment_trend: a.sentimentTrend,
    flags: a.flags,
    ttv: a.ttv,
    sentiment: a.sentiment,
    adoption_signals: a.adoptionSignals,
    renewal_date: a.renewal?.renewalDate ?? null,
    is_first_renewal: a.renewal?.isFirstRenewal ?? false,
  }));
  const ins = await supa.from("accounts").insert(accountRows).select("id, external_id");
  if (ins.error) throw ins.error;
  const idByExt = new Map(ins.data.map((row) => [row.external_id, row.id]));

  // var_metrics (today's pillar inputs)
  const varRows = accounts.map((a) => ({
    organization_id: HALCYON_ORG_ID,
    account_id: idByExt.get(a.id),
    as_of: today,
    value_score: a.valueScore,
    adoption_score: a.adoptionScore,
    relationship_score: a.relationshipScore,
    expansion_inputs: a.expansion,
    data_confidence: a.dataConfidence,
    source: "manual",
  }));
  r = await supa.from("var_metrics").insert(varRows);
  if (r.error) throw r.error;

  // health_score_snapshots: weekly history from scoreTrend + today's computed
  const snapRows: object[] = [];
  for (const s of scored) {
    const acct = idByExt.get(s.id);
    // scoreTrend is oldest -> newest; place entries at weekly intervals ending 7d ago
    s.scoreTrend.forEach((score, i) => {
      const weeksBack = s.scoreTrend.length - i; // last entry = 1 week ago
      snapRows.push({
        organization_id: HALCYON_ORG_ID,
        account_id: acct,
        as_of: daysAgo(weeksBack * 7),
        score,
        band: healthBand(score, s.segment),
        tier1: null,
        penalty_reasons: [],
        weights: {},
      });
    });
    snapRows.push({
      organization_id: HALCYON_ORG_ID,
      account_id: acct,
      as_of: today,
      score: s.scoring.score,
      band: s.scoring.band,
      tier1: s.scoring.tier1,
      penalty_reasons: s.scoring.penaltyReasons,
      weights: s.scoring.weights,
    });
  }
  r = await supa.from("health_score_snapshots").insert(snapRows);
  if (r.error) throw r.error;

  // expansion_scores (today)
  const expRows = scored.map((s) => ({
    organization_id: HALCYON_ORG_ID,
    account_id: idByExt.get(s.id),
    as_of: today,
    score: s.expansionScoring.score,
    band: s.expansionScoring.band,
    upsell_signal: s.expansionScoring.upsellSignal,
    cross_sell_signal: s.expansionScoring.crossSellSignal,
    timing_signal: s.expansionScoring.timingSignal,
    blocking_factor: s.expansionScoring.blockingFactor,
    components: s.expansionScoring.components,
  }));
  r = await supa.from("expansion_scores").insert(expRows);
  if (r.error) throw r.error;

  // renewal_forecasts (Renewal Window accounts only)
  const fcRows = scored.filter((s) => s.forecast).map((s) => ({
    organization_id: HALCYON_ORG_ID,
    account_id: idByExt.get(s.id),
    as_of: today,
    likelihood: s.forecast!.likelihood,
    likelihood_band: s.forecast!.likelihoodBand,
    model_component: s.forecast!.modelComponent,
    sentiment_component: s.forecast!.sentimentComponent,
    model_weight: s.forecast!.modelWeight,
    sentiment_weight: s.forecast!.sentimentWeight,
    confidence_tier: s.forecast!.confidenceTier,
    adjustments: {
      firstRenewalAdjustment: s.forecast!.firstRenewalAdjustment,
      expansionBoost: s.forecast!.expansionBoost,
    },
  }));
  r = await supa.from("renewal_forecasts").insert(fcRows);
  if (r.error) throw r.error;

  // churn_events (historical, no live account linkage)
  const churnRows = DATA.churnEvents.map((c) => ({
    organization_id: HALCYON_ORG_ID,
    account_id: null,
    account_name: c.name,
    segment: c.segment,
    arr: c.arr,
    churn_date: c.date,
    primary_reason: c.primaryReason,
    secondary_reason: c.secondaryReason,
    health_90d: c.healthScore90d,
    health_60d: c.healthScore60d,
    health_30d: c.healthScore30d,
    csm_notes: c.csmNotes,
    missed_signals: c.missedSignals,
    learnings: c.learnings,
  }));
  r = await supa.from("churn_events").insert(churnRows);
  if (r.error) throw r.error;

  console.log(`Seeded Halcyon: ${accountRows.length} accounts, ${varRows.length} var_metrics, ${snapRows.length} snapshots, ${expRows.length} expansion, ${fcRows.length} forecasts, ${churnRows.length} churn events`);
}

main().catch((err) => { console.error(err); process.exit(1); });
