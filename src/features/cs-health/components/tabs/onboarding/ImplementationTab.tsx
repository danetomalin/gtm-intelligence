"use client";
// Onboarding · Tab 2 — Implementation (internal + client views).
// Internal: phased milestone tables + the agentic/guided action queue.
// Client: the same plan reframed as a shareable customer tracker.

import { useState } from "react";
import { type OnboardingAccount, TEMPLATES } from "@/features/cs-health/lib/onboarding";
import { C, Badge, Card, MS, OWNER, BLOCKER, scoreColor } from "./parts";

export default function ImplementationTab({ account }: { account: OnboardingAccount }) {
  const [view, setView] = useState<"internal" | "client">("internal");
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const template = TEMPLATES[account.templateId];
  const completed = account.milestones.filter((m) => m.status === "complete").length;
  const atRisk = account.milestones.filter((m) => m.status === "at_risk" || m.status === "blocked").length;
  const pct = Math.round((completed / account.milestones.length) * 100);
  const needsClientAction = account.milestones.filter((m) => m.clientDeliverable && m.status !== "complete" && m.expectedDay <= account.daysInImpl + 7);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["internal", "client"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${C.border}`, borderRadius: "0.75rem", background: view === v ? "hsl(var(--foreground))" : C.card, color: view === v ? "hsl(var(--background))" : C.fg2, textTransform: "capitalize" }}>{v} View</button>
          ))}
        </div>
        {view === "client" && <Badge color={C.green} bg={C.greenBg}>Level 1 — Share as Google Doc or Notion Page</Badge>}
      </div>

      {/* INTERNAL */}
      {view === "internal" && (
        <div>
          <div style={{ background: "hsl(var(--foreground))", borderRadius: "1rem", padding: "14px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--background))" }}>{account.name}</div>
                <div style={{ fontSize: 10, color: "hsl(var(--background) / 0.65)", marginTop: 2 }}>{template.name} · Day {account.daysInImpl} · Go-live: {account.goLiveTarget}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(account.overallImplScore) }}>{account.overallImplScore}</div>
                <div style={{ fontSize: 9, color: "hsl(var(--background) / 0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Impl Score</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 5, background: "hsl(var(--background) / 0.2)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red, borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 11, color: "hsl(var(--background))", fontWeight: 600, whiteSpace: "nowrap" }}>{completed}/{account.milestones.length}</span>
              {atRisk > 0 && <Badge color={C.red} bg={C.redBg} size={9}>{atRisk} at risk</Badge>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
            <div>
              {template.phases.map((phase) => {
                const pms = account.milestones.filter((m) => m.phase === phase.id);
                if (!pms.length) return null;
                return (
                  <div key={phase.id} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: phase.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{phase.name} — Weeks {phase.weeks}</div>
                    <Card>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 60px 95px", padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.muted }}>
                        {["Milestone", "Day", "Owner", "Client", "Status"].map((h) => <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.fg3 }}>{h}</div>)}
                      </div>
                      {pms.map((m, i) => {
                        const st = MS[m.status]; const oc = OWNER[m.owner] || OWNER.Joint;
                        const overdue = !m.actualDay && m.expectedDay < account.daysInImpl && m.status !== "complete" && m.status !== "not_started";
                        return (
                          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 60px 95px", padding: "9px 12px", borderBottom: i < pms.length - 1 ? `1px solid ${C.border}` : "none", background: overdue ? C.redBg : "transparent", alignItems: "start" }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: m.status === "at_risk" ? 700 : 400, color: C.fg }}>{m.name}</div>
                              {m.internalNote && <div style={{ fontSize: 10, color: C.fg2, fontStyle: "italic", marginTop: 2 }}>{m.internalNote}</div>}
                              {m.blockerType && <div style={{ marginTop: 3 }}><Badge color={C.red} bg={C.redBg} size={9}>{BLOCKER[m.blockerType]}</Badge></div>}
                            </div>
                            <div style={{ fontSize: 11, color: C.fg2 }}>Day {m.expectedDay}</div>
                            <div><Badge color={oc.color} bg={oc.bg} size={9}>{m.owner}</Badge></div>
                            <div style={{ fontSize: 11, color: m.clientDeliverable ? C.amber : C.fg3 }}>{m.clientDeliverable ? "Reqd" : "—"}</div>
                            <div><Badge color={st.color} bg={st.bg} size={9}>{st.label}</Badge></div>
                          </div>
                        );
                      })}
                    </Card>
                  </div>
                );
              })}
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.fg2, marginBottom: 8 }}>Action Queue</div>
              {account.actionQueue.map((action) => {
                const isSent = sent[action.id]; const isExp = expandedAction === action.id;
                const tc = action.type === "agentic" ? { c: C.purple, bg: C.purpleBg } : { c: C.blue, bg: C.blueBg };
                const pc: Record<string, string> = { P0: C.red, P1: C.red, P2: C.amber, P3: C.fg2 };
                return (
                  <Card key={action.id} style={{ marginBottom: 8, opacity: isSent ? 0.6 : 1 }}>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 5, marginBottom: 5, flexWrap: "wrap" }}>
                        <Badge color={tc.c} bg={tc.bg} size={9}>{action.type === "agentic" ? "Auto" : "Guided"}</Badge>
                        <Badge color={pc[action.priority]} bg={C.muted} size={9}>{action.priority}</Badge>
                        {(action.status === "completed" || isSent) && <Badge color={C.green} bg={C.greenBg} size={9}>Done</Badge>}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.fg, lineHeight: 1.4, marginBottom: action.draftReady && !isSent && action.status !== "completed" ? 5 : 0 }}>{action.title}</div>
                      {action.draftReady && !isSent && action.status !== "completed" && (
                        <button onClick={() => setExpandedAction(isExp ? null : action.id)} style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: "none", border: "none", padding: 0, cursor: "pointer" }}>{isExp ? "Hide ▲" : "Review draft ▼"}</button>
                      )}
                      {isExp && (
                        <div style={{ marginTop: 8 }}>
                          <pre style={{ fontSize: 11, color: C.fg, background: C.muted, padding: "10px", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: "0 0 8px", fontFamily: "inherit", border: `1px solid ${C.border}`, borderRadius: "0.5rem" }}>{action.draft}</pre>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { setSent((p) => ({ ...p, [action.id]: true })); setExpandedAction(null); }} style={{ padding: "5px 12px", background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", borderRadius: "0.5rem" }}>Send</button>
                            <button onClick={() => setExpandedAction(null)} style={{ padding: "5px 12px", background: C.card, color: C.fg2, border: `1px solid ${C.border}`, fontSize: 11, cursor: "pointer", borderRadius: "0.5rem" }}>Edit</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CLIENT VIEW */}
      {view === "client" && (
        <div style={{ background: C.bg, padding: "20px", border: `1px solid ${C.border}`, borderRadius: "1rem" }}>
          <div style={{ background: "hsl(var(--foreground))", borderRadius: "0.75rem", padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: "hsl(var(--background) / 0.65)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Implementation Tracker</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--background))", marginBottom: 6 }}>{account.name}</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
              {[["CSM", account.csm], ["Go-Live Target", account.goLiveTarget], ["Progress", `${completed}/${account.milestones.length} milestones`]].map(([l, v]) => (
                <div key={l}><div style={{ fontSize: 9, color: "hsl(var(--background) / 0.5)", textTransform: "uppercase" }}>{l}</div><div style={{ fontSize: 12, color: "hsl(var(--background))", fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ height: 6, background: "hsl(var(--background) / 0.2)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: C.green, borderRadius: 999 }} />
            </div>
          </div>

          {needsClientAction.length > 0 && (
            <div style={{ background: C.amberBg, border: `1px solid ${C.amber}33`, borderLeft: `3px solid ${C.amber}`, borderRadius: "0.5rem", padding: "12px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Action Needed From Your Team</div>
              {needsClientAction.map((m) => (
                <div key={m.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.amber}22` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.fg, marginBottom: 2 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: C.fg2, marginBottom: 6 }}>{m.whatClientNeeds}</div>
                  {!acknowledged[m.id]
                    ? <button onClick={() => setAcknowledged((p) => ({ ...p, [m.id]: true }))} style={{ padding: "5px 12px", background: C.amber, color: "white", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", borderRadius: "0.5rem" }}>Mark as In Progress</button>
                    : <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>✓ Acknowledged</span>}
                </div>
              ))}
            </div>
          )}

          {template.phases.map((phase) => {
            const pms = account.milestones.filter((m) => m.phase === phase.id);
            if (!pms.length) return null;
            const phaseComplete = pms.filter((m) => m.status === "complete").length;
            return (
              <div key={phase.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: phase.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{phase.name} — Weeks {phase.weeks}</div>
                  <div style={{ fontSize: 10, color: C.fg2 }}>{phaseComplete}/{pms.length}</div>
                </div>
                <Card>
                  {pms.map((m, i) => {
                    const st = MS[m.status];
                    const isClientItem = m.clientDeliverable && m.status !== "complete" && m.expectedDay <= account.daysInImpl + 7;
                    return (
                      <div key={m.id} style={{ display: "flex", gap: 10, padding: "11px 14px", borderBottom: i < pms.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "flex-start", background: isClientItem ? C.amberBg : "transparent" }}>
                        <div style={{ width: 11, height: 11, borderRadius: "50%", background: st.color, flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.fg }}>{m.clientVisibleDesc}</div>
                            <div style={{ flexShrink: 0 }}><Badge color={st.color} bg={st.bg} size={9}>{st.label}</Badge></div>
                          </div>
                          {isClientItem && <div style={{ fontSize: 11, color: C.amber, marginTop: 3, fontWeight: 600 }}>Your team: {m.whatClientNeeds}</div>}
                          {m.clientNote && <div style={{ fontSize: 11, color: C.fg2, marginTop: 3, fontStyle: "italic" }}>{m.clientNote}</div>}
                        </div>
                        <div style={{ fontSize: 10, color: C.fg3, flexShrink: 0 }}>Day {m.expectedDay}</div>
                      </div>
                    );
                  })}
                </Card>
              </div>
            );
          })}
          <div style={{ marginTop: 12, fontSize: 11, color: C.fg2, textAlign: "center", fontStyle: "italic" }}>Questions? Contact {account.csm} · Updated as your implementation progresses</div>
        </div>
      )}
    </div>
  );
}
