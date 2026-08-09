"use client";
// ============================================================
// FRESHNESS CONTROL (design §8/§8a) — "Data as of … · Refresh".
// Reads connector status from GET /api/connectors; Refresh calls
// sync-all (server-side guards enforce cooldown/in-flight). The
// page always renders current DB data — never blocks on syncing.
// Also shows the CRM-only nudge when no support source is live.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ConnectorStatus = {
  id: string;
  configured: boolean;
  connection: { status: string; last_synced_at: string | null } | null;
};

const COOLDOWN_MS = 5 * 60 * 1000;

export function FreshnessBar() {
  const router = useRouter();
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/connectors");
      const body = await res.json();
      if (Array.isArray(body.connectors)) setConnectors(body.connectors);
    } catch {
      // no connector API (e.g. mock-only env) — render nothing
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const configured = connectors.filter((c) => c.configured);
  if (configured.length === 0) return null; // pure-demo tenant: stay invisible

  const syncTimes = configured
    .map((c) => c.connection?.last_synced_at)
    .filter((t): t is string => Boolean(t))
    .map((t) => new Date(t).getTime());
  const newest = syncTimes.length ? Math.max(...syncTimes) : null;
  const underCooldown = newest !== null && Date.now() - newest < COOLDOWN_MS;
  const supportLive = configured.some(
    (c) => c.id === "zendesk" && c.connection?.status === "connected",
  );

  async function refreshData() {
    setRefreshing(true);
    setNote(null);
    try {
      const res = await fetch("/api/connectors/sync-all", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      const errors = (body.outcomes ?? []).filter(
        (o: { status: string }) => o.status === "error",
      ).length;
      setNote(errors > 0 ? `Refreshed with ${errors} source error(s)` : null);
      await load();
      router.refresh(); // re-render the server component with fresh DB data
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-text-muted">
      <span>
        Data as of{" "}
        {newest ? new Date(newest).toLocaleString() : "— (no sync has run yet)"}
      </span>
      <button
        onClick={() => void refreshData()}
        disabled={refreshing || underCooldown}
        className="rounded border border-border px-2 py-0.5 text-text hover:bg-card disabled:opacity-60"
        title={underCooldown ? "Synced within the last 5 minutes" : "Pull latest from all sources"}
      >
        {refreshing ? "Refreshing…" : underCooldown ? "Up to date" : "Refresh"}
      </button>
      {note && <span className="text-danger">{note}</span>}
      {!supportLive && (
        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px]">
          Health scores are CRM-only — connect a support source for assessed scores
        </span>
      )}
    </div>
  );
}
