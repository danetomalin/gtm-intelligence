import {
  PageHeader,
  SectionDivider,
  StatCard,
} from "../_components/page-header";
import { overviewBlurb, demoBrand, agentTooling } from "@/lib/demo-data";
import { ActivePipeline } from "./active-pipeline";

export default function DashboardPage() {
  // Stats reflect the live state of the platform, not a stale hardcoded count.
  const workflowCount = agentTooling.length;
  const overviewStats = [
    {
      label: "Time saved per week",
      value: "12 hrs",
      sublabel: "per PMM seat",
    },
    {
      label: "Brands monitored",
      value: "1",
      sublabel: "Throughline pilot",
    },
    {
      label: "Workflows shipping",
      value: `${workflowCount}`,
      sublabel: "across R / S / D / X layers",
    },
    {
      label: "Tenant isolation",
      value: "RLS",
      sublabel: "Postgres-enforced",
    },
  ];

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

      <ActivePipeline workflows={agentTooling} />

      <section>
        <SectionDivider
          title="What ships when the chain runs"
          sub="Output by section"
        />
        <div className="space-y-2 text-sm">
          {[
            {
              name: "Market Context",
              desc: "Category dynamics + competitive landscape cards",
              href: "/market-context",
            },
            {
              name: "Brand Voice",
              desc: "Central thesis, voice pillars, narrative through-line",
              href: "/brand-voice",
            },
            {
              name: "Positioning Framework",
              desc: "Five-element positioning framework",
              href: "/positioning",
            },
            {
              name: "Workflows",
              desc: `Pipeline status across all ${workflowCount} workflows`,
              href: "/agent-tooling",
            },
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
