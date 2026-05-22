import { Fragment } from "react";
import { PageHeader, SectionDivider } from "../_components/page-header";
import { centralThesis, voicePillars, throughLine } from "@/lib/demo-data";

export default function BrandVoicePage() {
  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Brand voice & narrative"
        title="The story we tell"
        subtitle="A clear central thesis, three voice pillars, and a through-line the whole org can articulate."
      />

      <section>
        <SectionDivider title="Central thesis" sub="One paragraph" />
        <div className="rounded-lg border border-border bg-card px-6 py-6 border-l-2 border-l-accent">
          <p className="text-base text-text leading-relaxed">{centralThesis}</p>
        </div>
      </section>

      <section>
        <SectionDivider title="Voice pillars" sub="Three" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {voicePillars.map((pillar) => (
            <div
              key={pillar.name}
              className="rounded-lg border border-border bg-card px-5 py-4 space-y-2"
            >
              <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
                {pillar.name}
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionDivider title="Through-line" sub="What ties it all together" />
        <div className="flex flex-col md:flex-row md:items-stretch gap-2">
          {throughLine.map((step, idx) => (
            <Fragment key={step}>
              <div
                className="flex-1 rounded-lg border border-border bg-card px-4 py-4 flex items-center"
              >
                <div>
                  <div className="text-[10px] font-mono text-text-dim mb-1">
                    Step {idx + 1}
                  </div>
                  <div className="text-sm font-medium text-text leading-snug">
                    {step}
                  </div>
                </div>
              </div>
              {idx < throughLine.length - 1 && (
                <div className="flex items-center justify-center text-accent text-xl md:px-1">
                  &rarr;
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </section>
    </div>
  );
}
