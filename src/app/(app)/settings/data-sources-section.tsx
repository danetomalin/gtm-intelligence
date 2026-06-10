"use client";
// Settings → Data Sources. Ported from the cs-health v1.0 catalog:
// each connected source raises the Data Confidence score's
// source-diversity component and unlocks specific VAR inputs.
// Connections are simulated (localStorage) until OAuth wiring lands.

import { useEffect, useState } from "react";
import {
  INTEGRATION_CATALOG,
  loadConnectedSources,
  toggleConnectedSource,
} from "@/features/cs-health/lib/integrations";

const PRIORITY_STYLE: Record<string, string> = {
  P0: "text-danger",
  P1: "text-warn",
  P2: "text-text-dim",
};

export function DataSourcesSection() {
  const [connected, setConnected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConnected(loadConnectedSources());
    setHydrated(true);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="text-sm text-text-muted leading-relaxed max-w-2xl">
          Each connected source raises the Data Confidence score&apos;s
          source-diversity component and unlocks specific VAR inputs.
          Connections are simulated until OAuth wiring lands.
        </p>
        <span className="rounded-full bg-win-bg text-win px-3 py-1 text-xs font-semibold whitespace-nowrap">
          {hydrated ? `${connected.length} connected` : "…"}
        </span>
      </div>

      <div className="space-y-4 mt-4">
        {INTEGRATION_CATALOG.map((cat) => (
          <div key={cat.id} className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm">{cat.label}</span>
                <span className={`text-[11px] font-mono font-semibold ${PRIORITY_STYLE[cat.priority]}`}>
                  {cat.priority}
                </span>
              </div>
              <span className="text-xs text-text-dim">feeds: {cat.pillars.join(" · ")}</span>
            </div>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">{cat.rationale}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              {cat.integrations.map((integ) => {
                const isConnected = connected.includes(integ.id);
                const planned = integ.status === "planned";
                return (
                  <button
                    key={integ.id}
                    type="button"
                    disabled={planned}
                    onClick={() => setConnected(toggleConnectedSource(integ.id))}
                    className={
                      isConnected
                        ? "rounded-md border border-win/40 bg-win-bg px-3 py-1.5 text-sm font-medium text-win"
                        : planned
                          ? "rounded-md border border-border px-3 py-1.5 text-sm text-text-dim opacity-70 cursor-not-allowed"
                          : "rounded-md border border-border bg-card px-3 py-1.5 text-sm text-text hover:bg-card-hover transition"
                    }
                    title={planned ? "Planned — connector not built yet" : isConnected ? "Click to disconnect (simulated)" : "Click to connect (simulated)"}
                  >
                    {integ.name}
                    <span className="ml-2 text-[10px] uppercase tracking-wider opacity-80">
                      {isConnected ? "Connected" : planned ? "Planned" : "Available"}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-text-dim mt-3">{cat.signals.join(" · ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
