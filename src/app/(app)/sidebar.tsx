"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { agentTooling } from "@/lib/demo-data";
import { ROLE_LABEL_SHORT, ROLE_TAGLINE, WORKSPACE_ROLES } from "@/lib/persona";

const outputItems = [
  { name: "Overview", href: "/dashboard", hint: "Exec summary" },
  { name: "Market Context", href: "/market-context", hint: "Category dynamics" },
  { name: "Brand Voice", href: "/brand-voice", hint: "Thesis + pillars" },
  { name: "Positioning", href: "/positioning", hint: "5-element framework" },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-64 border-r border-border bg-surface/40 flex-shrink-0 sticky top-0 h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/dashboard" className="block">
          <div className="text-[10px] uppercase tracking-[2px] text-text-dim mb-1">
            AI Native System
          </div>
          <div className="text-base font-semibold tracking-tight">
            <span className="text-accent">Throughline</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
            Workspace
          </div>
          <ul className="space-y-0.5">
            {WORKSPACE_ROLES.map((role) => {
              const href = `/workspace/${role}`;
              const active = isActive(href);
              return (
                <li key={role}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition",
                      active
                        ? "bg-accent-bg text-accent"
                        : "text-text-muted hover:text-text hover:bg-card-hover/50",
                    )}
                  >
                    <div className="font-medium">{ROLE_LABEL_SHORT[role]}</div>
                    <div className="text-[11px] text-text-dim mt-0.5 truncate">
                      {ROLE_TAGLINE[role]}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
            Output
          </div>
          <ul className="space-y-0.5">
            {outputItems.map((item) => (
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

        <div>
          <div className="px-2 mb-2 flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
              Agents
            </span>
            <span className="text-[10px] text-text-dim">
              {agentTooling.length}
            </span>
          </div>
          <ul className="space-y-0.5">
            {agentTooling.map((agent) => {
              const href = `/agents/${agent.code.toLowerCase()}`;
              const active = isActive(href);
              return (
                <li key={agent.code}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition",
                      active
                        ? "bg-accent-bg text-accent"
                        : "text-text-muted hover:text-text hover:bg-card-hover/50",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 flex-shrink-0",
                        active
                          ? "bg-accent text-bg"
                          : "bg-card text-text-dim",
                      )}
                    >
                      {agent.code}
                    </span>
                    <span className="font-medium truncate">{agent.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
            Workspace
          </div>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/onboarding/brand-code"
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition",
                  isActive("/onboarding/brand-code")
                    ? "bg-accent-bg text-accent"
                    : "text-text-muted hover:text-text hover:bg-card-hover/50",
                )}
              >
                <div className="font-medium">+ Brand Code intake</div>
                <div className="text-[11px] text-text-dim mt-0.5">
                  Conversational R-BR onboarding
                </div>
              </Link>
            </li>
            <li>
              <Link
                href="/onboarding"
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition",
                  isActive("/onboarding") &&
                    !isActive("/onboarding/brand-code")
                    ? "bg-accent-bg text-accent"
                    : "text-text-muted hover:text-text hover:bg-card-hover/50",
                )}
              >
                <div className="font-medium">+ New brand (legacy form)</div>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-border text-[11px] text-text-dim">
        Demo data — Throughline tenant only (pre-multi-brand).
      </div>
    </aside>
  );
}
