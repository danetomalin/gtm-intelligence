import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
      <OnboardingForm userEmail={user.email ?? ""} />
    </div>
  );
}
