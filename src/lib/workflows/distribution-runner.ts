// ============================================================
// NATIVE DISTRIBUTION ADAPTERS — tranche 5 (X-EM, X-LI, X-OR, X-AP).
// Mock-first, exactly like the n8n versions: ship the most recent
// APPROVED artifact to the channel, record a campaign_sends row
// (source 'mock', status 'sent_mock'), and write synthetic
// engagement events into campaign_metrics so S-CP has data to
// analyze. Deterministic code — no LLM call, no credentials needed.
// Real channel credentials swap in later without changing callers.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_TENANT_ID, DEMO_BRAND_ID } from "@/lib/demo-context";

export const DISTRIBUTION_CODES = ["X-EM", "X-LI", "X-OR", "X-AP"] as const;
export type DistributionCode = (typeof DISTRIBUTION_CODES)[number];

export function isDistributionCode(code: string): code is DistributionCode {
  return (DISTRIBUTION_CODES as readonly string[]).includes(code);
}

const CHANNEL: Record<DistributionCode, { channel_type: string; audience: string; rates: { opened: number; clicked: number; replied: number } }> = {
  "X-EM": { channel_type: "resend", audience: "Nurture list — ops leaders (sample of 50)", rates: { opened: 0.42, clicked: 0.12, replied: 0.04 } },
  "X-LI": { channel_type: "linkedin", audience: "LinkedIn followers + 1st-degree ops network", rates: { opened: 0.3, clicked: 0.08, replied: 0.05 } },
  "X-OR": { channel_type: "outreach", audience: "Outreach sequence — 50 personas from buyer_personas", rates: { opened: 0.55, clicked: 0.1, replied: 0.07 } },
  "X-AP": { channel_type: "apollo", audience: "Apollo sequence — 50 personas from buyer_personas", rates: { opened: 0.5, clicked: 0.09, replied: 0.06 } },
};

const ARTIFACT_TABLES = ["content_outputs", "sales_collateral", "counter_narrative_memos"] as const;

// Deterministic-ish PRNG so synthetic engagement is stable per send.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function runDistribution(
  admin: SupabaseClient,
  code: DistributionCode,
  extras?: { artifactTable?: string; artifactId?: string },
): Promise<{ ok: true; summary: string } | { ok: false; error: string; status?: number }> {
  const ids = { organizationId: DEMO_TENANT_ID, brandId: DEMO_BRAND_ID };
  const cfg = CHANNEL[code];

  // 1. Resolve the artifact: explicit extras win; otherwise the most
  // recent APPROVED artifact across the three delivery tables.
  let artifactTable = extras?.artifactTable;
  let artifactId = extras?.artifactId;
  if (!artifactTable || !artifactId) {
    for (const table of ARTIFACT_TABLES) {
      const { data } = await admin
        .from(table)
        .select("id, created_at")
        .eq("brand_id", ids.brandId)
        .in("approval_status", ["approved", "published"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        artifactTable = table;
        artifactId = data.id;
        break;
      }
    }
  }
  if (!artifactTable || !artifactId) {
    return {
      ok: false,
      status: 422,
      error: "No APPROVED artifact to distribute — approve a content output, collateral piece, or counter-narrative in the Review Queue first.",
    };
  }

  // 2. Record the (mock) send.
  const audienceSize = 50;
  const { data: send, error: sendErr } = await admin
    .from("campaign_sends")
    .insert({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      channel_type: cfg.channel_type,
      source: "mock",
      artifact_table: artifactTable,
      artifact_id: artifactId,
      audience_descriptor: cfg.audience,
      audience_size: audienceSize,
      external_send_id: `${code.toLowerCase()}-mock-${Date.now().toString(36)}`,
      status: "sent_mock",
    })
    .select("id")
    .single();
  if (sendErr || !send) {
    return { ok: false, status: 500, error: sendErr?.message ?? "Failed to record campaign send." };
  }

  // 3. Synthetic engagement events (seeded by the send id for stability).
  const rng = mulberry32([...send.id].reduce((a, c) => a + c.charCodeAt(0), 0));
  const events: { event_type: string; recipient_hash: string }[] = [];
  for (let i = 0; i < audienceSize; i++) {
    const recipient = `r${i.toString().padStart(3, "0")}`;
    const r = rng();
    if (r < 0.04) {
      events.push({ event_type: "bounced", recipient_hash: recipient });
      continue;
    }
    events.push({ event_type: "delivered", recipient_hash: recipient });
    if (rng() < cfg.rates.opened) {
      events.push({ event_type: "opened", recipient_hash: recipient });
      if (rng() < cfg.rates.clicked / cfg.rates.opened) {
        events.push({ event_type: "clicked", recipient_hash: recipient });
      }
      if (rng() < cfg.rates.replied / cfg.rates.opened) {
        events.push({ event_type: "replied", recipient_hash: recipient });
      }
    }
  }
  const { error: metricsErr } = await admin.from("campaign_metrics").insert(
    events.map((e) => ({
      organization_id: ids.organizationId,
      brand_id: ids.brandId,
      send_id: send.id,
      source: "mock",
      metadata: { adapter: code, synthetic: true },
      ...e,
    })),
  );
  if (metricsErr) {
    return { ok: false, status: 500, error: `Send recorded but metrics write failed: ${metricsErr.message}` };
  }

  const opened = events.filter((e) => e.event_type === "opened").length;
  const replied = events.filter((e) => e.event_type === "replied").length;
  return {
    ok: true,
    summary: `Mock ${cfg.channel_type} send of ${artifactTable}/${artifactId.slice(0, 8)} to ${audienceSize} recipients — ${events.length} synthetic events (${opened} opens, ${replied} replies)`,
  };
}
