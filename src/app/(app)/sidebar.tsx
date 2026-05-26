"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { agentTooling } from "@/lib/demo-data";
import {
  filterWorkflowsForLens,
  groupWorkflowsByLayer,
  layerForCode,
  LENS_LABEL,
  LENS_OPTIONS,
  outputsForLens,
  type Lens,
} from "@/lib/persona";

// Role-independent sections that surface for every lens. Launches lives here
// per Dane's call (cross-functional operational object — every role touches
// it but it doesn't belong inside any one workspace).
const OPERATIONS_ITEMS = [
  { name: "Launches", href: "/launches", hint: "Release readiness packs" },
  { name: "Review Queue", href: "/review-queue", hint: "HITL approvals" },
  { name: "Observability", href: "/observability", hint: "Run health, HITL load" },
  { name: "Collateral Library", href: "/collateral", hint: "All enablement assets" },
  { name: "Cost Model", href: "/cost-model", hint: "Per-tier COGS & margin" },
];

const SETUP_ITEMS = [
  {
    name: "+ Brand Code intake",
    href: "/onboarding/brand-code",
    hint: "Conversational R-BR onboarding",
  },
  {
    name: "+ New brand",
    href: "/onboarding",
    hint: "",
  },
];

const LENS_STORAGE_KEY = "throughline:lens";

export function Sidebar() {
  const pathname = usePathname();
  // SSR-safe default — render "all" until client hydrates, then read the
  // persisted lens. Avoids a hydration flash by keeping the same default in
  // both passes; the hydration `useEffect` swaps in the persisted value.
  const [lens, setLens] = useState<Lens>("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LENS_STORAGE_KEY);
      if (stored && (LENS_OPTIONS as string[]).includes(stored)) {
        setLens(stored as Lens);
      }
    } catch {
      // localStorage unavailable (private mode, server, etc.) — silently fall
      // back to the default lens.
    }
    setHydrated(true);
  }, []);

  function updateLens(next: Lens) {
    setLens(next);
    try {
      localStorage.setItem(LENS_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Pass the unfiltered agentTooling so outputsForLens can rank role
  // dashboards by per-role workflow count when the lens is "all".
  const outputs = useMemo(() => outputsForLens(lens, agentTooling), [lens]);
  const workflows = useMemo(() => {
    // Setup-layer workflows (A0 Brand Initializer) are covered by the
    // dedicated "SETUP" group at the bottom of the sidebar — Brand Code
    // intake handles the same motion. Hide them from the Workflows section
    // to keep navigation non-duplicative. The dashboard's Active Pipeline
    // still surfaces A0 for completeness.
    const all = filterWorkflowsForLens(agentTooling, lens);
    return all.filter((w) => layerForCode(w.code) !== "A");
  }, [lens]);

  return (
    <aside className="w-64 border-r border-border bg-surface/40 flex-shrink-0 sticky top-0 h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/dashboard" className="block">
          <div className="text-[10px] uppercase tracking-[2px] text-text-dim mb-1">
            AI Native GTM
          </div>
          <div className="text-base font-semibold tracking-tight">
            <span className="text-accent">Throughline</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Overview — top-level landing, no group header */}
        <div>
          <Link
            href="/dashboard"
            aria-current={isActive("/dashboard") ? "page" : undefined}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition",
              isActive("/dashboard")
                ? "bg-accent-bg text-accent"
                : "text-text-muted hover:text-text hover:bg-card-hover/50",
            )}
          >
            <div className="font-medium">Overview</div>
            <div className="text-[11px] text-text-dim mt-0.5">
              Exec summary
            </div>
          </Link>
        </div>

        {/* Workspace lens — dropdown + filtered outputs + filtered workflows */}
        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
            Workspace
          </div>
          <div className="px-2 mb-3">
            <label className="sr-only" htmlFor="lens-picker">
              Workspace lens
            </label>
            <select
              id="lens-picker"
              value={lens}
              onChange={(e) => updateLens(e.target.value as Lens)}
              disabled={!hydrated}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
            >
              {LENS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {LENS_LABEL[opt]}
                </option>
              ))}
            </select>
          </div>

          {outputs.length > 0 && (
            <ul className="space-y-0.5 mb-3">
              {outputs.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition",
                      isActive(item.href)
                        ? "bg-accent-bg text-accent"
                        : "text-text-muted hover:text-text hover:bg-card-hover/50",
                    )}
                  >
                    <div className="font-medium">{item.name}</div>
                    {item.hint && (
                      <div className="text-[11px] text-text-dim mt-0.5">
                        {item.hint}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="px-2 mb-2 flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
              Workflows
            </span>
            <span className="text-[10px] text-text-dim">
              {workflows.length}
            </span>
          </div>
          {workflows.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-text-dim italic">
              No workflows tagged for this lens yet.
            </div>
          ) : (
            <div className="space-y-4">
              {groupWorkflowsByLayer(workflows).map((group) => (
                <div key={group.key}>
                  {/*
                   * Layer subheader is intentionally quiet — sentence case, no
                   * tracking, smaller and dimmer than the outer WORKFLOWS
                   * section head so the hierarchy reads as parent/child rather
                   * than as peers. Count dropped to reduce label competition.
                   */}
                  <div className="px-3 mb-1 text-[11px] text-text-dim/70">
                    {group.label}
                  </div>
                  <ul className="space-y-0.5">
                    {group.workflows.map((agent) => {
                      const href = `/agents/${agent.code.toLowerCase()}`;
                      const active = isActive(href);
                      return (
                        <li key={agent.code}>
                          <Link
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "block rounded-md px-3 py-1.5 text-sm transition",
                              active
                                ? "bg-accent-bg text-accent"
                                : "text-text-muted hover:text-text hover:bg-card-hover/50",
                            )}
                          >
                            <span className="font-medium truncate block">
                              {agent.name}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operations — role-independent ops/admin surfaces */}
        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
            Operations
          </div>
          <ul className="space-y-0.5">
            {OPERATIONS_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm transition",
                    isActive(item.href)
                      ? "bg-accent-bg text-accent"
                      : "text-text-muted hover:text-text hover:bg-card-hover/50",
                  )}
                >
                  <div className="font-medium">{item.name}</div>
                  <div className="text-[11px] text-text-dim mt-0.5">
                    {item.hint}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Setup — onboarding entry points */}
        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
            Setup
          </div>
          <ul className="space-y-0.5">
            {SETUP_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm transition",
                    isActive(item.href)
                      ? "bg-accent-bg text-accent"
                      : "text-text-muted hover:text-text hover:bg-card-hover/50",
                  )}
                >
                  <div className="font-medium">{item.name}</div>
                  {item.hint && (
                    <div className="text-[11px] text-text-dim mt-0.5">
                      {item.hint}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-border text-[11px] text-text-dim">
        Demo data — Throughline tenant only (pre-multi-brand).
      </div>
    </aside>
  );
}
