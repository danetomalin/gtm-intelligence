"use client";
// Manage panel → Data connections (placeholder tier, migration 0033).
// Assign external sources to a workflow + write pull instructions for
// each. No live connector is wired yet — the engine discloses the
// assignment to the model honestly, and the schema is ready for the
// connector layer to swap in real fetches per source.

import { useCallback, useEffect, useState } from "react";
import { INTEGRATION_CATALOG } from "@/features/cs-health/lib/integrations";

type SourceRow = {
  id: string;
  source_id: string;
  source_name: string;
  pull_instructions: string;
  enabled: boolean;
  connection_status: string;
};

export function DataConnections({ workflowCode }: { workflowCode: string }) {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");
  const [instructions, setInstructions] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // source_id
  const [editText, setEditText] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/${workflowCode.toLowerCase()}/data-sources`);
      const body = await res.json();
      if (Array.isArray(body.sources)) setRows(body.sources);
    } catch {
      // leave as-is
    } finally {
      setLoaded(true);
    }
  }, [workflowCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function upsert(
    source_id: string,
    source_name: string,
    pull_instructions: string,
    enabled: boolean,
    connection_status = "placeholder",
  ) {
    await fetch(`/api/workflows/${workflowCode.toLowerCase()}/data-sources`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id, source_name, pull_instructions, enabled, connection_status }),
    });
    await refresh();
  }

  async function remove(source_id: string) {
    await fetch(`/api/workflows/${workflowCode.toLowerCase()}/data-sources?source_id=${encodeURIComponent(source_id)}`, {
      method: "DELETE",
    });
    await refresh();
  }

  async function add() {
    if (!pick) return;
    const [catId, intId] = pick.split("/");
    const cat = INTEGRATION_CATALOG.find((c) => c.id === catId);
    const integ = cat?.integrations.find((i) => i.id === intId);
    if (!cat || !integ) return;
    setAdding(true);
    try {
      await upsert(integ.id, `${integ.name} (${cat.label})`, instructions, true);
      setPick("");
      setInstructions("");
    } finally {
      setAdding(false);
    }
  }

  const assigned = new Set(rows.map((r) => r.source_id));
  const btn = "text-xs rounded border border-border px-2 py-0.5 text-text hover:bg-card";

  return (
    <div className="space-y-2">
      {!loaded ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-text-muted">
          No external sources assigned — this workflow runs on internal data only.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.source_id} className="rounded-md border border-border bg-surface px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-text">{r.source_name}</span>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                    r.connection_status === "connected"
                      ? "border-success/40 bg-success/10 text-success"
                      : r.connection_status === "simulated"
                        ? "border-accent/40 bg-accent-bg/30 text-accent"
                        : "border-border bg-card text-text-muted"
                  }`}
                  title={
                    r.connection_status === "simulated"
                      ? "Simulated: runs fetch realistic synthetic data matched to the pull instructions, clearly labeled SIMULATED."
                      : "Placeholder: assignment + instructions are saved and disclosed to the model, but no data is fetched."
                  }
                >
                  {r.connection_status}
                </span>
                {!r.enabled && <span className="text-[10px] text-text-dim">disabled</span>}
                <span className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      void upsert(
                        r.source_id,
                        r.source_name,
                        r.pull_instructions,
                        r.enabled,
                        r.connection_status === "simulated" ? "placeholder" : "simulated",
                      )
                    }
                    className={
                      r.connection_status === "simulated"
                        ? `${btn} text-text-muted`
                        : "text-xs rounded border border-accent/50 bg-accent-bg/30 px-2 py-0.5 text-accent hover:bg-accent-bg/50"
                    }
                    title={
                      r.connection_status === "simulated"
                        ? "Stop fetching synthetic data; back to disclosure-only"
                        : "Runs will fetch realistic synthetic data matched to the pull instructions (labeled SIMULATED, cost tracked)"
                    }
                  >
                    {r.connection_status === "simulated" ? "Stop simulating" : "Simulate"}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(editing === r.source_id ? null : r.source_id);
                      setEditText(r.pull_instructions);
                    }}
                    className={btn}
                  >
                    {editing === r.source_id ? "Close" : "Edit pull"}
                  </button>
                  <button
                    onClick={() => void upsert(r.source_id, r.source_name, r.pull_instructions, !r.enabled, r.connection_status)}
                    className={btn}
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => void remove(r.source_id)}
                    className="text-xs rounded border border-danger/40 px-2 py-0.5 text-danger hover:bg-danger/10"
                  >
                    Remove
                  </button>
                </span>
              </div>
              {editing === r.source_id ? (
                <div className="mt-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    placeholder="What should this workflow pull from this source, and how should it use it?"
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={() => {
                      void upsert(r.source_id, r.source_name, editText, r.enabled, r.connection_status);
                      setEditing(null);
                    }}
                    className="mt-1 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:opacity-90"
                  >
                    Save pull instructions
                  </button>
                </div>
              ) : (
                r.pull_instructions && (
                  <p className="mt-1 text-xs text-text-muted line-clamp-2" title={r.pull_instructions}>
                    Pull: {r.pull_instructions}
                  </p>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add a source */}
      <div className="flex flex-wrap items-start gap-2 pt-1">
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Add a source…</option>
          {INTEGRATION_CATALOG.map((cat) => (
            <optgroup key={cat.id} label={cat.label}>
              {cat.integrations
                .filter((i) => !assigned.has(i.id))
                .map((i) => (
                  <option key={i.id} value={`${cat.id}/${i.id}`}>
                    {i.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {pick && (
          <>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="Pull instructions — what to fetch and how this workflow should use it"
              className="min-w-[260px] flex-1 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => void add()}
              disabled={adding}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </>
        )}
      </div>
      <p className="text-[11px] text-text-dim">
        Placeholder sources are disclosed to the model but fetch nothing. Hit Simulate and runs will fetch realistic
        synthetic data matched to your pull instructions (labeled SIMULATED in every artifact, cost tracked in the
        ledger, max 4 simulated fetches per run). Real connectors swap in later without reconfiguring.
      </p>
    </div>
  );
}
