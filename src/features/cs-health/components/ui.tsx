"use client";
// Shared UI primitives — Touchable design language (phase 1).
// Colors come from Touchable's semantic tokens: success/warning/
// destructive map to Healthy/At Risk/Critical. Surfaces use the
// 1px rim + radius conventions from docs/DESIGN.md.
import { useState } from "react";
import type { ExpansionBand, HealthBand, Segment } from "@/features/cs-health/lib/types";
import { healthBand } from "@/features/cs-health/lib/scoringEngine";

// ---------- Table sorting (shared across all tables) ----------

export type SortDir = "asc" | "desc";

export function useSort<K extends string>(defaultKey: K, defaultDir: SortDir = "asc") {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);
  function toggle(k: K, firstDir: SortDir = "asc") {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(firstDir);
    }
  }
  return { sortKey, sortDir, toggle };
}

export function sortRows<T>(rows: T[], value: (t: T) => number | string, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const va = value(a), vb = value(b);
    const cmp = typeof va === "string" && typeof vb === "string"
      ? va.localeCompare(vb)
      : (va as number) - (vb as number);
    return dir === "asc" ? cmp : -cmp;
  });
}

export function SortHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 3, border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: active ? "var(--primary)" : "var(--fg-secondary)", whiteSpace: "nowrap" }}
    >
      {label}
      <span style={{ fontSize: 8, opacity: active ? 1 : 0.35 }}>{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

// Semantic status colors (Touchable HSL triplet tokens)
const SUCCESS = "hsl(var(--success))";
const WARNING = "hsl(var(--warning))";
const DESTRUCTIVE = "hsl(var(--destructive))";
const FG_PRIMARY = "var(--fg-primary)";
const FG_SECONDARY = "var(--fg-secondary)";
const FG_TERTIARY = "var(--fg-tertiary)";

export const TOKENS = {
  success: SUCCESS,
  warning: WARNING,
  destructive: DESTRUCTIVE,
  fgPrimary: FG_PRIMARY,
  fgSecondary: FG_SECONDARY,
  fgTertiary: FG_TERTIARY,
  rim: "1px solid hsl(var(--border))",
  surface: "hsl(var(--card))",
  track: "hsl(var(--muted))",
};

export const BAND_COLORS: Record<HealthBand, { bg: string; text: string; dot: string }> = {
  Healthy: { bg: "hsl(var(--success) / 0.12)", text: "hsl(135 59% 32%)", dot: SUCCESS },
  "At Risk": { bg: "hsl(var(--warning) / 0.14)", text: "hsl(28 90% 38%)", dot: WARNING },
  Critical: { bg: "hsl(var(--destructive) / 0.12)", text: "hsl(359 75% 42%)", dot: DESTRUCTIVE },
};
export const EXPANSION_COLORS: Record<ExpansionBand, { bg: string; text: string }> = {
  "Expansion Ready": { bg: "hsl(var(--success) / 0.12)", text: "hsl(135 59% 32%)" },
  Warming: { bg: "hsl(var(--warning) / 0.14)", text: "hsl(28 90% 38%)" },
  "Not Ready": { bg: "hsl(var(--muted))", text: FG_SECONDARY },
};
export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  P0: { bg: "hsl(359 75% 38%)", text: "white" },
  P1: { bg: DESTRUCTIVE, text: "white" },
  P2: { bg: WARNING, text: "white" },
  P3: { bg: "hsl(var(--muted-foreground))", text: "white" },
  OK: { bg: "hsl(var(--success) / 0.12)", text: "hsl(135 59% 32%)" },
};
export const TREND_COLORS: Record<string, string> = { up: SUCCESS, down: DESTRUCTIVE, flat: FG_TERTIARY };
export const TREND_ICONS: Record<string, string> = { up: "↑", down: "↓", flat: "→" };

export function BandPill({ band }: { band: HealthBand }) {
  const c = BAND_COLORS[band];
  return <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", justifySelf: "start" }}>{band}</span>;
}

export function ExpansionPill({ band, score }: { band: ExpansionBand; score?: number }) {
  const c = EXPANSION_COLORS[band];
  return <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{band}{score !== undefined ? ` — ${score}` : ""}</span>;
}

export function PriorityPill({ p }: { p: string }) {
  const c = PRIORITY_COLORS[p];
  return <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, letterSpacing: "0.04em", fontFamily: "ui-monospace, monospace" }}>{p}</span>;
}

export function ScoreBar({ score, seg }: { score: number; seg: Segment }) {
  const band = healthBand(score, seg);
  const color = BAND_COLORS[band].dot;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: "hsl(var(--muted))", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: FG_PRIMARY, minWidth: 28, textAlign: "right" }}>{score}</span>
    </div>
  );
}

export function MiniSparkline({ scores, dir }: { scores: number[]; dir: "up" | "down" | "flat" }) {
  if (!scores || scores.length < 2) return null;
  const min = Math.min(...scores), max = Math.max(...scores), range = max - min || 1;
  const w = 48, h = 16;
  const pts = scores.map((s, i) => `${(i / (scores.length - 1)) * w},${2 + (h - 4) - ((s - min) / range) * (h - 4)}`).join(" ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", maxWidth: "100%" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0, display: "block" }}>
        <polyline points={pts} fill="none" stroke={TREND_COLORS[dir]} strokeWidth="1.5" />
      </svg>
      <span style={{ fontSize: 11, color: TREND_COLORS[dir], fontWeight: 600, flexShrink: 0 }}>{TREND_ICONS[dir]}</span>
    </div>
  );
}

export function SentimentDot({ t }: { t: string }) {
  const colors: Record<string, string> = { positive: SUCCESS, stable: FG_TERTIARY, declining: DESTRUCTIVE };
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: colors[t] || FG_TERTIARY, marginRight: 5 }} />;
}

export function StatCard({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: string; color: string }) {
  return (
    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "1rem", padding: "16px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color, opacity: 0.85 }} />
      <div style={{ fontSize: 11, fontWeight: 500, color: FG_SECONDARY, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: FG_PRIMARY, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: FG_TERTIARY, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export function SectionLabel({ children, color, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.01em", color: color ?? FG_SECONDARY, marginBottom: 12, ...style }}>{children}</div>;
}

export function ConfidenceBadge({ score }: { score: number }) {
  const c = score >= 75
    ? { bg: "hsl(var(--success) / 0.12)", text: "hsl(135 59% 32%)", label: "High conf" }
    : score >= 50
      ? { bg: "hsl(var(--warning) / 0.14)", text: "hsl(28 90% 38%)", label: "Mod conf" }
      : { bg: "hsl(var(--destructive) / 0.12)", text: "hsl(359 75% 42%)", label: "Low conf" };
  return <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{c.label} {score}</span>;
}

export function formatARR(n: number) {
  return n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
}
