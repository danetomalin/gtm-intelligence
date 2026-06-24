"use client";
// Onboarding · Tab 1 — Handoff Suite.
// Four connected documents from pre-sales intelligence: the handoff
// package, the prescribed KPI success plan, and two AI-generated docs
// (kickoff agenda + 90-day success plan) produced through the app's
// BYOK LLM proxy.

import { useState } from "react";
import { type OnboardingAccount, type SuccessPlanKpi, getSuccessPlan, isUniversalKpi } from "@/features/cs-health/lib/onboarding";
import { callLLM } from "@/features/cs-health/lib/llmClient";
import { isConfigured, loadApiConfig } from "@/features/cs-health/lib/apiConfig";
import { formatARR } from "@/features/cs-health/components/ui";
import { C, Badge, Card, SH, PBar, OnbButton } from "./parts";

type DocView = "handoff" | "kpis" | "kickoff" | "successplan";

export default function HandoffTab({ account }: { account: OnboardingAccount }) {
  const [doc, setDoc] = useState<DocView>("handoff");
  const [kpis, setKpis] = useState<SuccessPlanKpi[]>(() => getSuccessPlan(account.successArchetype));
  const [generating, setGenerating] = useState<"kickoff" | "successplan" | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<{ kickoff: string | null; successplan: string | null }>({ kickoff: null, successplan: null });
  const [genError, setGenError] = useState<string | null>(null);

  async function generate(type: "kickoff" | "successplan") {
    setGenerating(type);
    setGenError(null);
    const confirmedKPIs = kpis.filter((k) => k.confirmed);
    const kpiText = confirmedKPIs.map((k) => `${k.kpi}: 30d=${k.customerTarget.d30}, 90d=${k.customerTarget.d90}, 180d=${k.customerTarget.d180}`).join("; ");

    const prompts: Record<string, string> = {
      kickoff: `Generate a 60-minute kickoff meeting agenda for ${account.name}.
Success archetype: ${account.successArchetype}. Primary KPI: ${account.primaryKPI}.
Go-live: ${account.goLiveTarget}. Commitments: ${account.handoffPackage.keyCommitments.join("; ")}.
Scope risks: ${account.handoffPackage.scopeRisks.join("; ")}.
Stakeholders: ${account.handoffPackage.stakeholders.map((s) => `${s.name} (${s.role})`).join(", ")}.
Red flags: ${account.handoffPackage.redFlags.join("; ")}.
Include time blocks. Address risks and gaps directly. No em dashes.`,
      successplan: `Generate a 90-day success plan for ${account.name}.
ARR: ${formatARR(account.arr)}. Archetype: ${account.successArchetype}. Primary KPI: ${account.primaryKPI}.
Go-live: ${account.goLiveTarget}. TTV target: ${account.ttvTarget} days post go-live.
Agreed KPIs with targets: ${kpiText || "To be confirmed at kickoff"}.
Stakeholders: ${account.handoffPackage.stakeholders.map((s) => `${s.name}, ${s.title} (${s.role})`).join("; ")}.
Commitments: ${account.handoffPackage.keyCommitments.join("; ")}.
Include: account overview, success metrics with 30/90/180-day targets, stakeholder engagement plan, CSM cadence, escalation triggers, expansion indicators. No em dashes.`,
    };

    const res = await callLLM(
      [{ role: "user", content: prompts[type] }],
      { maxTokens: 1400, system: "You are a senior CSM generating a specific, customized document. Output plain text only. Use clear section headers. No markdown symbols, no em dashes." }
    );
    if (res.ok && res.text.trim()) {
      setGeneratedDoc((p) => ({ ...p, [type]: res.text }));
      setDoc(type);
    } else {
      setGenError(res.error ?? "Generation failed. Check Settings → Chat Model.");
    }
    setGenerating(null);
  }

  const archetypeKPIs = kpis.filter((k) => !isUniversalKpi(k.id));
  const universalKPIs = kpis.filter((k) => isUniversalKpi(k.id));
  const confirmedCount = kpis.filter((k) => k.confirmed).length;
  const keyConfigured = isConfigured(loadApiConfig());

  function toggleConfirm(id: string) {
    setKpis((p) => p.map((k) => (k.id === id ? { ...k, confirmed: !k.confirmed } : k)));
  }
  function updateTarget(id: string, horizon: "d30" | "d90" | "d180", val: string) {
    setKpis((p) => p.map((k) => (k.id === id ? { ...k, customerTarget: { ...k.customerTarget, [horizon]: val }, adjusted: true } : k)));
  }

  const docTabs: [DocView, string][] = [["handoff", "Handoff Package"], ["kpis", "Success Plan KPIs"], ["kickoff", "Kickoff Agenda"], ["successplan", "Success Plan Doc"]];

  return (
    <div>
      {/* Doc selector + generate actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {docTabs.map(([id, label]) => (
            <button key={id} onClick={() => setDoc(id)} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${C.border}`, borderRadius: "0.75rem", background: doc === id ? "hsl(var(--foreground))" : C.card, color: doc === id ? "hsl(var(--background))" : C.fg2 }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <OnbButton variant="accent" disabled={!!generating} onClick={() => generate("kickoff")}>{generating === "kickoff" ? "Generating…" : "Generate Kickoff Agenda"}</OnbButton>
          <OnbButton onClick={() => generate("successplan")} disabled={!!generating} variant="accent" style={{ background: C.green }}>{generating === "successplan" ? "Generating…" : "Generate Success Plan"}</OnbButton>
        </div>
      </div>

      {genError && (
        <div style={{ background: C.redBg, border: `1px solid hsl(var(--destructive) / 0.3)`, borderRadius: "0.75rem", padding: "8px 14px", marginBottom: 12, fontSize: 11, color: C.red }}>
          {genError}{genError.includes("key") || genError.includes("Settings") ? "" : " "}{!keyConfigured && " Open Settings → Chat Model (bottom-left) to configure a provider."}
        </div>
      )}

      {/* Handoff package */}
      {doc === "handoff" && (
        <div>
          {account.handoffPackage.redFlags.length > 0 && (
            <div style={{ background: C.redBg, border: `1px solid hsl(var(--destructive) / 0.2)`, borderLeft: `3px solid hsl(var(--destructive))`, borderRadius: "0.5rem", padding: "10px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.red, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Red Flags</div>
              {account.handoffPackage.redFlags.map((f, i) => <div key={i} style={{ fontSize: 12, color: C.red, marginBottom: 2 }}>! {f}</div>)}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card>
              <SH>Why They Bought</SH>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: C.fg, lineHeight: 1.6, fontStyle: "italic", background: C.blueBg, padding: "8px 12px", borderLeft: `2px solid ${C.blue}`, borderRadius: "0.25rem" }}>
                  &ldquo;{account.handoffPackage.whyTheyBought}&rdquo;
                </div>
              </div>
            </Card>
            <Card>
              <SH>Commitments &amp; Scope Risks</SH>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.fg2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Committed</div>
                {account.handoffPackage.keyCommitments.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.fg, marginBottom: 4, paddingLeft: 12, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: C.green, fontWeight: 700 }}>✓</span>{c}
                  </div>
                ))}
                {account.handoffPackage.scopeRisks.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 10, marginBottom: 6 }}>Scope Risks</div>
                    {account.handoffPackage.scopeRisks.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: C.amber, marginBottom: 4, paddingLeft: 12, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0, fontWeight: 700 }}>!</span>{r}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
            <Card>
              <SH color={C.green}>Stakeholder Map</SH>
              <div style={{ padding: "12px 14px" }}>
                {account.handoffPackage.stakeholders.map((s, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: i < account.handoffPackage.stakeholders.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, gap: 8, flexWrap: "wrap" }}>
                      <div><span style={{ fontSize: 12, fontWeight: 700, color: C.fg }}>{s.name}</span><span style={{ fontSize: 11, color: C.fg2, marginLeft: 6 }}>{s.title}</span></div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Badge color={s.role === "Champion" ? C.green : s.role === "Economic Buyer" ? C.blue : C.fg2} bg={s.role === "Champion" ? C.greenBg : s.role === "Economic Buyer" ? C.blueBg : C.muted} size={9}>{s.role}</Badge>
                        <Badge color={s.risk === "high" ? C.red : s.risk === "medium" ? C.amber : C.green} bg={s.risk === "high" ? C.redBg : s.risk === "medium" ? C.amberBg : C.greenBg} size={9}>{s.risk} risk</Badge>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.fg2, fontStyle: "italic" }}>{s.note}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <SH color={C.purple}>Archetype: {account.successArchetype}</SH>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: C.fg2, marginBottom: 8 }}>Primary KPI: <strong style={{ color: C.fg }}>{account.primaryKPI}</strong></div>
                <div style={{ fontSize: 10, color: C.fg2, marginBottom: 4 }}>{confirmedCount} of {kpis.length} KPIs confirmed in success plan</div>
                <PBar pct={Math.round((confirmedCount / kpis.length) * 100)} color={C.purple} h={4} />
                <button onClick={() => setDoc("kpis")} style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: C.blue, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Review and confirm KPI targets →</button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* KPI success plan builder */}
      {doc === "kpis" && (
        <div>
          <div style={{ background: C.blueBg, border: `1px solid ${C.blue}33`, borderLeft: `3px solid ${C.blue}`, borderRadius: "0.5rem", padding: "10px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.blue, lineHeight: 1.5 }}>
              Recommended targets are pre-populated based on the <strong>{account.successArchetype}</strong> success archetype. Review with the customer at kickoff — they can confirm as-is or adjust. Confirmed targets feed the success plan and 30/90/180-day checkpoint reviews.
            </div>
          </div>

          {([["Universal KPIs (all customers)", universalKPIs, C.blue], [`Archetype KPIs (${account.successArchetype})`, archetypeKPIs, C.purple]] as [string, SuccessPlanKpi[], string][]).map(([sectionLabel, items, color]) => (
            <div key={sectionLabel} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color, marginBottom: 8 }}>{sectionLabel}</div>
              <Card>
                <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 110px 110px 110px 90px", padding: "7px 14px", borderBottom: `2px solid ${color}`, background: C.muted }}>
                  {["", "KPI", "Category", "30-Day", "90-Day", "180-Day", "Status"].map((h) => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.fg3 }}>{h}</div>
                  ))}
                </div>
                {items.map((k, i) => (
                  <div key={k.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 110px 110px 110px 90px", padding: "10px 14px", borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "start", background: k.confirmed ? C.greenBg : "transparent" }}>
                    <input type="checkbox" checked={k.confirmed} onChange={() => toggleConfirm(k.id)} style={{ marginTop: 3, cursor: "pointer" }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.fg }}>{k.kpi}</div>
                      <div style={{ fontSize: 10, color: C.fg2, marginTop: 2 }}>{k.metric}</div>
                      <div style={{ fontSize: 10, color: C.blue, marginTop: 3, fontStyle: "italic" }}>{k.rationale}</div>
                    </div>
                    <div><Badge color={k.category === "Value" ? C.green : k.category === "Adoption" ? C.blue : k.category === "Satisfaction" ? C.purple : C.fg2} bg={C.muted} size={9}>{k.category}</Badge></div>
                    {(["d30", "d90", "d180"] as const).map((h) => (
                      <div key={h}>
                        <input value={k.customerTarget[h]} onChange={(e) => updateTarget(k.id, h, e.target.value)}
                          style={{ width: "92%", padding: "4px 6px", fontSize: 11, border: `1px solid ${k.adjusted ? C.amber : C.border}`, borderRadius: "0.375rem", background: C.card, color: C.fg, fontFamily: "inherit" }} />
                        <div style={{ fontSize: 9, color: C.fg3, marginTop: 1 }}>rec: {k.recommended[h]}</div>
                      </div>
                    ))}
                    <div>
                      {k.confirmed
                        ? <Badge color={C.green} bg={C.greenBg} size={9}>{k.adjusted ? "Adjusted" : "Confirmed"}</Badge>
                        : <Badge color={C.fg3} bg={C.muted} size={9}>Pending</Badge>}
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.fg2, fontStyle: "italic" }}>Check the box to confirm a KPI. Edit targets directly if the customer adjusts — adjusted targets are flagged in amber. Confirmed KPIs feed into the generated success plan and 30/90/180-day checkpoint reviews.</div>
        </div>
      )}

      {/* Generated docs */}
      {(doc === "kickoff" || doc === "successplan") && (
        <Card style={{ padding: "20px 24px" }}>
          {!generatedDoc[doc]
            ? <div style={{ textAlign: "center", padding: "40px", color: C.fg2 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>No {doc === "kickoff" ? "kickoff agenda" : "success plan"} generated yet.</div>
                <div style={{ fontSize: 11 }}>Click the generate button above to create a customized document.{!keyConfigured && " A chat model must be configured in Settings → Chat Model first."}</div>
              </div>
            : <pre style={{ fontFamily: "inherit", fontSize: 12, color: C.fg, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{generatedDoc[doc]}</pre>}
        </Card>
      )}
    </div>
  );
}
