import Link from "next/link";
import { Sidebar } from "./sidebar";
import { demoBrand } from "@/lib/demo-data";

// Demo mode: auth disabled. The shell is a persistent left sidebar + top bar.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-text-dim">Brand</span>
              <span className="rounded-md border border-border bg-card px-3 py-1.5 text-text font-medium">
                {demoBrand.name}
              </span>
              <span className="text-xs text-text-dim hidden md:inline">
                {demoBrand.website_url}
              </span>
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
