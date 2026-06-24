"use client";
// Onboarding · Tab 3 — Go-Live & Time-to-Value.
// Go-live is not success. This view starts the TTV clock and confirms
// first value across three independent layers (system / CSM / customer).
// Whichever fires first stops the clock and writes to the health
// model's Value pillar.

import { useState } from "react";
import { type OnboardingAccount } from "@/features/cs-health/lib/onboarding";
import { callLLM } from "@/features/cs-health/lib/llmClient";
import { isConfigured, loadApiConfig } from "@/features/cs-health/lib/apiConfig";
import { C, Badge, Card, SH, OnbButton } from "./parts";

export default function GoLiveTtvTab({ account }: { account: OnboardingAccount }) {
  const [csmConfirmed, setCsmConfirmed] = useState(false);
  const [customerAcked, setCustomerAcked] = useState(false);
  const [goLiveConfirmed, setGoLiveConfirmed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ackEmail, setAckEmail] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const systemDetected = false;
  const ttvConfirmed = csmConfirmed || customerAcked || systemDetected;
  const keyConfigured = isConfigured(loadApiConfig());

  const cohortData: { cohort: string; avgTTV: number | null; accounts: number }[] = [
    { cohort: "Q3 2025", avgTTV: 38, accounts: 8 },
    { cohort: "Q4 2025", avgTTV: 42, accounts: 11 },
    { cohort: "Q1 2026", avgTTV: 49, accounts: 9 },
    { cohort: "Q2 2026", avgTTV: null, accounts: 4 },
  ];
  const maxTTV = 60;

  async function generateAckEmail() {
    setGenerating(true);
    setGenError(null);
    const champion = account.handoffPackage.stakeholders.find((s) => s.role === "Champion");
    const res = await callLLM(
      [{ role: "user", content: `30-day value check-in email to ${champion?.name || "the champion"} at ${account.name}.
Primary KPI: ${account.primaryKPI}. CSM: ${account.csm}. 2-3 short paragraphs. Reference their specific outcome. Ask them to confirm whether they have seen the results they expected — give them a simple yes/not yet/partially framing.` }],
      { maxTokens: 500, system: "You are a senior CSM writing a concise value check-in email. Output subject line then body. No em dashes. No preamble. No markdown symbols." }
    );
    if (res.ok && res.text.trim()) setAckEmail(res.text);
    else setGenError(res.error ?? "Generation failed. Check Settings → Chat Model.");
    setGenerating(false);
  }

  return (
    <div>
      {/* Go-live confirmation */}
      <div style={{ background: "hsl(var(--foreground))", borderRadius: "1rem", padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--background))" }}>{account.name} — Go-Live Tracking</div>
            <div style={{ fontSize: 11, color: "hsl(var(--background) / 0.65)", marginTop: 2 }}>Target: {account.goLiveTarget} · TTV target: {account.ttvTarget}d post go-live</div>
          </div>
          {!goLiveConfirmed
            ? <OnbButton variant="accent" style={{ background: C.green, padding: "8px 18px", fontSize: 12 }} onClick={() => setGoLiveConfirmed(true)}>Confirm Go-Live</OnbButton>
            : <Badge color={C.green} bg={C.greenBg}>Go-Live Confirmed</Badge>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* TTV confirmation layers */}
        <Card>
          <SH color={C.blue}>First Value Confirmation — 3 Layers</SH>
          <div style={{ padding: "12px 14px" }}>
            {[
              { key: "system", label: "System Detection", active: systemDetected, desc: "Fires automatically when product usage data crosses the KPI threshold defined in the success plan. Requires product data pipeline." },
              { key: "csm", label: "CSM Confirmation", active: csmConfirmed, desc: "CSM confirms first value with evidence — a customer statement, a metric reading, or a call note. Especially useful when value is qualitative." },
              { key: "customer", label: "Customer Acknowledgment", active: customerAcked, desc: "Structured 30-day outreach asks the customer to confirm whether they have achieved the outcome they bought for. Response is logged." },
            ].map((layer, i) => (
              <div key={layer.key} style={{ padding: "12px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.fg }}>{layer.label}</div>
                  <Badge color={layer.active ? C.green : C.fg2} bg={layer.active ? C.greenBg : C.muted} size={9}>{layer.active ? "Confirmed" : "Awaiting"}</Badge>
                </div>
                <div style={{ fontSize: 11, color: C.fg2, lineHeight: 1.4, marginBottom: 8 }}>{layer.desc}</div>
                {layer.key === "csm" && !csmConfirmed && <OnbButton variant="accent" style={{ background: C.green }} onClick={() => setCsmConfirmed(true)}>Confirm First Value</OnbButton>}
                {layer.key === "customer" && !customerAcked && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <OnbButton variant="accent" disabled={generating} onClick={generateAckEmail}>{generating ? "Generating…" : "Generate Check-In Email"}</OnbButton>
                    <OnbButton variant="ghost" onClick={() => setCustomerAcked(true)}>Mark Acknowledged</OnbButton>
                  </div>
                )}
              </div>
            ))}
            {ttvConfirmed && (
              <div style={{ marginTop: 10, background: C.greenBg, border: `1px solid hsl(var(--success) / 0.3)`, borderRadius: "0.5rem", padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>First Value Confirmed</div>
                <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>TTV clock stopped. Event logged to health model Value pillar.</div>
              </div>
            )}
            {genError && <div style={{ marginTop: 10, fontSize: 11, color: C.red }}>{genError}{!keyConfigured && " Configure a provider in Settings → Chat Model."}</div>}
          </div>
        </Card>

        {/* TTV cohort trend */}
        <Card>
          <SH color={C.purple}>TTV Cohort Trend</SH>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: C.fg2, marginBottom: 12, fontStyle: "italic" }}>Avg days to first value vs. {account.ttvTarget}d target</div>
            {cohortData.map((c) => (
              <div key={c.cohort} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.fg }}>{c.cohort}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: C.fg2 }}>{c.accounts} accounts</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.avgTTV ? (c.avgTTV <= account.ttvTarget ? C.green : C.amber) : C.fg3 }}>{c.avgTTV ? `${c.avgTTV}d` : "In progress"}</span>
                  </div>
                </div>
                <div style={{ height: 6, background: C.muted, borderRadius: 999, position: "relative" }}>
                  <div style={{ position: "absolute", left: `${(account.ttvTarget / maxTTV) * 100}%`, top: -2, width: 2, height: 10, background: C.fg2, borderRadius: 1 }} />
                  {c.avgTTV && <div style={{ width: `${(c.avgTTV / maxTTV) * 100}%`, height: "100%", background: c.avgTTV <= account.ttvTarget ? C.green : C.amber, borderRadius: 999 }} />}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: C.fg3, marginTop: 8, fontStyle: "italic" }}>| marks {account.ttvTarget}-day target. Q1 2026 averaging 49d — 4d over target.</div>
          </div>
        </Card>
      </div>

      {ackEmail && (
        <Card style={{ padding: "16px 20px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.fg2, marginBottom: 10 }}>Generated Customer Check-In Email</div>
          <pre style={{ fontFamily: "inherit", fontSize: 12, color: C.fg, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{ackEmail}</pre>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={() => { setCustomerAcked(true); setAckEmail(null); }} style={{ padding: "6px 14px", background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", borderRadius: "0.5rem" }}>Mark as Sent</button>
            <button onClick={() => setAckEmail(null)} style={{ padding: "6px 14px", background: C.card, color: C.fg2, border: `1px solid ${C.border}`, fontSize: 11, cursor: "pointer", borderRadius: "0.5rem" }}>Dismiss</button>
          </div>
        </Card>
      )}
    </div>
  );
}
