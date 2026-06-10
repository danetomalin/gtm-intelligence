import { PageHeader } from "../_components/page-header";
import HealthDashboard from "@/features/cs-health/components/HealthDashboard";
import { loadPortfolioData } from "@/features/cs-health/lib/loadPortfolio";
import Link from "next/link";
import { agentTooling } from "@/lib/demo-data";
import { filterWorkflowsForLens } from "@/lib/persona";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customer Health · Throughline",
};

// Customer Health — the CS workspace's health-model area. Ported from the
// standalone cs-health-app (VAR model v2.0). Demo tenant: Halcyon, a
// workforce management platform whose 30-account portfolio is the mock
// data set. Phase B replaces generateData() with Supabase reads.
export default async function CustomerHealthPage() {
  const data = await loadPortfolioData();
  const csWorkflows = filterWorkflowsForLens(agentTooling, "customer_success");
  return (
    <div className="px-8 py-10 max-w-7xl">
      <PageHeader
        eyebrow="Customer Success"
        title="Customer Health"
        subtitle="VAR health model, confidence-weighted renewal forecasting, and expansion readiness across the Halcyon customer portfolio — workforce management platform, 30 named accounts plus an SMB cohort."
      />
      <HealthDashboard data={data} />

      {/* CS workflows — merged from the old CS workspace landing */}
      {csWorkflows.length > 0 && (
        <div className="mt-10">
          <div className="flex items-baseline justify-between pb-3 mb-5 border-b border-border">
            <h2 className="text-lg font-semibold tracking-tight">CS Workflows</h2>
            <div className="text-xs uppercase tracking-wider text-text-muted">
              Generate from this portfolio
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {csWorkflows.map((w) => (
              <Link
                key={w.code}
                href={`/agents/${w.code.toLowerCase()}`}
                className="rounded-lg border border-border bg-card hover:bg-card-hover transition p-4 block"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{w.name}</span>
                  <span className="text-[11px] uppercase tracking-wider text-text-dim">{w.code}</span>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">{w.purpose}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
