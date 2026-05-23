import { notFound } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  SectionDivider,
  StatCard,
} from "../../_components/page-header";
import { agentTooling } from "@/lib/demo-data";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import { LIVE_AGENTS } from "@/lib/agent-config";
import { RunButton } from "./run-button";
import { SignalCard, type Signal } from "./signal-card";
import { PastSignalsArchive } from "./past-signals";
import { DossierCard, type Dossier } from "./dossier-card";
import { PastDossiersArchive } from "./past-dossiers";
import { RoadmapCard, type RoadmapItem } from "./roadmap-card";
import { PastRoadmapArchive } from "./past-roadmap";
import {
  PositioningElementCard,
  sortPositioningElements,
  dedupeLatestPerType,
  type PositioningElement,
} from "./positioning-card";

const frameworkByCode: Record<string, { name: string; body: string }> = {
  A0: {
    name: "Brand Initializer",
    body: "Seeds Product Context, Business Rules, Buyer Personas, and Brand Competitors from a brand brief. Uses GPT-5 Mini with medium reasoning and no web access on this run.",
  },
  A1: {
    name: "Competitive Intelligence Assessment",
    body: "Seven analysis categories per competitor: Strategic Move, Messaging Drift, Pricing Intelligence, Product Signals, Talent Signals, Competitive Landmines, Risk Assessment.",
  },
  A2: {
    name: "Signal Engine Cognitive Filters",
    body: "So What test → Strategic Divergence → Impact Score (1–10) → Sentiment Classification. Every signal must pass all four filters or it gets dropped.",
  },
  A3: {
    name: "UVFV Assessment Framework",
    body: "Usable / Valuable / Feasible / Viable, each scored 1–10 with pass threshold at 5+. Recommendation: BUILD (all pass) / INVESTIGATE / DEFER / KILL.",
  },
  A4: {
    name: "Feedback Synthesis",
    body: "Clusters raw feedback (NPS, support tickets, call transcripts) into themes with summary, representative quotes, frequency, urgency, and revenue impact.",
  },
  A5: {
    name: "Five-Element Positioning",
    body: "April Dunford framework: Competitive Alternatives → Distinct Capabilities → Differentiated Value → Best-Fit Accounts → Market Category.",
  },
  A6: {
    name: "Messaging Template",
    body: "Per channel and persona: Something Cool We Do | How It's Different | Show Some Proof. Each message ties back to a positioning element.",
  },
  A7: {
    name: "Battlecard Structure",
    body: "Tight elevator pitch with target market, Kellogg functional/monetary/psychological value prop, single-person Target Buyer profile, kill points, objection handling, proof.",
  },
  A8: {
    name: "Sales Narrative & Collateral",
    body: "5-act narrative arc: Inflection → Implementation Bottleneck → Differentiated Capability → Proof → Call to Action. Used for SKO, board updates, and exec-level customer convos.",
  },
};

const sampleOutputByCode: Record<
  string,
  { label: string; preview: string }[]
> = {
  A0: [
    { label: "Capabilities seeded", preview: "8 capabilities, 5 business rules, 4 personas, 6 competitors" },
    { label: "Initialization framework", preview: "GPT-5 Mini · medium reasoning · no web access" },
  ],
  A1: [
    { label: "Latest dossier", preview: "Crayon — strategic move: Q1 AI feature launch · risk: MEDIUM" },
    { label: "Coverage", preview: "6 competitors tracked, 4 with dossiers in last 7 days" },
  ],
  A3: [
    { label: "Roadmap items scored", preview: "14 items · 3 BUILD · 5 INVESTIGATE · 4 DEFER · 2 KILL" },
    { label: "Critical priority", preview: "Cross-tenant analytics rollup (overall 8.5/10)" },
  ],
  A4: [
    { label: "Themes identified", preview: "6 themes from 47 feedback signals · 2 high-urgency" },
    { label: "Top theme", preview: "Onboarding friction at brand-init step · 14 mentions" },
  ],
  A5: [
    { label: "Positioning elements", preview: "All 5 elements current · last refresh 3 days ago" },
    { label: "Composed statement", preview: "Ready on the Positioning page" },
  ],
  A6: [
    { label: "Messages drafted", preview: "12 messages across 6 channels" },
    { label: "Campaign briefs", preview: "3 active briefs: email, LinkedIn, analyst relations" },
  ],
  A7: [
    { label: "Battlecards live", preview: "4 battlecards (Crayon, Klue, Kompyte, in-house tooling)" },
    { label: "Last refresh", preview: "Crayon updated 2 days ago after pricing change signal" },
  ],
  A8: [
    { label: "Collateral pieces", preview: "5-act narrative · 1-pager · sales kickoff deck outline" },
    { label: "Last refresh", preview: "Synced with positioning v1.2 yesterday" },
  ],
};

export async function generateStaticParams() {
  return agentTooling.map((a) => ({ code: a.code.toLowerCase() }));
}

export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const agent = agentTooling.find((a) => a.code === code);
  if (!agent) notFound();

  const framework = frameworkByCode[code];
  const isLive = LIVE_AGENTS.has(code);

  // Fetch live data only for migrated agents.
  let latestRun: {
    id: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    error_message: string | null;
  } | null = null;
  let runs30dCount = 0;
  let latestSignals: Signal[] = [];
  let pastSignals: Signal[] = [];
  let latestDossiers: Dossier[] = [];
  let pastDossiers: Dossier[] = [];
  let latestRoadmap: RoadmapItem[] = [];
  let pastRoadmap: RoadmapItem[] = [];
  let latestPositioning: PositioningElement[] = [];
  let pastPositioning: PositioningElement[] = [];

  if (isLive) {
    const admin = await createAdminClient();
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [latestRunRes, runCountRes, dataRes] = await Promise.all([
      admin
        .from("run_history")
        .select("id, status, started_at, finished_at, error_message")
        .eq("brand_id", DEMO_BRAND_ID)
        .eq("agent_code", code)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("run_history")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", DEMO_BRAND_ID)
        .eq("agent_code", code)
        .gte("started_at", thirtyDaysAgo),
      code === "A2"
        ? admin
            .from("market_signals")
            .select(
              "id, signal_date, category, headline, summary, strategic_commentary, impact_score, sentiment, sentiment_reason, created_at",
            )
            .eq("brand_id", DEMO_BRAND_ID)
            .order("created_at", { ascending: false })
            .limit(200)
        : code === "A1"
          ? admin
              .from("competitive_dossiers")
              .select(
                "id, competitor_name, run_date, strategic_move, messaging_drift, pricing_intelligence, product_signals, talent_signals, competitive_landmines, risk_assessment, risk_justification, sources, created_at",
              )
              .eq("brand_id", DEMO_BRAND_ID)
              .order("created_at", { ascending: false })
              .limit(200)
          : code === "A3"
            ? admin
                .from("roadmap_items")
                .select(
                  "id, item_date, title, category, summary, evidence, usable_score, usable_rationale, valuable_score, valuable_rationale, feasible_score, feasible_rationale, viable_score, viable_rationale, overall_score, recommendation, priority, tags, sources, created_at",
                )
                .eq("brand_id", DEMO_BRAND_ID)
                .order("overall_score", { ascending: false })
                .limit(200)
            : code === "A5"
              ? admin
                  .from("positioning_elements")
                  .select(
                    "id, element_type, content, evidence, last_change_reason, created_at, updated_at",
                  )
                  .eq("brand_id", DEMO_BRAND_ID)
                  .order("created_at", { ascending: false })
                  .limit(200)
              : Promise.resolve({ data: [], error: null }),
    ]);

    latestRun = latestRunRes.data ?? null;
    runs30dCount = runCountRes.count ?? 0;

    if (code === "A2") {
      const allSignals = (dataRes.data ?? []) as Signal[];
      pastSignals = allSignals;
      latestSignals = [...allSignals]
        .sort((a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0))
        .slice(0, 6);
    } else if (code === "A1") {
      const allDossiers = (dataRes.data ?? []) as Dossier[];
      pastDossiers = allDossiers;
      // Latest = one per competitor (most recent run_date), up to all unique competitors
      const seen = new Set<string>();
      const latestPerCompetitor: Dossier[] = [];
      for (const d of allDossiers) {
        const name = d.competitor_name ?? "";
        if (name && !seen.has(name)) {
          seen.add(name);
          latestPerCompetitor.push(d);
        }
      }
      latestDossiers = latestPerCompetitor;
    } else if (code === "A3") {
      const allItems = (dataRes.data ?? []) as RoadmapItem[];
      pastRoadmap = allItems;
      latestRoadmap = [...allItems]
        .sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
        .slice(0, 8);
    } else if (code === "A5") {
      const allElements = (dataRes.data ?? []) as PositioningElement[];
      pastPositioning = allElements;
      latestPositioning = sortPositioningElements(
        dedupeLatestPerType(allElements),
      );
    }
  }

  const sampleOutput = sampleOutputByCode[code] ?? [];

  const lastRunValue = latestRun
    ? formatRelative(
        new Date(latestRun.finished_at ?? latestRun.started_at),
      )
    : "—";
  const lastRunSub = latestRun?.status === "running"
    ? "Currently running"
    : latestRun
      ? latestRun.status
      : "awaiting first run";

  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <div className="flex items-start justify-between gap-6">
        <PageHeader
          eyebrow={`Agent ${agent.code}`}
          title={agent.name}
          subtitle={agent.purpose}
        />
        {isLive ? (
          <RunButton
            agentCode={code}
            initialLastStatus={latestRun?.status ?? null}
          />
        ) : (
          <button
            type="button"
            disabled
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-md bg-accent-strong px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            title="On-demand triggering ships once this agent is migrated to Supabase"
          >
            Run now
            <span className="text-[10px] uppercase tracking-wider opacity-75">
              soon
            </span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Status" value={isLive ? "live" : agent.status} />
        <StatCard label="Cadence" value={agent.cadence} />
        <StatCard
          label="Last run"
          value={lastRunValue}
          sublabel={lastRunSub}
        />
        <StatCard
          label="Runs (30d)"
          value={isLive ? String(runs30dCount) : "—"}
          sublabel={isLive ? "completed + running" : "awaiting first run"}
        />
      </div>

      {framework && (
        <section>
          <SectionDivider title="Methodology" sub={framework.name} />
          <div className="rounded-lg border border-border bg-card border-l-2 border-l-accent px-5 py-4">
            <p className="text-sm text-text leading-relaxed">{framework.body}</p>
          </div>
        </section>
      )}

      {isLive && code === "A2" && (
        <>
          <section>
            <SectionDivider
              title="Top signals"
              sub={`Highest impact · ${latestSignals.length}`}
            />
            {latestSignals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No signals yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire the
                agent — the first run typically takes 30–60 seconds and produces
                4–8 signals.
              </div>
            ) : (
              <div className="space-y-2">
                {latestSignals.map((s) => (
                  <SignalCard key={s.id} signal={s} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionDivider
              title="Past signals"
              sub={`Archive · ${pastSignals.length} total`}
            />
            <PastSignalsArchive signals={pastSignals} />
          </section>
        </>
      )}

      {isLive && code === "A1" && (
        <>
          <section>
            <SectionDivider
              title="Current dossiers"
              sub={`One per competitor · ${latestDossiers.length}`}
            />
            {latestDossiers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No dossiers yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire the
                agent — A1 generates one dossier per competitor in
                brand_competitors. ~30–60 seconds.
              </div>
            ) : (
              <div className="space-y-2">
                {latestDossiers.map((d) => (
                  <DossierCard key={d.id} dossier={d} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionDivider
              title="Past dossiers"
              sub={`Archive · ${pastDossiers.length} total`}
            />
            <PastDossiersArchive dossiers={pastDossiers} />
          </section>
        </>
      )}

      {isLive && code === "A3" && (
        <>
          <section>
            <SectionDivider
              title="Top roadmap items"
              sub={`Highest overall · ${latestRoadmap.length}`}
            />
            {latestRoadmap.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No roadmap items yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire the
                agent — A3 produces 5–8 UVFV-scored items in ~30–60 seconds.
              </div>
            ) : (
              <div className="space-y-2">
                {latestRoadmap.map((it) => (
                  <RoadmapCard key={it.id} item={it} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionDivider
              title="Past roadmap"
              sub={`Archive · ${pastRoadmap.length} total`}
            />
            <PastRoadmapArchive items={pastRoadmap} />
          </section>
        </>
      )}

      {isLive && code === "A5" && (
        <>
          <section>
            <SectionDivider
              title="Current positioning"
              sub={`Five-element framework · ${latestPositioning.length}/5`}
            />
            {latestPositioning.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No positioning yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire the
                agent — A5 produces all 5 Dunford elements in ~30–45 seconds.
              </div>
            ) : (
              <div className="space-y-3">
                {latestPositioning.map((el, idx) => (
                  <PositioningElementCard
                    key={el.id}
                    element={el}
                    index={idx + 1}
                  />
                ))}
              </div>
            )}
          </section>

          {pastPositioning.length > latestPositioning.length && (
            <section>
              <SectionDivider
                title="Past positioning"
                sub={`Archive · ${pastPositioning.length} total (includes prior versions)`}
              />
              <p className="text-xs text-text-dim mb-3">
                Showing every positioning element ever written for this brand.
                The Current section above is the latest version per element
                type.
              </p>
              <div className="space-y-2">
                {pastPositioning.map((el) => (
                  <PositioningElementCard key={el.id} element={el} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!isLive && sampleOutput.length > 0 && (
        <section>
          <SectionDivider
            title="Latest output"
            sub="Sample — pre-backfill"
          />
          <div className="space-y-2">
            {sampleOutput.map((row) => (
              <div
                key={row.label}
                className="flex items-start gap-4 rounded-md border border-border bg-card px-4 py-3"
              >
                <div className="text-[11px] uppercase tracking-wider text-text-dim w-44 flex-shrink-0 pt-0.5">
                  {row.label}
                </div>
                <div className="text-sm text-text flex-1">{row.preview}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionDivider title="What this agent feeds" />
        <div className="text-sm text-text-muted leading-relaxed">
          Output lands in the tenant-scoped Supabase store keyed by{" "}
          <code className="text-accent">organization_id</code> +{" "}
          <code className="text-accent">brand_id</code>. Downstream agents read
          from this store on their next run, and the frontend renders it on the
          relevant Output page (
          <Link href="/positioning" className="text-accent underline">
            Positioning
          </Link>
          ,{" "}
          <Link href="/market-context" className="text-accent underline">
            Market Context
          </Link>
          , etc.).
        </div>
      </section>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}
