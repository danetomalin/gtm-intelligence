"use client";
// ============================================================
// LIVE CONNECTORS PANEL — registry-driven (design §6). Renders one
// card per connector from GET /api/connectors; credential forms
// are generated from each connector's declared fields. Adding a
// new connector requires zero changes here.
// ============================================================

import { useCallback, useEffect, useState } from "react";

type CredentialField = {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
};

type ConnectorInfo = {
  id: string;
  name: string;
  description: string;
  defaultBaseUrl: string;
  credentialFields: CredentialField[];
  configured: boolean;
  connection: {
    base_url: string;
    status: string;
    last_synced_at: string | null;
    last_result: Record<string, number>;
    last_error: string | null;
  } | null;
};

const statusChip: Record<string, string> = {
  connected: "border-success/40 bg-success/10 text-success",
  configured: "border-accent/40 bg-accent-bg/30 text-accent",
  syncing: "border-accent/40 bg-accent-bg/30 text-accent",
  error: "border-danger/40 bg-danger/10 text-danger",
};

function fmtResult(r: Record<string, number>): string {
  return Object.entries(r)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

export function ConnectorPanel() {
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null); // "<id>:save" | "<id>:sync" | "all"
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [allMessage, setAllMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/connectors");
      const body = await res.json();
      if (Array.isArray(body.connectors)) setConnectors(body.connectors);
    } catch {
      // leave as-is
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function readBody(res: Response): Promise<{ error?: string; result?: Record<string, number>; outcomes?: Array<{ source: string; status: string; reason?: string; error?: string; result?: Record<string, number> }> }> {
    try {
      return await res.json();
    } catch {
      return { error: `Server error (${res.status}) — check the deployment function logs.` };
    }
  }

  const say = (id: string, msg: string) => setMessages((m) => ({ ...m, [id]: msg }));

  async function save(c: ConnectorInfo) {
    setBusy(`${c.id}:save`);
    say(c.id, "");
    try {
      const res = await fetch(`/api/connectors/${c.id}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: form }),
      });
      const body = await readBody(res);
      if (!res.ok) {
        say(c.id, body.error ?? "Save failed");
      } else {
        say(c.id, "Credentials validated and saved (encrypted).");
        setForm({});
        setEditing(null);
        await refresh();
      }
    } catch (e) {
      say(c.id, `Request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function syncOne(c: ConnectorInfo) {
    setBusy(`${c.id}:sync`);
    say(c.id, "");
    try {
      const res = await fetch(`/api/connectors/${c.id}/sync`, { method: "POST" });
      const body = await readBody(res);
      say(
        c.id,
        res.ok && body.result ? `Synced — ${fmtResult(body.result)}` : (body.error ?? "Sync failed"),
      );
      await refresh();
    } catch (e) {
      say(c.id, `Request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function syncAll() {
    setBusy("all");
    setMessages({});
    setAllMessage(null);
    try {
      const res = await fetch("/api/connectors/sync-all", { method: "POST" });
      const body = await readBody(res);
      const outcomes = body.outcomes ?? [];
      if (outcomes.length === 0) {
        setAllMessage(body.error ?? "No configured connectors to sync.");
        return;
      }
      const counts = { synced: 0, skipped: 0, error: 0 };
      for (const o of outcomes) {
        counts[o.status as keyof typeof counts] += 1;
        say(
          o.source,
          o.status === "synced" && o.result
            ? `Synced — ${fmtResult(o.result)}`
            : o.status === "skipped"
              ? `Skipped: ${o.reason}`
              : (o.error ?? "failed"),
        );
      }
      setAllMessage(
        `${counts.synced} synced · ${counts.skipped} skipped · ${counts.error} failed — details on each card`,
      );
      await refresh();
    } catch (e) {
      setAllMessage(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  const btn = "text-xs rounded border border-border px-2 py-0.5 text-text hover:bg-card";
  const accentBtn =
    "rounded border border-accent/50 bg-accent-bg/30 px-2 py-0.5 text-xs text-accent hover:bg-accent-bg/50";

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-text">Live connectors</h2>
        <span className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] text-text-muted">
          writes to Integration Test org only
        </span>
        <span className="ml-auto">
          <button className={accentBtn} onClick={() => void syncAll()} disabled={busy !== null}>
            {busy === "all" ? "Syncing all…" : "Sync all sources"}
          </button>
        </span>
      </div>
      <p className="mb-3 text-xs text-text-muted">
        Real integrations, distinct from the simulated sources above. Credentials are
        validated live, then stored encrypted (AES-256-GCM).
      </p>
      {allMessage && <p className="mb-2 text-[11px] text-text">{allMessage}</p>}

      {!loaded ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : (
        <div className="space-y-2">
          {connectors.map((c) => (
            <div key={c.id} className="rounded-md border border-border bg-card px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-text">{c.name}</span>
                {c.configured && c.connection ? (
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[10px] ${statusChip[c.connection.status] ?? ""}`}
                  >
                    {c.connection.status}
                  </span>
                ) : (
                  <span className="rounded-full border border-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
                    not configured
                  </span>
                )}
                <span className="text-[11px] text-text-dim">{c.description}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <button
                    className={btn}
                    onClick={() => {
                      setEditing(editing === c.id ? null : c.id);
                      setForm({});
                    }}
                  >
                    {c.configured ? "Update credentials" : "Add credentials"}
                  </button>
                  {c.configured && (
                    <button
                      className={accentBtn}
                      onClick={() => void syncOne(c)}
                      disabled={busy !== null}
                    >
                      {busy === `${c.id}:sync` ? "Syncing…" : "Sync now"}
                    </button>
                  )}
                </span>
              </div>

              {c.configured && c.connection?.last_synced_at && (
                <p className="mt-1 text-[11px] text-text-muted">
                  Last sync {new Date(c.connection.last_synced_at).toLocaleString()} ·{" "}
                  {fmtResult(c.connection.last_result ?? {})}
                </p>
              )}
              {c.connection?.last_error && (
                <p className="mt-1 text-[11px] text-danger">
                  Last error: {c.connection.last_error}
                </p>
              )}

              {editing === c.id && (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  {c.credentialFields.map((f) => (
                    <label key={f.key} className="block text-[11px] text-text-muted">
                      {f.label}
                      <input
                        type={f.type}
                        value={form[f.key] ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        placeholder={f.placeholder ?? ""}
                        className="mt-0.5 w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text"
                      />
                    </label>
                  ))}
                  <button
                    className={btn}
                    onClick={() => void save(c)}
                    disabled={busy !== null}
                  >
                    {busy === `${c.id}:save` ? "Validating…" : "Validate & save"}
                  </button>
                </div>
              )}

              {messages[c.id] && (
                <p className="mt-2 text-[11px] text-text">{messages[c.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
