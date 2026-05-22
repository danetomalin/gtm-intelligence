import { PageHeader, SectionDivider } from "../_components/page-header";
import { positioningElements } from "@/lib/demo-data";

export default function PositioningPage() {
  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Positioning framework"
        title="Five-element positioning"
        subtitle="April Dunford's five-element framework. Each element is paired with the evidence that supports it, so the positioning isn't theoretical — it's traceable to research."
      />

      <section>
        <div className="space-y-3">
          {positioningElements.map((el, idx) => (
            <div
              key={el.label}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <div className="flex items-start gap-4 px-5 py-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-bg text-accent flex items-center justify-center text-sm font-mono font-semibold">
                  0{idx + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[1.5px] text-accent font-semibold mb-1">
                      {el.label}
                    </div>
                    <p className="text-base text-text leading-relaxed">
                      {el.body}
                    </p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                      Evidence
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {el.evidence}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionDivider title="Composed positioning statement" sub="Synthesized" />
        <div className="rounded-lg border border-border bg-surface px-6 py-6">
          <p className="text-base text-text leading-relaxed">
            <strong className="text-accent">For PMM and product leaders at 50–500 person B2B SaaS companies</strong> who need to ship intelligent positioning, messaging, and battlecards on a weekly cadence,{" "}
            <strong>Throughline</strong> is the AI Native Workflow Modernization System that runs a nine-agent pipeline against your brand and writes the finished work product into a tenant-scoped store.{" "}
            <strong className="text-text">Unlike</strong> point tooling that monitors competitors but stops short of synthesis, or in-house Notion-and-Slack workflows that reset every time a PMM rotates,{" "}
            <strong>Throughline</strong> ships operational PMM work product that compounds with the org instead of the individual.
          </p>
        </div>
      </section>
    </div>
  );
}
