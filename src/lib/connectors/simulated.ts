// ============================================================
// SIMULATED CONNECTOR — the middle rung of the data-connection
// ladder (placeholder → simulated → connected).
//
// A simulated source "fetches" by asking a model to play the source's
// API: given the pull instructions and a seed of real demo-world facts
// (brand, competitors, personas), it generates a compact, realistic,
// CLEARLY-LABELED synthetic result set. Workflows then consume
// source-shaped data end to end. When a real connector lands, the
// status flips to 'connected' and this module steps aside — the
// engine-facing contract is identical.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { callProvider, type ProviderConfig, type ProviderResult } from "@/lib/llm/providers";

export interface SimSeed {
  brandLine: string;
  competitors: string[];
  personas: string[];
}

/** Real demo-world facts so simulations stay coherent with everything
 *  else the pipeline has built (same competitors, same personas). */
export async function buildSimSeed(
  admin: SupabaseClient,
  organizationId: string,
  brandId: string,
): Promise<SimSeed> {
  const [brand, comps, personas] = await Promise.all([
    admin.from("brands").select("name, website_url").eq("id", brandId).maybeSingle(),
    admin.from("brand_competitors").select("name").eq("brand_id", brandId).eq("active", true).limit(6),
    admin.from("buyer_personas").select("persona_name, title").eq("brand_id", brandId).limit(3),
  ]);
  return {
    brandLine: brand.data ? `${brand.data.name} (${brand.data.website_url ?? ""})` : "the company",
    competitors: (comps.data ?? []).map((c) => c.name),
    personas: (personas.data ?? []).map((p) => `${p.persona_name} (${p.title ?? ""})`),
  };
}

/** Pure prompt builder (unit-tested). */
export function buildSimulationPrompt(
  sourceName: string,
  pullInstructions: string,
  seed: SimSeed,
): string {
  return [
    `You are simulating the ${sourceName} API for ${seed.brandLine}.`,
    `PULL REQUEST: ${pullInstructions || "a representative sample of this source's most decision-useful records"}`,
    `Company context to stay coherent with (use these names, never contradict them):`,
    `- Competitors: ${seed.competitors.join(", ") || "(none listed)"}`,
    `- Buyer personas: ${seed.personas.join("; ") || "(none listed)"}`,
    ``,
    `Generate a compact, realistic result set answering the pull request: 5-10 records (or the natural equivalent for this source), plausible fictional account names, dates within the last 90 days, and numbers that hang together. Format as a tight markdown list or table. Maximum ~150 words. Output ONLY the data — no preamble, no commentary, no disclaimers.`,
  ].join("\n");
}

export interface SimFetchResult {
  ok: boolean;
  block: string;
  error?: string;
  usage?: ProviderResult["usage"];
}

/** One simulated fetch. The result block is labeled SIMULATED so the
 *  downstream model (and any human reading the artifact) knows. */
export async function runSimulatedFetch(
  cred: ProviderConfig,
  sourceName: string,
  pullInstructions: string,
  seed: SimSeed,
): Promise<SimFetchResult> {
  const prompt = buildSimulationPrompt(sourceName, pullInstructions, seed);
  const result = await callProvider(cred, [{ role: "user", content: prompt }], {
    system: "You simulate SaaS data source APIs for demo environments. Data must be plausible, internally consistent, and obviously fictional on close inspection (no real companies as customers).",
    maxTokens: 900,
  });
  if (!result.ok || !result.text.trim()) {
    return { ok: false, block: "", error: result.error ?? "empty simulation", usage: result.usage };
  }
  const block =
    `[SIMULATED · ${sourceName}] Synthetic data generated to match the pull instructions — swaps to live data when the real connector is wired. Treat as representative, and keep the SIMULATED label on any claim that depends on it.\n` +
    result.text.trim().slice(0, 2400);
  return { ok: true, block, usage: result.usage };
}
