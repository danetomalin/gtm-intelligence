import {
  PageHeader,
  SectionDivider,
  StatCard,
} from "../_components/page-header";
import { overviewStats, overviewBlurb, demoBrand, agentTooling } from "@/lib/demo-data";

export default function DashboardPage() {
  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Brand intelligence"
        title={demoBrand.name}
        subtitle={overviewBlurb}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {overviewStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <section>
        <SectionDivider title="Active pipeline" sub="A0 → A9" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {agentTooling.slice(0, 9).map((agent) => (
            <div
              key={agent.code}
              className="rounded-lg border border-border bg-card px-5 py-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-accent">
                  {agent.code}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-win bg-win-bg rounded-full px-2 py-0.5">
                  {agent.status}
                </span>
              </div>
              <div className="text-sm font-semibold mb-1">{agent.name}</div>
              <div className="text-xs text-text-muted leading-relaxed line-clamp-3">
                {agent.purpose}
              </div>
              <div className="text-[11px] text-text-dim mt-2">
                {agent.cadence}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionDivider title="What ships when the chain runs" sub="Output by section" />
        <div className="space-y-2 text-sm">
          {[
            { name: "Market Context", desc: "Category dynamics + competitive landscape cards", href: "/market-context" },
            { name: "Brand Voice", desc: "Central thesis, voice pillars, narrative through-line", href: "/brand-voice" },
            { name: "Positioning Framework", desc: "April Dunford 5-element positioning", href: "/positioning" },
            { name: "Agent Tooling", desc: "Pipeline status across all nine agents", href: "/agent-tooling" },
          ].map((row) => (
            <a
              key={row.href}
              href={row.href}
              className="flex items-center justify-between rounded-md border border-border bg-card hover:bg-card-hover px-4 py-3 transition"
            >
              <div>
                <div className="text-text font-medium">{row.name}</div>
                <div className="text-xs text-text-dim">{row.desc}</div>
              </div>
              <div className="text-accent text-sm">View →</div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
