import { OnboardingForm } from "./onboarding-form";

// Demo mode: skips the auth check. Real session reads will come back when
// auth is restored.
export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="mb-8">
        <div className="text-[11px] font-medium uppercase tracking-[1.5px] text-accent mb-2">
          One-time setup
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Tell us your brand</h1>
        <p className="text-text-muted mt-2">
          Throughline initializes its intelligence chain on the brand you give
          it. The first run takes about 12–15 minutes and produces a complete
          competitive and positioning snapshot.
        </p>
      </div>
      <OnboardingForm userEmail="demo@throughline.io" />
    </div>
  );
}
