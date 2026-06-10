import { PageHeader } from "../_components/page-header";
import HealthDashboard from "@/features/cs-health/components/HealthDashboard";

export const metadata = {
  title: "Customer Health · Throughline",
};

// Customer Health — the CS workspace's health-model area. Ported from the
// standalone cs-health-app (VAR model v2.0). Demo tenant: Halcyon, a
// workforce management platform whose 30-account portfolio is the mock
// data set. Phase B replaces generateData() with Supabase reads.
export default function CustomerHealthPage() {
  return (
    <div className="px-8 py-10 max-w-7xl">
      <PageHeader
        eyebrow="Customer Success"
        title="Customer Health"
        subtitle="VAR health model, confidence-weighted renewal forecasting, and expansion readiness across the Halcyon customer portfolio — workforce management platform, 30 named accounts plus an SMB cohort."
      />
      <HealthDashboard />
    </div>
  );
}
