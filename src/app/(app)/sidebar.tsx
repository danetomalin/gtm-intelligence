"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
// Command Center is NOT here — it's pinned above Settings at the bottom
// (Dane 2026-06-11: it's the primary run surface, always one click away).
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

const SECTIONS_KEY = "throughline.sidebarSections";

// Workspace stays open by default — it's the two main dashboards. Everything
// else starts collapsed to keep the nav scannable (Dane 2026-06-11).
const DEFAULT_OPEN: Record<string, boolean> = {
  workspace: true,
  workflows: false,
  operations: false,
  distribution: false,
  context: false,
  setup: false,
};

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

  // Which section owns the current route — that one is forced open so the
  // active link is never hidden behind a collapsed header.
  const activeSection = useMemo(() => {
    if (outputs.some((o) => isActive(o.href))) return "workspace";
    if (OPERATIONS_ITEMS.some((o) => isActive(o.href))) return "operations";
    if (contextItems.some((o) => isActive(o.href))) return "context";
    if (SETUP_ITEMS.some((o) => isActive(o.href))) return "setup";
    if (distributionWorkflows.some((w) => isActive(`/agents/${w.code.toLowerCase()}`)))
      return "distribution";
    if (workflows.some((w) => isActive(`/agents/${w.code.toLowerCase()}`)))
      return "workflows";
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, outputs, contextItems, workflows, distributionWorkflows]);

  const [open, setOpen] = useState<Record<string, boolean>>(DEFAULT_OPEN);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SECTIONS_KEY);
      if (raw) setOpen({ ...DEFAULT_OPEN, ...(JSON.parse(raw) as Record<string, boolean>) });
    } catch {
      // localStorage unavailable — defaults stand
    }
  }, []);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function Section({
    id,
    label,
    count,
    children,
  }: {
    id: string;
    label: string;
    count?: number;
    children: React.ReactNode;
  }) {
    const isOpen = open[id] || activeSection === id;
    return (
      <div>
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-expanded={isOpen}
          className="w-full px-2 mb-1 flex items-baseline gap-1.5 text-left group"
        >
          <span
            className={cn(
              "text-[9px] text-text-dim transition-transform inline-block",
              isOpen ? "rotate-90" : "rotate-0",
            )}
            aria-hidden
          >
            ▶
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim group-hover:text-text-muted transition">
            {label}
          </span>
          {typeof count === "number" && (
            <span className="ml-auto text-[10px] text-text-dim">{count}</span>
          )}
        </button>
        {isOpen && <div className="mt-1">{children}</div>}
      </div>
    );
  }

  function NavLink({
    href,
    name,
    hint,
    compact,
  }: {
    href: string;
    name: string;
    hint?: string;
    compact?: boolean;
  }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block rounded-md px-3 text-sm transition",
          compact ? "py-1.5" : "py-2",
          active
            ? "bg-accent-bg text-accent"
            : "text-text-muted hover:text-text hover:bg-card-hover/50",
        )}
      >
        <div className="font-medium truncate">{name}</div>
        {hint && <div className="text-[11px] text-text-dim mt-0.5">{hint}</div>}
      </Link>
    );
  }

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

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Workspaces — role dashboards */}
        <Section id="workspace" label="Workspace">
          <ul className="space-y-0.5">
            {outputs.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} name={item.name} hint={item.hint} />
              </li>
            ))}
          </ul>
        </Section>

        {/* Workflows — R/S/D layers (A + X live in their own sections) */}
        <Section id="workflows" label="Workflows" count={workflows.length}>
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
                   * than as peers.
                   */}
                  <div className="px-3 mb-1 text-[11px] text-text-dim/70">
                    {group.label}
                  </div>
                  <ul className="space-y-0.5">
                    {group.workflows.map((agent) => (
                      <li key={agent.code}>
                        <NavLink
                          href={`/agents/${agent.code.toLowerCase()}`}
                          name={agent.name}
                          compact
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Operations — role-independent ops/admin surfaces */}
        <Section id="operations" label="Operations">
          <ul className="space-y-0.5">
            {OPERATIONS_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} name={item.name} />
              </li>
            ))}
          </ul>
        </Section>

        {/* Distribution — X-* adapters shipping approved Library artifacts */}
        {distributionWorkflows.length > 0 && (
          <Section
            id="distribution"
            label="Distribution"
            count={distributionWorkflows.length}
          >
            <ul className="space-y-0.5">
              {distributionWorkflows.map((agent) => (
                <li key={agent.code}>
                  <NavLink
                    href={`/agents/${agent.code.toLowerCase()}`}
                    name={agent.name}
                    compact
                  />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Context — brand/category reference pages */}
        {contextItems.length > 0 && (
          <Section id="context" label="Context">
            <ul className="space-y-0.5">
              {contextItems.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} name={item.name} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Setup — onboarding entry points */}
        <Section id="setup" label="Setup">
          <ul className="space-y-0.5">
            {SETUP_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} name={item.name} />
              </li>
            ))}
          </ul>
        </Section>
      </nav>

      {/* Pinned: Command Center (primary run surface) + Settings */}
      <div className="px-3 py-3 border-t border-border space-y-0.5">
        <NavLink href="/command-center" name="Command Center" />
        <NavLink href="/settings" name="Settings" />
      </div>
      <div className="px-5 py-3 border-t border-border text-[11px] text-text-dim">
        Demo mode — single-tenant view (pre-multi-brand switcher).
      </div>
    </aside>
  );
}
