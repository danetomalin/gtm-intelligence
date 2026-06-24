"use client";
// Shared primitives for the Onboarding section — Touchable-skinned
// versions of the prototype's Badge / Card / section-header / progress
// helpers, all driven by the app's semantic CSS tokens.

import type { CSSProperties, ReactNode } from "react";

// Token palette (Touchable). Band text colors mirror components/ui.tsx.
export const C = {
  card: "hsl(var(--card))",
  bg: "hsl(var(--background))",
  border: "hsl(var(--border))",
  muted: "hsl(var(--muted))",
  fg: "var(--fg-primary)",
  fg2: "var(--fg-secondary)",
  fg3: "var(--fg-tertiary)",
  primary: "var(--primary)",
  green: "hsl(135 59% 32%)", greenBg: "hsl(var(--success) / 0.12)",
  amber: "hsl(28 90% 38%)", amberBg: "hsl(var(--warning) / 0.14)",
  red: "hsl(359 75% 42%)", redBg: "hsl(var(--destructive) / 0.12)",
  blue: "#1d4ed8", blueBg: "#eff6ff",
  purple: "hsl(270 50% 42%)", purpleBg: "hsl(270 50% 42% / 0.12)",
};

export function Badge({ children, color = C.blue, bg = C.blueBg, size = 10 }: { children: ReactNode; color?: string; bg?: string; size?: number }) {
  return (
    <span style={{ background: bg, color, fontSize: size, fontWeight: 700, padding: "2px 8px", borderRadius: 999, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap", display: "inline-block" }}>
      {children}
    </span>
  );
}

export function Card({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "1rem", overflow: "hidden", ...style }}>{children}</div>;
}

/** Section header strip inside a Card — accent-colored uppercase label. */
export function SH({ children, color = C.blue }: { children: ReactNode; color?: string }) {
  return (
    <div style={{ background: C.muted, padding: "8px 14px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{children}</div>
    </div>
  );
}

export function PBar({ pct, color = C.primary, h = 5 }: { pct: number; color?: string; h?: number }) {
  return (
    <div style={{ height: h, background: C.muted, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

export function OnbButton({ children, onClick, variant = "primary", disabled = false, style = {} }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "accent" | "ghost"; disabled?: boolean; style?: CSSProperties }) {
  const base: CSSProperties = { padding: "6px 12px", fontSize: 11, fontWeight: 600, borderRadius: "0.75rem", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, transition: "all 150ms ease-in-out", whiteSpace: "nowrap" };
  const variants: Record<string, CSSProperties> = {
    primary: { border: "none", background: "hsl(var(--foreground))", color: "hsl(var(--background))" },
    accent: { border: "none", background: C.primary, color: "white" },
    ghost: { border: `1px solid ${C.border}`, background: C.card, color: C.fg2 },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

// Milestone status → color + label.
export const MS: Record<string, { label: string; color: string; bg: string }> = {
  complete: { label: "Complete", color: C.green, bg: C.greenBg },
  in_progress: { label: "In Progress", color: C.blue, bg: C.blueBg },
  at_risk: { label: "At Risk", color: C.amber, bg: C.amberBg },
  not_started: { label: "Not Started", color: C.fg3, bg: C.muted },
  blocked: { label: "Blocked", color: C.red, bg: C.redBg },
};

// Milestone owner → chip colors.
export const OWNER: Record<string, { color: string; bg: string }> = {
  Vendor: { color: C.blue, bg: C.blueBg },
  Client: { color: C.amber, bg: C.amberBg },
  Joint: { color: C.purple, bg: C.purpleBg },
};

export const BLOCKER: Record<string, string> = {
  client: "Client Delay",
  dependency: "Dependency",
  vendor: "Vendor Issue",
  scope: "Scope Change",
};

// Score → semantic color (>=70 healthy, >=50 watch, else critical).
export function scoreColor(s: number): string {
  return s >= 70 ? C.green : s >= 50 ? C.amber : C.red;
}
export function scoreBg(s: number): string {
  return s >= 70 ? C.greenBg : s >= 50 ? C.amberBg : C.redBg;
}
