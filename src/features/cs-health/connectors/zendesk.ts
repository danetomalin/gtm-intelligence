// ============================================================
// ZENDESK CONNECTOR — earned health signals from support data.
// (design: docs/zendesk-connector-design.md §3–§4; mechanics
// ported from the smoke-tested Python prototype adapter)
//
// Pulls organizations + incremental tickets (cursor persisted in
// connector_sync_state) + ticket metrics + CSAT, aggregates
// per-account support signals in memory, and writes EARNED
// Relationship/Adoption inputs into var_metrics — replacing the
// neutral CRM-only baselines. Value stays CRM-owned.
//
// Auth: Basic "email/token:api_token". 429 backoff throughout.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { connectorLog } from "@/lib/connectors/logger";
import type { ConnectorConfig } from "./registry";

const SRC = "zendesk";

// ---------------- HTTP ----------------

function authHeader(cfg: ConnectorConfig): string {
  const raw = `${cfg.values.email}/token:${cfg.values.token}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

async function zdFetch<T>(
  cfg: ConnectorConfig,
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const url = new URL(`${cfg.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, {
      headers: { Authorization: authHeader(cfg) },
      cache: "no-store",
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") ?? 2 ** attempt);
      connectorLog.warn(SRC, "http.rate_limited", { path, attempt, waitSeconds: wait });
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Zendesk ${path} -> ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
  throw new Error(`Zendesk ${path}: rate-limited after 5 retries`);
}

// ---------------- Validate (registry hook) ----------------

export async function validateZendesk(
  cfg: ConnectorConfig,
): Promise<{ ok: boolean; message?: string }> {
  if (!cfg.values.email || !cfg.values.token) {
    return { ok: false, message: "email and token are required" };
  }
  try {
    await zdFetch(cfg, "/api/v2/organizations.json", { per_page: "1" });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------- Types (Zendesk shapes) ----------------

interface ZdOrg {
  id: number;
  name: string;
  domain_names?: string[];
}
interface ZdTicket {
  id: number;
  status: string;
  priority: string | null;
  organization_id: number | null;
  created_at: string;
  updated_at: string;
}
interface ZdIncremental {
  tickets: ZdTicket[];
  after_cursor: string | null;
  end_of_stream: boolean;
}
interface ZdMetric {
  ticket_id: number;
  full_resolution_time_in_minutes?: { calendar?: number | null };
}
interface ZdRating {
  ticket_id: number;
  score: string; // "good" | "bad"
}

// ---------------- Signal math (pure — unit tested) ----------------

export interface TicketLite {
  createdAt: string; // ISO
  priority: string | null;
  resolutionHours: number | null; // null = unsolved/unknown
  csat: "good" | "bad" | null;
}

export interface SupportSignals {
  tickets30d: number;
  ticketsPrior30d: number;
  volumeRatio: number;
  avgResolutionHours: number | null;
  csatPct: number | null;
  escalationPct: number;
  silent90d: boolean;
}

const DAY_MS = 86_400_000;

export function computeSignals(tickets: TicketLite[], now: Date = new Date()): SupportSignals {
  const age = (t: TicketLite) => (now.getTime() - new Date(t.createdAt).getTime()) / DAY_MS;
  const recent = tickets.filter((t) => age(t) <= 30);
  const prior = tickets.filter((t) => age(t) > 30 && age(t) <= 60);
  const window90 = tickets.filter((t) => age(t) <= 90);

  const solved = recent.filter((t) => t.resolutionHours !== null);
  const rated = recent.filter((t) => t.csat !== null);
  const escalated = recent.filter(
    (t) => t.priority === "high" || t.priority === "urgent",
  );

  return {
    tickets30d: recent.length,
    ticketsPrior30d: prior.length,
    volumeRatio: recent.length / Math.max(prior.length, 1),
    avgResolutionHours: solved.length
      ? solved.reduce((s, t) => s + (t.resolutionHours as number), 0) / solved.length
      : null,
    csatPct: rated.length
      ? (100 * rated.filter((t) => t.csat === "good").length) / rated.length
      : null,
    escalationPct: recent.length ? (100 * escalated.length) / recent.length : 0,
    silent90d: window90.length === 0,
  };
}

/** Relationship score per design §4: start 75, apply explainable penalties. */
export function relationshipScore(s: SupportSignals): { score: number; reasons: string[] } {
  let score = 75;
  const reasons: string[] = [];
  if (s.volumeRatio >= 1.8 && s.tickets30d >= 4) {
    score -= 20;
    reasons.push(`ticket volume spike (${s.volumeRatio.toFixed(1)}x vs prior 30d)`);
  }
  if (s.csatPct !== null && s.csatPct < 70) {
    score -= 25;
    reasons.push(`CSAT ${s.csatPct.toFixed(0)}% (< 70%)`);
  }
  if (s.avgResolutionHours !== null && s.avgResolutionHours > 48) {
    score -= 15;
    reasons.push(`avg resolution ${s.avgResolutionHours.toFixed(0)}h (> 48h)`);
  }
  if (s.escalationPct > 25) {
    score -= 10;
    reasons.push(`${s.escalationPct.toFixed(0)}% tickets high/urgent`);
  }
  if (s.csatPct !== null && s.csatPct >= 90 && s.volumeRatio < 1.3) {
    score += 10;
    reasons.push("strong CSAT with stable volume");
  }
  return { score: Math.max(5, Math.min(95, score)), reasons };
}

// ---------------- Fetch streams ----------------

async function fetchOrgs(cfg: ConnectorConfig): Promise<ZdOrg[]> {
  const data = await zdFetch<{ organizations: ZdOrg[] }>(cfg, "/api/v2/organizations.json");
  return data.organizations;
}

async function fetchTicketsIncremental(
  cfg: ConnectorConfig,
  startCursor: string | null,
): Promise<{ tickets: ZdTicket[]; cursor: string | null; pages: number }> {
  const tickets: ZdTicket[] = [];
  let cursor = startCursor;
  let pages = 0;
  for (;;) {
    const params: Record<string, string> = { per_page: "100" };
    if (cursor) params.cursor = cursor;
    else params.start_time = "0";
    const data = await zdFetch<ZdIncremental>(
      cfg,
      "/api/v2/incremental/tickets/cursor.json",
      params,
    );
    tickets.push(...data.tickets);
    pages += 1;
    cursor = data.after_cursor ?? cursor;
    if (data.end_of_stream) break;
  }
  return { tickets, cursor, pages };
}

/** Resolution times. Real Zendesk: ticket_metrics (tickets carry no
 * solved_at — prototype lesson). Falls back to updated_at-created_at for
 * solved tickets when the endpoint is unavailable (e.g. the mock). */
async function fetchResolutionHours(
  cfg: ConnectorConfig,
  solvedTickets: ZdTicket[],
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  try {
    let page = 1;
    for (;;) {
      const data = await zdFetch<{ ticket_metrics: ZdMetric[]; next_page: string | null }>(
        cfg,
        "/api/v2/ticket_metrics.json",
        { page: String(page), per_page: "100" },
      );
      for (const m of data.ticket_metrics) {
        const mins = m.full_resolution_time_in_minutes?.calendar;
        if (mins != null) out.set(m.ticket_id, mins / 60);
      }
      if (!data.next_page) break;
      page += 1;
    }
    return out;
  } catch {
    connectorLog.warn(SRC, "ticket_metrics.unavailable", {
      fallback: "updated_at - created_at for solved tickets",
    });
    for (const t of solvedTickets) {
      const h =
        (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 3_600_000;
      if (h > 0) out.set(t.id, h);
    }
    return out;
  }
}

async function fetchCsat(cfg: ConnectorConfig): Promise<Map<number, "good" | "bad">> {
  const out = new Map<number, "good" | "bad">();
  try {
    let page = 1;
    for (;;) {
      const data = await zdFetch<{ satisfaction_ratings: ZdRating[]; next_page: string | null }>(
        cfg,
        "/api/v2/satisfaction_ratings.json",
        { page: String(page), per_page: "100" },
      );
      for (const r of data.satisfaction_ratings) {
        if (r.score === "good" || r.score === "bad") out.set(r.ticket_id, r.score);
      }
      if (!data.next_page) break;
      page += 1;
    }
  } catch {
    connectorLog.warn(SRC, "csat.unavailable", { note: "ratings skipped (common on trials)" });
  }
  return out;
}

// ---------------- Sync (registry hook) ----------------

export async function syncZendesk(
  supa: SupabaseClient,
  cfg: ConnectorConfig,
  organizationId: string,
): Promise<Record<string, number>> {
  // 1. Streams
  const orgs = await fetchOrgs(cfg);

  const { data: stateRow } = await supa
    .from("connector_sync_state")
    .select("cursor")
    .eq("organization_id", organizationId)
    .eq("source_id", SRC)
    .eq("stream", "tickets")
    .maybeSingle();
  const { tickets: newTickets, cursor, pages } = await fetchTicketsIncremental(
    cfg,
    stateRow?.cursor ?? null,
  );
  connectorLog.info(SRC, "fetch.complete", {
    organizations: orgs.length,
    newTickets: newTickets.length,
    pages,
    resumedFromCursor: Boolean(stateRow?.cursor),
  });

  // 2. Persist raw-enough ticket facts per account? No — aggregate in
  // memory (design §3). But incremental sync only returns DELTAS, and
  // signals need a 90d window; so deltas are folded into a rolling
  // per-account snapshot kept in adoption_signals->'zendeskTickets'.
  const solvedStatuses = new Set(["solved", "closed"]);
  const solvedNew = newTickets.filter((t) => solvedStatuses.has(t.status));
  const resolution = await fetchResolutionHours(cfg, solvedNew);
  const csat = await fetchCsat(cfg);

  const orgDomain = new Map<number, string>();
  for (const o of orgs) {
    const d = o.domain_names?.[0];
    if (d) orgDomain.set(o.id, d.toLowerCase());
  }

  // 3. Accounts by domain
  const { data: accounts, error: accErr } = await supa
    .from("accounts")
    .select("id, domain, adoption_signals")
    .eq("organization_id", organizationId);
  if (accErr) throw new Error(`accounts select failed: ${accErr.message}`);
  const accountByDomain = new Map(
    (accounts ?? [])
      .filter((a) => a.domain)
      .map((a) => [String(a.domain).toLowerCase(), a]),
  );
  const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));

  // 4. Fold new tickets into each account's rolling ticket snapshot
  const perAccount = new Map<string, TicketLite[]>();
  for (const a of accountByDomain.values()) {
    const existing: TicketLite[] =
      (a.adoption_signals?.zendeskTickets as TicketLite[] | undefined) ?? [];
    perAccount.set(a.id, existing);
  }
  let matched = 0;
  const unmatchedOrgIds = new Set<number>();
  for (const t of newTickets) {
    const domain = t.organization_id != null ? orgDomain.get(t.organization_id) : undefined;
    const account = domain ? accountByDomain.get(domain) : undefined;
    if (!account) {
      if (t.organization_id != null) unmatchedOrgIds.add(t.organization_id);
      continue;
    }
    matched += 1;
    const list = perAccount.get(account.id) as TicketLite[];
    list.push({
      createdAt: t.created_at,
      priority: t.priority,
      resolutionHours: resolution.get(t.id) ?? null,
      csat: csat.get(t.id) ?? null,
    });
  }

  // 5. Compute signals + write var_metrics (merge semantics, design §4)
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const cutoff = now.getTime() - 90 * DAY_MS;

  const { data: existingVar } = await supa
    .from("var_metrics")
    .select("account_id, as_of, value_score, adoption_score, expansion_inputs")
    .eq("organization_id", organizationId)
    .order("as_of", { ascending: false });
  const latestVar = new Map<string, NonNullable<typeof existingVar>[number]>();
  for (const v of existingVar ?? []) {
    if (!latestVar.has(v.account_id)) latestVar.set(v.account_id, v);
  }

  let varRows = 0;
  for (const [accountId, allTickets] of perAccount) {
    // trim the rolling snapshot to the 90d window before storing/computing
    const trimmed = allTickets.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
    const signals = computeSignals(trimmed, now);
    const rel = relationshipScore(signals);
    const prev = latestVar.get(accountId);
    const adoption =
      Math.max(5, Math.min(95, (prev?.adoption_score ?? 55) + (signals.silent90d ? -10 : 0)));

    const { error: varErr } = await supa.from("var_metrics").upsert(
      {
        organization_id: organizationId,
        account_id: accountId,
        as_of: today,
        value_score: prev?.value_score ?? 60, // Value stays CRM-owned
        adoption_score: adoption,
        relationship_score: rel.score,
        expansion_inputs: prev?.expansion_inputs ?? {},
        data_confidence: {
          score: 55,
          completeness: 0.5,
          recency: 1,
          sourceDiversity: 2,
          note:
            "CRM + Support connected. " +
            (rel.reasons.length ? `Signals: ${rel.reasons.join("; ")}.` : "No adverse support signals.") +
            " Product analytics and VoC pending.",
        },
        source: "connector:zendesk",
      },
      { onConflict: "account_id,as_of" },
    );
    if (varErr) throw new Error(`var_metrics upsert failed: ${varErr.message}`);
    varRows += 1;

    // persist the trimmed rolling snapshot for the next delta sync
    const { error: accUpdErr } = await supa
      .from("accounts")
      .update({
        adoption_signals: {
          ...(accountById.get(accountId)?.adoption_signals ?? {}),
          zendeskTickets: trimmed,
        },
      })
      .eq("id", accountId);
    if (accUpdErr) throw new Error(`accounts snapshot update failed: ${accUpdErr.message}`);
  }

  // 6. Persist cursor LAST — a failed run re-pulls the same delta (safe,
  // idempotent) rather than silently skipping it.
  if (cursor) {
    const { error: curErr } = await supa.from("connector_sync_state").upsert(
      {
        organization_id: organizationId,
        source_id: SRC,
        stream: "tickets",
        cursor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,source_id,stream" },
    );
    if (curErr) throw new Error(`sync_state upsert failed: ${curErr.message}`);
  }

  return {
    organizations: orgs.length,
    newTickets: newTickets.length,
    matchedTickets: matched,
    unmatchedOrgs: unmatchedOrgIds.size,
    accountsScored: varRows,
  };
}
