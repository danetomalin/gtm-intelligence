import { PageHeader } from "../../_components/page-header";
import { BrandCodeQuestionnaire } from "./questionnaire";

export const dynamic = "force-dynamic";

export default function BrandCodeOnboardingPage() {
  return (
    <div className="px-8 py-10 max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Onboarding · Brand Code"
        title="Tell us how your brand thinks"
        subtitle="Twelve short questions feed R-BR (Brand Repository), which extracts voice rules, proof points, product capabilities, and buyer personas. Every downstream agent reads from these tables on their next run."
      />
      <BrandCodeQuestionnaire />
    </div>
  );
}
