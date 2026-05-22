import {
  PageHeader,
  SectionDivider,
  StatCard,
} from "../_components/page-header";
import {
  marketContextStats,
  marketContextNarrative,
  competitiveLandscape,
} from "@/lib/demo-data";

export default function MarketContextPage() {
  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Market context"
        title="Where the category is going"
        subtitle={marketContextNarrative}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {marketContextStats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            sublabel={stat.source}
          />
        ))}
      </div>

      <section>
        <SectionDivider
          title="Competitive landscape"
          sub={`${competitiveLandscape.length} tracked`}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {competitiveLandscape.map((c) => (
            <div
              key={c.name}
              className="rounded-lg border border-border bg-card px-5 py-4 space-y-3"
            >
              <div>
                <div className="text-lg font-semibold">{c.name}</div>
                <div className="text-xs uppercase tracking-wider text-text-dim mt-0.5">
                  {c.category}
                </div>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                {c.profile}
              </p>
              <div className="border-l-2 border-accent pl-3">
                <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
                  Throughline edge
                </div>
                <p className="text-sm text-text leading-relaxed">{c.edge}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
