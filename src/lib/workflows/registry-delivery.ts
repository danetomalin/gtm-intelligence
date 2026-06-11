// ============================================================
// NATIVE WORKFLOW REGISTRY — tranche 4: remaining delivery tier
// + tranche 6 brand-repository ingestion.
//   D-SN  sales_collateral          (longer-form leave-behinds)
//   D-CN  counter_narrative_memos   (responds to a bearish signal)
//   D-OB  enablement_assets         (objection_handler)
//   D-WW  enablement_assets         (win_wire)
//   R-BR  brand repository          (voice rules / proof points /
//                                    capabilities / personas — 4 tables)
// ============================================================

import { z } from "zod";
import { flexText } from "./schema-utils";
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

async function positioningBlock(admin: SupabaseClient, ids: WorkflowIds): Promise<string> {
  const { data } = await admin
    .from("positioning_elements")
    .select("element_type, content")
    .eq("brand_id", ids.brandId)
    .order("created_at", { ascending: false })
    .limit(5);
  return (data ?? []).map((x) => `- [${x.element_type}] ${x.content?.slice(0, 250)}`).join("\n") || "(no positioning yet — derive from brand context)";
}

// ── D-SN · Sales Narrative & Collateral ─────────────────────────

const collateralSchema = z.object({
  collateral: z
    .array(
      z.object({
        collateral_type: z.enum(["pitch_deck_outline", "competitive_comparison", "roi_calculator_inputs", "case_study_draft", "executive_briefing"]),
        target_account: flexText(0),
        target_segment: flexText(2, 80),
        competitors: flexText(0),
        content: flexText(100),
        positioning_refs: flexText(5),
        messaging_refs: flexText(0),
      }),
    )
    .min(1)
    .max(2),
});

const dsn: WorkflowSpec<typeof collateralSchema> = {
  code: "D-SN",
  task: "Produce ONE piece of longer-form sales collateral from the intelligence below — pick the single most useful type given what data exists (pitch deck outline or competitive comparison are usually safest on a fresh brand). One piece only: depth beats breadth, and each run adds a different piece to the library. Narrative consistency with the positioning framework is mandatory; cite which positioning elements it draws on; flag any claim lacking proof.",
  outputInstruction:
    '{"collateral": [{"collateral_type": "pitch_deck_outline|competitive_comparison|roi_calculator_inputs|case_study_draft|executive_briefing", "target_account": "segment-level if no specific account", "target_segment": "...", "competitors": "comma,separated or empty", "content": "the full structured collateral in markdown", "positioning_refs": "which elements it draws on", "messaging_refs": "..."}]} — 1 to 2 pieces.',
  outputSchema: collateralSchema,
  maxTokens: 8000,
  buildContext: async (admin, ids) => {
    const [brand, positioning, dossiers, battlecards, evidence] = await Promise.all([
      brandBlock(admin, ids),
      positioningBlock(admin, ids),
      admin.from("competitive_dossiers").select("competitor_name, strategic_move, risk_assessment").eq("brand_id", ids.brandId).order("run_date", { ascending: false }).limit(4),
      admin.from("battlecards").select("competitor_name, kill_points, competitor_weaknesses").eq("brand_id", ids.brandId).limit(3),
      admin.from("customer_evidence").select("evidence_type, content").eq("brand_id", ids.brandId).limit(5),
    ]);
    const d = (dossiers.data ?? []).map((x) => `- ${x.competitor_name} (${x.risk_assessment}): ${x.strategic_move?.slice(0, 140)}`).join("\n") || "(none)";
    const b = (battlecards.data ?? []).map((x) => `- ${x.competitor_name}: kill points ${x.kill_points?.slice(0, 140)}`).join("\n") || "(none)";
    const e = (evidence.data ?? []).map((x) => `- [${x.evidence_type}] ${x.content?.slice(0, 120)}`).join("\n") || "(none)";
    return `${brand}\n\nPositioning:\n${positioning}\n\nDossiers:\n${d}\n\nBattlecards:\n${b}\n\nEvidence:\n${e}`;
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.collateral.map((c) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      source_data_date: new Date().toISOString().slice(0, 10),
      ...c,
      approval_status: "pending_review",
      risk_tier: "high",
    }));
    const { error } = await admin.from("sales_collateral").insert(rows);
    if (error) throw new Error(`Failed to write sales_collateral: ${error.message}`);
    return `${rows.length} collateral pieces written (pending review)`;
  },
};

// ── D-CN · Counter-Narrative Responder ──────────────────────────

const counterSchema = z.object({
  competitor_named: flexText(2, 120),
  rep_talking_points: flexText(50),
  suggested_linkedin_post: flexText(50),
  email_reply_template: flexText(50),
  positioning_anchor: flexText(5),
  sources: flexText(0),
});

const dcn: WorkflowSpec<typeof counterSchema> = {
  code: "D-CN",
  task: "The bearish market signal below threatens this brand's narrative. Draft the one-page counter-narrative: confident rep talking points (3-5), a suggested LinkedIn post in the brand voice (no clickbait contrasts), and an email reply template for prospects who raise it. Anchor everything to the positioning framework — counter with what the brand IS, not by attacking.",
  outputInstruction:
    '{"competitor_named": "who the signal concerns", "rep_talking_points": "3-5 points", "suggested_linkedin_post": "<200 words", "email_reply_template": "subject + body", "positioning_anchor": "which element this defends", "sources": "the signal + supporting intel"}',
  outputSchema: counterSchema,
  maxTokens: 5000,
  buildContext: async (admin, ids) => {
    const { data: signal } = await admin
      .from("market_signals")
      .select("id, headline, summary, strategic_commentary, impact_score, sentiment")
      .eq("brand_id", ids.brandId)
      .eq("sentiment", "bearish")
      .order("impact_score", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!signal) {
      throw new Error("No bearish market signal to counter — run R-MS first so there is a triggering signal.");
    }
    const [brand, positioning] = await Promise.all([brandBlock(admin, ids), positioningBlock(admin, ids)]);
    return `${brand}\n\nTRIGGERING SIGNAL [impact ${signal.impact_score}, id ${signal.id}]:\n${signal.headline}\n${signal.summary}\nCommentary: ${signal.strategic_commentary}\n\nPositioning:\n${positioning}`;
  },
  write: async (admin, ids, parsed) => {
    const { data: signal } = await admin
      .from("market_signals")
      .select("id, headline, category")
      .eq("brand_id", ids.brandId)
      .eq("sentiment", "bearish")
      .order("impact_score", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await admin.from("counter_narrative_memos").insert({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      triggering_signal_id: signal?.id ?? null,
      triggering_signal_summary: signal?.headline ?? null,
      category: signal?.category ?? null,
      ...parsed,
      approval_status: "pending_review",
      risk_tier: "high",
    });
    if (error) throw new Error(`Failed to write counter_narrative_memos: ${error.message}`);
    return `Counter-narrative written for ${parsed.competitor_named} (pending review)`;
  },
};

// ── D-OB / D-WW · enablement assets ─────────────────────────────

const enablementSchema = z.object({
  title: flexText(5, 200),
  body_markdown: flexText(150),
  source_refs: flexText(5),
});

function enablementSpec(
  code: string,
  assetType: "objection_handler" | "win_wire",
  audience: "sales" | "both",
  task: string,
  context: (admin: SupabaseClient, ids: WorkflowIds) => Promise<string>,
): WorkflowSpec<typeof enablementSchema> {
  return {
    code,
    task,
    outputInstruction:
      '{"title": "...", "body_markdown": "the full scannable asset in markdown — bullets over prose, no section over 6 bullets", "source_refs": "what intel this draws on"}',
    outputSchema: enablementSchema,
    maxTokens: 6000,
    buildContext: context,
    write: async (admin, ids, parsed) => {
      const { error } = await admin.from("enablement_assets").insert({
        organization_id: ids.organizationId,
        brand_id: ids.brandId,
        asset_type: assetType,
        audience,
        ...parsed,
        produced_by: code,
        approval_status: "pending_review",
      });
      if (error) throw new Error(`Failed to write enablement_assets: ${error.message}`);
      return `${assetType} written: ${parsed.title} (pending review)`;
    },
  };
}

const dob = enablementSpec(
  "D-OB",
  "objection_handler",
  "sales",
  "Build the objection-handler asset: for each common objection (5-8), why it comes up, a confident non-defensive response framework, a proof point (or 'proof pending'), and the escalation path. Draw objections from the battlecards and win/loss patterns below.",
  async (admin, ids) => {
    const [brand, battlecards, winloss, personas] = await Promise.all([
      brandBlock(admin, ids),
      admin.from("battlecards").select("competitor_name, objections, competitor_strengths").eq("brand_id", ids.brandId).limit(3),
      admin.from("win_loss_analyses").select("outcome, primary_factors, key_quotes").eq("brand_id", ids.brandId).limit(6),
      admin.from("buyer_personas").select("persona_name, pain_points").eq("brand_id", ids.brandId).limit(5),
    ]);
    const b = (battlecards.data ?? []).map((x) => `- vs ${x.competitor_name}: ${x.objections?.slice(0, 180) ?? ""}`).join("\n") || "(none)";
    const w = (winloss.data ?? []).map((x) => `- [${x.outcome}] ${x.primary_factors?.slice(0, 140) ?? ""}`).join("\n") || "(none)";
    const p = (personas.data ?? []).map((x) => `- ${x.persona_name}: ${x.pain_points ?? ""}`).join("\n") || "(none)";
    return `${brand}\n\nBattlecard objections:\n${b}\n\nWin/loss factors:\n${w}\n\nPersonas:\n${p}`;
  },
);

const dww = enablementSpec(
  "D-WW",
  "win_wire",
  "both",
  "Write a win wire for the most instructive recent WIN in the win/loss data below: the deal arc, the decisive moment, who said what, and the replicable plays. Internal-facing celebration + replication doc. If the wins are synthetic (SYN- deals), say so in the header.",
  async (admin, ids) => {
    const [brand, wins] = await Promise.all([
      brandBlock(admin, ids),
      admin
        .from("win_loss_analyses")
        .select("deal_id, account_name, account_segment, competitor, primary_factors, key_quotes, recommendation")
        .eq("brand_id", ids.brandId)
        .eq("outcome", "win")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
    if (!wins.data || wins.data.length === 0) {
      throw new Error("No win-outcome deals in win_loss_analyses — run R-WL first.");
    }
    const w = wins.data
      .map((x) => `- ${x.deal_id} ${x.account_name} (${x.account_segment}) vs ${x.competitor}: ${x.primary_factors?.slice(0, 200)} | quotes: ${x.key_quotes?.slice(0, 150)}`)
      .join("\n");
    return `${brand}\n\nRecent wins:\n${w}`;
  },
);

// ── R-BR · Brand Repository (Brand Code Ingestion) ──────────────

// flexText now lives in schema-utils (shared by every spec file).

const brandRepoSchema = z.object({
  voice_rules: z
    .array(
      z.object({
        rule_type: z.enum(["tone", "banned_phrase", "preferred_term", "formatting", "do_not_say", "always_say", "reading_level"]),
        rule: flexText(5),
        rationale: flexText(0),
      }),
    )
    .min(3)
    .max(10),
  proof_points: z
    .array(
      z.object({
        proof_type: z.enum(["metric", "customer_quote", "case_study_excerpt", "third_party_validation", "award", "certification"]),
        claim: flexText(10),
        attribution: flexText(0),
      }),
    )
    .min(2)
    .max(8),
  capabilities: z
    .array(
      z.object({
        capability_name: flexText(3, 160),
        category: flexText(0),
        feature_description: flexText(10),
        buyer_benefit: flexText(10),
        competitive_gap: flexText(0),
        status: z.enum(["ga", "beta", "alpha", "planned", "sunset"]),
      }),
    )
    .min(3)
    .max(10),
  personas: z
    .array(
      z.object({
        persona_name: flexText(3, 120),
        title: flexText(3, 160),
        segment: flexText(0),
        pain_points: flexText(10),
        goals: flexText(10),
      }),
    )
    .min(2)
    .max(5),
});

const rbr: WorkflowSpec<typeof brandRepoSchema> = {
  code: "R-BR",
  task: "Ingest this brand's brand code from the brand context below (no web research is available in this run): voice rules (tone, preferred/banned terms), proof points (mark every claim's attribution honestly — use 'unverified — needs source' where you cannot ground it), product capabilities (with buyer benefit + competitive gap), and buyer personas. Every downstream workflow reads these tables, so be precise rather than exhaustive.",
  outputInstruction:
    '{"voice_rules": [{"rule_type": "tone|banned_phrase|preferred_term|formatting|do_not_say|always_say|reading_level", "rule": "...", "rationale": "..."}], "proof_points": [{"proof_type": "metric|customer_quote|case_study_excerpt|third_party_validation|award|certification", "claim": "...", "attribution": "source or \'unverified — from research\'"}], "capabilities": [{"capability_name": "...", "category": "...", "feature_description": "...", "buyer_benefit": "...", "competitive_gap": "...", "status": "ga|beta|alpha|planned|sunset"}], "personas": [{"persona_name": "...", "title": "...", "segment": "...", "pain_points": "single semicolon-separated STRING, not an array", "goals": "single STRING, not an array"}]} — every field is a plain string; never use nested arrays for prose fields.',
  outputSchema: brandRepoSchema,
  maxTokens: 8000,
  // Tavily intentionally removed for now (Dane 2026-06-11) — R-BR runs on
  // brand context alone so Stage 1 needs no search key. Re-add
  // buildSearchQueries to ground proof points in web research later.
  buildContext: brandBlock,
  write: async (admin, ids, parsed) => {
    const base = { organization_id: ids.organizationId, brand_id: ids.brandId };
    const [vr, pp, pc, bp] = await Promise.all([
      admin.from("brand_voice_rules").insert(parsed.voice_rules.map((r) => ({ ...base, ...r }))),
      admin.from("brand_proof_points").insert(parsed.proof_points.map((r) => ({ ...base, ...r }))),
      admin.from("product_capabilities").insert(parsed.capabilities.map((r) => ({ ...base, ...r }))),
      admin.from("buyer_personas").insert(parsed.personas.map((r) => ({ ...base, ...r }))),
    ]);
    const firstError = vr.error ?? pp.error ?? pc.error ?? bp.error;
    if (firstError) throw new Error(`Brand repository write failed: ${firstError.message}`);
    return `Brand repository ingested: ${parsed.voice_rules.length} voice rules, ${parsed.proof_points.length} proof points, ${parsed.capabilities.length} capabilities, ${parsed.personas.length} personas`;
  },
};

export const DELIVERY_SPECS: Record<string, WorkflowSpec<z.ZodTypeAny>> = {
  "D-SN": dsn as WorkflowSpec<z.ZodTypeAny>,
  "D-CN": dcn as WorkflowSpec<z.ZodTypeAny>,
  "D-OB": dob as WorkflowSpec<z.ZodTypeAny>,
  "D-WW": dww as WorkflowSpec<z.ZodTypeAny>,
  "R-BR": rbr as WorkflowSpec<z.ZodTypeAny>,
};
