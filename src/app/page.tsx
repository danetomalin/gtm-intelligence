import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-24 text-center">
      <div className="max-w-2xl space-y-8">
        <h1 className="text-5xl font-bold tracking-tight leading-[1.1] text-text sm:text-6xl">
          Welcome to <span className="text-accent">Throughline</span>
        </h1>
        <p className="text-xl text-text-muted leading-relaxed max-w-xl mx-auto">
          GTM work that compounds with the org, not the individual.
        </p>
        <p className="text-base text-text-dim leading-relaxed max-w-xl mx-auto pt-2">
          Throughline rebuilds the work product marketing, sales, customer
          success, and product teams ship as AI-native workflows that run
          against every brand you care about.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-accent-strong px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent"
          >
            Open dashboard
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-3 text-sm font-semibold text-text transition hover:bg-card-hover"
          >
            Add a brand
          </Link>
        </div>
        <p className="text-xs text-text-dim pt-4">
          Demo mode. Auth disabled while we build out the UI.
        </p>
      </div>
    </main>
  );
}
