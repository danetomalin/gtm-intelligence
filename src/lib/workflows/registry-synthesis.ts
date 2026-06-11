// ============================================================
// NATIVE WORKFLOW REGISTRY — tranche 3a: the synthesis tier.
//   S-PO positioning_elements (one row per element type, versioned)
//   S-BC battlecards (per competitor, Kellogg value-prop structure)
//   R-CF feedback_themes        R-PF product_feedback
//   R-EV customer_evidence      S-AR analyst_briefings
//   S-LP launch_plans           S-CP campaign_performance
//   S-DB daily_briefs (uses the existing server-side snapshot)
// Synthesis archetype: no web search — these read upstream workflow
// outputs. Output shapes mirror the n8n chain exactly.
// ============================================================

import { z } from "zod";
import { flexText } from "./schema-utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowIds, WorkflowSpec } from "./engine";
import { buildDailyBriefSnapshot } from "@/lib/daily-brief-snapshot";

const today = () => new Date().toISOString().slice(0, 10);
const loose = z.record(z.string(), z.unknown());

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

async function intelBlock(admin: SupabaseClient, ids: WorkflowIds): Promise<string> {
  const [dossiers, signals, feedback] = await Promise.all([
    admin
      .from("competitive_dossiers")
      .select("competitor_name, strategic_move, risk_assessment, competitive_landmines")
      .eq("brand_id", ids.brandId)
      .order("run_date", { ascending: false })
      .limit(4),
    admin
      .from("market_signals")
      .select("headline, strategic_commentary, impact_score, sentiment")
      .eq("brand_id", ids.brandId)
      .order("impact_score", { ascending: false })
      .limit(8),
    admin
      .from("feedback_themes")
      .select("theme_name, summary, urgency")
      .eq("brand_id", ids.brandId)
      .limit(6),
  ]);
  const d = (dossiers.data ?? [])
    .map((x) => `- ${x.competitor_name} (${x.risk_assessment ?? "?"}): ${x.strategic_move?.slice(0, 160) ?? ""}`)
    .join("\n") || "(no dossiers yet)";
  const s = (signals.data ?? [])
    .map((x) => `- [${x.impact_score}/${x.sentiment}] ${x.headline}: ${x.strategic_commentary?.slice(0, 140) ?? ""}`)
    .join("\n") || "(no signals yet)";
  const f = (feedback.data ?? [])
    .map((x) => `- ${x.theme_name} (${x.urgency ?? "?"}): ${x.summary?.slice(0, 120) ?? ""}`)
    .join("\n") || "(no feedback themes yet)";
  return `Latest dossiers:\n${d}\n\nTop market signals:\n${s}\n\nFeedback themes:\n${f}`;
}

// ── S-PO · Positioning Engine ───────────────────────────────────

const positioningSchema = z.object({
  elements: z
    .array(
      z.object({
        element_type: z.enum(["competitive_alternatives", "distinct_capabilities", "differentiated_value", "best_fit_accounts", "market_category"]),
        content: flexText(20),
        evidence: flexText(10),
        last_change_reason: flexText(5),
      }),
    )
    .length(5),
});

const spo: WorkflowSpec<typeof positioningSchema> = {
  code: "S-PO",
  task: "Produce a fresh version of all FIVE positioning elements for this brand from the intelligence below, per your operating instructions (five-element framework). Every distinct capability must name an alternative that lacks it; every differentiated value must map to a capability; best-fit accounts must be specific segments with observable signals. Document why each element changed (or 'initial version' on first run).",
  outputInstruction:
    '{"elements": [{"element_type": "competitive_alternatives|distinct_capabilities|differentiated_value|best_fit_accounts|market_category", "content": "the element", "evidence": "what supports it", "last_change_reason": "why it changed vs the prior version"}]} — exactly 5 elements, one per type.',
  outputSchema: positioningSchema,
  maxTokens: 6000,
  buildContext: async (admin, ids) => {
    const [brand, intel, prior] = await Promise.all([
      brandBlock(admin, ids),
      intelBlock(admin, ids),
      admin
        .from("positioning_elements")
        .select("element_type, content")
        .eq("brand_id", ids.brandId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    const p = (prior.data ?? []).map((x) => `- [${x.element_type}] ${x.content?.slice(0, 200)}`).join("\n") || "(first run — initial version)";
    return `${brand}\n\n${intel}\n\nPrior positioning elements:\n${p}`;
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.elements.map((e) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      ...e,
    }));
    const { error } = await admin.from("positioning_elements").insert(rows);
    if (error) throw new Error(`Failed to write positioning_elements: ${error.message}`);
    return "5 positioning elements written (fresh version)";
  },
};

// ── S-BC · Battlecard Generator ─────────────────────────────────

const battlecardSchema = z.object({
  cards: z
    .array(
      z.object({
        competitor_name: flexText(2, 120),
        elevator_pitch: flexText(20),
        value_prop: flexText(10),
        features_benefits: flexText(10),
        target_personas: flexText(5),
        pain_points: flexText(10),
        qualifying_questions: flexText(10),
        competitor_profile: flexText(10),
        competitor_strengths: flexText(10),
        competitor_weaknesses: flexText(10),
        kill_points: flexText(10),
        objections: flexText(10),
        success_stories: flexText(5),
      }),
    )
    .min(1)
    .max(3),
});

const sbc: WorkflowSpec<typeof battlecardSchema> = {
  code: "S-BC",
  task: "Produce sales-ready battlecards for the highest-risk competitors using the dossiers, signals, and positioning below. Follow your operating instructions strictly: company-first framing, HONEST competitor strengths, Kellogg functional/monetary/psychological value prop, single specific target buyer, no section over 6 bullets, 'Proof points pending' rather than invented metrics.",
  outputInstruction:
    '{"cards": [{"competitor_name": "...", "elevator_pitch": "30-second pitch w/ target market", "value_prop": "functional/monetary/psychological vs this competitor", "features_benefits": "3-5 feature→benefit mappings", "target_personas": "one specific buyer profile", "pain_points": "their pains on the competitor today", "qualifying_questions": "3-5 non-leading questions", "competitor_profile": "2-3 neutral sentences", "competitor_strengths": "honest strengths", "competitor_weaknesses": "evidence-backed", "kill_points": "exact tactics", "objections": "objection: response pairs", "success_stories": "stories + metrics or \'Proof points pending\'"}]} — max 3 cards, highest risk first.',
  outputSchema: battlecardSchema,
  maxTokens: 8000,
  buildContext: async (admin, ids) => {
    const [brand, intel, positioning] = await Promise.all([
      brandBlock(admin, ids),
      intelBlock(admin, ids),
      admin
        .from("positioning_elements")
        .select("element_type, content")
        .eq("brand_id", ids.brandId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    const p = (positioning.data ?? []).map((x) => `- [${x.element_type}] ${x.content?.slice(0, 250)}`).join("\n") || "(no positioning yet — derive from brand context)";
    return `${brand}\n\n${intel}\n\nPositioning framework:\n${p}`;
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.cards.map((c) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      ...c,
    }));
    const { error } = await admin.from("battlecards").insert(rows);
    if (error) throw new Error(`Failed to write battlecards: ${error.message}`);
    return `${rows.length} battlecards written (${rows.map((r) => r.competitor_name).join(", ")})`;
  },
};

// ── R-CF · Customer Feedback Synthesis ──────────────────────────

const themesSchema = z.object({
  themes: z
    .array(
      z.object({
        theme_name: flexText(3, 160),
        category: flexText(3, 80),
        summary: flexText(20),
        representative_quotes: flexText(10),
        frequency: z.enum(["low", "medium", "high"]),
        urgency: z.enum(["Critical", "High", "Medium", "Low"]),
        revenue_impact: z.enum(["High", "Medium", "Low"]),
        strategic_alignment: z.enum(["Aligned", "Neutral", "Misaligned"]),
        // min(3): terse-but-legit actions ("Monitor") shouldn't fail the
        // run — live R-CF run tripped the old min(10) on one theme.
        recommended_action: flexText(3),
      }),
    )
    .min(2)
    .max(6),
});

const rcf: WorkflowSpec<typeof themesSchema> = {
  code: "R-CF",
  task: "Synthesize customer feedback themes for this brand. No raw feedback channels are connected yet, so derive REPRESENTATIVE themes from the available intelligence (dossiers, signals, win/loss patterns, product feedback rows) plus the brand's market context — quotes must be clearly representative composites attributed by segment, never to named customers. A single loud source is not a theme: note source count reasoning in the summary.",
  outputInstruction:
    '{"themes": [{"theme_name": "...", "category": "feature_request|pain_point|competitive_mention|pricing|onboarding|use_case_expansion", "summary": "3-5 sentences incl. source-count reasoning", "representative_quotes": "2-3 composite quotes attributed by segment", "frequency": "low|medium|high", "urgency": "Critical|High|Medium|Low", "revenue_impact": "High|Medium|Low", "strategic_alignment": "Aligned|Neutral|Misaligned", "recommended_action": "build|investigate|communicate|no action + why"}]} — 2 to 6 themes.',
  outputSchema: themesSchema,
  maxTokens: 6000,
  buildContext: async (admin, ids) => {
    const [brand, intel, winloss, roadmap] = await Promise.all([
      brandBlock(admin, ids),
      intelBlock(admin, ids),
      admin
        .from("win_loss_analyses")
        .select("outcome, competitor, primary_factors")
        .eq("brand_id", ids.brandId)
        .order("created_at", { ascending: false })
        .limit(6),
      admin
        .from("roadmap_items")
        .select("title, recommendation")
        .eq("brand_id", ids.brandId)
        .order("item_date", { ascending: false })
        .limit(8),
    ]);
    const w = (winloss.data ?? []).map((x) => `- ${x.outcome} vs ${x.competitor ?? "?"}: ${x.primary_factors?.slice(0, 140) ?? ""}`).join("\n") || "(no win/loss yet)";
    const r = (roadmap.data ?? []).map((x) => `- ${x.title} → ${x.recommendation ?? "?"}`).join("\n") || "(no roadmap items yet)";
    return `${brand}\n\n${intel}\n\nWin/loss patterns:\n${w}\n\nRoadmap items (cross-reference themes against these):\n${r}`;
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.themes.map((t) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      ...t,
    }));
    const { error } = await admin.from("feedback_themes").insert(rows);
    if (error) throw new Error(`Failed to write feedback_themes: ${error.message}`);
    return `${rows.length} feedback themes written`;
  },
};

// ── R-PF · Product Feedback ─────────────────────────────────────

const productFeedbackSchema = z.object({
  items: z
    .array(
      z.object({
        source: z.enum(["support_ticket", "sales_call", "nps_open", "user_interview", "community", "review"]),
        customer_segment: flexText(2, 60),
        raw_excerpt: flexText(10),
        themed_summary: flexText(10),
        severity: z.enum(["low", "medium", "high", "critical"]),
        recurrence_count: z.number().int().min(1).max(50),
        recommendation: flexText(10),
        sources: flexText(0),
      }),
    )
    .min(2)
    .max(6),
});

const rpf: WorkflowSpec<typeof productFeedbackSchema> = {
  code: "R-PF",
  task: "Produce themed product feedback entries for this brand. No support/call channels are connected yet — derive REPRESENTATIVE feedback items from review-site patterns visible in the intelligence below and the brand's known product surface, marked as representative composites in sources. Severity reflects deal/churn impact; recurrence reflects how widespread the pattern plausibly is.",
  outputInstruction:
    '{"items": [{"source": "support_ticket|sales_call|nps_open|user_interview|community|review", "customer_segment": "SMB|mid-market|enterprise", "raw_excerpt": "representative verbatim", "themed_summary": "the theme it belongs to", "severity": "low|medium|high|critical", "recurrence_count": 1-50, "recommendation": "...", "sources": "representative composite — grounded in: ..."}]} — 2 to 6 items.',
  outputSchema: productFeedbackSchema,
  maxTokens: 5000,
  buildContext: async (admin, ids) => {
    const [brand, intel] = await Promise.all([brandBlock(admin, ids), intelBlock(admin, ids)]);
    return `${brand}\n\n${intel}`;
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.items.map((i) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      feedback_date: today(),
      ...i,
    }));
    const { error } = await admin.from("product_feedback").insert(rows);
    if (error) throw new Error(`Failed to write product_feedback: ${error.message}`);
    return `${rows.length} product feedback items written`;
  },
};

// ── R-EV · Customer Evidence ────────────────────────────────────

const evidenceSchema = z.object({
  evidence: z
    .array(
      z.object({
        customer_name: flexText(2, 120),
        customer_segment: flexText(2, 60),
        evidence_type: z.enum(["quote", "case_study", "metric", "nps_verbatim", "review", "reference_call_note"]),
        content: flexText(15),
        attribution: flexText(3),
        positioning_alignment: flexText(5),
        legal_status: z.enum(["approved", "pending_legal", "anonymize_only", "do_not_use"]),
        sources: flexText(0),
      }),
    )
    .min(2)
    .max(6),
});

const rev: WorkflowSpec<typeof evidenceSchema> = {
  code: "R-EV",
  task: "Curate a customer evidence library for this brand. No evidence sources are connected yet — generate clearly-labeled REPRESENTATIVE evidence entries (fictional but realistic customer names, marked representative in sources) that map to the positioning elements below. Set legal_status to pending_legal for everything since none of it has been cleared.",
  outputInstruction:
    '{"evidence": [{"customer_name": "fictional but realistic", "customer_segment": "SMB|mid-market|enterprise", "evidence_type": "quote|case_study|metric|nps_verbatim|review|reference_call_note", "content": "the evidence", "attribution": "role @ company", "positioning_alignment": "which positioning element it proves", "legal_status": "pending_legal", "sources": "representative composite"}]} — 2 to 6 entries.',
  outputSchema: evidenceSchema,
  maxTokens: 5000,
  buildContext: async (admin, ids) => {
    const [brand, positioning] = await Promise.all([
      brandBlock(admin, ids),
      admin
        .from("positioning_elements")
        .select("element_type, content")
        .eq("brand_id", ids.brandId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    const p = (positioning.data ?? []).map((x) => `- [${x.element_type}] ${x.content?.slice(0, 250)}`).join("\n") || "(no positioning yet — derive from brand context)";
    return `${brand}\n\nPositioning to prove:\n${p}`;
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.evidence.map((e) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      evidence_date: today(),
      ...e,
    }));
    const { error } = await admin.from("customer_evidence").insert(rows);
    if (error) throw new Error(`Failed to write customer_evidence: ${error.message}`);
    return `${rows.length} evidence entries written (all pending_legal)`;
  },
};

// ── S-AR · Analyst Relations ────────────────────────────────────

const briefingSchema = z.object({
  briefings: z
    .array(
      z.object({
        analyst_firm: flexText(2, 120),
        briefing_type: z.enum(["initial", "update", "inquiry", "quadrant_input", "wave_input"]),
        key_messages: flexText(20),
        proof_points: flexText(10),
        competitor_framing: flexText(10),
        questions_likely: flexText(10),
        positioning_anchor: flexText(5),
        sources: flexText(0),
      }),
    )
    .min(1)
    .max(2),
});

const sar: WorkflowSpec<typeof briefingSchema> = {
  code: "S-AR",
  task: "Prepare analyst briefing materials for this brand (Gartner and/or Forrester) from the positioning, dossiers, and evidence below: key messages, proof points, competitor framing (factual, never dismissive), likely analyst questions with the angle behind each, and the positioning anchor everything ladders to.",
  outputInstruction:
    '{"briefings": [{"analyst_firm": "Gartner|Forrester|IDC", "briefing_type": "initial|update|inquiry|quadrant_input|wave_input", "key_messages": "3-4 messages", "proof_points": "...", "competitor_framing": "...", "questions_likely": "likely questions + the angle behind each", "positioning_anchor": "...", "sources": "what intel this draws on"}]} — 1 to 2 briefings.',
  outputSchema: briefingSchema,
  maxTokens: 6000,
  buildContext: async (admin, ids) => {
    const [brand, intel, positioning, evidence] = await Promise.all([
      brandBlock(admin, ids),
      intelBlock(admin, ids),
      admin.from("positioning_elements").select("element_type, content").eq("brand_id", ids.brandId).order("created_at", { ascending: false }).limit(5),
      admin.from("customer_evidence").select("evidence_type, content").eq("brand_id", ids.brandId).limit(5),
    ]);
    const p = (positioning.data ?? []).map((x) => `- [${x.element_type}] ${x.content?.slice(0, 200)}`).join("\n") || "(none)";
    const e = (evidence.data ?? []).map((x) => `- [${x.evidence_type}] ${x.content?.slice(0, 140)}`).join("\n") || "(none)";
    return `${brand}\n\n${intel}\n\nPositioning:\n${p}\n\nEvidence:\n${e}`;
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.briefings.map((b) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      briefing_date: today(),
      ...b,
    }));
    const { error } = await admin.from("analyst_briefings").insert(rows);
    if (error) throw new Error(`Failed to write analyst_briefings: ${error.message}`);
    return `${rows.length} analyst briefings written`;
  },
};

// ── S-LP · Launch Planning ──────────────────────────────────────

const launchPlanSchema = z.object({
  plans: z
    .array(
      z.object({
        launch_name: flexText(5, 160),
        launch_type: z.enum(["feature", "product", "announcement", "rebrand", "pricing_change", "partnership"]),
        target_personas: flexText(10),
        messaging_pillars: flexText(20),
        channel_plan: flexText(20),
        success_metrics: flexText(10),
        positioning_anchor: flexText(5),
        sources: flexText(0),
      }),
    )
    .min(1)
    .max(2),
});

const slp: WorkflowSpec<typeof launchPlanSchema> = {
  code: "S-LP",
  task: "Draft a channel-aware launch plan for the most launch-worthy opportunity visible in the roadmap and signals below (e.g. a BUILD-rated item or a market moment worth announcing). Personas, messaging pillars anchored to positioning, channel plan with sequencing, and measurable success metrics.",
  outputInstruction:
    '{"plans": [{"launch_name": "...", "launch_type": "feature|product|announcement|rebrand|pricing_change|partnership", "target_personas": "...", "messaging_pillars": "3-4 pillars", "channel_plan": "channels + sequencing", "success_metrics": "measurable", "positioning_anchor": "...", "sources": "which roadmap item/signal motivated this"}]} — 1 to 2 plans.',
  outputSchema: launchPlanSchema,
  maxTokens: 5000,
  buildContext: async (admin, ids) => {
    const [brand, roadmap, positioning, personas] = await Promise.all([
      brandBlock(admin, ids),
      admin.from("roadmap_items").select("title, recommendation, priority, summary").eq("brand_id", ids.brandId).order("item_date", { ascending: false }).limit(8),
      admin.from("positioning_elements").select("element_type, content").eq("brand_id", ids.brandId).order("created_at", { ascending: false }).limit(5),
      admin.from("buyer_personas").select("persona_name, title, pain_points").eq("brand_id", ids.brandId).limit(5),
    ]);
    const r = (roadmap.data ?? []).map((x) => `- ${x.title} [${x.recommendation}/${x.priority}]: ${x.summary?.slice(0, 120) ?? ""}`).join("\n") || "(no roadmap items)";
    const p = (positioning.data ?? []).map((x) => `- [${x.element_type}] ${x.content?.slice(0, 200)}`).join("\n") || "(none)";
    const pe = (personas.data ?? []).map((x) => `- ${x.persona_name} (${x.title ?? ""}): ${x.pain_points ?? ""}`).join("\n") || "(none)";
    return `${brand}\n\nRoadmap items:\n${r}\n\nPositioning:\n${p}\n\nPersonas:\n${pe}`;
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.plans.map((p) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      launch_date_target: null,
      ...p,
    }));
    const { error } = await admin.from("launch_plans").insert(rows);
    if (error) throw new Error(`Failed to write launch_plans: ${error.message}`);
    return `${rows.length} launch plans written`;
  },
};

// ── S-CP · Campaign Performance Analyst ─────────────────────────

const perfSchema = z.object({
  rollups: z
    .array(
      z.object({
        scope: z.enum(["messaging_theme", "channel", "persona", "positioning_element", "overall"]),
        scope_value: flexText(2, 120),
        window_label: flexText(2, 60),
        sends_count: z.number().int().min(0),
        open_rate_pct: z.number().min(0).max(100),
        click_through_rate_pct: z.number().min(0).max(100),
        reply_rate_pct: z.number().min(0).max(100),
        winning_theme: flexText(0),
        losing_theme: flexText(0),
        narrative: flexText(20),
        recommendation: flexText(10),
        sources: flexText(0),
      }),
    )
    .min(1)
    .max(4),
});

const scp: WorkflowSpec<typeof perfSchema> = {
  code: "S-CP",
  task: "Analyze the campaign engagement metrics below and write performance rollups: which themes and channels win, which lose, and what the next messaging refresh should weigh more heavily. Rates must be computed from the actual metric rows provided — do not invent volumes.",
  outputInstruction:
    '{"rollups": [{"scope": "messaging_theme|channel|persona|positioning_element|overall", "scope_value": "...", "window_label": "e.g. last 30 days", "sends_count": N, "open_rate_pct": 0-100, "click_through_rate_pct": 0-100, "reply_rate_pct": 0-100, "winning_theme": "...", "losing_theme": "...", "narrative": "...", "recommendation": "..." , "sources": "campaign_metrics rows analyzed"}]} — 1 to 4 rollups.',
  outputSchema: perfSchema,
  maxTokens: 5000,
  buildContext: async (admin, ids) => {
    const { data: metrics } = await admin
      .from("campaign_metrics")
      .select("*")
      .eq("brand_id", ids.brandId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (!metrics || metrics.length === 0) {
      throw new Error(
        "No campaign_metrics rows for the active brand — run the X-* distribution adapters first so there is engagement data to analyze.",
      );
    }
    const lines = metrics
      .map((m) => `- ${JSON.stringify(m).slice(0, 280)}`)
      .join("\n");
    return `Campaign engagement metrics (${metrics.length} rows, newest first):\n${lines}`;
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.rollups.map((r) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      ...r,
    }));
    const { error } = await admin.from("campaign_performance").insert(rows);
    if (error) throw new Error(`Failed to write campaign_performance: ${error.message}`);
    return `${rows.length} performance rollups written`;
  },
};

// ── S-DB · Daily Brief ──────────────────────────────────────────

const briefSchema = z.object({
  headline: flexText(10, 300),
  focus_items: z
    .array(
      z.object({
        rank: z.number().int().min(1).max(5),
        title: flexText(5, 200),
        why: flexText(10),
        action: flexText(5),
        related_artifact: loose.nullable(),
      }),
    )
    .min(3)
    .max(5),
});

const sdb: WorkflowSpec<typeof briefSchema> = {
  code: "S-DB",
  task: "From the platform snapshot below, produce today's operator brief: a one-line headline and 3-5 ranked focus items (what to look at, why it matters, the concrete action). Prioritize pending approvals, high-impact signals, stale runs, and launches in flight.",
  outputInstruction:
    '{"headline": "one line", "focus_items": [{"rank": 1, "title": "...", "why": "...", "action": "...", "related_artifact": null}]} — 3 to 5 items, rank ascending.',
  outputSchema: briefSchema,
  maxTokens: 4000,
  buildContext: async (admin, ids) => {
    const snapshot = await buildDailyBriefSnapshot(admin, ids.brandId);
    return `Platform snapshot (live):\n${JSON.stringify(snapshot, null, 1).slice(0, 8000)}`;
  },
  write: async (admin, ids, parsed) => {
    const { error } = await admin.from("daily_briefs").insert({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      headline: parsed.headline,
      focus_items: parsed.focus_items,
      model: "native-engine",
    });
    if (error) throw new Error(`Failed to write daily_briefs: ${error.message}`);
    return `Daily brief written (${parsed.focus_items.length} focus items)`;
  },
};

export const SYNTHESIS_SPECS: Record<string, WorkflowSpec<z.ZodTypeAny>> = {
  "S-PO": spo as WorkflowSpec<z.ZodTypeAny>,
  "S-BC": sbc as WorkflowSpec<z.ZodTypeAny>,
  "R-CF": rcf as WorkflowSpec<z.ZodTypeAny>,
  "R-PF": rpf as WorkflowSpec<z.ZodTypeAny>,
  "R-EV": rev as WorkflowSpec<z.ZodTypeAny>,
  "S-AR": sar as WorkflowSpec<z.ZodTypeAny>,
  "S-LP": slp as WorkflowSpec<z.ZodTypeAny>,
  "S-CP": scp as WorkflowSpec<z.ZodTypeAny>,
  "S-DB": sdb as WorkflowSpec<z.ZodTypeAny>,
};
