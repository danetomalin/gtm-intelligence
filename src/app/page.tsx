import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-24 text-center">
      <div className="max-w-2xl space-y-8">
        <div className="inline-block rounded-full border border-border bg-card/50 px-3 py-1 text-[11px] font-medium uppercase tracking-[1.5px] text-accent">
          AI Native Workflow Modernization System
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-[1.1] text-text sm:text-6xl">
          Your GTM team,{" "}
          <span className="text-accent">running on AI workflows.</span>
        </h1>
        <p className="text-lg text-text-muted leading-relaxed max-w-xl mx-auto">
          Throughline rebuilds the work product marketing, customer success,
          sales, and product teams ship — as AI-native workflows that produce
          intelligence on every brand you care about.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-accent-strong px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent"
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-3 text-sm font-semibold text-text transition hover:bg-card-hover"
          >
            Get started
          </Link>
        </div>
      </div>
    </main>
  );
}
