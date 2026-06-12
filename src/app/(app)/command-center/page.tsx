import { PageHeader } from "../_components/page-header";
import { agentTooling } from "@/lib/demo-data";
import { DEMO_BRAND_NAME } from "@/lib/demo-context";
import { CommandCenterClient } from "./command-center-client";
import { CostLedger } from "./cost-ledger";
import { ApprovalsPanel } from "./approvals-panel";

export const dynamic = "force-dynamic";

export default function CommandCenterPage() {
  const names: Record<string, string> = {};
  const purposes: Record<string, string> = {};
  for (const a of agentTooling) {
    names[a.code] = a.name;
    purposes[a.code] = a.purpose;
  }

  return (
    <div className="px-8 py-10 max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Command Center"
        subtitle={`Run the full workflow system on ${DEMO_BRAND_NAME}, stage by stage. Each stage runs sequentially with a pause between workflows; advance manually once everything is green. The Customer Success track runs independently off the customer portfolio.`}
      />
      <CommandCenterClient names={names} purposes={purposes} />

      <ApprovalsPanel />

      <CostLedger names={names} />
    </div>
  );
}
