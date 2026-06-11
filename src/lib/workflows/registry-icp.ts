// ============================================================
// NATIVE WORKFLOW REGISTRY — tranche 3b: the ICP sub-agent chain.
//   R-CR  super_user_cohorts   (Gate 1: PMM scrubs the cohort)
//   R-CE  customer_enrichment  (reads the latest cohort)
//   R-VC  voc_extractions      (Gate 2: drift indicators)
//   S-IC  icp_definitions      (merges cohort + enrichment + VoC)
// HITL note: downstream steps prefer an APPROVED upstream row and
// fall back to the latest pending one (demo-permissive), flagging
// that in the context so the model notes it in evidence_basis.
// No CRM/product analytics are connected yet, so R-CR derives its
// cohort from the Customer Health portfolio (Halcyon accounts) —
// clearly labeled in methodology.
// ============================================================

import { z } from "zod";
import { flexText } from "./schema-utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowIds, WorkflowSpec } from "./engine";
import { DEMO_CS_ORG_ID } from "@/lib/demo-context";

const loose = z.record(z.string(), z.unknown());
const looseArray = z.array(loose);

async function latestRow<T = Record<string, unknown>>(
  admin: SupabaseClient,
  table: string,
  brandId: string,
  select: string,
): Promise<{ row: (T & { id: string; approval_status?: string }) | null; approvedNote: string }> {
  const { data: approved } = await admin
    .from(table)
    .select(select)
    .eq("brand_id", brandId)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (approved) return { row: approved as unknown as T & { id: string }, approvedNote: "APPROVED" };
  const { data: latest } = await admin
    .from(table)
    .select(select)
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    row: (latest as unknown as (T & { id: string }) | null) ?? null,
    approvedNote: latest ? "PENDING REVIEW (no approved version yet — note this in evidence)" : "MISSING",
  };
}

// ── R-CR · Customer Revenue Analyst ─────────────────────────────

const cohortSchema = z.object({
  cohort_name: flexText(5, 160),
  methodology: flexText(20),
  filter_criteria: loose,
  cohort_accounts: looseArray.min(3).max(15),
  excluded_accounts: looseArray.max(10),
});

const rcr: WorkflowSpec<typeof cohortSchema> = {
  code: "R-CR",
  task: "Build the top-decile 'super user' cohort from the customer portfolio below: sort by health, adoption, and ARR quality; exclude support-burdened or low-adoption accounts (list them in excluded_accounts with reasons). State plainly in methodology that the source is the Customer Health portfolio (no CRM connected). Each cohort account needs: name, segment, arr, health/adoption indicators, and included_reason.",
  outputInstruction:
    '{"cohort_name": "...", "methodology": "filter logic incl. data source caveat", "filter_criteria": {"min_health": N, "...": "..."}, "cohort_accounts": [{"name": "...", "segment": "...", "arr_usd": N, "health_score": N, "adoption_score": N, "included_reason": "..."}], "excluded_accounts": [{"name": "...", "excluded_reason": "..."}]} — 3 to 15 cohort accounts.',
  outputSchema: cohortSchema,
  maxTokens: 6000,
  buildContext: async (admin) => {
    // The customer portfolio lives under the CS demo org (Halcyon).
    const { data: accounts } = await admin
      .from("accounts")
      .select("name, segment, stage, arr, csm, adoption_signals, sentiment_trend")
      .eq("organization_id", DEMO_CS_ORG_ID)
      .limit(45);
    const { data: snaps } = await admin
      .from("health_score_snapshots")
      .select("account_id, score, band, as_of")
      .eq("organization_id", DEMO_CS_ORG_ID)
      .order("as_of", { ascending: false })
      .limit(45);
    if (!accounts || accounts.length === 0) {
      throw new Error("No customer accounts found in the Customer Health portfolio — seed it before running R-CR.");
    }
    const lines = accounts
      .map((a) => `- ${a.name} | ${a.segment}/${a.stage} | ARR $${Math.round(Number(a.arr) / 1000)}K | sentiment ${a.sentiment_trend} | adoption ${JSON.stringify(a.adoption_signals).slice(0, 120)}`)
      .join("\n");
    const snapLines = (snaps ?? []).slice(0, 40).map((s) => `- ${s.account_id.slice(0, 8)}: ${s.score} (${s.band})`).join("\n");
    return `Customer portfolio (${accounts.length} accounts):\n${lines}\n\nLatest health snapshots (sample):\n${snapLines}`;
  },
  write: async (admin, ids, parsed) => {
    const { error } = await admin.from("super_user_cohorts").insert({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      is_active: false,
      ...parsed,
      sources: "Customer Health portfolio (native engine) — no CRM connected",
      approval_status: "pending_review",
      risk_tier: "high",
    });
    if (error) throw new Error(`Failed to write super_user_cohorts: ${error.message}`);
    return `Cohort written: ${parsed.cohort_accounts.length} accounts (Gate 1 pending review)`;
  },
};

// ── R-CE · Customer Enrichment ──────────────────────────────────

const enrichmentSchema = z.object({
  firmographic_clusters: loose,
  technographic_signals: loose,
  trigger_signals: looseArray.min(1),
  enrichment_sources: looseArray,
  total_accounts_enriched: z.number().int().min(1),
  coverage_pct: z.number().min(0).max(100),
});

const rce: WorkflowSpec<typeof enrichmentSchema> = {
  code: "R-CE",
  task: "Enrich the cohort below with firmographic clusters (industries, employee bands, geographies), technographic signals (stack tools observed/missing), and corporate trigger signals, grounded in the web research. Mark enrichment_sources entries with the research URLs and confidence; coverage_pct reflects how much of the cohort the research plausibly covers.",
  outputInstruction:
    '{"firmographic_clusters": {"industry": [{"label": "...", "account_count": N, "pct": N}], "employee_band": [...], "geography": [...]}, "technographic_signals": {"uses": [{"tool": "...", "account_count": N, "pct": N}], "missing": [...]}, "trigger_signals": [{"trigger_type": "...", "description": "...", "observed_in_accounts": N, "confidence": "high|medium|low"}], "enrichment_sources": [{"provider": "tavily", "request_url": "...", "confidence": "..."}], "total_accounts_enriched": N, "coverage_pct": 0-100}',
  outputSchema: enrichmentSchema,
  maxTokens: 6000,
  buildContext: async (admin, ids) => {
    const { row, approvedNote } = await latestRow(admin, "super_user_cohorts", ids.brandId, "id, cohort_name, cohort_accounts");
    if (!row) throw new Error("No super-user cohort exists — run R-CR first (and approve it in the Review Queue).");
    return `Cohort [${approvedNote}]: ${(row as { cohort_name?: string }).cohort_name}\nAccounts:\n${JSON.stringify((row as { cohort_accounts?: unknown }).cohort_accounts, null, 1).slice(0, 5000)}`;
  },
  buildSearchQueries: async (admin, ids) => {
    const { row } = await latestRow(admin, "super_user_cohorts", ids.brandId, "id, cohort_accounts");
    const accounts = ((row as { cohort_accounts?: { segment?: string }[] } | null)?.cohort_accounts ?? []);
    const segs = [...new Set(accounts.map((a) => a.segment).filter(Boolean))].slice(0, 2);
    return [
      "workforce management software buyer firmographics industries",
      ...segs.map((s) => `${s} companies hourly workforce technology stack trends`),
      "hourly workforce hiring surge expansion trigger signals",
    ].slice(0, 4);
  },
  write: async (admin, ids, parsed) => {
    const { row } = await latestRow(admin, "super_user_cohorts", ids.brandId, "id");
    const { error } = await admin.from("customer_enrichment").insert({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      super_user_cohort_id: row?.id ?? null,
      ...parsed,
    });
    if (error) throw new Error(`Failed to write customer_enrichment: ${error.message}`);
    return `Enrichment written (${parsed.total_accounts_enriched} accounts, ${parsed.coverage_pct}% coverage)`;
  },
};

// ── R-VC · Voice of Customer ────────────────────────────────────

const vocSchema = z.object({
  top_pains: looseArray.min(2).max(5),
  pain_vocabulary: loose,
  compelling_events: looseArray.min(1),
  buying_committee: looseArray.min(1),
  source_transcript_count: z.number().int().min(0),
});

const rvc: WorkflowSpec<typeof vocSchema> = {
  code: "R-VC",
  task: "Extract the voice of customer for the cohort below: the top 3 pains (with the exact vocabulary customers use, severity, frequency), compelling purchase events, and the buying committee. No transcript source is connected — derive from the evidence, win/loss quotes, and feedback themes provided, set source_transcript_count to the number of distinct source rows you drew from, and keep single-customer concentration visible per pain.",
  outputInstruction:
    '{"top_pains": [{"rank": 1, "pain": "...", "vocabulary_examples": ["..."], "severity": "high|medium|low", "frequency_pct": N, "source_transcript_count": N, "single_customer_concentration_pct": N}], "pain_vocabulary": {"theme": ["phrase", "..."]}, "compelling_events": [{"event": "...", "frequency_pct": N, "sample_quote": "..."}], "buying_committee": [{"role": "...", "influence_weight": "high|medium|low", "typical_pain_focus": "..."}], "source_transcript_count": N}',
  outputSchema: vocSchema,
  maxTokens: 6000,
  buildContext: async (admin, ids) => {
    const [{ row, approvedNote }, evidence, winloss, themes] = await Promise.all([
      latestRow(admin, "super_user_cohorts", ids.brandId, "id, cohort_name, cohort_accounts"),
      admin.from("customer_evidence").select("evidence_type, content, customer_segment").eq("brand_id", ids.brandId).limit(8),
      admin.from("win_loss_analyses").select("outcome, key_quotes, primary_factors").eq("brand_id", ids.brandId).limit(6),
      admin.from("feedback_themes").select("theme_name, representative_quotes").eq("brand_id", ids.brandId).limit(6),
    ]);
    if (!row) throw new Error("No super-user cohort exists — run R-CR first.");
    const e = (evidence.data ?? []).map((x) => `- [${x.evidence_type}/${x.customer_segment}] ${x.content?.slice(0, 160)}`).join("\n") || "(none)";
    const w = (winloss.data ?? []).map((x) => `- [${x.outcome}] ${x.key_quotes?.slice(0, 160) ?? ""}`).join("\n") || "(none)";
    const t = (themes.data ?? []).map((x) => `- ${x.theme_name}: ${x.representative_quotes?.slice(0, 140) ?? ""}`).join("\n") || "(none)";
    return `Cohort [${approvedNote}]: ${(row as { cohort_name?: string }).cohort_name}\n\nEvidence:\n${e}\n\nWin/loss quotes:\n${w}\n\nFeedback theme quotes:\n${t}`;
  },
  write: async (admin, ids, parsed) => {
    const { row } = await latestRow(admin, "super_user_cohorts", ids.brandId, "id");
    const { error } = await admin.from("voc_extractions").insert({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      super_user_cohort_id: row?.id ?? null,
      ...parsed,
      approval_status: "pending_review",
      risk_tier: "high",
    });
    if (error) throw new Error(`Failed to write voc_extractions: ${error.message}`);
    return `VoC extraction written (${parsed.top_pains.length} pains, Gate 2 pending review)`;
  },
};

// ── S-IC · ICP Synthesizer ──────────────────────────────────────

const icpSchema = z.object({
  segment_name: flexText(5, 160),
  one_line_definition: flexText(20, 400),
  firmographics: loose,
  technographics: loose,
  trigger_signals: looseArray,
  primary_pains: looseArray.min(2),
  buying_committee: looseArray.min(1),
  typical_sales_cycle: flexText(3, 120),
  anti_icp: looseArray.min(1),
  evidence_basis: flexText(20),
});

const sic: WorkflowSpec<typeof icpSchema> = {
  code: "S-IC",
  task: "Merge the cohort, enrichment, and voice-of-customer below into the canonical ICP playbook: segment name, one-line definition, structured firmographics and technographics, trigger signals, ordered primary pains with customer vocabulary, buying committee, typical sales cycle, and the anti-ICP (who NOT to sell to, with observable signals). evidence_basis must state which upstream rows (and their approval state) this draws on.",
  outputInstruction:
    '{"segment_name": "...", "one_line_definition": "...", "firmographics": {"industries": [], "employee_range": {"min": N, "max": N}, "geographies": []}, "technographics": {"uses": [], "missing": []}, "trigger_signals": [{"event": "...", "frequency_pct": N}], "primary_pains": [{"rank": 1, "pain": "...", "vocabulary_examples": [], "severity": "..."}], "buying_committee": [{"role": "...", "influence_weight": "..."}], "typical_sales_cycle": "...", "anti_icp": [{"description": "...", "why_excluded": "...", "observable_signal": "..."}], "evidence_basis": "..."}',
  outputSchema: icpSchema,
  maxTokens: 7000,
  buildContext: async (admin, ids) => {
    const [cohort, enrichment, voc] = await Promise.all([
      latestRow(admin, "super_user_cohorts", ids.brandId, "id, cohort_name, cohort_accounts"),
      latestRow(admin, "customer_enrichment", ids.brandId, "id, firmographic_clusters, technographic_signals, trigger_signals"),
      latestRow(admin, "voc_extractions", ids.brandId, "id, top_pains, pain_vocabulary, compelling_events, buying_committee"),
    ]);
    if (!cohort.row) throw new Error("No super-user cohort — run R-CR first.");
    if (!enrichment.row) throw new Error("No enrichment — run R-CE first.");
    if (!voc.row) throw new Error("No VoC extraction — run R-VC first.");
    const j = (v: unknown) => JSON.stringify(v, null, 1).slice(0, 3500);
    return [
      `Cohort [${cohort.approvedNote}]:\n${j(cohort.row)}`,
      `Enrichment [${enrichment.approvedNote}]:\n${j(enrichment.row)}`,
      `Voice of customer [${voc.approvedNote}]:\n${j(voc.row)}`,
    ].join("\n\n");
  },
  write: async (admin, ids, parsed) => {
    const [cohort, enrichment, voc] = await Promise.all([
      latestRow(admin, "super_user_cohorts", ids.brandId, "id"),
      latestRow(admin, "customer_enrichment", ids.brandId, "id"),
      latestRow(admin, "voc_extractions", ids.brandId, "id"),
    ]);
    const { error } = await admin.from("icp_definitions").insert({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      is_active: false,
      super_user_cohort_id: cohort.row?.id ?? null,
      customer_enrichment_id: enrichment.row?.id ?? null,
      voc_extraction_id: voc.row?.id ?? null,
      ...parsed,
      sources: "Merged from cohort + enrichment + VoC (native engine)",
      approval_status: "pending_review",
      risk_tier: "high",
    });
    if (error) throw new Error(`Failed to write icp_definitions: ${error.message}`);
    return `ICP definition written: ${parsed.segment_name} (pending review)`;
  },
};

export const ICP_SPECS: Record<string, WorkflowSpec<z.ZodTypeAny>> = {
  "R-CR": rcr as WorkflowSpec<z.ZodTypeAny>,
  "R-CE": rce as WorkflowSpec<z.ZodTypeAny>,
  "R-VC": rvc as WorkflowSpec<z.ZodTypeAny>,
  "S-IC": sic as WorkflowSpec<z.ZodTypeAny>,
};
