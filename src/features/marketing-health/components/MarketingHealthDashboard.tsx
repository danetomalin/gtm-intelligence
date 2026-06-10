"use client";
// Marketing Health dashboard shell (Phase B.1) — mirrors the Customer
// Health shell: horizontal pill tab bar, mock data, pure derivation.
// KPI/trend dashboard by design: no composite health score.

import { useMemo, useState } from "react";
import { MARKETING_DATA, type MarketingData } from "@/features/marketing-health/lib/generateData";
import { scoreCampaigns, rollupChannels } from "@/features/marketing-health/lib/rollups";
import WeeklyReviewTab from "@/features/marketing-health/components/tabs/WeeklyReviewTab";
import CampaignsTab from "@/features/marketing-health/components/tabs/CampaignsTab";
import ChannelsTab from "@/features/marketing-health/components/tabs/ChannelsTab";
import FunnelTab from "@/features/marketing-health/components/tabs/FunnelTab";
import SignalsTab from "@/features/marketing-health/components/tabs/SignalsTab";

const TABS = [
  "weekly review",
  "campaigns",
  "channels",
  "funnel",
  "emerging signals",
] as const;

export default function MarketingHealthDashboard({
  data = MARKETING_DATA,
}: {
  data?: MarketingData;
}) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("weekly review");

  const scored = useMemo(() => scoreCampaigns(data.campaigns), [data]);
  const rollups = useMemo(() => rollupChannels(scored), [scored]);

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
      <nav
        aria-label="Marketing Health sections"
        style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "6px", margin: "0 0 20px", border: "1px solid hsl(var(--border))", borderRadius: "1rem", background: "hsl(var(--card))" }}
      >
        {TABS.map((t) => (
          <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {activeTab === "weekly review" && (
        <WeeklyReviewTab scored={scored} rollups={rollups} funnel={data.funnel} />
      )}
      {activeTab === "campaigns" && <CampaignsTab scored={scored} />}
      {activeTab === "channels" && <ChannelsTab rollups={rollups} />}
      {activeTab === "funnel" && <FunnelTab funnel={data.funnel} />}
      {activeTab === "emerging signals" && <SignalsTab trends={data.aggregateTrends} />}

      <div style={{ marginTop: 24, paddingTop: 14, borderTop: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-tertiary)", flexWrap: "wrap", gap: 8 }}>
        <span>Marketing Health · KPI + trend signals (no composite score by design)</span>
        <span>generateMarketingData() → Supabase reads in a later phase · rollups are pure functions</span>
      </div>
    </div>
  );
}
