"use client";
// Churn Intelligence — TTM churn events, reason code breakdown,
// model signal quality (flagged vs missed), expandable event detail.
// Churn reasons are the ground-truth label set for the optimization loop.

import { useState } from "react";
import { DATA, type ChurnEvent } from "@/features/cs-health/lib/generateData";
import { SectionLabel, SortHeader, StatCard, formatARR, sortRows, useSort } from "@/features/cs-health/components/ui";

type ChurnSortKey = "name" | "segment" | "arr" | "reason" | "h90" | "date" | "signals";
const CHURN_SORT_VALUE: Record<ChurnSortKey, (e: ChurnEvent) => number | string> = {
  name: (e) => e.name.toLowerCase(),
  segment: (e) => e.segment,
  arr: (e) => e.arr,
  reason: (e) => e.primaryReason,
  h90: (e) => e.healthScore90d,
  date: (e) => e.date,
  signals: (e) => e.missedSignals.length,
};
const CHURN_HEADERS: { label: string; key?: ChurnSortKey }[] = [
  { label: "" },
  { label: "Account", key: "name" },
  { label: "Seg", key: "segment" },
  { label: "ARR", key: "arr" },
  { label: "Reason", key: "reason" },
  { label: "@90d", key: "h90" },
  { label: "Date", key: "date" },
  { label: "Missed Signals", key: "signals" },
];

const REASON_COLORS: Record<string, string> = { "CR-01": "hsl(var(--destructive))", "CR-02": "hsl(var(--warning))", "CR-03": "#7c3aed", "CR-04": "#2563eb", "CR-05": "var(--fg-secondary)", "CR-06": "#ea580c", "CR-07": "var(--fg-tertiary)" };
const REASON_LABELS: Record<string, string> = { "CR-01": "Value Not Realized", "CR-02": "Product Gap", "CR-03": "Champion Loss", "CR-04": "Competitive", "CR-05": "Budget/Economic", "CR-06": "Impl Failure", "CR-07": "Strategic Change" };

export default function ChurnIntelligenceTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sortKey, sortDir, toggle } = useSort<ChurnSortKey>("date", "desc");
  const totalArrLost = DATA.churnReasonSummary.reduce((s, r) => s + r.arrLost, 0);
  const modelCaughtCount = DATA.churnEvents.filter((e) => e.healthScore90d < 65).length;
  const sortedEvents = sortRows(DATA.churnEvents, CHURN_SORT_VALUE[sortKey], sortDir);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Churn Events (TTM)" value={DATA.churnEvents.length} sub="All segments" color="hsl(var(--destructive))" />
        <StatCard label="ARR Lost (TTM)" value={formatARR(totalArrLost)} sub="Closed churn + contraction" color="hsl(359 75% 42%)" />
        <StatCard label="Model Caught (90d)" value={`${modelCaughtCount}/${DATA.churnEvents.length}`} sub="Health score below 65 at 90d prior" color="hsl(var(--warning))" />
        <StatCard label="Top Driver" value="CR-01" sub="Value Not Realized — 2 events, $400K" color="#7c3aed" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "18px 20px" }}>
          <SectionLabel style={{ marginBottom: 14 }}>Churn by Reason Code (TTM)</SectionLabel>
          {DATA.churnReasonSummary.map((r) => (
            <div key={r.code} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-primary)" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: r.color, fontWeight: 700, marginRight: 6 }}>{r.code}</span>{r.label}
                </span>
                <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{r.count}{r.count > 0 && <span style={{ color: "var(--fg-tertiary)" }}> · {formatARR(r.arrLost)}</span>}</span>
              </div>
              {r.count > 0 && <div style={{ height: 5, background: "hsl(var(--muted))", borderRadius: "0.5rem" }}><div style={{ width: `${(r.arrLost / totalArrLost) * 100}%`, height: "100%", background: r.color, borderRadius: "0.5rem", opacity: 0.75 }} /></div>}
            </div>
          ))}
        </div>
        <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "18px 20px" }}>
          <SectionLabel style={{ marginBottom: 14 }}>Model Signal Quality — Health Score at 90d Prior</SectionLabel>
          {DATA.churnEvents.map((e) => {
            const caught = e.healthScore90d < 65;
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid hsl(var(--muted))" }}>
                <div style={{ minWidth: 140, fontSize: 11, fontWeight: 600, color: "var(--fg-primary)" }}>{e.name}</div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 80, height: 5, background: "hsl(var(--muted))", borderRadius: "0.5rem" }}>
                    <div style={{ width: `${e.healthScore90d}%`, height: "100%", background: caught ? "hsl(var(--warning))" : "hsl(var(--destructive))", borderRadius: "0.5rem" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: caught ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>{e.healthScore90d}</span>
                  <span style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>→ {e.healthScore30d} at 30d</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", background: caught ? "hsl(var(--warning) / 0.14)" : "hsl(var(--destructive) / 0.12)", color: caught ? "hsl(28 90% 38%)" : "hsl(359 75% 42%)", borderRadius: "0.5rem" }}>{caught ? "FLAGGED" : "MISSED"}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid hsl(var(--border))" }}>
          <SectionLabel style={{ marginBottom: 0 }}>Churn Event Detail — Click to Expand</SectionLabel>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "24px 170px 50px 60px 125px 65px 70px 1fr", columnGap: 10, padding: "8px 14px", borderBottom: "2px solid hsl(var(--foreground))", alignItems: "center" }}>
          {CHURN_HEADERS.map((hd, i) => hd.key ? (
            <SortHeader key={i} label={hd.label} active={sortKey === hd.key} dir={sortDir} onClick={() => toggle(hd.key!, "desc")} />
          ) : (
            <div key={i} />
          ))}
        </div>
        {sortedEvents.map((e) => {
          const isExp = expandedId === e.id;
          return (
            <div key={e.id}>
              <div onClick={() => setExpandedId(isExp ? null : e.id)} style={{ display: "grid", gridTemplateColumns: "24px 170px 50px 60px 125px 65px 70px 1fr", columnGap: 10, padding: "11px 14px", borderBottom: "1px solid hsl(var(--border))", alignItems: "center", cursor: "pointer", background: isExp ? "hsl(var(--card))" : "white" }}>
                <div style={{ fontSize: 10, color: "var(--fg-tertiary)", fontWeight: 700 }}>{isExp ? "▼" : "▶"}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-primary)" }}>{e.name}</div>
                <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{e.segment}</div>
                <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{formatARR(e.arr)}</div>
                <div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: REASON_COLORS[e.primaryReason], background: REASON_COLORS[e.primaryReason] + "20", padding: "2px 7px", borderRadius: "0.5rem" }}>{e.primaryReason}</span>
                  <div style={{ fontSize: 10, color: "var(--fg-secondary)", marginTop: 2 }}>{REASON_LABELS[e.primaryReason]}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: e.healthScore90d < 65 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>{e.healthScore90d} <span style={{ fontSize: 10, color: "var(--fg-tertiary)", fontWeight: 400 }}>@90d</span></div>
                <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>{e.date}</div>
                <div style={{ fontSize: 11, color: e.missedSignals.length > 0 ? "hsl(var(--destructive))" : "hsl(var(--success))", fontWeight: 600 }}>{e.missedSignals.length > 0 ? `${e.missedSignals.length} missed signal${e.missedSignals.length > 1 ? "s" : ""}` : "Signals present"}</div>
              </div>
              {isExp && (
                <div style={{ padding: "16px 42px 20px", background: "hsl(var(--card))", borderBottom: "1px solid hsl(var(--border))" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8 }}>Score Trajectory</div>
                      {([["90d prior", e.healthScore90d], ["60d prior", e.healthScore60d], ["30d prior", e.healthScore30d]] as const).map(([label, score]) => (
                        <div key={label} style={{ marginBottom: 7 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                            <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>{label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: score < 50 ? "hsl(var(--destructive))" : score < 65 ? "hsl(var(--warning))" : "hsl(var(--success))" }}>{score}</span>
                          </div>
                          <div style={{ height: 4, background: "hsl(var(--muted))", borderRadius: "0.5rem" }}>
                            <div style={{ width: `${score}%`, height: "100%", background: score < 50 ? "hsl(var(--destructive))" : score < 65 ? "hsl(var(--warning))" : "hsl(var(--success))", borderRadius: "0.5rem" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8 }}>Missed Signals</div>
                      {e.missedSignals.length === 0
                        ? <div style={{ fontSize: 11, color: "hsl(var(--success))" }}>No missed signals — model flagged this account appropriately.</div>
                        : e.missedSignals.map((s, i) => (
                          <div key={i} style={{ fontSize: 11, color: "var(--fg-secondary)", padding: "4px 0 4px 12px", borderBottom: "1px solid hsl(var(--muted))", position: "relative", lineHeight: 1.4 }}>
                            <span style={{ position: "absolute", left: 0, color: "hsl(var(--destructive))", fontWeight: 700 }}>!</span>{s}
                          </div>
                        ))
                      }
                    </div>
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8 }}>Model Learnings</div>
                      <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.6 }}>{e.learnings}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 11, color: "var(--fg-secondary)", background: "hsl(var(--muted))", padding: "10px 14px", fontStyle: "italic", borderLeft: "2px solid hsl(var(--border))", lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--fg-primary)", fontStyle: "normal" }}>CSM Notes:</strong> {e.csmNotes}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
