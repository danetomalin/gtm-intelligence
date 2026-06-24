"use client";
// Onboarding section shell — the full onboarding arc in one place:
// Handoff Suite → Implementation → Go-Live & TTV → Post-Launch.
// Absorbs the former "implementation & launch" tab. The four sub-tabs
// follow a new customer from contract signature to steady-state
// retention, and feed the main health model at three points (TTV →
// Value, checkpoints → Value, impl risk flags → Tier 2).

import { useMemo, useState } from "react";
import { ONBOARDING_ACCOUNTS } from "@/features/cs-health/lib/onboarding";
import { StatCard, formatARR } from "@/features/cs-health/components/ui";
import { C } from "./onboarding/parts";
import HandoffTab from "./onboarding/HandoffTab";
import ImplementationTab from "./onboarding/ImplementationTab";
import GoLiveTtvTab from "./onboarding/GoLiveTtvTab";
import PostLaunchTab from "./onboarding/PostLaunchTab";

type SubTab = "handoff" | "impl" | "golive" | "postlaunch";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "handoff", label: "1 — Handoff Suite" },
  { id: "impl", label: "2 — Implementation" },
  { id: "golive", label: "3 — Go-Live & TTV" },
  { id: "postlaunch", label: "4 — Post-Launch" },
];

export default function OnboardingTab() {
  const [sub, setSub] = useState<SubTab>("handoff");
  const [selectedId, setSelectedId] = useState(ONBOARDING_ACCOUNTS[0].id);
  const account = ONBOARDING_ACCOUNTS.find((a) => a.id === selectedId) ?? ONBOARDING_ACCOUNTS[0];

  const stats = useMemo(() => {
    const atRisk = ONBOARDING_ACCOUNTS.reduce((s, a) => s + a.milestones.filter((m) => m.status === "at_risk" || m.status === "blocked").length, 0);
    const pending = ONBOARDING_ACCOUNTS.reduce((s, a) => s + a.actionQueue.filter((q) => q.status === "pending" && q.draftReady).length, 0);
    const avgScore = Math.round(ONBOARDING_ACCOUNTS.reduce((s, a) => s + a.overallImplScore, 0) / ONBOARDING_ACCOUNTS.length);
    const arr = ONBOARDING_ACCOUNTS.reduce((s, a) => s + a.arr, 0);
    return { atRisk, pending, avgScore, arr };
  }, []);

  const subTabStyle = (id: SubTab): React.CSSProperties => ({
    padding: "9px 14px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    cursor: "pointer",
    border: "none",
    background: sub === id ? "hsl(var(--foreground))" : "transparent",
    color: sub === id ? "hsl(var(--background))" : C.fg2,
    borderRadius: "0.75rem",
    transition: "all 150ms ease-in-out",
    whiteSpace: "nowrap",
  });

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <StatCard label="Active Onboardings" value={ONBOARDING_ACCOUNTS.length} sub="Contract → steady state" color="var(--primary)" />
        <StatCard label="Milestones at Risk" value={stats.atRisk} sub="At-risk or blocked" color="hsl(var(--warning))" />
        <StatCard label="Guided Actions" value={stats.pending} sub="Awaiting CSM review" color="hsl(270 50% 42%)" />
        <StatCard label="Onboarding ARR" value={formatARR(stats.arr)} sub={`Avg impl score ${stats.avgScore}`} color="var(--fg-primary)" />
      </div>

      {/* Sub-tab nav + account selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap", paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {SUB_TABS.map((t) => <button key={t.id} style={subTabStyle(t.id)} onClick={() => setSub(t.id)}>{t.label}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.fg2 }}>Account:</span>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
            style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: "0.5rem", background: C.card, color: C.fg, cursor: "pointer", fontFamily: "inherit" }}>
            {ONBOARDING_ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {sub === "handoff" && <HandoffTab account={account} />}
      {sub === "impl" && <ImplementationTab account={account} />}
      {sub === "golive" && <GoLiveTtvTab account={account} />}
      {sub === "postlaunch" && <PostLaunchTab account={account} />}
    </div>
  );
}
