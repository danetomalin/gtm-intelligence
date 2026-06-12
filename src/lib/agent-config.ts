// Per-agent code registry: every known workflow code plus legacy A1-A8
// normalization. The n8n webhook map that used to live here was removed
// when the chain was decommissioned (2026-06-12) — all codes run natively
// via the workflow registry / CS runner / distribution adapters.
//
// Codes display uppercase in tables, docs, and the UI sidebar. URLs use
// lowercase per web convention (e.g. /agents/r-ci).

export const KNOWN_AGENT_CODES = new Set<string>([
  // A0 is form-driven brand setup (no agent run); known so the run route
  // can answer it with a helpful 400 instead of a generic 404.
  "A0",
  "R-CI", "R-MS", "S-RM", "R-CF", "S-PO", "D-MG", "S-BC", "D-SN", "R-PP", "R-WL", "R-EV", "R-PF", "S-AR", "S-LP", "R-BR", "D-CN", "X-EM", "X-LI", "X-OR", "X-AP", "S-CP", "D-OB", "D-QB", "D-HP", "D-WW", "D-XP", "D-RT", "R-CR", "R-CE", "R-VC", "S-IC", "S-DB", "D-DA", "D-DP",
]);

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

// Kept under the historical name — consumers treat this as "known codes".
export const LIVE_AGENTS = KNOWN_AGENT_CODES;

/**
 * Canonicalize a code from any accepted form (legacy A1, lowercase r-ci, etc.)
 * to the new uppercase form ("R-CI"). Returns null if the input doesn't match
 * a known agent.
 */
export function normalizeAgentCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const upper = input.toUpperCase();
  if (KNOWN_AGENT_CODES.has(upper)) return upper;
  const mapped = LEGACY_TO_NEW_CODE[upper];
  if (mapped) return mapped;
  return null;
}

export function isLiveAgent(code: string | null | undefined): boolean {
  return normalizeAgentCode(code) !== null;
}
