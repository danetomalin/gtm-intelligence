"use client";

import { useEffect, useMemo, useState } from "react";
import {
  groupWorkflowsByLayer,
  LAYER_LABEL,
  LAYER_ORDER,
  layerForCode,
  type LayerKey,
} from "@/lib/persona";

type Workflow = {
  name: string;
  code: string;
  purpose: string;
  cadence: string;
  status: string;
};

type LayerFilter = "all" | LayerKey;

const STORAGE_KEY = "throughline:dashboard:layer";

const FILTER_LABEL: Record<LayerFilter, string> = {
  all: "All workflows",
  R: LAYER_LABEL.R,
  S: LAYER_LABEL.S,
  D: LAYER_LABEL.D,
  X: LAYER_LABEL.X,
  I: LAYER_LABEL.I,
  A: LAYER_LABEL.A,
};

export function ActivePipeline({ workflows }: { workflows: Workflow[] }) {
  const [filter, setFilter] = useState<LayerFilter>("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored in FILTER_LABEL) {
        setFilter(stored as LayerFilter);
      }
    } catch {
      // localStorage unavailable
    }
    setHydrated(true);
  }, []);

  function updateFilter(next: LayerFilter) {
    setFilter(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  const visible = useMemo(() => {
    if (filter === "all") return workflows;
    return workflows.filter((w) => layerForCode(w.code) === filter);
  }, [workflows, filter]);

  // Build the dropdown options only from layers that have at least one workflow.
  // Keeps the dropdown honest when a layer (e.g. Integrations) has none yet.
  const availableLayers = useMemo(() => {
    const groups = groupWorkflowsByLayer(workflows);
    return groups.map((g) => g.key);
  }, [workflows]);

  return (
    <section>
      <div className="flex items-center justify-between pb-3 mb-5 border-b border-border gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Active pipeline</h2>
        <div className="flex items-center gap-2">
          <label
            htmlFor="active-pipeline-layer"
            className="text-[10px] uppercase tracking-wider text-text-dim font-semibold"
          >
            Layer
          </label>
          <select
            id="active-pipeline-layer"
            value={filter}
            onChange={(e) => updateFilter(e.target.value as LayerFilter)}
            disabled={!hydrated}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          >
            <option value="all">
              All workflows ({workflows.length})
            </option>
            {availableLayers.map((key) => {
              const count = workflows.filter((w) => layerForCode(w.code) === key).length;
              return (
                <option key={key} value={key}>
                  {LAYER_LABEL[key]} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-10 text-center text-sm text-text-muted">
          No workflows in this layer yet.
        </div>
      ) : filter === "all" ? (
        // Show grouped by layer when viewing all, so the layer structure is
        // visible even without filtering.
        <div className="space-y-6">
          {groupWorkflowsByLayer(workflows).map((group) => (
            <div key={group.key}>
              <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-2 px-1">
                {group.label}
                <span className="ml-2 text-text-dim/70 normal-case font-normal">
                  {group.workflows.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {group.workflows.map((agent) => (
                  <WorkflowCard key={agent.code} agent={agent} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Filtered to a single layer — flat grid, no inner header
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {visible.map((agent) => (
            <WorkflowCard key={agent.code} agent={agent} />
          ))}
        </div>
      )}
    </section>
  );
}

function WorkflowCard({ agent }: { agent: Workflow }) {
  return (
    <a
      href={`/agents/${agent.code.toLowerCase()}`}
      className="block rounded-lg border border-border bg-card hover:border-text-dim hover:bg-card-hover px-5 py-4 transition"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-accent">
          {agent.code}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-win bg-win-bg rounded-full px-2 py-0.5">
          {agent.status}
        </span>
      </div>
      <div className="text-sm font-semibold mb-1 text-text">{agent.name}</div>
      <div className="text-xs text-text-muted leading-relaxed line-clamp-3">
        {agent.purpose}
      </div>
      <div className="text-[11px] text-text-dim mt-2">{agent.cadence}</div>
    </a>
  );
}
