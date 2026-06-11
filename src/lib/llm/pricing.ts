// ============================================================
// LLM PRICING — $ per 1M tokens, by model. Costs are computed and
// FROZEN at write time (run_history.cost_usd), so editing these
// rates later never rewrites history.
// Rates as of 2026-06 list prices; unknown models return null
// (tokens still display, dollars don't).
// ============================================================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// $ per 1M tokens: [input, output]
const MODEL_PRICES: Record<string, [number, number]> = {
  "claude-sonnet-4-6": [3, 15],
  "claude-opus-4-8": [15, 75],
  "claude-haiku-4-5": [1, 5],
  "gemini-2.5-pro": [1.25, 10],
  "gemini-2.5-flash": [0.3, 2.5],
  "gemini-2.5-flash-lite": [0.1, 0.4],
  "gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  o3: [2, 8],
  "o4-mini": [1.1, 4.4],
};

/** Resolve a price row, tolerating dated/versioned model ids
 *  (e.g. "claude-haiku-4-5-20251001" matches "claude-haiku-4-5"). */
export function priceFor(model: string | null | undefined): [number, number] | null {
  if (!model) return null;
  const m = model.toLowerCase().trim();
  if (MODEL_PRICES[m]) return MODEL_PRICES[m];
  // Longest-prefix match for dated ids.
  let best: string | null = null;
  for (const key of Object.keys(MODEL_PRICES)) {
    if (m.startsWith(key) && (!best || key.length > best.length)) best = key;
  }
  return best ? MODEL_PRICES[best] : null;
}

/** Cost in USD for a run's token usage; null when the model is unpriced. */
export function costUsd(model: string | null | undefined, usage: TokenUsage): number | null {
  const price = priceFor(model);
  if (!price) return null;
  const [inRate, outRate] = price;
  return (usage.inputTokens * inRate + usage.outputTokens * outRate) / 1_000_000;
}

export function formatCost(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "$0";
  if (v < 0.001) return "<$0.001";
  if (v < 1) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(2)}`;
}

export function formatTokens(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
