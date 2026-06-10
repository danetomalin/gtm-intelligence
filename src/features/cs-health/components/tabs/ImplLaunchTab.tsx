"use client";
// Impl & Launch — milestone-level view per onboarding account.

import { useState } from "react";
import { DATA, type ImplAccount } from "@/features/cs-health/lib/generateData";
import { SectionLabel, StatCard, formatARR } from "@/features/cs-health/components/ui";

const MS_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  complete: { color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.12)", label: "Complete" },
  in_progress: { color: "#3b82f6", bg: "#eff6ff", label: "In Progress" },
  at_risk: { color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.14)", label: "At Risk" },
  not_started: { color: "hsl(var(--muted))", bg: "hsl(var(--muted))", label: "Not Started" },
};

export default function ImplLaunchTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const accounts = DATA.implLaunchAccounts;
  const implAccounts = accounts.filter((a) => a.stage === "Implementation");
  const launchAccounts = accounts.filter((a) => a.stage === "Launch");

  function AccountCard({ a }: { a: ImplAccount }) {
    const isExp = expandedId === a.id;
    const gap = a.expectedMilestonePct - a.overallMilestonePct;
    const behind = gap > 0;
    const atRiskCount = a.milestones.filter((m) => m.status === "at_risk").length;
    const relColor = a.relationshipHealth === "positive" ? "hsl(var(--success))" : a.relationshipHealth === "declining" ? "hsl(var(--destructive))" : "var(--fg-tertiary)";
    return (
      <div style={{ background: "hsl(var(--card))", border: `1px solid ${behind && gap > 10 ? "hsl(var(--destructive) / 0.4)" : "hsl(var(--border))"}`, marginBottom: 12 }}>
        <div onClick={() => setExpandedId(isExp ? null : a.id)} style={{ display: "grid", gridTemplateColumns: "26px 180px 110px 1fr 140px 100px 70px", columnGap: 10, padding: "14px 16px", alignItems: "center", cursor: "pointer", borderBottom: isExp ? "1px solid hsl(var(--border))" : "none" }}>
          <div style={{ fontSize: 10, color: "var(--fg-tertiary)", fontWeight: 700 }}>{isExp ? "▼" : "▶"}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-primary)" }}>{a.name}</div>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>{a.csm} · {a.segment} · {formatARR(a.arr)}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: a.stage === "Implementation" ? "#eff6ff" : "hsl(var(--success) / 0.12)", color: a.stage === "Implementation" ? "#1d4ed8" : "hsl(135 59% 32%)", borderRadius: "0.5rem", alignSelf: "center", justifySelf: "start", whiteSpace: "nowrap" }}>{a.stage}</span>
          <div style={{ paddingRight: 20 }}>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 4 }}>Milestone completion</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 100, height: 6, background: "hsl(var(--muted))", borderRadius: 3, position: "relative" }}>
                <div style={{ position: "absolute", left: `${a.expectedMilestonePct}%`, top: -3, width: 2, height: 12, background: "var(--fg-tertiary)", borderRadius: 1 }} />
                <div style={{ width: `${a.overallMilestonePct}%`, height: "100%", background: behind && gap > 8 ? "hsl(var(--warning))" : "hsl(var(--success))", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: behind && gap > 8 ? "hsl(var(--warning))" : "hsl(var(--success))" }}>{a.overallMilestonePct}%</span>
              <span style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>exp {a.expectedMilestonePct}%</span>
            </div>
            {behind && gap > 0 && <div style={{ fontSize: 10, color: "hsl(28 90% 38%)", marginTop: 3 }}>{gap}pts behind plan</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 2 }}>Go-live</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: a.daysAtRisk > 0 ? "hsl(var(--destructive))" : "var(--fg-primary)" }}>{a.projectedGoLive}</div>
            {a.daysAtRisk > 0 ? <div style={{ fontSize: 10, color: "hsl(var(--destructive))", fontWeight: 700 }}>+{a.daysAtRisk}d slip risk</div> : <div style={{ fontSize: 10, color: "hsl(var(--success))" }}>On track</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 2 }}>Relationship</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: relColor }} />
              <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{a.relationshipHealth}</span>
            </div>
          </div>
          <div>{atRiskCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: "hsl(var(--warning) / 0.14)", color: "hsl(28 90% 38%)", padding: "3px 8px", borderRadius: "0.5rem" }}>{atRiskCount} at risk</span>}</div>
        </div>
        {isExp && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 100px 80px 50px", padding: "8px 16px 4px", borderBottom: "1px solid hsl(var(--border))" }}>
              {["", "Milestone", "Status", "Owner", "Done"].map((h) => <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-tertiary)" }}>{h}</div>)}
            </div>
            {a.milestones.map((m, i) => {
              const st = MS_STATUS[m.status];
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr 100px 80px 50px", padding: "9px 16px", borderBottom: i < a.milestones.length - 1 ? "1px solid hsl(var(--muted))" : "none", alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.color }} />
                  <div>
                    <div style={{ fontSize: 12, color: "var(--fg-primary)", fontWeight: m.status === "at_risk" ? 700 : 400 }}>{m.name}</div>
                    {m.note && <div style={{ fontSize: 10, color: m.status === "at_risk" ? "hsl(28 90% 38%)" : "var(--fg-secondary)", fontStyle: "italic", marginTop: 2 }}>{m.note}</div>}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", background: st.bg, color: st.color, borderRadius: "0.5rem" }}>{st.label}</span>
                  <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{m.owner}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.pct >= 100 ? "hsl(var(--success))" : m.pct > 0 ? "#3b82f6" : "hsl(var(--muted))" }}>{m.pct}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="In Implementation" value={implAccounts.length} sub={`${implAccounts.filter((a) => a.daysAtRisk > 0).length} go-live at risk`} color="#3b82f6" />
        <StatCard label="In Launch" value={launchAccounts.length} sub={`${launchAccounts.filter((a) => a.overallMilestonePct < a.expectedMilestonePct - 8).length} behind plan`} color="#8b5cf6" />
        <StatCard label="Go-Live at Risk" value={accounts.filter((a) => a.daysAtRisk > 0).length} sub="Accounts with projected slip" color="hsl(var(--warning))" />
        <StatCard label="ARR in Impl/Launch" value={formatARR(accounts.reduce((s, a) => s + a.arr, 0))} sub="Active onboarding pipeline" color="var(--fg-primary)" />
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginBottom: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <span>Progress bar: <strong style={{ color: "var(--fg-primary)" }}>fill</strong> = actual, <strong style={{ color: "var(--fg-tertiary)" }}>|</strong> = expected at this point</span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {([["complete", "hsl(var(--success))"], ["in_progress", "#3b82f6"], ["at_risk", "hsl(var(--warning))"], ["not_started", "hsl(var(--muted))"]] as const).map(([k, c]) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
              <span style={{ fontSize: 10 }}>{k.replace("_", " ")}</span>
            </span>
          ))}
        </span>
      </div>
      {implAccounts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionLabel color="#1d4ed8" style={{ marginBottom: 10, letterSpacing: "0.12em" }}>Implementation</SectionLabel>
          {implAccounts.map((a) => <AccountCard key={a.id} a={a} />)}
        </div>
      )}
      {launchAccounts.length > 0 && (
        <div>
          <SectionLabel color="hsl(135 59% 32%)" style={{ marginBottom: 10, letterSpacing: "0.12em" }}>Launch / Go Live</SectionLabel>
          {launchAccounts.map((a) => <AccountCard key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}
