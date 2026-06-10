import { PageHeader, SectionDivider } from "../_components/page-header";
import { agentTooling } from "@/lib/demo-data";
import { CredentialsSection } from "./credentials-section";
import { InstructionsSection } from "./instructions-section";

export const metadata = {
  title: "Settings · Throughline",
};

// Settings — the ONE place for API credentials (BYOK, browser-only)
// and the per-workflow instruction warehouse (workflow_configs).
// Decision 2026-06-09: centralized here instead of 28 per-workflow
// credential panels; each workflow page keeps a slim Configure for
// quick instruction edits against the same rows.
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
        subtitle="API credentials for every workflow and copilot, plus each workflow's operating instructions."
      />

      <section>
        <SectionDivider
          title="API credentials"
          sub="Bring your own key · stored in this browser only"
        />
        <CredentialsSection />
      </section>

      <section>
        <SectionDivider
          title="Workflow instructions"
          sub="Operating briefs · stored per workflow"
        />
        <InstructionsSection workflows={workflows} />
      </section>
    </div>
  );
}
