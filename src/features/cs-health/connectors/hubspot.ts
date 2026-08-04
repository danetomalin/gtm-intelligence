// ============================================================
// HUBSPOT CONNECTOR — TypeScript port of the validated Python
// prototype adapter (gtm-ingest-prototype/ingest/hubspot_adapter.py),
// which was smoke-tested against a live HubSpot portal.
//
// Mechanics preserved from the prototype:
//   - private-app Bearer auth
//   - crm/v3 list endpoints with paging.next.after pagination
//   - deal -> company associations in the real envelope shape:
//       { associations: { companies: { results: [{ id }] } } }
//   - 429 handling with Retry-After backoff
//
// What it writes (Integration Test org only, never Halcyon):
//   - accounts: one row per HubSpot company (external_id = company id)
//   - var_metrics: a neutral CRM-only baseline row per account, but
//     ONLY for accounts with no existing metrics — never overwrites
//     manual/csv data. data_confidence is honest about the gap.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export interface HubSpotConfig {
  baseUrl: string; // https://api.hubapi.com, or the prototype mock
  token: string;   // private-app token (pat-...)
}

interface HsCompany {
  id: string;
  properties: Record<string, string | null>;
}
interface HsDeal {
  id: string;
  properties: Record<string, string | null>;
  associations?: {
    companies?: { results?: Array<{ id: string }> } | Array<{ id: string }>;
  };
}
interface HsListResponse<T> {
  results: T[];
  paging?: { next?: { after?: string } };
}

export interface SyncResult {
  companies: number;
  deals: number;
  accountsUpserted: number;
  baselinesInserted: number;
}

// ---------- HTTP with 429 backoff (mirrors prototype get_with_retry) ----------

async function hsFetch<T>(
  cfg: HubSpotConfig,
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const url = new URL(`${cfg.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") ?? 2 ** attempt);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HubSpot ${path} -> ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
  throw new Error(`HubSpot ${path}: rate-limited after ${maxRetries} retries`);
}

async function fetchAllPages<T>(
  cfg: HubSpotConfig,
  path: string,
  params: Record<string, string>,
): Promise<T[]> {
  const out: T[] = [];
  let after: string | undefined;
  do {
    const page = await hsFetch<HsListResponse<T>>(cfg, path, {
      ...params,
      ...(after ? { after } : {}),
    });
    out.push(...page.results);
    after = page.paging?.next?.after;
  } while (after);
  return out;
}

// ---------- Fetch ----------

export async function fetchPortfolio(cfg: HubSpotConfig) {
  // Real HubSpot omits non-default properties unless requested explicitly
  // (the prototype mock returns everything; the live API does not).
  const companies = await fetchAllPages<HsCompany>(cfg, "/crm/v3/objects/companies", {
    properties: "name,domain,annualrevenue",
    limit: "100",
  });
  const deals = await fetchAllPages<HsDeal>(cfg, "/crm/v3/objects/deals", {
    properties: "dealname,amount,dealstage,pipeline,closedate",
    associations: "companies",
    limit: "100",
  });
  return { companies, deals };
}

// ---------- Map (pure — unit-tested without any network/DB) ----------

export interface AccountRow {
  organization_id: string;
  external_id: string;
  name: string;
  arr: number;
  segment: "ENT" | "MM" | "SMB";
  stage: "Implementation" | "Launch" | "Steady State" | "Renewal Window";
  renewal_date: string | null; // YYYY-MM-DD
  is_first_renewal: boolean;
}

function dealCompanyIds(d: HsDeal): string[] {
  const assoc = d.associations?.companies;
  if (!assoc) return [];
  const results = Array.isArray(assoc) ? assoc : (assoc.results ?? []);
  return results.map((r) => r.id);
}

function isRenewalDeal(d: HsDeal): boolean {
  const name = (d.properties.dealname ?? "").toLowerCase();
  return d.properties.pipeline === "renewals" || name.includes("renewal");
}

export function mapToAccounts(
  companies: HsCompany[],
  deals: HsDeal[],
  organizationId: string,
  now: Date = new Date(),
): AccountRow[] {
  // company id -> earliest renewal close date among its renewal deals
  const renewalByCompany = new Map<string, string>();
  for (const d of deals) {
    if (!isRenewalDeal(d) || !d.properties.closedate) continue;
    const date = d.properties.closedate.slice(0, 10);
    for (const cid of dealCompanyIds(d)) {
      const prev = renewalByCompany.get(cid);
      if (!prev || date < prev) renewalByCompany.set(cid, date);
    }
  }

  return companies.map((c) => {
    const arr = Number(c.properties.annualrevenue ?? 0) || 0;
    const renewal = renewalByCompany.get(c.id) ?? null;
    const daysToRenewal = renewal
      ? Math.round((new Date(renewal).getTime() - now.getTime()) / 86_400_000)
      : null;
    return {
      organization_id: organizationId,
      external_id: c.id,
      name: c.properties.name ?? c.properties.domain ?? `Company ${c.id}`,
      arr,
      segment: arr >= 100_000 ? "ENT" : arr >= 25_000 ? "MM" : "SMB",
      stage:
        daysToRenewal !== null && daysToRenewal <= 120
          ? "Renewal Window"
          : "Steady State",
      renewal_date: renewal,
      is_first_renewal: false,
    };
  });
}

// ---------- Sync (fetch -> map -> upsert) ----------

export async function syncHubSpot(
  supa: SupabaseClient,
  cfg: HubSpotConfig,
  organizationId: string,
): Promise<SyncResult> {
  const { companies, deals } = await fetchPortfolio(cfg);
  const rows = mapToAccounts(companies, deals, organizationId);

  // Upsert accounts on the natural key (organization_id, external_id).
  const { error: upErr } = await supa
    .from("accounts")
    .upsert(rows, { onConflict: "organization_id,external_id" });
  if (upErr) throw new Error(`accounts upsert failed: ${upErr.message}`);

  // The dashboard only renders accounts that have var_metrics. Insert a
  // neutral CRM-only baseline for accounts that have NONE — and never
  // touch accounts that already have manual/csv/other-connector metrics.
  const { data: accountRows, error: selErr } = await supa
    .from("accounts")
    .select("id, external_id")
    .eq("organization_id", organizationId);
  if (selErr) throw new Error(`accounts select failed: ${selErr.message}`);

  const { data: existingVar } = await supa
    .from("var_metrics")
    .select("account_id")
    .eq("organization_id", organizationId);
  const hasMetrics = new Set((existingVar ?? []).map((v) => v.account_id));

  const synced = new Set(rows.map((r) => r.external_id));
  const today = new Date().toISOString().slice(0, 10);
  const baselines = (accountRows ?? [])
    .filter((a) => a.external_id && synced.has(a.external_id) && !hasMetrics.has(a.id))
    .map((a) => ({
      organization_id: organizationId,
      account_id: a.id,
      as_of: today,
      value_score: 60,
      adoption_score: 55,
      relationship_score: 60,
      expansion_inputs: {},
      data_confidence: {
        score: 30,
        completeness: 0.25,
        recency: 1,
        sourceDiversity: 1,
        note:
          "CRM-only baseline (HubSpot connector). Adoption/relationship are " +
          "neutral defaults until support and product sources are connected.",
      },
      source: "connector:hubspot",
    }));

  if (baselines.length > 0) {
    const { error: varErr } = await supa
      .from("var_metrics")
      .upsert(baselines, { onConflict: "account_id,as_of" });
    if (varErr) throw new Error(`var_metrics insert failed: ${varErr.message}`);
  }

  return {
    companies: companies.length,
    deals: deals.length,
    accountsUpserted: rows.length,
    baselinesInserted: baselines.length,
  };
}
