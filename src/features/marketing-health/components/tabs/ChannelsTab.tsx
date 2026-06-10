"use client";
// Channels — roll-up cards: efficiency, share, best/worst campaign.

import { SectionLabel, MiniSparkline, TOKENS } from "@/features/cs-health/components/ui";
import type { ChannelRollup } from "@/features/marketing-health/lib/types";
import { CHANNEL_LABEL, SignalPill, dirOf, fmtMoney, fmtNum, fmtPct } from "../ui";

export default function ChannelsTab({ rollups }: { rollups: ChannelRollup[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 14 }}>
      {rollups.map((r) => (
        <div key={r.channel} style={{ background: TOKENS.surface, border: TOKENS.rim, borderRadius: "1rem", padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel color="var(--fg-primary)" style={{ marginBottom: 0 }}>
              {CHANNEL_LABEL[r.channel]}
              <span style={{ color: "var(--fg-tertiary)", fontWeight: 400 }}> · {r.activeCount} active</span>
            </SectionLabel>
            <SignalPill s={r.signal} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>Spend 4w</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>{fmtMoney(r.spend4w)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>Pipeline 4w</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>{fmtMoney(r.pipeline4w)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-secondary)" }}>Pipe / $</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>
                {r.pipelinePerDollar !== null ? `${r.pipelinePerDollar.toFixed(1)}x` : "—"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {[
              { label: "Spend share", value: r.spendShare, color: "hsl(28 90% 52%)" },
              { label: "Pipeline share", value: r.pipelineShare, color: "hsl(217 71% 45%)" },
            ].map((bar) => (
              <div key={bar.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "var(--fg-secondary)", width: 80 }}>{bar.label}</span>
                <div style={{ flex: 1, height: 5, background: TOKENS.track, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(bar.value * 100)}%`, height: "100%", background: bar.color, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, color: "var(--fg-secondary)", width: 34, textAlign: "right" }}>{fmtPct(bar.value, 0)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: TOKENS.rim, paddingTop: 10 }}>
            <div style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
              {fmtNum(r.mqls4w)} MQLs · CPL {r.cpl !== null ? `$${r.cpl.toFixed(0)}` : "—"}
            </div>
            <MiniSparkline scores={r.mqlWeekly} dir={dirOf(r.mqlWeekly)} />
          </div>

          {(r.topCampaign || r.bottomCampaign) && (
            <div style={{ fontSize: 11, color: "var(--fg-tertiary)", marginTop: 8, lineHeight: 1.5 }}>
              {r.topCampaign && <div>▲ Best: <span style={{ color: "var(--fg-secondary)" }}>{r.topCampaign}</span></div>}
              {r.bottomCampaign && <div>▽ Trailing: <span style={{ color: "var(--fg-secondary)" }}>{r.bottomCampaign}</span></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
