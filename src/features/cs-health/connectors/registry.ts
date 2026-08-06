// ============================================================
// CONNECTOR REGISTRY — the seam that makes connector #2..#N a
// registry entry + a sync function, not a new set of routes.
//
// The API routes are dynamic (/api/connectors/[source]/...) and
// dispatch through this table. Adding Zendesk later means adding
// one entry here; no route, panel, or credential-storage changes.
//
// Per-source metadata lives here (answering the review question
// about hardcoded defaults): defaultBaseUrl is per-connector
// platform metadata, overridable per-org via the stored base_url.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { syncHubSpot } from "./hubspot";

export interface ConnectorConfig {
  baseUrl: string;
  token: string;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  defaultBaseUrl: string;
  /** Cheap live credential check — called before saving. */
  validate(cfg: ConnectorConfig): Promise<{ ok: boolean; message?: string }>;
  /** Full sync into the given org. Returns counts for last_result. */
  sync(
    supa: SupabaseClient,
    cfg: ConnectorConfig,
    organizationId: string,
  ): Promise<Record<string, number>>;
}

const hubspot: ConnectorDefinition = {
  id: "hubspot",
  name: "HubSpot",
  defaultBaseUrl: "https://api.hubapi.com",
  async validate(cfg) {
    try {
      const res = await fetch(`${cfg.baseUrl}/crm/v3/objects/companies?limit=1`, {
        headers: { Authorization: `Bearer ${cfg.token}` },
        cache: "no-store",
      });
      if (res.ok) return { ok: true };
      const text = await res.text();
      return {
        ok: false,
        message: `HubSpot rejected the credentials (${res.status}): ${text.slice(0, 160)}`,
      };
    } catch (e) {
      return {
        ok: false,
        message: `Could not reach ${cfg.baseUrl}: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  },
  async sync(supa, cfg, organizationId) {
    const result = await syncHubSpot(supa, cfg, organizationId);
    return { ...result };
  },
};

export const CONNECTORS: Record<string, ConnectorDefinition> = {
  hubspot,
};

export function getConnector(source: string): ConnectorDefinition | null {
  return CONNECTORS[source] ?? null;
}
