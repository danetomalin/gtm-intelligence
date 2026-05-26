import {
  PageHeader,
  SectionDivider,
  StatCard,
} from "../_components/page-header";
import { agentTooling } from "@/lib/demo-data";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID, DEMO_BRAND_NAME } from "@/lib/demo-context";
import { ActivePipeline } from "./active-pipeline";
import { DailyBrief, type BriefSnapshot } from "./daily-brief";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Pull the most recent brief server-side so the panel renders with content
  // on first load (when one exists). If none exists yet, DailyBrief shows
  // the empty-state with a 'Brief me' button.
  const admin = await createAdminClient();
  const [briefRowRes, brandRes] = await Promise.all([
    admin
      .from("daily_briefs")
      .select("id, generated_at, headline, focus_items")
      .eq("brand_id", DEMO_BRAND_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("brands")
      .select("name")
      .eq("id", DEMO_BRAND_ID)
      .maybeSingle(),
  ]);
  const initialBrief = (briefRowRes.data ?? null) as BriefSnapshot | null;
  const activeBrandName =
    (brandRes.data as { name: string | null } | null)?.name ||
    DEMO_BRAND_NAME ||
    "active brand";

  // Stats reflect the live state of the platform, not a stale hardcoded count.
  const workflowCount = agentTooling.length;
  const overviewStats = [
    {
      label: "Time saved per week",
      value: "12 hrs",
      sublabel: "per PMM seat",
    },
    {
      label: "Active brand",
      value: activeBrandName,
      sublabel: "demo tenant",
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
        title={activeBrandName}
        subtitle={`The full multi-workflow intelligence chain running against ${activeBrandName}. Research → Synthesis → Delivery → Distribution, with every output landing in a tenant-scoped store you can read like a dashboard.`}
      />

      <DailyBrief initialBrief={initialBrief} />

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
