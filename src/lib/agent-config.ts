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
