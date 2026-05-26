import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, SectionDivider } from "../../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import {
  ROLE_LABEL,
  ROLE_TAGLINE,
  WORKSPACE_ROLES,
  type Role,
} from "@/lib/persona";
import { SignalCard, type Signal } from "../../agents/[code]/signal-card";
import { DossierCard, type Dossier } from "../../agents/[code]/dossier-card";
import {
  RoadmapCard,
  type RoadmapItem,
} from "../../agents/[code]/roadmap-card";
import {
  PositioningElementCard,
  sortPositioningElements,
  dedupeLatestPerType,
  type PositioningElement,
} from "../../agents/[code]/positioning-card";
import {
  BattlecardCard,
  type Battlecard,
} from "../../agents/[code]/battlecard-card";
import {
  ThemeCard,
  type FeedbackTheme,
} from "../../agents/[code]/theme-card";
import {
  ContentCard,
  type ContentOutput,
} from "../../agents/[code]/content-card";
import {
  CollateralCard,
  type SalesCollateral,
} from "../../agents/[code]/collateral-card";
import {
  PricingIntelCard,
  type PricingIntel,
} from "../../agents/[code]/pricing-intel-card";
import {
  WinLossCard,
  type WinLoss,
} from "../../agents/[code]/win-loss-card";
import {
  EvidenceCard,
  type CustomerEvidence,
} from "../../agents/[code]/evidence-card";
import {
  ProductFeedbackCard,
  type ProductFeedback,
} from "../../agents/[code]/product-feedback-card";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return WORKSPACE_ROLES.map((role) => ({ role }));
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: rawRole } = await params;
  const role = rawRole.toLowerCase() as Role;
  if (!WORKSPACE_ROLES.includes(role)) notFound();

  const admin = await createAdminClient();

  // Each persona pulls the slice of data it cares about most. Queries are
  // tuned to the persona, not to "show everything." Half-populated milestone:
  // Phase 3 agents (R-PP, R-WL, R-EV, R-PF, S-AR, S-LP, S-CP) and Phase 4+
  // agents (R-BR) appear as "Coming soon" placeholders.

  switch (role) {
    case "marketing":
      return <MarketingWorkspace admin={admin} />;
    case "sales":
      return <SalesWorkspace admin={admin} />;
    case "product":
      return <ProductWorkspace admin={admin} />;
    case "customer_success":
      return <CustomerSuccessWorkspace admin={admin} />;
    default:
      notFound();
  }
}

// ============================================================================
// Marketing workspace — positioning, messaging, market signals above fold.
// ============================================================================

async function MarketingWorkspace({
  admin,
}: {
  admin: Awaited<ReturnType<typeof createAdminClient>>;
}) {
  const [signalsRes, positioningRes, messagingRes] = await Promise.all([
    admin
      .from("market_signals")
      .select(
        "id, signal_date, category, headline, summary, strategic_commentary, impact_score, sentiment, sentiment_reason, created_at",
      )
      .eq("brand_id", DEMO_BRAND_ID)
      .order("impact_score", { ascending: false })
      .limit(6),
    admin
      .from("positioning_elements")
      .select(
        "id, element_type, content, evidence, last_change_reason, created_at, updated_at",
      )
      .eq("brand_id", DEMO_BRAND_ID)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("content_outputs")
      .select(
        "id, channel, topic, target_persona, content, messaging_refs, proof_pending, approval_status, created_at",
      )
      .eq("brand_id", DEMO_BRAND_ID)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const signals = (signalsRes.data ?? []) as Signal[];
  const positioning = sortPositioningElements(
    dedupeLatestPerType((positioningRes.data ?? []) as PositioningElement[]),
  );
  const messages = (messagingRes.data ?? []) as ContentOutput[];

  return (
    <WorkspaceShell role="marketing">
      <WorkspaceSection
        title="Top market signals"
        sub={`R-MS · ${signals.length} above fold`}
        href="/agents/r-ms"
        empty={
          signals.length === 0
            ? "No signals yet. Run R-MS from the workflow page to populate."
            : null
        }
      >
        <div className="space-y-2">
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Positioning framework"
        sub="S-PO · 5-element"
        href="/agents/s-po"
        empty={
          positioning.length === 0
            ? "No positioning yet. Run S-PO from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {positioning.map((p) => (
            <PositioningElementCard key={p.id} element={p} />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Recent messaging"
        sub="D-MG · pending review surfaced first"
        href="/agents/d-mg"
        empty={
          messages.length === 0
            ? "No messages yet. Run D-MG from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {messages.map((m) => (
            <ContentCard key={m.id} content={m} compact />
          ))}
        </div>
      </WorkspaceSection>

      <ComingSoonSection
        title="Campaign performance"
        sub="S-CP · closed-loop feedback"
        phase="Phase 6"
      />
    </WorkspaceShell>
  );
}

// ============================================================================
// Sales workspace — battlecards, narratives, what to say next.
// ============================================================================

async function SalesWorkspace({
  admin,
}: {
  admin: Awaited<ReturnType<typeof createAdminClient>>;
}) {
  const [battlecardsRes, dossiersRes, collateralRes, pricingRes, winLossRes] =
    await Promise.all([
      admin
        .from("battlecards")
        .select(
          "id, competitor_name, elevator_pitch, value_prop, features_benefits, target_personas, pain_points, qualifying_questions, competitor_profile, competitor_strengths, competitor_weaknesses, kill_points, objections, success_stories, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("competitive_dossiers")
        .select(
          "id, competitor_name, run_date, strategic_move, messaging_drift, pricing_intelligence, product_signals, talent_signals, competitive_landmines, risk_assessment, risk_justification, sources, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("created_at", { ascending: false })
        .limit(8),
      admin
        .from("sales_collateral")
        .select(
          "id, collateral_type, target_account, target_segment, competitors, content, positioning_refs, messaging_refs, source_data_date, stale_flag, approval_status, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("created_at", { ascending: false })
        .limit(5),
      admin
        .from("pricing_intelligence")
        .select(
          "id, competitor_name, snapshot_date, pricing_model, tiers, packaging_observations, pricing_velocity, recent_changes, positioning_implications, sources, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("win_loss_analyses")
        .select(
          "id, deal_id, deal_date, outcome, account_name, account_segment, account_size, competitor, primary_factors, key_quotes, patterns_observed, recommendation, sources, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  // Latest battlecard per competitor.
  const seen = new Set<string>();
  const latestBattlecards: Battlecard[] = [];
  for (const c of (battlecardsRes.data ?? []) as Battlecard[]) {
    const name = c.competitor_name ?? "";
    if (name && !seen.has(name)) {
      seen.add(name);
      latestBattlecards.push(c);
    }
  }
  const dossiers = (dossiersRes.data ?? []) as Dossier[];
  const collateral = (collateralRes.data ?? []) as SalesCollateral[];
  const winLoss = (winLossRes.data ?? []) as WinLoss[];

  // Latest pricing snapshot per competitor (rows come created_at DESC).
  const pricingSeen = new Set<string>();
  const latestPricing: PricingIntel[] = [];
  for (const p of (pricingRes.data ?? []) as PricingIntel[]) {
    const name = p.competitor_name ?? "";
    if (name && !pricingSeen.has(name)) {
      pricingSeen.add(name);
      latestPricing.push(p);
    }
  }

  return (
    <WorkspaceShell role="sales">
      <WorkspaceSection
        title="Battlecards"
        sub={`S-BC · ${latestBattlecards.length} competitors`}
        href="/agents/s-bc"
        empty={
          latestBattlecards.length === 0
            ? "No battlecards yet. Run S-BC from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {latestBattlecards.map((b) => (
            <BattlecardCard key={b.id} card={b} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="What to say next"
        sub="R-CI · competitive landmines & risk"
        href="/agents/r-ci"
        empty={
          dossiers.length === 0
            ? "No dossiers yet. Run R-CI from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {dossiers.map((d) => (
            <DossierCard key={d.id} dossier={d} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Sales narratives"
        sub="D-SN · pitch arc + collateral"
        href="/agents/d-sn"
        empty={
          collateral.length === 0
            ? "No collateral yet. Run D-SN from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {collateral.map((c) => (
            <CollateralCard key={c.id} piece={c} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Pricing intel"
        sub="R-PP · current per competitor"
        href="/agents/r-pp"
        empty={
          latestPricing.length === 0
            ? "No pricing snapshots yet. Run R-PP from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {latestPricing.map((p) => (
            <PricingIntelCard key={p.id} intel={p} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Recent win/loss"
        sub="R-WL · deal-pattern learning"
        href="/agents/r-wl"
        empty={
          winLoss.length === 0
            ? "No win/loss analyses yet. Run R-WL from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {winLoss.map((w) => (
            <WinLossCard key={w.id} analysis={w} compact />
          ))}
        </div>
      </WorkspaceSection>
    </WorkspaceShell>
  );
}

// ============================================================================
// Product workspace — roadmap, feedback themes, competitive product signals.
// ============================================================================

async function ProductWorkspace({
  admin,
}: {
  admin: Awaited<ReturnType<typeof createAdminClient>>;
}) {
  const [roadmapRes, themesRes, dossiersRes, productFeedbackRes] =
    await Promise.all([
      admin
        .from("roadmap_items")
        .select(
          "id, item_date, title, category, summary, evidence, usable_score, usable_rationale, valuable_score, valuable_rationale, feasible_score, feasible_rationale, viable_score, viable_rationale, overall_score, recommendation, priority, tags, sources, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("overall_score", { ascending: false })
        .limit(8),
      admin
        .from("feedback_themes")
        .select(
          "id, theme_name, category, summary, representative_quotes, frequency, urgency, revenue_impact, strategic_alignment, recommended_action, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("urgency", { ascending: false })
        .limit(6),
      admin
        .from("competitive_dossiers")
        .select(
          "id, competitor_name, run_date, strategic_move, messaging_drift, pricing_intelligence, product_signals, talent_signals, competitive_landmines, risk_assessment, risk_justification, sources, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("created_at", { ascending: false })
        .limit(6),
      admin
        .from("product_feedback")
        .select(
          "id, source, feedback_date, customer_segment, raw_excerpt, themed_summary, linked_roadmap_item_id, severity, recurrence_count, recommendation, sources, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("recurrence_count", { ascending: false })
        .limit(6),
    ]);

  const roadmap = (roadmapRes.data ?? []) as RoadmapItem[];
  const themes = (themesRes.data ?? []) as FeedbackTheme[];
  const dossiers = (dossiersRes.data ?? []) as Dossier[];
  const productFeedback = (productFeedbackRes.data ?? []) as ProductFeedback[];

  return (
    <WorkspaceShell role="product">
      <WorkspaceSection
        title="Top roadmap candidates"
        sub="S-RM · UVFV scored"
        href="/agents/s-rm"
        empty={
          roadmap.length === 0
            ? "No roadmap items yet. Run S-RM from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {roadmap.map((r) => (
            <RoadmapCard key={r.id} item={r} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Feedback themes by urgency"
        sub="R-CF · clustered customer voice"
        href="/agents/r-cf"
        empty={
          themes.length === 0
            ? "No themes yet. Run R-CF from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {themes.map((t) => (
            <ThemeCard key={t.id} theme={t} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Competitive product signals"
        sub="R-CI · product_signals across dossiers"
        href="/agents/r-ci"
        empty={
          dossiers.length === 0
            ? "No dossiers yet. Run R-CI from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {dossiers.map((d) => (
            <DossierCard key={d.id} dossier={d} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Top product feedback"
        sub="R-PF · severity-weighted, recurrence-sorted"
        href="/agents/r-pf"
        empty={
          productFeedback.length === 0
            ? "No product feedback synthesized yet. Run R-PF from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {productFeedback.map((f) => (
            <ProductFeedbackCard key={f.id} feedback={f} compact />
          ))}
        </div>
      </WorkspaceSection>
    </WorkspaceShell>
  );
}

// ============================================================================
// CS workspace — customer evidence, escalations, value articulation.
// ============================================================================

async function CustomerSuccessWorkspace({
  admin,
}: {
  admin: Awaited<ReturnType<typeof createAdminClient>>;
}) {
  const [themesRes, positioningRes, evidenceRes, escalationsRes] =
    await Promise.all([
      admin
        .from("feedback_themes")
        .select(
          "id, theme_name, category, summary, representative_quotes, frequency, urgency, revenue_impact, strategic_alignment, recommended_action, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("revenue_impact", { ascending: false })
        .limit(6),
      admin
        .from("positioning_elements")
        .select(
          "id, element_type, content, evidence, last_change_reason, created_at, updated_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .eq("element_type", "differentiated_value")
        .order("created_at", { ascending: false })
        .limit(3),
      admin
        .from("customer_evidence")
        .select(
          "id, customer_name, customer_segment, evidence_type, content, attribution, evidence_date, positioning_alignment, legal_status, sources, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("created_at", { ascending: false })
        .limit(8),
      admin
        .from("product_feedback")
        .select(
          "id, source, feedback_date, customer_segment, raw_excerpt, themed_summary, linked_roadmap_item_id, severity, recurrence_count, recommendation, sources, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .in("severity", ["high", "critical"])
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const themes = (themesRes.data ?? []) as FeedbackTheme[];
  const valuePositioning = (positioningRes.data ?? []) as PositioningElement[];
  const evidence = (evidenceRes.data ?? []) as CustomerEvidence[];
  const escalations = (escalationsRes.data ?? []) as ProductFeedback[];

  return (
    <WorkspaceShell role="customer_success">
      <WorkspaceSection
        title="Themes by revenue impact"
        sub="R-CF · what's affecting renewals"
        href="/agents/r-cf"
        empty={
          themes.length === 0
            ? "No themes yet. Run R-CF from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {themes.map((t) => (
            <ThemeCard key={t.id} theme={t} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Differentiated value"
        sub="S-PO · for QBR and expansion conversations"
        href="/agents/s-po"
        empty={
          valuePositioning.length === 0
            ? "No differentiated-value statement yet. Run S-PO."
            : null
        }
      >
        <div className="space-y-2">
          {valuePositioning.map((p) => (
            <PositioningElementCard key={p.id} element={p} />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Customer evidence library"
        sub="R-EV · quotes, metrics, NPS verbatims"
        href="/agents/r-ev"
        empty={
          evidence.length === 0
            ? "No evidence curated yet. Run R-EV from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {evidence.map((e) => (
            <EvidenceCard key={e.id} evidence={e} compact />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Escalations digest"
        sub="R-PF · high + critical severity, recent first"
        href="/agents/r-pf"
        empty={
          escalations.length === 0
            ? "No escalations flagged. Run R-PF from the workflow page."
            : null
        }
      >
        <div className="space-y-2">
          {escalations.map((f) => (
            <ProductFeedbackCard key={f.id} feedback={f} compact />
          ))}
        </div>
      </WorkspaceSection>
    </WorkspaceShell>
  );
}

// ============================================================================
// Shared layout primitives.
// ============================================================================

function WorkspaceShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  return (
    <div className="px-8 py-10 max-w-6xl space-y-8">
      <PageHeader
        eyebrow={`Workspace · ${ROLE_LABEL[role]}`}
        title={`${ROLE_LABEL[role]} view`}
        subtitle={ROLE_TAGLINE[role]}
      />
      {children}
    </div>
  );
}

function WorkspaceSection({
  title,
  sub,
  href,
  empty,
  children,
}: {
  title: string;
  sub?: string;
  href?: string;
  empty: string | null;
  children: React.ReactNode;
}) {
  return (
    <section>
      <SectionDivider title={title} sub={sub} />
      {empty ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-10 text-center text-sm text-text-muted">
          {empty}
        </div>
      ) : (
        <>
          {children}
          {href && (
            <div className="mt-3 text-right">
              <Link
                href={href}
                className="text-xs text-accent hover:underline"
              >
                Open full agent →
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ComingSoonSection({
  title,
  sub,
  phase,
}: {
  title: string;
  sub?: string;
  phase: string;
}) {
  return (
    <section>
      <SectionDivider title={title} sub={sub} />
      <div className="rounded-lg border border-dashed border-border bg-card/30 px-8 py-10 text-center">
        <div className="text-[10px] uppercase tracking-wider text-text-dim mb-2 font-semibold">
          Coming in {phase}
        </div>
        <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
          This agent isn't wired yet. The workspace shell is here so the card
          slot is ready to flip live the moment the workflow lands.
        </p>
      </div>
    </section>
  );
}
