"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { agentTooling } from "@/lib/demo-data";
import {
  contextForLens,
  filterWorkflowsForLens,
  groupWorkflowsByLayer,
  layerForCode,
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
    name: "Brand Code intake",
    href: "/onboarding/brand-code",
    hint: "Conversational R-BR onboarding",
  },
  {
    name: "New brand",
    href: "/onboarding",
    hint: "",
  },
  {
    name: "Brand kit",
    href: "/brand-kit",
    hint: "Colors, logo, footer — applied to branded PDFs",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  // Lens picker removed 2026-06-09 (with the Overview entry) — the sidebar
  // always renders the full "all" view now. The lens plumbing stays in
  // persona.ts for when multi-role workspaces come back.
  const lens: Lens = "all";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Pass the unfiltered agentTooling so outputsForLens can rank role
  // dashboards by per-role workflow count when the lens is "all".
  const outputs = useMemo(() => outputsForLens(lens, agentTooling), [lens]);
  const contextItems = useMemo(() => contextForLens(lens), [lens]);
  const workflows = useMemo(() => {
    // Hide A-layer (Setup) and X-layer (Distribution) from the Workflows
    // section. Both have their own top-level groups in the sidebar — Setup
    // at the bottom for onboarding, Distribution under Operations as the
    // shipping surface — so leaving them in the Workflows accordion would
    // be duplicative.
    const all = filterWorkflowsForLens(agentTooling, lens);
    return all.filter((w) => {
      const layer = layerForCode(w.code);
      return layer !== "A" && layer !== "X";
    });
  }, [lens]);

  // Distribution workflows promoted to their own sidebar section under
  // Operations. Respects the lens just like the Workflows section, so a
  // role-specific lens still shows only the relevant distributors.
  const distributionWorkflows = useMemo(() => {
    const all = filterWorkflowsForLens(agentTooling, lens);
    return all.filter((w) => layerForCode(w.code) === "X");
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
        {/* Workspaces — role dashboards (lens picker + Overview removed 2026-06-09) */}
        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
            Workspace
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
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Distribution — promoted out of Workflows to a top-level section.
            These X-* adapters ship approved Library artifacts to external
            channels, so they belong with the operational surfaces rather
            than nested as a Workflows subheader. */}
        {distributionWorkflows.length > 0 && (
          <div>
            <div className="px-2 mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
                Distribution
              </span>
              <span className="text-[10px] text-text-dim">
                {distributionWorkflows.length}
              </span>
            </div>
            <ul className="space-y-0.5">
              {distributionWorkflows.map((agent) => {
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
        )}

        {/* Context — brand/category reference pages (moved out of the
            Workspace outputs per Dane 2026-06-09: these are read-mostly
            reference surfaces, not role dashboards). */}
        {contextItems.length > 0 && (
          <div>
            <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
              Context
            </div>
            <ul className="space-y-0.5">
              {contextItems.map((item) => (
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
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

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
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <Link
          href="/settings"
          aria-current={isActive("/settings") ? "page" : undefined}
          className={cn(
            "block rounded-md px-3 py-2 text-sm transition",
            isActive("/settings")
              ? "bg-accent-bg text-accent"
              : "text-text-muted hover:text-text hover:bg-card-hover/50",
          )}
        >
          <div className="font-medium">Settings</div>
        </Link>
      </div>
      <div className="px-5 py-3 border-t border-border text-[11px] text-text-dim">
        Demo mode — single-tenant view (pre-multi-brand switcher).
      </div>
    </aside>
  );
}
