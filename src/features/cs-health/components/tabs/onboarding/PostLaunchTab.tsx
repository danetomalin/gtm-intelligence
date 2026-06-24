"use client";
// Onboarding · Tab 4 — Post-Launch Checkpoints.
// The 30/90/180-day reviews that decide whether implementation success
// converts to retention. Results feed back into the health model Value
// pillar; misses at 90d flag At-Risk, misses at 180d trigger a Tier 2
// penalty and a renewal risk review.

import { useState } from "react";
import { type OnboardingAccount, type Checkpoint, getSuccessPlan } from "@/features/cs-health/lib/onboarding";
import { C, Badge, Card, SH } from "./parts";

const KPI_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not started", color: C.fg3, bg: C.muted },
  on_track: { label: "On track", color: C.green, bg: C.greenBg },
  at_risk: { label: "At risk", color: C.amber, bg: C.amberBg },
  achieved: { label: "Achieved", color: C.green, bg: C.greenBg },
  missed: { label: "Missed", color: C.red, bg: C.redBg },
};

export default function PostLaunchTab({ account }: { account: OnboardingAccount }) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(account.postLaunch.checkpoints);
  const [expanded, setExpanded] = useState<number | null>(null);
  const kpis = getSuccessPlan(account.successArchetype);

  function updateCheckpoint(day: number, field: keyof Checkpoint, val: string) {
    setCheckpoints((p) => p.map((c) => (c.day === day ? { ...c, [field]: val } : c)));
  }

  return (
    <div>
      <div style={{ background: C.blueBg, border: `1px solid ${C.blue}33`, borderLeft: `3px solid ${C.blue}`, borderRadius: "0.5rem", padding: "10px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: C.blue, lineHeight: 1.5 }}>
          Post-launch checkpoints track adoption and value realization at 30, 90, and 180 days. Results feed back into the health model Value pillar and inform the renewal forecast. This is where go-live becomes a retention story — or a risk.
        </div>
      </div>

      {checkpoints.map((cp) => {
        const isExp = expanded === cp.day;
        const cpKPIs = kpis.slice(0, 4);
        const s = KPI_STATUS[cp.kpiStatus];
        return (
          <Card key={cp.day} style={{ marginBottom: 12 }}>
            <div onClick={() => setExpanded(isExp ? null : cp.day)} style={{ display: "grid", gridTemplateColumns: "32px 100px 1fr 140px 130px 100px", gap: 8, padding: "12px 16px", alignItems: "center", cursor: "pointer", borderBottom: isExp ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: 10, color: C.fg3, fontWeight: 700 }}>{isExp ? "▼" : "▶"}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.fg }}>{cp.label}</div>
              <div style={{ fontSize: 11, color: C.fg2 }}>Day {cp.day} post go-live · Adoption target: <strong>{cp.adoptionTarget}</strong></div>
              <div>
                <div style={{ fontSize: 10, color: C.fg2, marginBottom: 3 }}>Adoption actual</div>
                <input value={cp.adoptionActual || ""} onChange={(e) => updateCheckpoint(cp.day, "adoptionActual", e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g. 68%"
                  style={{ width: 100, padding: "4px 8px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: "0.375rem", fontFamily: "inherit", color: C.fg, background: C.bg }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.fg2, marginBottom: 3 }}>KPI status</div>
                <select value={cp.kpiStatus} onChange={(e) => updateCheckpoint(cp.day, "kpiStatus", e.target.value)} onClick={(e) => e.stopPropagation()}
                  style={{ padding: "4px 8px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: "0.375rem", fontFamily: "inherit", color: C.fg, background: C.bg, cursor: "pointer" }}>
                  {Object.entries(KPI_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><Badge color={s.color} bg={s.bg}>{s.label}</Badge></div>
            </div>

            {isExp && (
              <div style={{ padding: "14px 24px 18px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* KPI review */}
                  <Card>
                    <SH color={C.blue}>{cp.label} KPI Review</SH>
                    <div style={{ padding: "10px 14px" }}>
                      {cpKPIs.map((k) => (
                        <div key={k.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.fg }}>{k.kpi}</span>
                            <span style={{ fontSize: 11, color: C.blue, fontWeight: 700, whiteSpace: "nowrap" }}>Target: {k.recommended[cp.day === 30 ? "d30" : cp.day === 90 ? "d90" : "d180"]}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input placeholder="Actual result" style={{ flex: 1, padding: "4px 8px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: "0.375rem", fontFamily: "inherit", color: C.fg, background: C.bg }} />
                            <select style={{ padding: "4px 6px", fontSize: 10, border: `1px solid ${C.border}`, borderRadius: "0.375rem", fontFamily: "inherit", color: C.fg, background: C.bg, cursor: "pointer" }}>
                              {Object.entries(KPI_STATUS).map(([k2, v]) => <option key={k2} value={k2}>{v.label}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Notes + health model feed */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Card>
                      <SH color={C.purple}>Checkpoint Notes</SH>
                      <div style={{ padding: "10px 14px" }}>
                        <textarea value={cp.note} onChange={(e) => updateCheckpoint(cp.day, "note", e.target.value)} placeholder={`Notes from the ${cp.label} review — what's working, what's not, what needs attention…`}
                          style={{ width: "100%", height: 100, padding: "8px 10px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: "0.5rem", fontFamily: "inherit", color: C.fg, background: C.bg, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} />
                      </div>
                    </Card>
                    <div style={{ background: C.blueBg, border: `1px solid ${C.blue}33`, borderRadius: "0.5rem", padding: "10px 12px", fontSize: 11, color: C.blue, lineHeight: 1.5 }}>
                      <strong>Health model feed:</strong> KPI status and adoption actual at this checkpoint update the Value pillar score. Missed targets at 90d trigger an At-Risk flag. Missed at 180d trigger a Tier 2 penalty and renewal risk review.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Steady-state handoff */}
      <Card style={{ padding: "16px 18px", marginTop: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.fg2, marginBottom: 8 }}>Handoff to Steady-State Health Model</div>
        <div style={{ fontSize: 12, color: C.fg, lineHeight: 1.6 }}>
          When the 180-day checkpoint is complete, this account exits the onboarding operating model and enters the standard health model in Steady State. The following data transfers automatically:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          {["TTV (days to first value)", "User activation rate at 180d", "KPI achievement status", "Stakeholder map and champion", "Success criteria for QBR narrative", "Churn reason risk flags (if any)"].map((item, i) => (
            <div key={i} style={{ fontSize: 11, color: C.fg, paddingLeft: 12, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: C.green, fontWeight: 700 }}>→</span>{item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
