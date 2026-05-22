import Link from "next/link";

// Demo mode: bypasses Supabase auth + reads and renders a sample brand intel
// view. Restore the real fetch path from git history when auth comes back.
const DEMO_BRAND = {
  id: "demo-brand-id",
  name: "Throughline",
  website_url: "https://throughline.io",
};

export default function DashboardPage() {
  const brand = DEMO_BRAND;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
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
          href="/onboarding"
          className="inline-flex items-center justify-center rounded-md bg-accent-strong px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent"
        >
          Run a new brand
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Capabilities" value="—" />
        <Stat label="Competitors" value="—" />
        <Stat label="Signals" value="—" />
        <Stat label="Roadmap items" value="—" />
      </div>

      <Section title="Positioning inputs" sub="Five-element framework">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PositioningCard
            label="Competitive alternatives"
            body="Spreadsheets, scattered slack threads, the analyst report PDF a teammate emailed last quarter."
          />
          <PositioningCard
            label="Distinct capabilities"
            body="Workflow-native intelligence that runs the same way every Monday and writes back to a single tenant-scoped store."
          />
          <PositioningCard
            label="Differentiated value"
            body="Replace 4–6 hours per week of competitive intel grunt work with a dashboard that updates while the team sleeps."
          />
          <PositioningCard
            label="Best-fit accounts"
            body="PMM and product leaders at 50–500 person B2B SaaS companies in competitive categories with quarterly positioning cycles."
          />
        </div>
      </Section>

      <Section title="What this brand builds" sub="Top capabilities">
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
          Capabilities appear here once the chain finishes its first run.
          <div className="mt-1 text-xs text-text-dim">
            Each capability includes a category tag, description, and gap analysis.
          </div>
        </div>
      </Section>

      <Section title="Who they're up against" sub="Competitive landscape">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-[11px] uppercase tracking-wider text-text-dim">
              <tr>
                <th className="text-left px-4 py-3">Competitor</th>
                <th className="text-left px-4 py-3">Risk</th>
                <th className="text-left px-4 py-3">Latest messaging</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3">
                  <div className="font-medium">Sample Competitor</div>
                  <div className="text-xs text-text-dim">samplecompetitor.com</div>
                </td>
                <td className="px-4 py-3">
                  <Pill tone="warn">MEDIUM</Pill>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  Populated by A1 once the chain runs.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <p className="text-xs text-text-dim text-center pt-4">
        Demo mode — bypassing auth. Real auth and live data come back once we wire
        the n8n A0–A9 chain to write into Supabase.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-text-dim mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between pb-3 mb-4 border-b border-border">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="text-xs uppercase tracking-wider text-text-muted">{sub}</div>
      </div>
      {children}
    </section>
  );
}

function PositioningCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 border-l-2 border-l-accent">
      <div className="text-[11px] uppercase tracking-wider text-accent mb-2">
        {label}
      </div>
      <p className="text-sm text-text leading-relaxed">{body}</p>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "accent" | "win" | "warn" | "danger" | "muted";
}) {
  const toneMap: Record<typeof tone, string> = {
    accent: "bg-accent-bg text-accent",
    win: "bg-win-bg text-win",
    warn: "bg-warn-bg text-warn",
    danger: "bg-danger-bg text-danger",
    muted: "bg-white/5 text-text-muted",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
}
