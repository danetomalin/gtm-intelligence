"use client";
// Marketing Health — small UI primitives on top of the shared
// cs-health Touchable set. Signal colors mirror the CS scale with
// one addition: "improving" (favorable movement) renders success.

import type { Channel, TrendSignal } from "@/features/marketing-health/lib/types";

export const CHANNEL_LABEL: Record<Channel, string> = {
  email: "Email",
  lifecycle: "Lifecycle",
  linkedin: "LinkedIn",
  paid_search: "Paid Search",
  paid_social: "Paid Social",
  content_seo: "Content / SEO",
  webinars: "Webinars",
  partner: "Partner",
};

export const SIGNAL_STYLE: Record<TrendSignal, { bg: string; text: string; label: string }> = {
  spike: { bg: "hsl(var(--destructive) / 0.12)", text: "hsl(359 75% 42%)", label: "SPIKE" },
  warning: { bg: "hsl(var(--warning) / 0.14)", text: "hsl(28 90% 38%)", label: "WARNING" },
  watch: { bg: "hsl(var(--muted))", text: "var(--fg-secondary)", label: "WATCH" },
  stable: { bg: "hsl(var(--muted))", text: "var(--fg-tertiary)", label: "STABLE" },
  improving: { bg: "hsl(var(--success) / 0.12)", text: "hsl(135 59% 32%)", label: "IMPROVING" },
};

export function SignalPill({ s }: { s: TrendSignal }) {
  const c = SIGNAL_STYLE[s];
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

export function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function fmtPct(x: number | null, digits = 1): string {
  return x === null ? "—" : `${(x * 100).toFixed(digits)}%`;
}

// Direction for MiniSparkline on higher-is-better series only
// (direction == goodness, so the green/red color reads correctly).
export function dirOf(weeks: number[]): "up" | "down" | "flat" {
  if (weeks.length < 2) return "flat";
  const first = weeks[0], last = weeks[weeks.length - 1];
  if (first === 0) return last > 0 ? "up" : "flat";
  const change = (last - first) / Math.abs(first);
  if (change > 0.05) return "up";
  if (change < -0.05) return "down";
  return "flat";
}
