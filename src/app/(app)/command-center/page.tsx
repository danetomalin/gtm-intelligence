import { PageHeader } from "../_components/page-header";
import { agentTooling } from "@/lib/demo-data";
import { DEMO_BRAND_NAME } from "@/lib/demo-context";
import { CommandCenterClient } from "./command-center-client";
import { RunErrorsPanel } from "./run-errors-panel";

export const dynamic = "force-dynamic";

export default function CommandCenterPage() {
  const names: Record<string, string> = {};
  for (const a of agentTooling) names[a.code] = a.name;

  return (
    <div className="px-8 py-10 max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Command Center"
        subtitle={`Run the full workflow system on ${DEMO_BRAND_NAME}, stage by stage. Each stage runs sequentially with a pause between workflows; advance manually once everything is green. The Customer Success track runs independently off the Halcyon portfolio.`}
      />
      <CommandCenterClient names={names} />

      <section className="space-y-3">
        <header>
          <h2 className="text-base font-semibold text-text">Troubleshooting</h2>
          <p className="text-xs text-text-muted">
            Recent failed and canceled runs across all brands — classified
            cause, suggested fix, full provider message, one-click retry.
          </p>
        </header>
        <RunErrorsPanel />
      </section>
    </div>
  );
}
