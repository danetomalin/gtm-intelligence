import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Look up the user's organization and primary brand.
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    redirect("/onboarding");
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, website_url")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!brand) {
    redirect("/onboarding");
  }

  const { data: report } = await supabase
    .from("executive_reports")
    .select("id, html_report, report_date, executive_summary, data_freshness")
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[1.5px] text-accent mb-1">
            Brand intelligence
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
          {brand.website_url && (
            <p className="text-sm text-text-muted mt-1">{brand.website_url}</p>
          )}
        </div>
        <Link
          href={`/brands/${brand.id}/run`}
          className="inline-flex items-center justify-center rounded-md bg-accent-strong px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent"
        >
          Run again
        </Link>
      </div>

      {report ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div
            className="prose prose-invert max-w-none"
            // The report HTML comes from A9 and is sanitized at write-time.
            dangerouslySetInnerHTML={{ __html: report.html_report }}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-16 text-center">
          <p className="text-text-muted mb-2">
            No report yet — the intelligence chain is still running.
          </p>
          <p className="text-xs text-text-dim">
            First runs typically take 12–15 minutes. This page will populate
            when A9 publishes the executive report.
          </p>
        </div>
      )}
    </div>
  );
}
