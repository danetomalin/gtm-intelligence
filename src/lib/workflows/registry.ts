// ============================================================
// NATIVE WORKFLOW REGISTRY — tranche 1 of the n8n migration.
// Pilots proving both archetypes:
//   R-MS  research  (Tavily search + brand context → market_signals)
//   D-MG  synthesis (positioning/voice/personas → content_outputs)
// Output shapes mirror exactly what the n8n chain wrote, so the
// existing agent-page cards keep rendering unchanged.
// ============================================================

import { z } from "zod";
import { flexText } from "./schema-utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowIds, WorkflowSpec } from "./engine";
import { RESEARCH_SPECS } from "./registry-research";
import { SYNTHESIS_SPECS } from "./registry-synthesis";
import { ICP_SPECS } from "./registry-icp";
import { DELIVERY_SPECS } from "./registry-delivery";

async function brandLine(admin: SupabaseClient, ids: WorkflowIds): Promise<string> {
  const { data } = await admin
    .from("brands")
    .select("name, website_url, additional_context")
    .eq("id", ids.brandId)
    .maybeSingle();
  return data
    ? `Brand: ${data.name} (${data.website_url ?? "no site"})\n${data.additional_context ?? ""}`
    : "Brand: unknown";
}

// ── R-MS · Market Signal Engine ─────────────────────────────────

const signalSchema = z.object({
  signals: z
    .array(
      z.object({
        category: z.enum(["spend_shifts", "market_expansion", "regulatory", "competitive_positioning"]),
        headline: flexText(5, 160),
        summary: flexText(10),
        strategic_commentary: flexText(10),
        impact_score: z.number().int().min(1).max(10),
        sentiment: z.enum(["bullish", "bearish", "neutral"]),
        sentiment_reason: flexText(3),
        tags: flexText(0),
        sources: flexText(5), // comma-separated URLs from the research block
      }),
    )
    .min(1)
    .max(6),
});

const rms: WorkflowSpec<typeof signalSchema> = {
  code: "R-MS",
  task: "Scan the web research below for market signals relevant to this brand. Apply the 'So What' test, impact scoring, and sentiment classification from your operating instructions. Only include signals grounded in the research results — cite their URLs in sources.",
  outputInstruction:
    '{"signals": [{"category": "spend_shifts|market_expansion|regulatory|competitive_positioning", "headline": "max 120 chars", "summary": "...", "strategic_commentary": "specific, actionable, justifies the score", "impact_score": 1-10, "sentiment": "bullish|bearish|neutral", "sentiment_reason": "...", "tags": "comma,separated", "sources": "url1, url2"}]} — 3 to 6 signals.',
  outputSchema: signalSchema,
  maxTokens: 6000,
  buildContext: async (admin, ids) => {
    const [brand, competitors, recent] = await Promise.all([
      brandLine(admin, ids),
      admin.from("brand_competitors").select("name, domain, keywords, risk_level").eq("brand_id", ids.brandId),
      admin
        .from("market_signals")
        .select("headline, signal_date")
        .eq("brand_id", ids.brandId)
        .order("signal_date", { ascending: false })
        .limit(12),
    ]);
    const comps = (competitors.data ?? [])
      .map((c) => `- ${c.name} (${c.domain ?? "?"}, risk ${c.risk_level ?? "?"}): ${c.keywords ?? ""}`)
      .join("\n");
    const prior = (recent.data ?? []).map((s) => `- [${s.signal_date}] ${s.headline}`).join("\n") || "(none yet)";
    return `${brand}\n\nTracked competitors:\n${comps}\n\nAlready-captured signals (do NOT duplicate):\n${prior}`;
  },
  buildSearchQueries: async (admin, ids) => {
    const { data: brand } = await admin.from("brands").select("name").eq("id", ids.brandId).maybeSingle();
    const { data: comps } = await admin
      .from("brand_competitors")
      .select("name, risk_level")
      .eq("brand_id", ids.brandId)
      .in("risk_level", ["HIGH", "MEDIUM"])
      .limit(3);
    const name = brand?.name ?? "the company";
    return [
      `workforce management software market news ${new Date().getFullYear()}`,
      `${name} competitor news announcement`,
      ...(comps ?? []).slice(0, 2).map((c) => `${c.name} product launch pricing news`),
      "fair workweek scheduling regulation news",
    ];
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.signals.map((s) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      signal_date: new Date().toISOString().slice(0, 10),
      ...s,
      impact_score: s.impact_score,
    }));
    const { error } = await admin.from("market_signals").insert(rows);
    if (error) throw new Error(`Failed to write market_signals: ${error.message}`);
    return `${rows.length} market signals written`;
  },
};

// ── D-MG · Messaging Generator ──────────────────────────────────

const contentSchema = z.object({
  pieces: z
    .array(
      z.object({
        channel: z.enum(["email", "linkedin", "ad", "one_pager", "talk_track"]),
        topic: flexText(3, 200),
        target_persona: flexText(3, 160),
        content: flexText(40),
        messaging_refs: flexText(0),
        proof_pending: z.boolean(),
      }),
    )
    .min(1)
    .max(4),
});

const dmg: WorkflowSpec<typeof contentSchema> = {
  code: "D-MG",
  task: "Generate channel-ready messaging for this brand from the positioning, voice rules, proof points, and personas below. Follow the channel rules in your operating instructions. If positioning data is sparse, derive sensible positioning from the brand context and mark proof_pending=true wherever a claim lacks a proof point.",
  outputInstruction:
    '{"pieces": [{"channel": "email|linkedin|ad|one_pager|talk_track", "topic": "...", "target_persona": "...", "content": "the full copy", "messaging_refs": "which positioning element/message this traces to", "proof_pending": true|false}]} — 2 to 4 pieces across different channels.',
  outputSchema: contentSchema,
  maxTokens: 6000,
  buildContext: async (admin, ids) => {
    const [brand, positioning, voice, proof, personas] = await Promise.all([
      brandLine(admin, ids),
      admin
        .from("positioning_elements")
        .select("element_type, content")
        .eq("brand_id", ids.brandId)
        .order("created_at", { ascending: false })
        .limit(10),
      admin.from("brand_voice_rules").select("rule").eq("brand_id", ids.brandId).limit(10),
      admin.from("brand_proof_points").select("claim, attribution").eq("brand_id", ids.brandId).limit(10),
      admin.from("buyer_personas").select("persona_name, title, pain_points").eq("brand_id", ids.brandId).limit(5),
    ]);
    const fmt = (label: string, rows: unknown[] | null, map: (r: never) => string) =>
      `${label}:\n${rows && rows.length > 0 ? rows.map(map as (r: unknown) => string).join("\n") : "(none yet — derive from brand context)"}`;
    return [
      brand,
      fmt("Positioning elements", positioning.data, (p: { element_type: string; content: string }) => `- [${p.element_type}] ${p.content?.slice(0, 300)}`),
      fmt("Voice rules", voice.data, (v: { rule: string }) => `- ${v.rule}`),
      fmt("Proof points", proof.data, (p: { claim: string; attribution: string }) => `- ${p.claim} (${p.attribution ?? "attribution pending"})`),
      fmt("Buyer personas", personas.data, (p: { persona_name: string; title: string; pain_points: string }) => `- ${p.persona_name} (${p.title ?? ""}): ${p.pain_points ?? ""}`),
    ].join("\n\n");
  },
  write: async (admin, ids, parsed) => {
    const rows = parsed.pieces.map((p) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      ...p,
      approval_status: "pending_review",
      risk_tier: "medium",
    }));
    const { error } = await admin.from("content_outputs").insert(rows);
    if (error) throw new Error(`Failed to write content_outputs: ${error.message}`);
    return `${rows.length} content pieces written (pending review)`;
  },
};

// ── Registry ────────────────────────────────────────────────────

export const WORKFLOW_REGISTRY: Record<string, WorkflowSpec<z.ZodTypeAny>> = {
  "R-MS": rms as WorkflowSpec<z.ZodTypeAny>,
  "D-MG": dmg as WorkflowSpec<z.ZodTypeAny>,
  ...RESEARCH_SPECS, // tranche 2: R-CI, R-PP, R-WL, S-RM
  ...SYNTHESIS_SPECS, // tranche 3a: S-PO, S-BC, R-CF, R-PF, R-EV, S-AR, S-LP, S-CP, S-DB
  ...ICP_SPECS, // tranche 3b: R-CR, R-CE, R-VC, S-IC
  ...DELIVERY_SPECS, // tranches 4+6: D-SN, D-CN, D-OB, D-WW, R-BR
};

export function isRegistryCode(code: string): boolean {
  return code.toUpperCase() in WORKFLOW_REGISTRY;
}
