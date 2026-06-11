import { PageHeader } from "../_components/page-header";
import { agentTooling } from "@/lib/demo-data";
import { CollapsibleSection } from "./collapsible-section";
import { CredentialsSection } from "./credentials-section";
import { InstructionsSection } from "./instructions-section";
import { DataSourcesSection } from "./data-sources-section";

export const metadata = {
  title: "Settings · Throughline",
};

// Settings — the ONE place for API credentials (BYOK, browser-only),
// the per-workflow instruction warehouse (workflow_configs), and data
// source connections. All sections are collapsible (Dane, 2026-06-10).
// Troubleshooting moved to the Command Center (Dane, 2026-06-11).
export default function SettingsPage() {
  const workflows = agentTooling.map((w) => ({
    code: w.code,
    name: w.name,
    purpose: w.purpose,
  }));

  return (
    <div className="px-8 py-10 max-w-5xl space-y-10">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        subtitle="API credentials, workflow operating instructions, and data source connections. Run troubleshooting lives in the Command Center."
      />

      <CollapsibleSection
        title="API credentials"
        sub="Bring your own key · stored in this browser only"
        defaultOpen
      >
        <CredentialsSection />
      </CollapsibleSection>

      <CollapsibleSection
        title="Workflow instructions"
        sub="Operating briefs · stored per workflow"
      >
        <InstructionsSection workflows={workflows} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Data sources"
        sub="Connectors · simulated until OAuth lands"
      >
        <DataSourcesSection />
      </CollapsibleSection>

    </div>
  );
}
