import {
  PageHeader,
  SectionDivider,
} from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID, DEMO_BRAND_NAME } from "@/lib/demo-context";

export const dynamic = "force-dynamic";

type Brand = {
  id: string;
  name: string | null;
  additional_context: string | null;
};

type Competitor = {
  id: string;
  name: string | null;
  domain: string | null;
  risk_level: string | null;
};

type Dossier = {
  id: string;
  competitor_name: string | null;
  strategic_move: string | null;
  pricing_intelligence: string | null;
  competitive_landmines: string | null;
  risk_assessment: string | null;
  risk_justification: string | null;
  created_at: string | null;
};

const RISK_TONE: Record<string, string> = {
  HIGH: "bg-danger-bg text-danger",
  MEDIUM: "bg-warn-bg text-warn",
  LOW: "bg-card text-text-dim",
};

export default async function MarketContextPage() {
  const admin = await createAdminClient();

  const [brandRes, competitorsRes, dossiersRes] = await Promise.all([
    admin
      .from("brands")
      .select("id, name, additional_context")
      .eq("id", DEMO_BRAND_ID)
      .maybeSingle(),
    admin
      .from("brand_competitors")
      .select("id, name, domain, risk_level")
      .eq("brand_id", DEMO_BRAND_ID)
      .order("name", { ascending: true }),
    admin
      .from("competitive_dossiers")
      .select(
        "id, competitor_name, strategic_move, pricing_intelligence, competitive_landmines, risk_assessment, risk_justification, created_at",
      )
      .eq("brand_id", DEMO_BRAND_ID)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const brand = (brandRes.data as Brand | null) ?? null;
  const brandName = brand?.name || DEMO_BRAND_NAME || "this brand";
  const competitors = (competitorsRes.data as Competitor[]) ?? [];
  const allDossiers = (dossiersRes.data as Dossier[]) ?? [];

  // Pick the latest dossier per competitor.
  const latestByCompetitor = new Map<string, Dossier>();
  for (const d of allDossiers) {
    const key = d.competitor_name ?? "";
    if (key && !latestByCompetitor.has(key)) latestByCompetitor.set(key, d);
  }

  // Build the landscape rows: prefer dossier strategic_move as the profile,
  // fall back to a generic line if no dossier exists yet.
  const landscape = competitors.map((c) => {
    const dossier = c.name ? latestByCompetitor.get(c.name) : undefined;
    const profile =
      dossier?.strategic_move ||
      `Direct competitor in ${brandName}'s category. Run R-CI for a fresh dossier.`;
    const landmine = dossier?.competitive_landmines ?? null;
    const risk = c.risk_level ?? dossier?.risk_assessment ?? null;
    return {
      id: c.id,
      name: c.name ?? "Unknown",
      domain: c.domain ?? null,
      profile,
      landmine,
      risk: risk ? risk.toUpperCase() : null,
    };
  });

  const subtitle =
    brand?.additional_context ||
    `Live competitive landscape for ${brandName}. Pulled from R-CI dossiers and the brand's competitor list.`;

  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Market context"
        title={`${brandName} · competitive landscape`}
        subtitle={subtitle}
      />

      <section>
        <SectionDivider
          title="Tracked competitors"
          sub={`${landscape.length} tracked`}
        />
        {landscape.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
            No competitors configured. Seed brand_competitors and run R-CI to
            generate dossiers.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {landscape.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border bg-card px-5 py-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{c.name}</div>
                    {c.domain && (
                      <div className="text-xs text-text-dim mt-0.5">
                        {c.domain}
                      </div>
                    )}
                  </div>
                  {c.risk && (
                    <span
                      className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${RISK_TONE[c.risk] ?? "bg-card text-text-dim"}`}
                    >
                      {c.risk} risk
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-muted leading-relaxed">
                  {c.profile}
                </p>
                {c.landmine && (
                  <div className="border-l-2 border-accent pl-3">
                    <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
                      Competitive landmine
                    </div>
                    <p className="text-sm text-text leading-relaxed">
                      {c.landmine}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
