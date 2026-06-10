"use client";
// Customer Health dashboard shell — ported from cs-health-app v2.0.
// Renders inside Throughline's (app) layout, so there is no local
// sidebar: tabs are a horizontal pill bar under the page header.
// Data layer (generateData) and scoring engine (lib/scoringEngine)
// are fully decoupled; Phase B swaps mock data for Supabase reads
// without touching the UI.
//
// Phase C note: the "Ask Jon" tab becomes the workspace copilot
// (floating panel) when BYOK plumbing goes Throughline-wide.

import { useMemo, useState } from "react";
import { DATA } from "@/features/cs-health/lib/generateData";
import { buildScoredAccounts } from "@/features/cs-health/lib/scoringEngine";
import WeeklyReviewTab from "@/features/cs-health/components/tabs/WeeklyReviewTab";
import ImplLaunchTab from "@/features/cs-health/components/tabs/ImplLaunchTab";
import AccountsTab from "@/features/cs-health/components/tabs/AccountsTab";
import RenewalForecastTab from "@/features/cs-health/components/tabs/RenewalForecastTab";
import ExpansionTab from "@/features/cs-health/components/tabs/ExpansionTab";
import ChurnIntelligenceTab from "@/features/cs-health/components/tabs/ChurnIntelligenceTab";
import EmergingSignalsTab from "@/features/cs-health/components/tabs/EmergingSignalsTab";
import AskTab from "@/features/cs-health/components/tabs/AskTab";

const TABS = [
  "weekly review",
  "accounts",
  "renewal forecast",
  "expansion",
  "churn intelligence",
  "emerging signals",
  "implementation & launch",
  "ask jon",
] as const;

export default function HealthDashboard() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("weekly review");

  const allScored = useMemo(
    () => buildScoredAccounts([...DATA.enterprise, ...DATA.midmarket]),
    []
  );

  const stats = useMemo(() => {
    const ent = allScored.filter((a) => a.segment === "ENT");
    const mm = allScored.filter((a) => a.segment === "MM");
    const arrAtRisk = allScored.reduce((s, a) => s + (a.scoring.band !== "Healthy" ? a.arr : 0), 0) + DATA.smbCohort.arrAtRisk;
    const totalARR = allScored.reduce((s, a) => s + a.arr, 0) + DATA.smbCohort.totalARR;
    const renewalAtRisk = allScored.filter((a) => a.stage === "Renewal Window" && a.scoring.band !== "Healthy");
    const countBands = (list: typeof allScored) => ({
      Healthy: list.filter((a) => a.scoring.band === "Healthy").length,
      "At Risk": list.filter((a) => a.scoring.band === "At Risk").length,
      Critical: list.filter((a) => a.scoring.band === "Critical").length,
    });
    return {
      arrAtRisk,
      totalARR,
      criticalEnt: ent.filter((a) => a.scoring.band === "Critical").length,
      p0p1: allScored.filter((a) => ["P0", "P1"].includes(a.action.priority)).length,
      renewalAtRisk,
      entBands: countBands(ent),
      mmBands: countBands(mm),
    };
  }, [allScored]);

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: "8px 14px",
    minHeight: 36,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    textTransform: "capitalize",
    cursor: "pointer",
    border: "none",
    borderRadius: "0.75rem",
    background: activeTab === t ? "hsl(var(--foreground))" : "transparent",
    color: activeTab === t ? "hsl(var(--background))" : "var(--fg-secondary)",
    transition: "all 150ms ease-in-out",
    whiteSpace: "nowrap",
  });

  return (
    <div>
      {/* Horizontal tab bar */}
      <nav
        aria-label="Customer Health sections"
        style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "6px", margin: "0 0 20px", border: "1px solid hsl(var(--border))", borderRadius: "1rem", background: "hsl(var(--card))" }}
      >
        {TABS.map((t) => (
          <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>
            {t === "ask jon" ? (
              <>
                <span style={{ color: activeTab === t ? "hsl(var(--background))" : "var(--primary)" }}>✦</span> Ask Jon
              </>
            ) : (
              t
            )}
          </button>
        ))}
      </nav>

      {activeTab === "ask jon" && <AskTab allScored={allScored} />}
      {activeTab === "weekly review" && <WeeklyReviewTab allScored={allScored} stats={stats} />}
      {activeTab === "implementation & launch" && <ImplLaunchTab />}
      {activeTab === "accounts" && <AccountsTab allScored={allScored} />}
      {activeTab === "renewal forecast" && <RenewalForecastTab allScored={allScored} />}
      {activeTab === "expansion" && <ExpansionTab allScored={allScored} />}
      {activeTab === "churn intelligence" && <ChurnIntelligenceTab />}
      {activeTab === "emerging signals" && <EmergingSignalsTab allScored={allScored} />}

      <div style={{ marginTop: 24, paddingTop: 14, borderTop: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-tertiary)", flexWrap: "wrap", gap: 8 }}>
        <span>Halcyon portfolio · Customer Health · VAR model v2.0</span>
        <span>generateData() → Supabase reads in Phase B · scoringEngine() is a pure function</span>
      </div>
    </div>
  );
}
