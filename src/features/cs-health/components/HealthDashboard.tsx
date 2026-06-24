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
import { DATA, type PortfolioData } from "@/features/cs-health/lib/generateData";
import { buildScoredAccounts } from "@/features/cs-health/lib/scoringEngine";
import { PortfolioProvider } from "@/features/cs-health/components/PortfolioProvider";
import { FloatingCopilot } from "@/components/floating-copilot";
import { buildSystemPrompt, SUGGESTED_PROMPTS } from "@/features/cs-health/lib/chatContext";
import WeeklyReviewTab from "@/features/cs-health/components/tabs/WeeklyReviewTab";
import OnboardingTab from "@/features/cs-health/components/tabs/OnboardingTab";
import AccountsTab from "@/features/cs-health/components/tabs/AccountsTab";
import RenewalForecastTab from "@/features/cs-health/components/tabs/RenewalForecastTab";
import ExpansionTab from "@/features/cs-health/components/tabs/ExpansionTab";
import ChurnIntelligenceTab from "@/features/cs-health/components/tabs/ChurnIntelligenceTab";
import EmergingSignalsTab from "@/features/cs-health/components/tabs/EmergingSignalsTab";

const TABS = [
  "weekly review",
  "accounts",
  "renewal forecast",
  "expansion",
  "churn intelligence",
  "emerging signals",
  "onboarding",
] as const;

export default function HealthDashboard({ data = DATA }: { data?: PortfolioData }) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("weekly review");

  const allScored = useMemo(
    () => buildScoredAccounts([...data.enterprise, ...data.midmarket]),
    [data]
  );

  const stats = useMemo(() => {
    const ent = allScored.filter((a) => a.segment === "ENT");
    const mm = allScored.filter((a) => a.segment === "MM");
    const arrAtRisk = allScored.reduce((s, a) => s + (a.scoring.band !== "Healthy" ? a.arr : 0), 0) + data.smbCohort.arrAtRisk;
    const totalARR = allScored.reduce((s, a) => s + a.arr, 0) + data.smbCohort.totalARR;
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
  }, [allScored, data]);

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
    <PortfolioProvider data={data}>
    <div>
      {/* Horizontal tab bar */}
      <nav
        aria-label="Customer Health sections"
        style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "6px", margin: "0 0 20px", border: "1px solid hsl(var(--border))", borderRadius: "1rem", background: "hsl(var(--card))" }}
      >
        {TABS.map((t) => (
          <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {activeTab === "weekly review" && <WeeklyReviewTab allScored={allScored} stats={stats} />}
      {activeTab === "onboarding" && <OnboardingTab />}
      {activeTab === "accounts" && <AccountsTab allScored={allScored} />}
      {activeTab === "renewal forecast" && <RenewalForecastTab allScored={allScored} />}
      {activeTab === "expansion" && <ExpansionTab allScored={allScored} />}
      {activeTab === "churn intelligence" && <ChurnIntelligenceTab />}
      {activeTab === "emerging signals" && <EmergingSignalsTab allScored={allScored} />}

      <div style={{ marginTop: 24, paddingTop: 14, borderTop: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-tertiary)", flexWrap: "wrap", gap: 8 }}>
        <span>Deputy portfolio · Customer Health · VAR model v2.0</span>
        <span>Supabase-backed (CS_HEALTH_DATA_SOURCE=mock to fall back) · scoringEngine() is a pure function</span>
      </div>
    </div>
      {/* Workspace copilot — floating, bottom-right (moved out of the tab bar 2026-06-09) */}
      <FloatingCopilot
        name="Jon"
        description="Jon sees every account, VAR score, override, renewal forecast, expansion signal, and churn learning on this dashboard — and answers with names and numbers, not generalities."
        systemPrompt={buildSystemPrompt(allScored, data)}
        suggestions={SUGGESTED_PROMPTS}
      />
    </PortfolioProvider>
  );
}
