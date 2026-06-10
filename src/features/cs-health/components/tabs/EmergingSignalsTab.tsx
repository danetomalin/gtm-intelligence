"use client";
// Emerging Signals — architecture documentation for the next-gen
// signal layer and accounts with active sentiment signals.

import type { ScoredAccount } from "@/features/cs-health/lib/types";
import { BandPill, SectionLabel, SentimentDot } from "@/features/cs-health/components/ui";

const SOURCES = [
  { source: "Call Transcripts (Gong / Otter)", pillar: "Relationship", signals: ["Sentiment trajectory over time", "Topic drift: strategic to tactical to transactional", "Engagement pattern: who is on call, question volume", "Language shift detection"], status: "Modeled — API integration pending" },
  { source: "Email Metadata", pillar: "Relationship", signals: ["Response latency trend", "Champion communication frequency", "Tone analysis on thread escalations", "Ghosting detection: no reply in N days"], status: "Modeled — requires email metadata access" },
  { source: "CSAT / NPS Verbatims", pillar: "Relationship + Value", signals: ["NLP clustering by theme and sentiment", "Score-verbatim divergence", "Longitudinal theme tracking", "Detractor early warning from verbatim keywords"], status: "Partially live — verbatim themes shown in accounts view" },
  { source: "AI Adoption Signals", pillar: "Adoption", signals: ["Prompt sophistication trajectory", "Output utilization rate", "Workflow integration depth", "Wow-to-meh curve detection"], status: "Framework defined — requires product instrumentation" },
];

export default function EmergingSignalsTab({ allScored }: { allScored: ScoredAccount[] }) {
  const entScored = allScored.filter((a) => a.segment === "ENT");
  return (
    <div>
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "20px 24px", marginBottom: 14 }}>
        <SectionLabel style={{ marginBottom: 8 }}>Next-Gen Signal Layer — Architecture</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.7, marginBottom: 16 }}>These signals are modeled in the data architecture and partially surfaced in the accounts view. Full integration requires Gong/transcript API, email metadata access, and NLP pipeline on CSAT verbatims.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {SOURCES.map((s) => (
            <div key={s.source} style={{ border: "1px solid hsl(var(--border))", padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-primary)" }}>{s.source}</div>
                <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", background: "hsl(var(--muted))", color: "var(--fg-secondary)", borderRadius: "0.5rem", marginLeft: 8, whiteSpace: "nowrap" }}>{s.pillar}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px 0" }}>
                {s.signals.map((sig, i) => (
                  <li key={i} style={{ fontSize: 11, color: "var(--fg-secondary)", padding: "3px 0 3px 12px", position: "relative", lineHeight: 1.4 }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--fg-tertiary)" }}>—</span>{sig}
                  </li>
                ))}
              </ul>
              <div style={{ fontSize: 10, color: s.status.includes("live") ? "hsl(135 59% 32%)" : "hsl(28 90% 38%)", background: s.status.includes("live") ? "hsl(var(--success) / 0.12)" : "hsl(var(--warning) / 0.14)", padding: "5px 8px", fontWeight: 600 }}>{s.status}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "20px 24px" }}>
        <SectionLabel style={{ marginBottom: 14 }}>Accounts with Active Sentiment Signals</SectionLabel>
        {entScored.filter((a) => a.sentimentTrend === "declining" || a.sentiment.verbatimTheme).map((a) => (
          <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid hsl(var(--muted))", display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ minWidth: 160 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-primary)" }}>{a.name}</div>
              <div style={{ display: "flex", alignItems: "center", marginTop: 3 }}>
                <SentimentDot t={a.sentimentTrend} /><span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{a.sentimentTrend}</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>Meeting tone: <strong>{a.sentiment.meetingTone}</strong> · Email: <strong>{a.sentiment.emailResponseTrend}</strong></div>
              {a.sentiment.verbatimTheme && <div style={{ fontSize: 11, color: "var(--fg-secondary)", fontStyle: "italic", marginTop: 4 }}>&ldquo;{a.sentiment.verbatimTheme}&rdquo;</div>}
            </div>
            <BandPill band={a.scoring.band} />
          </div>
        ))}
      </div>
    </div>
  );
}
