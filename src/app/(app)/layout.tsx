import Link from "next/link";
import { Sidebar } from "./sidebar";
import { createAdminClient } from "@/lib/supabase/server";
import {
  DEMO_BRAND_ID,
  DEMO_BRAND_NAME,
  DEMO_BRAND_WEBSITE,
} from "@/lib/demo-context";

export const dynamic = "force-dynamic";

// Demo mode: auth disabled. The shell is a persistent left sidebar + top bar.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the active brand from Supabase so the top-bar pill reflects whoever
  // DEMO_BRAND_ID currently points at, not a hardcoded label.
  const admin = await createAdminClient();
  const { data } = await admin
    .from("brands")
    .select("name, website_url")
    .eq("id", DEMO_BRAND_ID)
    .maybeSingle();
  const brandName = data?.name || DEMO_BRAND_NAME || "Brand";
  const brandWebsite = data?.website_url || DEMO_BRAND_WEBSITE || "";

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-text-dim">Brand</span>
              <span className="rounded-md border border-border bg-card px-3 py-1.5 text-text font-medium">
                {brandName}
              </span>
              {brandWebsite && (
                <span className="text-xs text-text-dim hidden md:inline">
                  {brandWebsite}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Link
                href="/onboarding"
                className="text-text-muted hover:text-text transition"
              >
                + New brand
              </Link>
              <span className="rounded-full bg-accent-bg text-accent px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
                Demo mode
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
