// ============================================================
// NATIVE WORKFLOW REGISTRY — tranche 2: the research tier.
//   R-CI  Competitive Intelligence  → competitive_dossiers
//   R-PP  Pricing & Packaging       → pricing_intelligence
//   R-WL  Win/Loss Analyst          → win_loss_analyses
//   S-RM  Roadmap Steering          → roadmap_items
// All four are research-archetype specs (Tavily-backed). Output
// shapes mirror the n8n chain so existing cards render unchanged.
// R-WL note: the n8n version read dummy CRM deal notes; natively it
// produces clearly-labeled synthetic representative teardowns until
// a real CRM connector lands.
// ============================================================

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowIds, WorkflowSpec } from "./engine";

async function brandBlock(admin: SupabaseClient, ids: WorkflowIds): Promise<string> {
  const { data } = await admin
    .from("brands")
    .select("name, website_url, additional_context")
    .eq("id", ids.brandId)
    .maybeSingle();
  return data
    ? `Brand: ${data.name} (${data.website_url ?? "no site"})\n${data.additional_context ?? ""}`
    : "Brand: unknown";
}

async function competitorBlock(admin: SupabaseClient, ids: WorkflowIds): Promise<string> {
  const { data } = await admin
    .from("brand_competitors")
    .select("name, domain, keywords, risk_level, latest_messaging, latest_pricing_summary")
    .eq("brand_id", ids.brandId);
  return (data ?? [])
    .map(
      (c) =>
        `- ${c.name} (${c.domain ?? "?"}, risk ${c.risk_level ?? "?"}): ${c.keywords ?? ""}${c.latest_messaging ? ` | last messaging: ${c.latest_messaging.slice(0, 150)}` : ""}${c.latest_pricing_summary ? ` | last pricing: ${c.latest_pricing_summary.slice(0, 150)}` : ""}`,
    )
    .join("\n");
}

async function topCompetitors(admin: SupabaseClient, ids: WorkflowIds, n: number): Promise<string[]> {
  const { data } = await admin
    .from("brand_competitors")
    .select("name, risk_level")
    .eq("brand_id", ids.brandId);
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as Record<string, number>;
  return (data ?? [])
    .sort((a, b) => (order[a.risk_level ?? "LOW"] ?? 3) - (order[b.risk_level ?? "LOW"] ?? 3))
    .slice(0, n)
    .map((c) => c.name);
}

// ── R-CI · Competitive Intelligence ─────────────────────────────

const dossierSchema = z.object({
  dossiers: z
    .array(
      z.object({
        competitor_name: z.string().min(2).max(120),
        strategic_move: z.string().min(10),
        messaging_drift: z.string().min(5),
        pricing_intelligence: z.string().min(5),
        product_signals: z.string().min(5),
        talent_signals: z.string().min(5),
        competitive_landmines: z.string().min(10), // 3 numbered questions
        risk_assessment: z.enum(["LOW", "MEDIUM", "HIGH"]),
        risk_justification: z.string().min(5),
        sources: z.string().min(5),
      }),
    )
    .min(1)
    .max(3),
});

const rci: WorkflowSpec<typeof dossierSchema> = {
  code: "R-CI",
  task: "Produce a competitive dossier for each competitor covered by the web research below (up to 3, highest-risk first). Follow your operating instructions' seven-section structure. Ground every claim in the research results and cite URLs in sources; mark single-source claims UNVERIFIED. Compare against the previous dossier summaries in the context and call out what changed in messaging_drift.",
  outputInstruction:
    '{"dossiers": [{"competitor_name": "...", "strategic_move": "the single biggest recent move", "messaging_drift": "how positioning changed vs the last dossier (or \'first dossier — baseline\' )", "pricing_intelligence": "...", "product_signals": "...", "talent_signals": "...", "competitive_landmines": "1. question one 2. question two 3. question three", "risk_assessment": "LOW|MEDIUM|HIGH", "risk_justification": "one line", "sources": "url1, url2"}]} — one dossier per researched competitor, max 3.',
  outputSchema: dossierSchema,
  maxTokens: 8000,
  buildContext: async (admin, ids) => {
    const [brand, comps, prior] = await Promise.all([
      brandBlock(admin, ids),
      competitorBlock(admin, ids),
      admin
        .from("competitive_dossiers")
        .select("competitor_name, run_date, strategic_move, risk_assessment")
        .eq("brand_id", ids.brandId)
        .order("run_date", { ascending: false })
        .limit(6),
    ]);
    const priorBlock =
      (prior.data ?? [])
        .map((d) => `- [${d.run_date}] ${d.competitor_name} (${d.risk_assessment ?? "?"}): ${d.strategic_move?.slice(0, 160) ?? ""}`)
        .join("\n") || "(no previous dossiers — these are baselines)";
    return `${brand}\n\nTracked competitors:\n${comps}\n\nPrevious dossier summaries (for drift comparison):\n${priorBlock}`;
  },
  buildSearchQueries: async (admin, ids) => {
    const names = await topCompetitors(admin, ids, 3);
    return names.flatMap((n) => [`${n} news funding product announcement`, `${n} pricing plans review`]).slice(0, 5);
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.dossiers.map((d) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      run_date: new Date().toISOString().slice(0, 10),
      ...d,
    }));
    const { error } = await admin.from("competitive_dossiers").insert(rows);
    if (error) throw new Error(`Failed to write competitive_dossiers: ${error.message}`);
    return `${rows.length} dossiers written (${rows.map((r) => r.competitor_name).join(", ")})`;
  },
};

// ── R-PP · Pricing & Packaging ──────────────────────────────────

const pricingSchema = z.object({
  snapshots: z
    .array(
      z.object({
        competitor_name: z.string().min(2).max(120),
        pricing_model: z.enum(["tiered", "usage", "seat", "flat", "hybrid", "custom", "subscription", "freemium", "unknown"]),
        tiers: z
          .array(
            z.object({
              name: z.string(),
              price: z.string(),
              unit: z.string().optional(),
              features: z.array(z.string()).max(6).optional(),
            }),
          )
          .max(6),
        packaging_observations: z.string().min(5),
        pricing_velocity: z.enum(["stable", "changing", "recently_changed", "unknown"]),
        recent_changes: z.string(),
        positioning_implications: z.string().min(10),
        sources: z.string().min(5),
      }),
    )
    .min(1)
    .max(3),
});

const rpp: WorkflowSpec<typeof pricingSchema> = {
  code: "R-PP",
  task: "Produce a pricing & packaging snapshot for each competitor covered by the web research below (up to 3). Capture the pricing model, visible tiers with prices and key inclusions, packaging observations, how fast pricing is moving, recent changes, and what each shift means for this brand's positioning. Only state prices you can ground in the research; use \"unknown\" rather than guessing.",
  outputInstruction:
    '{"snapshots": [{"competitor_name": "...", "pricing_model": "tiered|usage|seat|flat|hybrid|custom|subscription|freemium|unknown", "tiers": [{"name": "...", "price": "$X/mo or unknown", "unit": "per user/location", "features": ["..."]}], "packaging_observations": "...", "pricing_velocity": "stable|changing|recently_changed|unknown", "recent_changes": "...", "positioning_implications": "...", "sources": "url1, url2"}]} — max 3 snapshots.',
  outputSchema: pricingSchema,
  maxTokens: 7000,
  buildContext: async (admin, ids) => {
    const [brand, comps, prior] = await Promise.all([
      brandBlock(admin, ids),
      competitorBlock(admin, ids),
      admin
        .from("pricing_intelligence")
        .select("competitor_name, snapshot_date, pricing_model, recent_changes")
        .eq("brand_id", ids.brandId)
        .order("snapshot_date", { ascending: false })
        .limit(6),
    ]);
    const priorBlock =
      (prior.data ?? [])
        .map((p) => `- [${p.snapshot_date}] ${p.competitor_name}: ${p.pricing_model ?? "?"} — ${p.recent_changes?.slice(0, 140) ?? ""}`)
        .join("\n") || "(no previous snapshots — these are baselines)";
    return `${brand}\n\nTracked competitors:\n${comps}\n\nPrevious pricing snapshots (compare against):\n${priorBlock}`;
  },
  buildSearchQueries: async (admin, ids) => {
    const names = await topCompetitors(admin, ids, 3);
    return names.map((n) => `${n} pricing plans cost per user`).slice(0, 5);
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.snapshots.map((s) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      ...s,
    }));
    const { error } = await admin.from("pricing_intelligence").insert(rows);
    if (error) throw new Error(`Failed to write pricing_intelligence: ${error.message}`);
    return `${rows.length} pricing snapshots written`;
  },
};

// ── R-WL · Win/Loss Analyst ─────────────────────────────────────

const winLossSchema = z.object({
  analyses: z
    .array(
      z.object({
        deal_id: z.string().min(2).max(60),
        outcome: z.enum(["win", "loss", "no_decision", "closed_lost_to_competitor", "closed_lost_to_status_quo"]),
        account_name: z.string().min(2).max(120),
        account_segment: z.string().max(60),
        account_size: z.string().max(60),
        competitor: z.string().max(120),
        primary_factors: z.string().min(10),
        key_quotes: z.string().min(5),
        patterns_observed: z.string().min(10),
        recommendation: z.string().min(10),
        sources: z.string(),
      }),
    )
    .min(2)
    .max(4),
});

const rwl: WorkflowSpec<typeof winLossSchema> = {
  code: "R-WL",
  task: "Produce representative win/loss deal teardowns for this brand against its highest-risk competitors, grounded in the competitive intelligence below and the web research on how these vendors actually compete. IMPORTANT: no real CRM is connected yet — generate clearly-labeled SYNTHETIC representative deals (deal_id prefixed 'SYN-', fictional account names) that illustrate realistic competitive dynamics. Note in sources that the deal is synthetic, citing the research URLs that ground the competitive dynamics.",
  outputInstruction:
    '{"analyses": [{"deal_id": "SYN-001", "outcome": "win|loss|no_decision|closed_lost_to_competitor|closed_lost_to_status_quo", "account_name": "fictional but realistic", "account_segment": "SMB|mid-market|enterprise", "account_size": "e.g. 45 locations / 1,200 hourly workers", "competitor": "...", "primary_factors": "...", "key_quotes": "representative buyer quotes", "patterns_observed": "...", "recommendation": "...", "sources": "synthetic deal — competitive dynamics from: url1, url2"}]} — 2 to 4 teardowns with mixed outcomes.',
  outputSchema: winLossSchema,
  maxTokens: 7000,
  buildContext: async (admin, ids) => {
    const [brand, comps, dossiers] = await Promise.all([
      brandBlock(admin, ids),
      competitorBlock(admin, ids),
      admin
        .from("competitive_dossiers")
        .select("competitor_name, strategic_move, competitive_landmines")
        .eq("brand_id", ids.brandId)
        .order("run_date", { ascending: false })
        .limit(4),
    ]);
    const dossierBlock =
      (dossiers.data ?? [])
        .map((d) => `- ${d.competitor_name}: ${d.strategic_move?.slice(0, 180) ?? ""} | landmines: ${d.competitive_landmines?.slice(0, 180) ?? ""}`)
        .join("\n") || "(no dossiers yet — rely on the web research)";
    return `${brand}\n\nTracked competitors:\n${comps}\n\nLatest dossier intel:\n${dossierBlock}`;
  },
  buildSearchQueries: async (admin, ids) => {
    const names = await topCompetitors(admin, ids, 2);
    return [
      ...names.map((n) => `"switched from ${n}" OR "${n} vs" review comparison`),
      "workforce management software buying decision criteria reviews",
    ].slice(0, 4);
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.analyses.map((a) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      deal_date: new Date().toISOString().slice(0, 10),
      ...a,
    }));
    const { error } = await admin.from("win_loss_analyses").insert(rows);
    if (error) throw new Error(`Failed to write win_loss_analyses: ${error.message}`);
    return `${rows.length} win/loss teardowns written (synthetic deals)`;
  },
};

// ── S-RM · Roadmap Steering ─────────────────────────────────────

const roadmapSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(5).max(160),
        category: z.string().min(3).max(80),
        summary: z.string().min(10),
        evidence: z.string().min(10),
        usable_score: z.number().int().min(1).max(10),
        usable_rationale: z.string().min(5),
        valuable_score: z.number().int().min(1).max(10),
        valuable_rationale: z.string().min(5),
        feasible_score: z.number().int().min(1).max(10),
        feasible_rationale: z.string().min(5),
        viable_score: z.number().int().min(1).max(10),
        viable_rationale: z.string().min(5),
        recommendation: z.enum(["build", "investigate", "defer", "kill"]),
        priority: z.enum(["critical", "high", "medium", "low"]),
        tags: z.string(),
        sources: z.string().min(5),
      }),
    )
    .min(2)
    .max(5),
});

const srm: WorkflowSpec<typeof roadmapSchema> = {
  code: "S-RM",
  task: "Identify product gaps and opportunities for this brand from the web research (user reviews, competitor capabilities, market demand) and run each through the full UVFV assessment per your operating instructions. The recommendation must follow the pass-count rule (pass at 5+: 4 passes = build, 3 = investigate, 2 = defer, 0-1 = kill) and priority must follow the average-score bands. Cite evidence sources.",
  outputInstruction:
    '{"items": [{"title": "...", "category": "e.g. compliance / scheduling AI / integrations / mobile UX", "summary": "the gap or opportunity", "evidence": "specific data points with sources", "usable_score": 1-10, "usable_rationale": "...", "valuable_score": 1-10, "valuable_rationale": "...", "feasible_score": 1-10, "feasible_rationale": "...", "viable_score": 1-10, "viable_rationale": "...", "recommendation": "build|investigate|defer|kill", "priority": "critical|high|medium|low", "tags": "comma,separated", "sources": "url1, url2"}]} — 2 to 5 items.',
  outputSchema: roadmapSchema,
  maxTokens: 8000,
  buildContext: async (admin, ids) => {
    const [brand, comps, prior] = await Promise.all([
      brandBlock(admin, ids),
      competitorBlock(admin, ids),
      admin
        .from("roadmap_items")
        .select("title, recommendation, item_date")
        .eq("brand_id", ids.brandId)
        .order("item_date", { ascending: false })
        .limit(10),
    ]);
    const priorBlock =
      (prior.data ?? []).map((r) => `- [${r.item_date}] ${r.title} → ${r.recommendation ?? "?"}`).join("\n") ||
      "(no previous items — first run)";
    return `${brand}\n\nCompetitor landscape:\n${comps}\n\nExisting roadmap items (do NOT duplicate; note tier movement if re-assessing):\n${priorBlock}`;
  },
  buildSearchQueries: async (admin, ids) => {
    const { data: brand } = await admin.from("brands").select("name").eq("id", ids.brandId).maybeSingle();
    const names = await topCompetitors(admin, ids, 2);
    const b = brand?.name ?? "the product";
    return [
      `${b} reviews complaints missing features G2`,
      ...names.map((n) => `${n} new features changelog ${new Date().getFullYear()}`),
      "workforce management software feature requests trends",
    ].slice(0, 5);
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.items.map((i) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      item_date: new Date().toISOString().slice(0, 10),
      ...i,
      overall_score:
        Math.round(((i.usable_score + i.valuable_score + i.feasible_score + i.viable_score) / 4) * 100) / 100,
    }));
    const { error } = await admin.from("roadmap_items").insert(rows);
    if (error) throw new Error(`Failed to write roadmap_items: ${error.message}`);
    return `${rows.length} roadmap items written`;
  },
};

export const RESEARCH_SPECS: Record<string, WorkflowSpec<z.ZodTypeAny>> = {
  "R-CI": rci as WorkflowSpec<z.ZodTypeAny>,
  "R-PP": rpp as WorkflowSpec<z.ZodTypeAny>,
  "R-WL": rwl as WorkflowSpec<z.ZodTypeAny>,
  "S-RM": srm as WorkflowSpec<z.ZodTypeAny>,
};
