// ============================================================
// CONNECTOR REGISTRY — one entry per source; routes and panel are
// generic over this table (Dimensions 1 + 2 of the scalability
// discussion, see docs/zendesk-connector-design.md §6).
//
// Each entry DECLARES its credential fields; the panel renders
// forms from these declarations, and the credentials route stores
// whatever shape a connector declares (encrypted as one blob).
// Adding a connector = one entry here + a sync module.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { syncHubSpot } from "./hubspot";
import { syncZendesk, validateZendesk } from "./zendesk";

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
}

/** Generic runtime config: base URL + the declared credential values. */
export interface ConnectorConfig {
  baseUrl: string;
  values: Record<string, string>;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  description: string;
  defaultBaseUrl: string;
  credentialFields: CredentialField[];
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
  description: "CRM — account spine: companies, ARR, deals, renewal dates.",
  defaultBaseUrl: "https://api.hubapi.com",
  credentialFields: [
    { key: "token", label: "Private app token", type: "password", placeholder: "pat-..." },
  ],
  async validate(cfg) {
    try {
      const res = await fetch(`${cfg.baseUrl}/crm/v3/objects/companies?limit=1`, {
        headers: { Authorization: `Bearer ${cfg.values.token}` },
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
    const result = await syncHubSpot(
      supa,
      { baseUrl: cfg.baseUrl, token: cfg.values.token },
      organizationId,
    );
    return { ...result };
  },
};

const zendesk: ConnectorDefinition = {
  id: "zendesk",
  name: "Zendesk",
  description:
    "Support — earned Relationship/Adoption signals: ticket trends, resolution, CSAT.",
  defaultBaseUrl: "https://yoursubdomain.zendesk.com",
  credentialFields: [
    {
      key: "baseUrl",
      label: "Zendesk URL",
      type: "text",
      placeholder: "https://yourcompany.zendesk.com",
    },
    { key: "email", label: "Admin email", type: "text", placeholder: "you@company.com" },
    { key: "token", label: "API token", type: "password" },
  ],
  validate: validateZendesk,
  sync: syncZendesk,
};

export const CONNECTORS: Record<string, ConnectorDefinition> = {
  hubspot,
  zendesk,
};

export function getConnector(source: string): ConnectorDefinition | null {
  return CONNECTORS[source] ?? null;
}
