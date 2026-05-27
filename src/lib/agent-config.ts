// Per-agent configuration: which agents are live (Supabase-native + on-demand),
// and which n8n webhook path each maps to. Codes use the layer-prefixed naming
// convention (Decision 2026-05-22): L-XX where L is one of R/S/D/X (Research,
// Synthesis, Delivery, Distribution) and XX is the function suffix.
//
// Codes display uppercase in tables, docs, and the UI sidebar. URLs use
// lowercase per web convention (e.g. /agents/r-ci).

export const AGENT_WEBHOOK_PATHS: Record<string, string> = {
  "R-CI": "/webhook/competitive-intel-supabase", // formerly A1
  "R-MS": "/webhook/market-signals-supabase", // formerly A2
  "S-RM": "/webhook/roadmap-steering-supabase", // formerly A3
  "R-CF": "/webhook/customer-feedback-supabase", // formerly A4
  "S-PO": "/webhook/positioning-engine-supabase", // formerly A5
  "D-MG": "/webhook/messaging-supabase", // formerly A6
  "S-BC": "/webhook/battlecards-supabase", // formerly A7
  "D-SN": "/webhook/sales-narrative-supabase", // formerly A8
  // Phase 3 agents. Webhook paths are committed contracts; n8n workflows
  // implement them on Dane's side. Until each workflow exists, clicking
  // "Run now" will return 502 and surface in run_history.error_message.
  "R-PP": "/webhook/pricing-intelligence-supabase",
  "R-WL": "/webhook/win-loss-supabase",
  "R-EV": "/webhook/customer-evidence-supabase",
  "R-PF": "/webhook/product-feedback-supabase",
  "S-AR": "/webhook/analyst-relations-supabase",
  "S-LP": "/webhook/launch-planning-supabase",
  // Phase 4: Brand Repository (Brand Code Ingestion).
  "R-BR": "/webhook/brand-repository-supabase",
  // Phase 5: Counter-Narrative Responder. Designed to fire autonomously but
  // currently on-demand only (scheduled trigger paused to avoid API spend).
  "D-CN": "/webhook/counter-narrative-supabase",
  // Phase 6A: Distribution adapters (mock-first per PLAN §4d) + S-CP analyst.
  // X-* workflows take an artifactTable + artifactId in the extras body.
  "X-EM": "/webhook/distribution-email-supabase",
  "X-LI": "/webhook/distribution-linkedin-supabase",
  "X-OR": "/webhook/distribution-outreach-supabase",
  "X-AP": "/webhook/distribution-apollo-supabase",
  "S-CP": "/webhook/campaign-performance-supabase",
  // Phase 6B: Cap 5 v1 collateral library sub-agents. All write into the
  // unified enablement_assets table with different asset_type values.
  "D-OB": "/webhook/objection-handler-supabase",
  "D-QB": "/webhook/qbr-template-supabase",
  "D-HP": "/webhook/health-playbook-supabase",
  "D-WW": "/webhook/win-wire-supabase",
  // Phase 7: Final two Cap 5 sub-agents (expansion + renewal talk track).
  "D-XP": "/webhook/expansion-play-supabase",
  "D-RT": "/webhook/renewal-talk-track-supabase",
  // Capability 10: ICP sub-agents. R-CR produces a top-decile super-user
  // cohort, R-CE enriches it firmographically + technographically, R-VC pulls
  // qualitative pain + compelling events from transcripts, S-IC synthesizes
  // the boardroom-ready ICP playbook. HITL gates after R-CR and R-VC catch
  // failure modes a single end-state approval can't.
  "R-CR": "/webhook/customer-revenue-supabase",
  "R-CE": "/webhook/customer-enrichment-supabase",
  "R-VC": "/webhook/voice-of-customer-supabase",
  "S-IC": "/webhook/icp-synthesizer-supabase",
  // Capability 11: Daily Brief synthesizer. Powers the "what should I focus
  // on today" panel at the top of /dashboard. Reads pending HITL load,
  // high-impact signals, launches in flight, margin floor breaches, stale
  // runs — synthesizes 3-5 ranked focus items via Gemini Flash.
  "S-DB": "/webhook/daily-brief-supabase",
  // Capability 12: Deployment forking. Two-agent pipeline turning an
  // approved Collateral Library artifact into shippable formats (one-pager,
  // slide deck, email sequence, LinkedIn post, etc).
  //   D-DA assesses which formats fit and writes a recommendation row.
  //   D-DP fires per format the user approves and writes the actual content.
  // Both gate through HITL. Approved deployment_formats rows surface in the
  // Library as forks of the source artifact.
  "D-DA": "/webhook/deployment-assessor-supabase",
  "D-DP": "/webhook/deployment-producer-supabase",
};

// Legacy A1–A8 codes still appear in old `run_history.agent_code` rows and in
// any pre-rename deep links. Normalize to the new code so downstream lookups
// don't care which form they got.
export const LEGACY_TO_NEW_CODE: Record<string, string> = {
  A1: "R-CI",
  A2: "R-MS",
  A3: "S-RM",
  A4: "R-CF",
  A5: "S-PO",
  A6: "D-MG",
  A7: "S-BC",
  A8: "D-SN",
};

export const LIVE_AGENTS = new Set(Object.keys(AGENT_WEBHOOK_PATHS));

/**
 * Canonicalize a code from any accepted form (legacy A1, lowercase r-ci, etc.)
 * to the new uppercase form ("R-CI"). Returns null if the input doesn't match
 * a known agent.
 */
export function normalizeAgentCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const upper = input.toUpperCase();
  if (LIVE_AGENTS.has(upper)) return upper;
  const mapped = LEGACY_TO_NEW_CODE[upper];
  if (mapped) return mapped;
  return null;
}

export function isLiveAgent(code: string | null | undefined): boolean {
  return normalizeAgentCode(code) !== null;
}

export function webhookPathFor(code: string | null | undefined): string | null {
  const normalized = normalizeAgentCode(code);
  if (!normalized) return null;
  return AGENT_WEBHOOK_PATHS[normalized] ?? null;
}
