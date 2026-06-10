"use client";
// Accounts — full account table with VAR breakdown, expandable detail.

import { useMemo, useState } from "react";
import type { ScoredAccount } from "@/features/cs-health/lib/types";
import { BandPill, ExpansionPill, MiniSparkline, PriorityPill, ScoreBar, SentimentDot, SortHeader, formatARR, sortRows, useSort } from "@/features/cs-health/components/ui";

const GRID = "26px 165px 60px 85px 80px 34px 34px 34px 86px 105px 56px";
const GRID_GAP = 10;

type SortKey = "name" | "arr" | "score" | "trend" | "v" | "a" | "r" | "band";
const TREND_RANK: Record<string, number> = { down: 0, flat: 1, up: 2 };
const BAND_RANK: Record<string, number> = { Critical: 0, "At Risk": 1, Healthy: 2 };
const SORT_VALUE: Record<SortKey, (a: ScoredAccount) => number | string> = {
  name: (a) => a.name.toLowerCase(),
  arr: (a) => a.arr,
  score: (a) => a.scoring.score,
  trend: (a) => TREND_RANK[a.trendDir] ?? 1,
  v: (a) => a.valueScore,
  a: (a) => a.adoptionScore,
  r: (a) => a.relationshipScore,
  band: (a) => BAND_RANK[a.scoring.band] ?? 1,
};
const HEADERS: { label: string; key?: SortKey }[] = [
  { label: "" },
  { label: "Account", key: "name" },
  { label: "ARR", key: "arr" },
  { label: "Score", key: "score" },
  { label: "Trend", key: "trend" },
  { label: "V", key: "v" },
  { label: "A", key: "a" },
  { label: "R", key: "r" },
  { label: "Band", key: "band" },
  { label: "Action" },
  { label: "Priority" },
];

export default function AccountsTab({ allScored }: { allScored: ScoredAccount[] }) {
  const [segFilter, setSegFilter] = useState("all");
  const [bandFilter, setBandFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { sortKey, sortDir, toggle } = useSort<SortKey>("score", "asc");

  const filtered = useMemo(() => {
    let list = segFilter === "ent" ? allScored.filter((a) => a.segment === "ENT")
      : segFilter === "mm" ? allScored.filter((a) => a.segment === "MM")
      : allScored;
    if (bandFilter !== "all") list = list.filter((a) => a.scoring.band === bandFilter);
    if (priorityFilter !== "all") list = list.filter((a) => a.action.priority === priorityFilter);
    return sortRows(list, SORT_VALUE[sortKey], sortDir);
  }, [segFilter, bandFilter, priorityFilter, sortKey, sortDir, allScored]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all", "All Segments"], ["ent", "Enterprise"], ["mm", "Mid-Market"]].map(([v, l]) => (
          <button key={v} onClick={() => setSegFilter(v)} style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", background: segFilter === v ? "var(--fg-primary)" : "white", color: segFilter === v ? "white" : "var(--fg-secondary)" }}>{l}</button>
        ))}
        <div style={{ width: 1, background: "hsl(var(--border))", margin: "0 4px" }} />
        {[["all", "All Bands"], ["Healthy", "Healthy"], ["At Risk", "At Risk"], ["Critical", "Critical"]].map(([v, l]) => (
          <button key={v} onClick={() => setBandFilter(v)} style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", background: bandFilter === v ? "var(--fg-primary)" : "white", color: bandFilter === v ? "white" : "var(--fg-secondary)" }}>{l}</button>
        ))}
        <div style={{ width: 1, background: "hsl(var(--border))", margin: "0 4px" }} />
        {[["all", "All Priorities"], ["P0", "P0"], ["P1", "P1"], ["P2", "P2"], ["P3", "P3"], ["OK", "OK"]].map(([v, l]) => (
          <button key={v} onClick={() => setPriorityFilter(v)} style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", background: priorityFilter === v ? "var(--fg-primary)" : "white", color: priorityFilter === v ? "white" : "var(--fg-secondary)" }}>{l}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-tertiary)", alignSelf: "center" }}>{filtered.length} accounts</span>
      </div>
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, columnGap: GRID_GAP, padding: "8px 14px", borderBottom: "2px solid hsl(var(--foreground))", minWidth: 960, alignItems: "center" }}>
          {HEADERS.map((h, i) => h.key ? (
            <SortHeader key={i} label={h.label} active={sortKey === h.key} dir={sortDir} onClick={() => toggle(h.key!)} />
          ) : (
            <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)" }}>{h.label}</div>
          ))}
        </div>
        {filtered.map((a) => {
          const isExp = expandedRow === a.id;
          const w = a.scoring.weights;
          const exp = a.expansionScoring;
          return (
            <div key={a.id}>
              <div onClick={() => setExpandedRow(isExp ? null : a.id)} style={{ display: "grid", gridTemplateColumns: GRID, columnGap: GRID_GAP, padding: "11px 14px", borderBottom: "1px solid hsl(var(--border))", alignItems: "center", cursor: "pointer", background: isExp ? "hsl(var(--card))" : "white", minWidth: 960 }}>
                <div style={{ fontSize: 10, color: "var(--fg-tertiary)", fontWeight: 700 }}>{isExp ? "▼" : "▶"}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-primary)" }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>{a.csm} · {a.stage}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>{formatARR(a.arr)}</div>
                <ScoreBar score={a.scoring.score} seg={a.segment} />
                <MiniSparkline scores={a.scoreTrend} dir={a.trendDir} />
                {[a.valueScore, a.adoptionScore, a.relationshipScore].map((s, i) => (
                  <div key={i} style={{ fontSize: 12, fontWeight: 600, color: s >= 70 ? "hsl(var(--success))" : s >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>{s}</div>
                ))}
                <BandPill band={a.scoring.band} />
                <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.3 }}>{a.action.label}</div>
                <PriorityPill p={a.action.priority} />
              </div>
              {isExp && (
                <div style={{ padding: "16px 50px 20px", background: "hsl(var(--card))", borderBottom: "1px solid hsl(var(--border))" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
                    {/* Action */}
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8 }}>Recommended Action</div>
                      <PriorityPill p={a.action.priority} />
                      <div style={{ fontSize: 12, color: "var(--fg-primary)", marginTop: 8, fontWeight: 600 }}>{a.action.label}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 4, lineHeight: 1.5 }}>{a.action.detail}</div>
                      {a.scoring.tier1 && <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: "hsl(359 75% 42%)", background: "hsl(var(--destructive) / 0.12)", padding: "6px 8px" }}>TIER 1: {a.scoring.tier1}</div>}
                      {a.scoring.penaltyReasons.map((r, i) => <div key={i} style={{ fontSize: 10, color: "hsl(28 90% 38%)", background: "hsl(var(--warning) / 0.14)", padding: "3px 7px", marginTop: 3 }}>T2: {r}</div>)}
                    </div>
                    {/* VAR */}
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8 }}>VAR Detail & Stage Weights</div>
                      {([["Value", a.valueScore, w.value, "#1e3a5f"], ["Adoption", a.adoptionScore, w.adoption, "#2d4a22"], ["Relationship", a.relationshipScore, w.relationship, "#4a2040"]] as const).map(([label, score, weight, color]) => (
                        <div key={label} style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
                            <span style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>wt: {Math.round(weight * 100)}%</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: score >= 70 ? "hsl(var(--success))" : score >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>{score}</span>
                          </div>
                          <div style={{ height: 4, background: "hsl(var(--muted))", borderRadius: "0.5rem" }}>
                            <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "0.5rem", opacity: 0.6 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Relationship */}
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8 }}>Relationship Signals</div>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>CSM Rating</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-primary)" }}>{"★".repeat(a.sentiment.csmRating)}{"☆".repeat(5 - a.sentiment.csmRating)}</div>
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>Email Response</div>
                        <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>{a.sentiment.emailResponseTrend}</div>
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>Meeting Tone</div>
                        <div style={{ fontSize: 12, color: "var(--fg-secondary)", display: "flex", alignItems: "center" }}>
                          <SentimentDot t={a.sentimentTrend} />{a.sentiment.meetingTone}
                        </div>
                      </div>
                      {a.sentiment.verbatimTheme && <div style={{ fontSize: 11, color: "var(--fg-secondary)", background: "hsl(var(--muted))", padding: "6px 8px", fontStyle: "italic", borderLeft: "2px solid hsl(var(--border))", lineHeight: 1.4 }}>&ldquo;{a.sentiment.verbatimTheme}&rdquo;</div>}
                    </div>
                    {/* Adoption */}
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8 }}>Adoption Signals</div>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>User Penetration</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: "hsl(var(--muted))", borderRadius: "0.5rem" }}>
                            <div style={{ width: `${a.adoptionSignals.userPenetration}%`, height: "100%", background: a.adoptionSignals.userPenetration > 70 ? "hsl(var(--success))" : a.adoptionSignals.userPenetration > 45 ? "hsl(var(--warning))" : "hsl(var(--destructive))", borderRadius: "0.5rem" }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-primary)" }}>{a.adoptionSignals.userPenetration}%</span>
                        </div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>Feature Breadth</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: "hsl(var(--muted))", borderRadius: "0.5rem" }}>
                            <div style={{ width: `${a.adoptionSignals.featureBreadth}%`, height: "100%", background: "#2d4a22", borderRadius: "0.5rem", opacity: 0.6 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-primary)" }}>{a.adoptionSignals.featureBreadth}%</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fg-secondary)", fontStyle: "italic", lineHeight: 1.4 }}>{a.adoptionSignals.trajectoryNote}</div>
                    </div>
                    {/* Expansion Readiness — engine-computed */}
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px", gridColumn: "span 2" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Expansion Readiness</span>
                        <ExpansionPill band={exp.band} score={exp.score} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                        {exp.components.slice(0, 4).map((c) => (
                          <div key={c.label}>
                            <div style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 3 }}>{c.label}</div>
                            <div style={{ height: 4, background: "hsl(var(--muted))", borderRadius: "0.5rem", marginBottom: 2 }}>
                              <div style={{ width: `${c.value}%`, height: "100%", background: c.value >= 70 ? "hsl(var(--success))" : c.value >= 45 ? "hsl(var(--warning))" : "hsl(var(--muted))", borderRadius: "0.5rem" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-primary)" }}>{c.value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--fg-secondary)", marginTop: 8, lineHeight: 1.4 }}>{exp.recommendedPlay}</div>
                    </div>
                    {/* Data Confidence */}
                    <div style={{ background: "hsl(var(--card))", border: `1px solid ${a.dataConfidence.score < 50 ? "hsl(var(--destructive) / 0.4)" : a.dataConfidence.score < 75 ? "hsl(var(--warning) / 0.5)" : "hsl(var(--border))"}`, padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8 }}>Data Confidence</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: a.dataConfidence.score >= 75 ? "hsl(135 59% 32%)" : a.dataConfidence.score >= 50 ? "hsl(28 90% 38%)" : "hsl(359 75% 42%)", marginBottom: 8 }}>
                        {a.dataConfidence.score}<span style={{ fontSize: 11, fontWeight: 400, color: "var(--fg-secondary)", marginLeft: 4 }}>/ 100</span>
                      </div>
                      {([["Completeness", a.dataConfidence.completeness], ["Recency", a.dataConfidence.recency], ["Source diversity", a.dataConfidence.sourceDiversity]] as const).map(([l, v]) => (
                        <div key={l} style={{ marginBottom: 5 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                            <span style={{ fontSize: 10, color: "var(--fg-secondary)" }}>{l}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-secondary)" }}>{v}</span>
                          </div>
                          <div style={{ height: 3, background: "hsl(var(--muted))", borderRadius: "0.5rem" }}>
                            <div style={{ width: `${v}%`, height: "100%", background: v >= 75 ? "hsl(var(--success))" : v >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))", borderRadius: "0.5rem" }} />
                          </div>
                        </div>
                      ))}
                      {a.dataConfidence.note && <div style={{ fontSize: 10, color: "hsl(28 90% 38%)", background: "hsl(var(--warning) / 0.14)", padding: "5px 8px", marginTop: 8, lineHeight: 1.4 }}>{a.dataConfidence.note}</div>}
                    </div>
                    {/* TTV */}
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)", marginBottom: 8 }}>Time to Value</div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>Days to First Value</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-primary)" }}>
                          {a.ttv.daysToFirstValue ? `${a.ttv.daysToFirstValue}d` : "—"}
                        </div>
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>Value Trajectory</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: a.ttv.valueTrajectory === "accelerating" || a.ttv.valueTrajectory === "improving" ? "hsl(var(--success))" : a.ttv.valueTrajectory === "regressing" ? "hsl(var(--destructive))" : "hsl(var(--warning))" }}>{a.ttv.valueTrajectory}</div>
                      </div>
                      {a.ttv.trajectoryScore && (
                        <div style={{ height: 4, background: "hsl(var(--muted))", borderRadius: "0.5rem" }}>
                          <div style={{ width: `${a.ttv.trajectoryScore}%`, height: "100%", background: "#1e3a5f", borderRadius: "0.5rem", opacity: 0.6 }} />
                        </div>
                      )}
                    </div>
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
