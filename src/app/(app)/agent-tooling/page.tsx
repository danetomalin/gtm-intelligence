import { PageHeader, SectionDivider } from "../_components/page-header";
import { agentTooling } from "@/lib/demo-data";

export default function AgentToolingPage() {
  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Automation & agent tooling"
        title="The nine-agent pipeline"
        subtitle="A founding PMM doesn't have the luxury of a large team. Nine buildable agents close the gap — brand initialization, competitive intel, market signals, roadmap steering, customer feedback, positioning, messaging, battlecards, and sales narrative."
      />

      <section>
        <SectionDivider title="Pipeline" sub={`${agentTooling.length} agents`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agentTooling.map((agent) => (
            <div
              key={agent.code}
              className="rounded-lg border border-border bg-card px-5 py-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-accent bg-accent-bg rounded-md px-2 py-0.5">
                    {agent.code}
                  </span>
                  <span className="text-base font-semibold">{agent.name}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-win bg-win-bg rounded-full px-2 py-0.5">
                  {agent.status}
                </span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed mb-3">
                {agent.purpose}
              </p>
              <div className="text-[11px] uppercase tracking-wider text-text-dim">
                Cadence: <span className="text-text-muted">{agent.cadence}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
