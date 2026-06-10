import Link from "next/link";
import { PageHeader } from "../_components/page-header";
import MarketingHealthDashboard from "@/features/marketing-health/components/MarketingHealthDashboard";
import { agentTooling } from "@/lib/demo-data";
import { filterWorkflowsForLens } from "@/lib/persona";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID, DEMO_BRAND_NAME } from "@/lib/demo-context";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketing Health · Throughline",
};

// Marketing Health — the Marketing workspace area (Phase B.1). KPI and
// trend-signal dashboard over the campaign portfolio: campaigns scored
// individually, channels as computed roll-ups, no composite health
// score by design. Mock data flavored to the active demo brand; swaps
// for Supabase reads in a later phase.
export default async function MarketingHealthPage() {
  const admin = await createAdminClient();
  const { data: brandRow } = await admin
    .from("brands")
    .select("name")
    .eq("id", DEMO_BRAND_ID)
    .maybeSingle();
  const brandName = (brandRow as { name: string | null } | null)?.name || DEMO_BRAND_NAME;
  const marketingWorkflows = filterWorkflowsForLens(agentTooling, "marketing");

  return (
    <div className="px-8 py-10 max-w-7xl">
      <PageHeader
        eyebrow="Marketing"
        title="Marketing Health"
        subtitle={`Campaign portfolio KPIs, channel roll-ups, funnel conversion, and trend signals for ${brandName} — 14 campaigns across 8 channels, 4-week trailing window.`}
      />
      <MarketingHealthDashboard brandName={brandName} />

      {/* Marketing workflows — merged from the old Marketing workspace landing */}
      {marketingWorkflows.length > 0 && (
        <div className="mt-10">
          <div className="flex items-baseline justify-between pb-3 mb-5 border-b border-border">
            <h2 className="text-lg font-semibold tracking-tight">Marketing Workflows</h2>
            <div className="text-xs uppercase tracking-wider text-text-muted">
              {marketingWorkflows.length} workflows · generate from this data
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {marketingWorkflows.map((w) => (
              <Link
                key={w.code}
                href={`/agents/${w.code.toLowerCase()}`}
                className="rounded-lg border border-border bg-card hover:bg-card-hover transition px-4 py-3 block"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{w.name}</span>
                  <span className="text-[11px] uppercase tracking-wider text-text-dim">{w.code}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
