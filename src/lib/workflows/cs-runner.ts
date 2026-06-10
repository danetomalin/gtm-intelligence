// ============================================================
// NATIVE CS WORKFLOW RUNNER (Phase C) — the first workflows to run
// as Vercel-native code instead of n8n. Executes the operating
// instructions warehoused in workflow_configs on the credential
// profile assigned in Settings (headers from the client), against
// LIVE Customer Health data (Halcyon portfolio in Supabase).
//
// v1 target selection is automatic (the most relevant account per
// workflow); an account picker comes later. Output lands in
// enablement_assets as pending_review, so it flows through the
// existing Review Queue / Collateral Library like every other
// delivery artifact.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPortfolioData } from "@/features/cs-health/lib/loadPortfolio";
import { buildScoredAccounts } from "@/features/cs-health/lib/scoringEngine";
import type { ScoredAccount } from "@/features/cs-health/lib/types";
import type { PortfolioData } from "@/features/cs-health/lib/generateData";
import { callProvider, type ProviderConfig } from "@/lib/llm/providers";
import { DEMO_TENANT_ID, DEMO_BRAND_ID, DEMO_CS_COMPANY } from "@/lib/demo-context";
import { agentTooling } from "@/lib/demo-data";

export const NATIVE_CS_CODES = ["D-QB", "D-RT", "D-HP", "D-XP"] as const;
export type NativeCsCode = (typeof NATIVE_CS_CODES)[number];

export function isNativeCsCode(code: string): code is NativeCsCode {
  return (NATIVE_CS_CODES as readonly string[]).includes(code);
}

const ASSET_TYPE: Record<NativeCsCode, string> = {
  "D-QB": "qbr_template",
  "D-RT": "renewal_talk_track",
  "D-HP": "customer_health_playbook",
  "D-XP": "expansion_play",
};

const fmtK = (n: number) => `$${Math.round(n / 1000)}K`;

function accountDetail(a: ScoredAccount): string {
  const f = a.forecast
    ? `renewal likelihood ${a.forecast.likelihood}% (${a.forecast.likelihoodBand}, ${a.forecast.confidenceTier})${a.renewal?.isFirstRenewal ? ", FIRST renewal" : ""}, renews ${a.renewal?.renewalDate}`
    : "not in renewal window";
  return [
    `Account: ${a.name} (${a.segment}, ${a.stage}, CSM ${a.csm}, ARR ${fmtK(a.arr)})`,
    `Health: ${a.scoring.score}/100 (${a.scoring.band})${a.scoring.tier1 ? ` — TIER-1 OVERRIDE: ${a.scoring.tier1}` : ""}${a.scoring.penaltyReasons.length ? ` — penalties: ${a.scoring.penaltyReasons.join("; ")}` : ""}`,
    `VAR pillars: Value ${a.valueScore} / Adoption ${a.adoptionScore} / Relationship ${a.relationshipScore} · trend ${a.scoreTrend.join("→")}`,
    `Priority action: ${a.action.priority} — ${a.action.label} (${a.action.detail})`,
    `Expansion: ${a.expansionScoring.score}/100 (${a.expansionScoring.band})${a.expansionScoring.blockingFactor ? `, blocked by: ${a.expansionScoring.blockingFactor}` : ""} · recommended play: ${a.expansionScoring.recommendedPlay}`,
    `Renewal: ${f}`,
    `Sentiment: CSM rating ${a.sentiment.csmRating}/5, email ${a.sentiment.emailResponseTrend}, meetings ${a.sentiment.meetingTone}, verbatim theme: "${a.sentiment.verbatimTheme}"`,
    `Adoption signals: ${a.adoptionSignals.userPenetration}% penetration, ${a.adoptionSignals.featureBreadth}% feature breadth — ${a.adoptionSignals.trajectoryNote}`,
    `Time to value: ${a.ttv.daysToFirstValue ?? "n/a"} days, trajectory ${a.ttv.valueTrajectory}`,
  ].join("\n");
}

function churnLearnings(data: PortfolioData): string {
  return data.churnEvents
    .map((e) => `${e.name} (${e.segment}, ${fmtK(e.arr)}, ${e.primaryReason}): ${e.learnings}`)
    .join("\n");
}

// Pick the most relevant target + compose the task for each workflow.
function buildTask(code: NativeCsCode, scored: ScoredAccount[], data: PortfolioData): { title: string; task: string } {
  const atRiskRenewals = scored
    .filter((a) => a.forecast)
    .sort((a, b) => (a.forecast!.likelihood - b.forecast!.likelihood));

  switch (code) {
    case "D-QB": {
      const target = scored
        .filter((a) => a.stage === "Renewal Window")
        .sort((a, b) => b.arr - a.arr)[0] ?? scored.sort((a, b) => b.arr - a.arr)[0];
      return {
        title: `QBR outline — ${target.name}`,
        task: `Generate a QBR deck outline for the account below: success milestones, value delivered vs the VAR data, risk flags to address openly, expansion signals worth raising, and a recommended next-quarter agenda.\n\n${accountDetail(target)}\n\nChurn learnings to avoid repeating (portfolio ground truth):\n${churnLearnings(data)}`,
      };
    }
    case "D-RT": {
      const target = atRiskRenewals[0] ?? scored[0];
      return {
        title: `Renewal talk track — ${target.name}`,
        task: `Generate a renewal-call talk track for the account below: value-realized recap script grounded in the VAR data, honest risk acknowledgement, expansion bridge if appropriate, and a deal-saver play matched to the account's risk pattern.\n\n${accountDetail(target)}\n\nChurn learnings to avoid repeating (portfolio ground truth):\n${churnLearnings(data)}`,
      };
    }
    case "D-XP": {
      const target = scored
        .filter((a) => a.expansionScoring.band === "Expansion Ready")
        .sort((a, b) => b.expansionScoring.score - a.expansionScoring.score)[0]
        ?? scored.sort((a, b) => b.expansionScoring.score - a.expansionScoring.score)[0];
      return {
        title: `Expansion play — ${target.name}`,
        task: `Generate an account-expansion playbook for the account below: triggers to watch, the multi-thread plan (who to engage, where), an expansion talk track, and proof points that land for this profile.\n\n${accountDetail(target)}`,
      };
    }
    case "D-HP": {
      const critical = scored.filter((a) => a.scoring.band === "Critical");
      const detail = critical
        .sort((a, b) => b.arr - a.arr)
        .slice(0, 5)
        .map(accountDetail)
        .join("\n\n");
      return {
        title: `Health playbook — Critical-band pattern (${critical.length} accounts)`,
        task: `Generate a customer-health playbook for the dominant risk pattern in the Critical band below: early-warning signals, intervention scripts, escalation paths, and recovery proof.\n\nCritical accounts (top by ARR):\n${detail}\n\nChurn learnings (portfolio ground truth):\n${churnLearnings(data)}`,
      };
    }
  }
}

export async function runNativeCsWorkflow(
  admin: SupabaseClient,
  code: NativeCsCode,
  cred: ProviderConfig,
): Promise<{ ok: true; assetId: string; title: string } | { ok: false; error: string; status?: number }> {
  // 1. Operating instructions from the warehouse (Settings-editable).
  const { data: cfg } = await admin
    .from("workflow_configs")
    .select("instructions")
    .eq("organization_id", DEMO_TENANT_ID)
    .eq("workflow_code", code)
    .maybeSingle();
  const definition = agentTooling.find((w) => w.code === code);
  const instructions =
    (cfg?.instructions ?? "").trim() ||
    `You are the ${definition?.name ?? code} workflow (${code}). ${definition?.purpose ?? ""}`;

  // 2. Live Customer Health data.
  const portfolio = await loadPortfolioData();
  const scored = buildScoredAccounts([...portfolio.enterprise, ...portfolio.midmarket]);
  const { title, task } = buildTask(code, scored, portfolio);

  const system = `${instructions}

Context: the customer portfolio belongs to ${DEMO_CS_COMPANY}, a workforce management platform. The data below is live output of the VAR health model (Value/Adoption/Relationship, 0-100, Tier-1 overrides force Critical). Format the deliverable in clean markdown with scannable section headers.`;

  // 3. Execute on the assigned credential profile.
  const result = await callProvider(cred, [{ role: "user", content: task }], {
    system,
    maxTokens: 4096,
  });
  if (!result.ok || !result.text.trim()) {
    return { ok: false, error: result.error ?? "Model returned an empty response.", status: result.status };
  }

  // 4. Land in the enablement library as pending review (HITL).
  const { data: asset, error: assetErr } = await admin
    .from("enablement_assets")
    .insert({
      organization_id: DEMO_TENANT_ID,
      brand_id: DEMO_BRAND_ID,
      asset_type: ASSET_TYPE[code],
      audience: "customer_success",
      title,
      body_markdown: result.text,
      source_refs: `Customer Health (${DEMO_CS_COMPANY} portfolio) · live VAR model data · native runner`,
      produced_by: code,
      approval_status: "pending_review",
    })
    .select("id")
    .single();
  if (assetErr || !asset) {
    return { ok: false, error: assetErr?.message ?? "Failed to write enablement asset.", status: 500 };
  }

  return { ok: true, assetId: asset.id, title };
}
