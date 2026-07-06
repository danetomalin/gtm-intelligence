// ============================================================
// NATIVE WORKFLOW ENGINE (n8n migration, tranche 1).
// One generic executor + declarative per-workflow specs, so porting
// a workflow means writing a spec — not a new system. Flow:
//
//   instructions (workflow_configs, Settings-editable)
//   + context    (spec's Supabase reads, brand-scoped)
//   + research   (optional Tavily searches — x-search-key from the
//                 browser credential store)
//   → callProvider on the workflow's assigned BYOK profile
//   → JSON extracted + zod-validated against the output table shape
//   → spec.write() lands rows as pending_review (HITL)
//
// run_history lifecycle and error surfacing are handled by the run
// route, same as the CS runner.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodTypeAny, infer as ZodInfer } from "zod";
import { callProvider, type ProviderConfig } from "@/lib/llm/providers";
import { searchTavily, type SearchResult } from "@/lib/search/tavily";
import { buildSimSeed, runSimulatedFetch } from "@/lib/connectors/simulated";
import { agentTooling } from "@/lib/demo-data";
import { DEMO_TENANT_ID, DEMO_BRAND_ID } from "@/lib/demo-context";

export interface WorkflowIds {
  organizationId: string;
  brandId: string;
}

export interface WorkflowSpec<S extends ZodTypeAny = ZodTypeAny> {
  code: string;
  // Assemble the data context the model reads (brand-scoped Supabase reads).
  buildContext: (admin: SupabaseClient, ids: WorkflowIds) => Promise<string>;
  // Research workflows: queries to run through Tavily before the LLM call.
  buildSearchQueries?: (admin: SupabaseClient, ids: WorkflowIds) => Promise<string[]>;
  // The task framing + REQUIRED output JSON description (shape contract).
  task: string;
  outputInstruction: string;
  outputSchema: S;
  // Persist validated output; returns a human summary for run_history.
  write: (admin: SupabaseClient, ids: WorkflowIds, parsed: ZodInfer<S>) => Promise<string>;
  maxTokens?: number;
}

export interface RunUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export type EngineResult =
  | { ok: true; summary: string; usage?: RunUsage }
  // Validation failures still consumed tokens — usage rides along.
  | { ok: false; error: string; status?: number; usage?: RunUsage };

// Pull the first JSON value out of a model reply (handles ```json fences
// and leading prose).
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    // fall through to bracket scan
  }
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model output.");
  const open = candidate[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === open) depth++;
    else if (candidate[i] === close) depth--;
    if (depth === 0) {
      return JSON.parse(candidate.slice(start, i + 1));
    }
  }
  throw new Error("Unbalanced JSON in model output.");
}

const MAX_QUERIES = 5;
const RESULTS_PER_QUERY = 5;

export async function runWorkflowSpec<S extends ZodTypeAny>(
  admin: SupabaseClient,
  spec: WorkflowSpec<S>,
  cred: ProviderConfig,
  searchKey?: string,
): Promise<EngineResult> {
  const ids: WorkflowIds = { organizationId: DEMO_TENANT_ID, brandId: DEMO_BRAND_ID };

  // 1. Operating instructions (the Settings-managed brief).
  const { data: cfg } = await admin
    .from("workflow_configs")
    .select("instructions")
    .eq("organization_id", ids.organizationId)
    .eq("workflow_code", spec.code)
    .maybeSingle();
  const definition = agentTooling.find((w) => w.code === spec.code);
  const instructions =
    (cfg?.instructions ?? "").trim() ||
    `You are the ${definition?.name ?? spec.code} workflow (${spec.code}). ${definition?.purpose ?? ""}`;

  // 2. Data context.
  const context = await spec.buildContext(admin, ids);

  // 2b. Assigned external data sources (migrations 0033/0034).
  // Three tiers per source:
  //   placeholder — disclosed as configured-but-unavailable
  //   simulated   — a model plays the source's API and returns a
  //                 compact, clearly-labeled synthetic result set
  //                 matched to the pull instructions (costs tracked)
  //   connected   — future real connector (treated as placeholder
  //                 until the connector layer lands)
  let externalSources = "";
  const simUsages: { inputTokens: number; outputTokens: number }[] = [];
  const { data: dataSources } = await admin
    .from("workflow_data_sources")
    .select("source_name, pull_instructions, enabled, connection_status")
    .eq("organization_id", ids.organizationId)
    .eq("workflow_code", spec.code)
    .eq("enabled", true);
  if (dataSources && dataSources.length > 0) {
    const blocks: string[] = [];
    const disclosures: string[] = [];
    // Cap simulated fetches per run — each is a model call; context
    // budget and latency both matter.
    const MAX_SIM_FETCHES = 4;
    let simCount = 0;
    let seed: Awaited<ReturnType<typeof buildSimSeed>> | null = null;
    for (const src of dataSources) {
      if (src.connection_status === "simulated" && simCount < MAX_SIM_FETCHES) {
        simCount += 1;
        seed = seed ?? (await buildSimSeed(admin, ids.organizationId, ids.brandId));
        const sim = await runSimulatedFetch(cred, src.source_name, src.pull_instructions ?? "", seed);
        if (sim.usage) simUsages.push(sim.usage);
        if (sim.ok) {
          blocks.push(sim.block);
        } else {
          disclosures.push(`- ${src.source_name} [simulation failed: ${sim.error?.slice(0, 120)}] — treat as unavailable`);
        }
      } else {
        disclosures.push(`- ${src.source_name} [${src.connection_status}]: ${src.pull_instructions || "(no pull instructions yet)"}`);
      }
    }
    const parts: string[] = [];
    if (blocks.length > 0) parts.push(blocks.join("\n\n"));
    if (disclosures.length > 0) {
      parts.push(
        `Configured but not fetched (treat as unavailable; label dependent content accordingly):\n${disclosures.join("\n")}`,
      );
    }
    externalSources = `\n\n=== EXTERNAL DATA SOURCES ===\n${parts.join("\n\n")}`;
  }

  // 2c. Feedback loop (migration 0035, BACKLOG item 1).
  //   Brand learnings — layer 5 of the brand code: durable operating
  //     learnings promoted from feedback. Active learnings reach EVERY
  //     workflow run — one correction propagates to all future outputs.
  //   Open feedback — until applied or dismissed, feedback rides the
  //     next run's context verbatim: workflow-scoped feedback rides
  //     this workflow; brand-scoped feedback rides all workflows.
  let feedbackBlock = "";
  {
    const [{ data: learnings }, { data: openFeedback }] = await Promise.all([
      admin
        .from("brand_learnings")
        .select("statement, layer, confidence")
        .eq("organization_id", ids.organizationId)
        .eq("brand_id", ids.brandId)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(40),
      admin
        .from("workflow_feedback")
        .select("verdict, comment, scope, workflow_code")
        .eq("organization_id", ids.organizationId)
        .eq("status", "new")
        .or(`workflow_code.eq.${spec.code},scope.eq.brand`)
        .order("created_at", { ascending: true })
        .limit(20),
    ]);
    const parts: string[] = [];
    if (learnings && learnings.length > 0) {
      parts.push(
        `=== BRAND CODE — OPERATING LEARNINGS (must respect) ===\n` +
          learnings
            .map((l) => `- [${l.layer}${l.confidence !== "confirmed" ? ` · ${l.confidence}` : ""}] ${l.statement}`)
            .join("\n"),
      );
    }
    const relevant = (openFeedback ?? []).filter((f) => (f.comment ?? "").trim());
    if (relevant.length > 0) {
      parts.push(
        `=== USER FEEDBACK (must respect — open corrections awaiting application) ===\n` +
          relevant
            .map((f) => `- [${f.verdict}${f.scope === "brand" ? " · brand-wide" : ""}] ${f.comment}`)
            .join("\n"),
      );
    }
    if (parts.length > 0) feedbackBlock = `\n\n${parts.join("\n\n")}`;
  }

  // 3. Optional web research. Gemini profiles use the model's native
  // Google Search grounding (Dane 2026-06-11 — best access to current
  // info, no Tavily key needed); other providers use Tavily.
  let research = "";
  let useGrounding = false;
  if (spec.buildSearchQueries) {
    const queries = (await spec.buildSearchQueries(admin, ids)).slice(0, MAX_QUERIES);
    if (cred.provider === "google") {
      useGrounding = true;
      research =
        `\n\n=== WEB RESEARCH (REQUIRED — use Google Search grounding) ===\n` +
        `Search the live web for each topic below BEFORE answering. Ground every claim in what you find — current pricing, recent announcements, real product changes. Cite the source title or domain for each claim in the output's sources fields. Never invent facts the search did not surface.\n` +
        queries.map((q) => `- ${q}`).join("\n");
    } else if (searchKey) {
      const blocks: string[] = [];
      for (const q of queries) {
        const res = await searchTavily(searchKey, q, RESULTS_PER_QUERY);
        if (!res.ok) {
          return { ok: false, error: `Web search failed ("${q}"): ${res.error}`, status: res.status };
        }
        blocks.push(
          `Query: ${q}\n` +
            res.results
              .map((r: SearchResult) => `- ${r.title} (${r.url})\n  ${r.content.slice(0, 400)}`)
              .join("\n"),
        );
      }
      research = `\n\n=== WEB RESEARCH (Tavily) ===\n${blocks.join("\n\n")}`;
    } else {
      return {
        ok: false,
        status: 401,
        error:
          "This research workflow needs web access: assign it a Gemini credential profile (native Google Search grounding) or add a Tavily key in Settings → API credentials → Search API.",
      };
    }
  }

  // 4. Model call on the assigned credential profile.
  const user = `${spec.task}\n\n=== DATA CONTEXT ===\n${context}${externalSources}${feedbackBlock}${research}\n\n=== OUTPUT FORMAT (MANDATORY) ===\n${spec.outputInstruction}\nReturn ONLY valid JSON — no prose, no markdown fences.`;
  const usage: RunUsage = { provider: cred.provider, model: cred.model, inputTokens: 0, outputTokens: 0 };
  const addUsage = (u?: { inputTokens: number; outputTokens: number }) => {
    if (u) {
      usage.inputTokens += u.inputTokens;
      usage.outputTokens += u.outputTokens;
    }
  };
  for (const u of simUsages) addUsage(u); // simulated-source fetches bill to the run
  let result = await callProvider(cred, [{ role: "user", content: user }], {
    system: instructions,
    maxTokens: spec.maxTokens ?? 4096,
    webSearch: useGrounding,
  });
  addUsage(result.usage);
  if (!result.ok || !result.text.trim()) {
    return { ok: false, error: result.error ?? "Model returned an empty response.", status: result.status, usage };
  }

  // 5. Parse + validate (one corrective retry on bad JSON).
  let parsed: ZodInfer<S>;
  try {
    parsed = spec.outputSchema.parse(extractJson(result.text));
  } catch (firstErr) {
    result = await callProvider(
      cred,
      [
        { role: "user", content: user },
        { role: "assistant", content: result.text },
        {
          role: "user",
          content: `Your output failed validation: ${firstErr instanceof Error ? firstErr.message.slice(0, 500) : "invalid JSON"}. Return ONLY the corrected valid JSON.`,
        },
      ],
      { system: instructions, maxTokens: spec.maxTokens ?? 4096, webSearch: useGrounding },
    );
    addUsage(result.usage);
    if (!result.ok || !result.text.trim()) {
      return { ok: false, error: result.error ?? "Model returned an empty response on retry.", status: result.status, usage };
    }
    try {
      parsed = spec.outputSchema.parse(extractJson(result.text));
    } catch (secondErr) {
      return {
        ok: false,
        status: 502,
        error: `Output failed validation twice: ${secondErr instanceof Error ? secondErr.message.slice(0, 300) : "invalid"}`,
        usage,
      };
    }
  }

  // 6. Persist (pending_review HITL inside each spec's write).
  const summary = await spec.write(admin, ids, parsed);
  return { ok: true, summary, usage };
}
