"use client";
// Campaigns — sortable portfolio table with channel/status filters.

import { useMemo, useState } from "react";
import { SectionLabel, SortHeader, TOKENS, useSort, sortRows, MiniSparkline } from "@/features/cs-health/components/ui";
import { SIGNAL_SEVERITY } from "@/features/marketing-health/lib/rollups";
import type { CampaignStatus, Channel, ScoredCampaign } from "@/features/marketing-health/lib/types";
import { CHANNEL_LABEL, SignalPill, dirOf, fmtMoney, fmtNum, fmtPct } from "../ui";

type SortKey = "name" | "spend" | "mqls" | "cpl" | "ctr" | "pipeline" | "ppd" | "signal";

const SORT_VALUE: Record<SortKey, (c: ScoredCampaign) => number | string> = {
  name: (c) => c.name,
  spend: (c) => c.kpis.spend4w,
  mqls: (c) => c.kpis.mqls4w,
  cpl: (c) => c.kpis.cpl ?? Number.MAX_SAFE_INTEGER,
  ctr: (c) => c.kpis.ctr,
  pipeline: (c) => c.kpis.pipeline4w,
  ppd: (c) => c.kpis.pipelinePerDollar ?? 0,
  signal: (c) => SIGNAL_SEVERITY[c.kpis.worstSignal],
};

const STATUS_STYLE: Record<CampaignStatus, { color: string; label: string }> = {
  active: { color: "hsl(135 59% 32%)", label: "Active" },
  paused: { color: "hsl(28 90% 38%)", label: "Paused" },
  completed: { color: "var(--fg-tertiary)", label: "Done" },
};

export default function CampaignsTab({ scored }: { scored: ScoredCampaign[] }) {
  const { sortKey, sortDir, toggle } = useSort<SortKey>("pipeline", "desc");
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");

  const channels = useMemo(
    () => [...new Set(scored.map((c) => c.channel))],
    [scored],
  );

  const rows = useMemo(() => {
    const filtered = scored.filter(
      (c) => (channel === "all" || c.channel === channel) && (status === "all" || c.status === status),
    );
    return sortRows(filtered, SORT_VALUE[sortKey], sortDir);
  }, [scored, channel, status, sortKey, sortDir]);

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 999,
    cursor: "pointer",
    border: TOKENS.rim,
    background: active ? "hsl(var(--foreground))" : "hsl(var(--card))",
    color: active ? "hsl(var(--background))" : "var(--fg-secondary)",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button style={chip(channel === "all")} onClick={() => setChannel("all")}>All channels</button>
        {channels.map((ch) => (
          <button key={ch} style={chip(channel === ch)} onClick={() => setChannel(ch)}>{CHANNEL_LABEL[ch]}</button>
        ))}
        <span style={{ width: 1, height: 20, background: "hsl(var(--border))", margin: "0 4px" }} />
        {(["all", "active", "paused"] as const).map((st) => (
          <button key={st} style={chip(status === st)} onClick={() => setStatus(st)}>
            {st === "all" ? "All statuses" : STATUS_STYLE[st as CampaignStatus].label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-tertiary)" }}>{rows.length} campaigns</span>
      </div>

      <div style={{ background: TOKENS.surface, border: TOKENS.rim, borderRadius: "1rem", padding: 18, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}><SortHeader label="Campaign" active={sortKey === "name"} dir={sortDir} onClick={() => toggle("name")} /></th>
              <th style={{ padding: "6px 8px" }}><SortHeader label="Spend 4w" active={sortKey === "spend"} dir={sortDir} onClick={() => toggle("spend", "desc")} /></th>
              <th style={{ padding: "6px 8px" }}><SortHeader label="MQLs 4w" active={sortKey === "mqls"} dir={sortDir} onClick={() => toggle("mqls", "desc")} /></th>
              <th style={{ padding: "6px 8px" }}><SortHeader label="CPL" active={sortKey === "cpl"} dir={sortDir} onClick={() => toggle("cpl")} /></th>
              <th style={{ padding: "6px 8px" }}><SortHeader label="CTR" active={sortKey === "ctr"} dir={sortDir} onClick={() => toggle("ctr", "desc")} /></th>
              <th style={{ padding: "6px 8px" }}><SortHeader label="Pipeline 4w" active={sortKey === "pipeline"} dir={sortDir} onClick={() => toggle("pipeline", "desc")} /></th>
              <th style={{ padding: "6px 8px" }}><SortHeader label="Pipe / $" active={sortKey === "ppd"} dir={sortDir} onClick={() => toggle("ppd", "desc")} /></th>
              <th style={{ padding: "6px 8px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-secondary)" }}>MQL trend</th>
              <th style={{ padding: "6px 8px" }}><SortHeader label="Signal" active={sortKey === "signal"} dir={sortDir} onClick={() => toggle("signal", "desc")} /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderTop: TOKENS.rim }}>
                <td style={{ padding: "8px", minWidth: 220 }}>
                  <div style={{ fontWeight: 600, color: "var(--fg-primary)" }}>
                    <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: STATUS_STYLE[c.status].color, marginRight: 7 }} />
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-tertiary)", marginTop: 2 }}>
                    {CHANNEL_LABEL[c.channel]} · {c.objective.replace("_", " ")} · {c.owner}
                  </div>
                </td>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{fmtMoney(c.kpis.spend4w)}</td>
                <td style={{ padding: "8px" }}>{fmtNum(c.kpis.mqls4w)}</td>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{c.kpis.cpl !== null ? `$${c.kpis.cpl.toFixed(0)}` : "—"}</td>
                <td style={{ padding: "8px" }}>{fmtPct(c.kpis.ctr)}</td>
                <td style={{ padding: "8px", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtMoney(c.kpis.pipeline4w)}</td>
                <td style={{ padding: "8px" }}>{c.kpis.pipelinePerDollar !== null ? `${c.kpis.pipelinePerDollar.toFixed(1)}x` : "—"}</td>
                <td style={{ padding: "8px" }}><MiniSparkline scores={c.weekly.mqls} dir={dirOf(c.weekly.mqls)} /></td>
                <td style={{ padding: "8px" }}><SignalPill s={c.kpis.worstSignal} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
