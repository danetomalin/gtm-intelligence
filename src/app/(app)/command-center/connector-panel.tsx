"use client";
// ============================================================
// LIVE CONNECTORS PANEL (migration 0036) — the first real
// connector: HubSpot. Saves an encrypted private-app token
// (validated against the live API before saving) and triggers
// syncs into the Integration Test org — the Halcyon demo
// portfolio is never touched.
// ============================================================

import { useCallback, useEffect, useState } from "react";

type Connection = {
  base_url: string;
  status: "configured" | "connected" | "error";
  last_synced_at: string | null;
  last_result: {
    companies?: number;
    deals?: number;
    accountsUpserted?: number;
    baselinesInserted?: number;
  };
  last_error: string | null;
} | null;

const statusChip: Record<string, string> = {
  connected: "border-success/40 bg-success/10 text-success",
  configured: "border-accent/40 bg-accent-bg/30 text-accent",
  error: "border-danger/40 bg-danger/10 text-danger",
};

export function ConnectorPanel() {
  const [conn, setConn] = useState<Connection>(null);
  const [configured, setConfigured] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.hubapi.com");
  const [busy, setBusy] = useState<"save" | "sync" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/connectors/hubspot/credentials");
      const body = await res.json();
      setConfigured(Boolean(body.configured));
      setConn(body.connection ?? null);
    } catch {
      // leave as-is
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/connectors/hubspot/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, baseUrl }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error ?? "Save failed");
      } else {
        setMessage("Credentials validated and saved (encrypted).");
        setToken("");
        setEditing(false);
        await refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function syncNow() {
    setBusy("sync");
    setMessage(null);
    try {
      const res = await fetch("/api/connectors/hubspot/sync", { method: "POST" });
      const body = await res.json();
      setMessage(
        res.ok
          ? `Synced: ${body.result.companies} companies, ${body.result.deals} deals -> ` +
            `${body.result.accountsUpserted} accounts (${body.result.baselinesInserted} new baselines).`
          : (body.error ?? "Sync failed"),
      );
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const btn = "text-xs rounded border border-border px-2 py-0.5 text-text hover:bg-card";

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-text">Live connectors</h2>
        <span className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] text-text-muted">
          writes to Integration Test org only
        </span>
      </div>
      <p className="mb-3 text-xs text-text-muted">
        Real integrations, distinct from the simulated sources above. Credentials are
        validated live, then stored encrypted (AES-256-GCM).
      </p>

      {!loaded ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : (
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-text">HubSpot</span>
            {configured && conn ? (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[10px] ${statusChip[conn.status] ?? ""}`}
              >
                {conn.status}
              </span>
            ) : (
              <span className="rounded-full border border-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
                not configured
              </span>
            )}
            <span className="ml-auto flex items-center gap-1.5">
              <button className={btn} onClick={() => setEditing((v) => !v)}>
                {configured ? "Update credentials" : "Add credentials"}
              </button>
              {configured && (
                <button
                  className="rounded border border-accent/50 bg-accent-bg/30 px-2 py-0.5 text-xs text-accent hover:bg-accent-bg/50"
                  onClick={() => void syncNow()}
                  disabled={busy !== null}
                >
                  {busy === "sync" ? "Syncing…" : "Sync now"}
                </button>
              )}
            </span>
          </div>

          {configured && conn?.last_synced_at && (
            <p className="mt-1 text-[11px] text-text-muted">
              Last sync {new Date(conn.last_synced_at).toLocaleString()} ·{" "}
              {conn.last_result?.accountsUpserted ?? 0} accounts from{" "}
              {conn.last_result?.companies ?? 0} companies / {conn.last_result?.deals ?? 0} deals
            </p>
          )}
          {conn?.last_error && (
            <p className="mt-1 text-[11px] text-danger">Last error: {conn.last_error}</p>
          )}

          {editing && (
            <div className="mt-2 space-y-2 border-t border-border pt-2">
              <label className="block text-[11px] text-text-muted">
                Private app token
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="pat-..."
                  className="mt-0.5 w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text"
                />
              </label>
              <label className="block text-[11px] text-text-muted">
                Base URL (keep default for real HubSpot; point at the mock for testing)
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="mt-0.5 w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text"
                />
              </label>
              <button
                className={btn}
                onClick={() => void save()}
                disabled={busy !== null || token.trim() === ""}
              >
                {busy === "save" ? "Validating…" : "Validate & save"}
              </button>
            </div>
          )}

          {message && <p className="mt-2 text-[11px] text-text">{message}</p>}
        </div>
      )}
    </section>
  );
}
