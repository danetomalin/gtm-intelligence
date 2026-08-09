// ============================================================
// SHARED SYNC EXECUTOR — used by the per-source sync route and
// the sync-all route. Owns the status lifecycle + guards:
//   - 'syncing' status marks in-flight (skip duplicates)
//   - stale 'syncing' (> 10 min) treated as crashed -> re-run
//   - cooldown: skip when last sync finished < 5 min ago
//     (unless force, e.g. the panel's explicit per-source button)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptJson, type EncryptedPayload } from "@/lib/connectors/crypto";
import { connectorLog } from "@/lib/connectors/logger";
import { getConnector } from "@/features/cs-health/connectors/registry";

const COOLDOWN_MS = 5 * 60 * 1000;
const STALE_SYNCING_MS = 10 * 60 * 1000;

export type SyncOutcome =
  | { source: string; status: "synced"; result: Record<string, number> }
  | { source: string; status: "skipped"; reason: string }
  | { source: string; status: "error"; error: string };

interface LegacyOrCurrentPayload {
  values?: Record<string, string>;
  token?: string;
}

export async function runSync(
  admin: SupabaseClient,
  organizationId: string,
  source: string,
  opts: { force?: boolean } = {},
): Promise<SyncOutcome> {
  const connector = getConnector(source);
  if (!connector) return { source, status: "error", error: `Unknown connector: ${source}` };

  const { data: cred, error: credErr } = await admin
    .from("connector_credentials")
    .select("base_url, encrypted, status, last_synced_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("source_id", source)
    .maybeSingle();
  if (credErr) return { source, status: "error", error: credErr.message };
  if (!cred) return { source, status: "skipped", reason: "not configured" };

  // In-flight guard (with crash self-heal)
  if (cred.status === "syncing") {
    const age = Date.now() - new Date(cred.updated_at).getTime();
    if (age < STALE_SYNCING_MS) {
      return { source, status: "skipped", reason: "sync already running" };
    }
    connectorLog.warn(source, "sync.stale_inflight_reset", { ageMs: age });
  }

  // Cooldown guard
  if (!opts.force && cred.last_synced_at) {
    const since = Date.now() - new Date(cred.last_synced_at).getTime();
    if (since < COOLDOWN_MS) {
      return {
        source,
        status: "skipped",
        reason: `synced ${Math.round(since / 1000)}s ago (cooldown)`,
      };
    }
  }

  const mark = (fields: Record<string, unknown>) =>
    admin
      .from("connector_credentials")
      .update(fields)
      .eq("organization_id", organizationId)
      .eq("source_id", source);

  await mark({ status: "syncing" });
  const started = Date.now();
  connectorLog.info(source, "sync.start", { org: organizationId, baseUrl: cred.base_url });
  try {
    const payload = decryptJson<LegacyOrCurrentPayload>(cred.encrypted as EncryptedPayload);
    const values = payload.values ?? (payload.token ? { token: payload.token } : {});
    const result = await connector.sync(
      admin,
      { baseUrl: cred.base_url, values },
      organizationId,
    );
    await mark({
      status: "connected",
      last_synced_at: new Date().toISOString(),
      last_result: result,
      last_error: null,
    });
    connectorLog.info(source, "sync.complete", { ...result, ms: Date.now() - started });
    return { source, status: "synced", result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await mark({ status: "error", last_error: message });
    connectorLog.error(source, "sync.failed", {
      message: message.slice(0, 300),
      ms: Date.now() - started,
    });
    return { source, status: "error", error: message };
  }
}
