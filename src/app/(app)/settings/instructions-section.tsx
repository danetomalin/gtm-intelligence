"use client";
// Settings → Workflow Instructions. Every workflow listed with its
// customization status; expand a row to edit its operating brief.
// Same workflow_configs rows the per-workflow Configure panel edits.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { InstructionsEditor } from "./instructions-editor";
import { CredentialAssign } from "./credential-assign";

export type WorkflowListItem = {
  code: string;
  name: string;
  purpose: string;
};

type ConfigRow = {
  workflow_code: string;
  instructions: string;
  updated_at: string;
};

export function InstructionsSection({ workflows }: { workflows: WorkflowListItem[] }) {
  const [configs, setConfigs] = useState<Map<string, ConfigRow>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workflows/config");
        const body = await res.json();
        if (!cancelled && Array.isArray(body.configs)) {
          setConfigs(new Map(body.configs.map((c: ConfigRow) => [c.workflow_code, c])));
        }
      } catch {
        // list still renders; rows show Default
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q),
    );
  }, [workflows, filter]);

  const customizedCount = [...configs.values()].filter(
    (c) => c.instructions.trim().length > 0,
  ).length;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="text-xs uppercase tracking-wider text-text-muted">
          {workflows.length} workflows · {loaded ? `${customizedCount} customized` : "loading…"}
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter workflows…"
          className="w-56 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <ul className="divide-y divide-border">
        {rows.map((w) => {
          const row = configs.get(w.code);
          const customized = !!row && row.instructions.trim().length > 0;
          const open = openCode === w.code;
          return (
            <li key={w.code} className="py-2">
              <button
                type="button"
                onClick={() => setOpenCode(open ? null : w.code)}
                className="w-full flex items-center justify-between gap-3 text-left rounded-md px-2 py-1.5 hover:bg-card-hover/60 transition"
              >
                <span className="min-w-0">
                  <span className="font-medium text-sm">{w.name}</span>
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-text-dim">
                    {w.code}
                  </span>
                </span>
                <span className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={
                      customized
                        ? "rounded-full bg-accent-bg text-accent px-2.5 py-0.5 text-[11px] font-semibold"
                        : "rounded-full bg-card-hover text-text-dim px-2.5 py-0.5 text-[11px]"
                    }
                  >
                    {customized ? "Customized" : "Default"}
                  </span>
                  <span className="text-text-dim text-xs">{open ? "▾" : "▸"}</span>
                </span>
              </button>
              {open && (
                <div className="px-2 pt-3 pb-1">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <Link
                      href={`/agents/${w.code.toLowerCase()}`}
                      className="text-accent text-xs"
                    >
                      Open workflow page →
                    </Link>
                    <CredentialAssign workflowCode={w.code} />
                  </div>
                  <InstructionsEditor
                    code={w.code}
                    defaultInstructions={w.purpose}
                    initialInstructions={row?.instructions ?? ""}
                    onSaved={(instructions) => {
                      setConfigs((m) => {
                        const next = new Map(m);
                        next.set(w.code, {
                          workflow_code: w.code,
                          instructions,
                          updated_at: new Date().toISOString(),
                        });
                        return next;
                      });
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
