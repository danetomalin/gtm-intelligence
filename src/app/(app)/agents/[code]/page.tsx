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
import { LIVE_AGENTS, normalizeAgentCode } from "@/lib/agent-config";
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
import { BattlecardCard, type Battlecard } from "./battlecard-card";
import { ThemeCard, type FeedbackTheme } from "./theme-card";
import { ContentCard, type ContentOutput } from "./content-card";
import { CollateralCard, type SalesCollateral } from "./collateral-card";
import { PricingIntelCard, type PricingIntel } from "./pricing-intel-card";
import { MarginOverview, type CostModelTier } from "./margin-overview";
import {
  SuperUserCohortCard,
  type SuperUserCohort,
} from "./super-user-cohort-card";
import { WinLossCard, type WinLoss } from "./win-loss-card";
import { EvidenceCard, type CustomerEvidence } from "./evidence-card";
import {
  ProductFeedbackCard,
  type ProductFeedback,
} from "./product-feedback-card";
import {
  AnalystBriefingCard,
  type AnalystBriefing,
} from "./analyst-briefing-card";
import { LaunchPlanCard, type LaunchPlan } from "./launch-plan-card";
import { VoiceRuleCard, type VoiceRule } from "./voice-rule-card";
import { ProofPointCard, type ProofPoint } from "./proof-point-card";
import {
  CapabilityCard,
  type ProductCapability,
} from "./capability-card";
import { PersonaCard, type BuyerPersona } from "./persona-card";
import {
  CounterNarrativeCard,
  type CounterNarrative,
} from "./counter-narrative-card";
import {
  DistributionCard,
  type CampaignSend,
} from "./distribution-card";
import {
  PerformanceCard,
  type CampaignPerformance,
} from "./performance-card";
import {
  EnablementAssetCard,
  type EnablementAsset,
} from "./enablement-asset-card";

const frameworkByCode: Record<string, { name: string; body: string }> = {
  A0: {
    name: "Brand Initializer",
    body: "Seeds Product Context, Business Rules, Buyer Personas, and Brand Competitors from a brand brief. Uses GPT-5 Mini with medium reasoning and no web access on this run.",
  },
  "R-CI": {
    name: "Competitive Intelligence Assessment",
    body: "Seven analysis categories per competitor: Strategic Move, Messaging Drift, Pricing Intelligence, Product Signals, Talent Signals, Competitive Landmines, Risk Assessment.",
  },
  "R-MS": {
    name: "Signal Engine Cognitive Filters",
    body: "So What test → Strategic Divergence → Impact Score (1–10) → Sentiment Classification. Every signal must pass all four filters or it gets dropped.",
  },
  "S-RM": {
    name: "UVFV Assessment Framework",
    body: "Usable / Valuable / Feasible / Viable, each scored 1–10 with pass threshold at 5+. Recommendation: BUILD (all pass) / INVESTIGATE / DEFER / KILL.",
  },
  "R-CF": {
    name: "Feedback Synthesis",
    body: "Clusters raw feedback (NPS, support tickets, call transcripts) into themes with summary, representative quotes, frequency, urgency, and revenue impact.",
  },
  "S-PO": {
    name: "Five-Element Positioning",
    body: "Five-element framework: Competitive Alternatives → Distinct Capabilities → Differentiated Value → Best-Fit Accounts → Market Category.",
  },
  "D-MG": {
    name: "Messaging Template",
    body: "Per channel and persona: Something Cool We Do | How It's Different | Show Some Proof. Each message ties back to a positioning element.",
  },
  "S-BC": {
    name: "Battlecard Structure",
    body: "Tight elevator pitch with target market, Kellogg functional/monetary/psychological value prop, single-person Target Buyer profile, kill points, objection handling, proof.",
  },
  "D-SN": {
    name: "Sales Narrative & Collateral",
    body: "5-act narrative arc: Inflection → Implementation Bottleneck → Differentiated Capability → Proof → Call to Action. Used for SKO, board updates, and exec-level customer convos.",
  },
  "R-PP": {
    name: "Pricing & Packaging Intelligence",
    body: "Per-competitor pricing model + tier breakdown + recent changes + positioning implications. Reads R-CI dossiers and R-MS signals. Output feeds S-BC battlecards and S-PO positioning.",
  },
  "R-WL": {
    name: "Win/Loss Analyst",
    body: "Per-deal teardown: outcome, primary factors, key quotes from rep notes, patterns across deals, and the recommendation. Reads dummy CRM data + R-CI dossiers.",
  },
  "R-EV": {
    name: "Customer Evidence Curator",
    body: "Library of quotes, case studies, NPS verbatims, and metrics with attribution and legal status. Source-of-truth for proof used in messaging, sales narratives, and analyst materials.",
  },
  "R-PF": {
    name: "Product Feedback Synthesizer",
    body: "Themed feedback from support tickets, sales calls, NPS, and interviews. Severity-scored, recurrence-tracked, linked to roadmap items where applicable.",
  },
  "S-AR": {
    name: "Analyst Relations Prep",
    body: "Briefing prep for Gartner / Forrester / IDC. Key messages, proof points, competitor framing, likely questions, positioning anchor. Synthesizes from S-PO + R-CI + S-RM + R-EV.",
  },
  "S-LP": {
    name: "Launch Planning",
    body: "Channel-aware launch plan: target personas, messaging pillars, channel plan, success metrics. Reads S-PO positioning, buyer_personas, and existing content_outputs.",
  },
  "R-BR": {
    name: "Brand Code Ingestion",
    body: "Conversational questionnaire (~12 questions) feeds Claude Sonnet for structured extraction. Outputs land in brand_voice_rules, brand_proof_points, product_capabilities, and buyer_personas. Every downstream agent reads from these tables on subsequent runs.",
  },
  "D-CN": {
    name: "Counter-Narrative Trigger",
    body: "Designed for autonomous firing on R-MS signals; currently on-demand only (scheduled trigger disabled to avoid API credit consumption). When run, applies the compound rule (impact ≥ 8, OR impact ≥ 7 + bearish + competitive_positioning/regulatory) against the latest signals and drafts memos for every match. Reads S-BC battlecards for framing. Output goes through the HITL review queue before publish.",
  },
  "X-EM": {
    name: "Email Distributor (mock)",
    body: "Mock-first Resend adapter. Sends an approved D-MG / D-SN / D-CN artifact, marks it published, and writes synthetic open / click / reply events to campaign_metrics. Real-credential swap-in via admin settings, no code changes required.",
  },
  "X-LI": {
    name: "LinkedIn Queue (mock)",
    body: "Mock-first LinkedIn adapter. Synthetic impressions / clicks / comments for an approved artifact. Real path is queue + manual paste until LinkedIn API access is granted.",
  },
  "X-OR": {
    name: "Outreach Distributor (mock)",
    body: "Mock-first Outreach.io sequence adapter. Synthetic engagement matching Outreach's typical 5-step sequence profile (45% opens, 11% replies, 2.5% meetings booked).",
  },
  "X-AP": {
    name: "Apollo Distributor (mock)",
    body: "Mock-first Apollo.io sequence adapter. Synthetic engagement mirroring Apollo's typical profile (40% opens, 9% replies, 2.8% conversions).",
  },
  "S-CP": {
    name: "Campaign Performance Analyst",
    body: "Reads campaign_sends + campaign_metrics + content_outputs. Aggregates by channel and messaging theme, writes campaign_performance rollups with winning/losing theme + recommendation. The output feeds S-PO positioning and D-MG messaging on their next runs — this is the closed loop.",
  },
  "D-OB": {
    name: "Objection Handler",
    body: "Reads S-BC battlecards + R-WL win/loss patterns + buyer_personas. Writes structured objection-handler entries to the enablement library: objection, why it comes up, response framework, proof point, escalation path. Sales-facing.",
  },
  "D-QB": {
    name: "QBR Template Generator",
    body: "Reads R-EV customer_evidence + R-PF product_feedback + R-CF feedback themes. Writes segment-specific QBR deck outlines: success milestones, expansion signals, risk flags, next-quarter agenda.",
  },
  "D-HP": {
    name: "Customer Health Playbook",
    body: "Reads R-PF product_feedback + R-CF feedback themes + R-EV customer_evidence. Writes health-pattern playbooks: early-warning signals, intervention scripts, escalation paths, recovery proof.",
  },
  "D-WW": {
    name: "Win Wire",
    body: "Reads R-WL win_loss_analyses + S-BC battlecards. Writes a post-deal teardown asset: deal arc, decisive moment, key quotes, replicable plays. Internal celebration + pattern propagation.",
  },
  "D-XP": {
    name: "Expansion Play",
    body: "Reads R-EV customer_evidence + product_capabilities + buyer_personas. Writes account-expansion playbooks: triggers, multi-thread plan, talk track, proof points. CS + AE collaboration asset.",
  },
  "D-RT": {
    name: "Renewal Talk Track",
    body: "Reads R-EV customer_evidence + R-PF product_feedback + S-CP campaign_performance. Writes renewal-call playbooks keyed to a customer-health pattern: value-realized recap, risk acknowledgment, expansion bridge, deal-saver play.",
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
  "R-CI": [
    { label: "Latest dossier", preview: "Crayon — strategic move: Q1 AI feature launch · risk: MEDIUM" },
    { label: "Coverage", preview: "6 competitors tracked, 4 with dossiers in last 7 days" },
  ],
  "S-RM": [
    { label: "Roadmap items scored", preview: "14 items · 3 BUILD · 5 INVESTIGATE · 4 DEFER · 2 KILL" },
    { label: "Critical priority", preview: "Cross-tenant analytics rollup (overall 8.5/10)" },
  ],
  "R-CF": [
    { label: "Themes identified", preview: "6 themes from 47 feedback signals · 2 high-urgency" },
    { label: "Top theme", preview: "Onboarding friction at brand-init step · 14 mentions" },
  ],
  "S-PO": [
    { label: "Positioning elements", preview: "All 5 elements current · last refresh 3 days ago" },
    { label: "Composed statement", preview: "Ready on the Positioning page" },
  ],
  "D-MG": [
    { label: "Messages drafted", preview: "12 messages across 6 channels" },
    { label: "Campaign briefs", preview: "3 active briefs: email, LinkedIn, analyst relations" },
  ],
  "S-BC": [
    { label: "Battlecards live", preview: "4 battlecards (Crayon, Klue, Kompyte, in-house tooling)" },
    { label: "Last refresh", preview: "Crayon updated 2 days ago after pricing change signal" },
  ],
  "D-SN": [
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
  // Accept either the new layer-prefixed code (R-CI, S-PO, …) or a legacy
  // A1–A8 code from pre-rename URLs. `normalizeAgentCode` returns the canonical
  // new form, or null for completely unknown codes.
  const code = normalizeAgentCode(rawCode) ?? rawCode.toUpperCase();
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
  let latestBattlecards: Battlecard[] = [];
  let pastBattlecards: Battlecard[] = [];
  let latestThemes: FeedbackTheme[] = [];
  let pastThemes: FeedbackTheme[] = [];
  let pastContent: ContentOutput[] = [];
  let pastCollateral: SalesCollateral[] = [];
  let latestPricing: PricingIntel[] = [];
  let pastPricing: PricingIntel[] = [];
  let costModelTiers: CostModelTier[] = [];
  let latestWinLoss: WinLoss[] = [];
  let pastWinLoss: WinLoss[] = [];
  let latestEvidence: CustomerEvidence[] = [];
  let pastEvidence: CustomerEvidence[] = [];
  let latestFeedback: ProductFeedback[] = [];
  let pastFeedback: ProductFeedback[] = [];
  let latestBriefings: AnalystBriefing[] = [];
  let pastBriefings: AnalystBriefing[] = [];
  let latestLaunches: LaunchPlan[] = [];
  let pastLaunches: LaunchPlan[] = [];
  let voiceRules: VoiceRule[] = [];
  let proofPoints: ProofPoint[] = [];
  let capabilities: ProductCapability[] = [];
  let personas: BuyerPersona[] = [];
  let latestMemos: CounterNarrative[] = [];
  let pastMemos: CounterNarrative[] = [];
  let channelSends: CampaignSend[] = [];
  let performanceRows: CampaignPerformance[] = [];
  let enablementAssets: EnablementAsset[] = [];
  let cohorts: SuperUserCohort[] = [];

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
      code === "R-MS"
        ? admin
            .from("market_signals")
            .select(
              "id, signal_date, category, headline, summary, strategic_commentary, impact_score, sentiment, sentiment_reason, created_at",
            )
            .eq("brand_id", DEMO_BRAND_ID)
            .order("created_at", { ascending: false })
            .limit(200)
        : code === "R-CI"
          ? admin
              .from("competitive_dossiers")
              .select(
                "id, competitor_name, run_date, strategic_move, messaging_drift, pricing_intelligence, product_signals, talent_signals, competitive_landmines, risk_assessment, risk_justification, sources, created_at",
              )
              .eq("brand_id", DEMO_BRAND_ID)
              .order("created_at", { ascending: false })
              .limit(200)
          : code === "S-RM"
            ? admin
                .from("roadmap_items")
                .select(
                  "id, item_date, title, category, summary, evidence, usable_score, usable_rationale, valuable_score, valuable_rationale, feasible_score, feasible_rationale, viable_score, viable_rationale, overall_score, recommendation, priority, tags, sources, created_at",
                )
                .eq("brand_id", DEMO_BRAND_ID)
                .order("overall_score", { ascending: false })
                .limit(200)
            : code === "S-PO"
              ? admin
                  .from("positioning_elements")
                  .select(
                    "id, element_type, content, evidence, last_change_reason, created_at, updated_at",
                  )
                  .eq("brand_id", DEMO_BRAND_ID)
                  .order("created_at", { ascending: false })
                  .limit(200)
              : code === "S-BC"
                ? admin
                    .from("battlecards")
                    .select(
                      "id, competitor_name, elevator_pitch, value_prop, features_benefits, target_personas, pain_points, qualifying_questions, competitor_profile, competitor_strengths, competitor_weaknesses, kill_points, objections, success_stories, created_at",
                    )
                    .eq("brand_id", DEMO_BRAND_ID)
                    .order("created_at", { ascending: false })
                    .limit(200)
                : code === "R-CF"
                  ? admin
                      .from("feedback_themes")
                      .select(
                        "id, theme_name, category, summary, representative_quotes, frequency, urgency, revenue_impact, strategic_alignment, recommended_action, created_at",
                      )
                      .eq("brand_id", DEMO_BRAND_ID)
                      .order("created_at", { ascending: false })
                      .limit(200)
                  : code === "D-MG"
                    ? admin
                        .from("content_outputs")
                        .select(
                          "id, channel, topic, target_persona, content, messaging_refs, proof_pending, approval_status, created_at",
                        )
                        .eq("brand_id", DEMO_BRAND_ID)
                        .order("created_at", { ascending: false })
                        .limit(200)
                    : code === "D-SN"
                      ? admin
                          .from("sales_collateral")
                          .select(
                            "id, collateral_type, target_account, target_segment, competitors, content, positioning_refs, messaging_refs, source_data_date, stale_flag, approval_status, created_at",
                          )
                          .eq("brand_id", DEMO_BRAND_ID)
                          .order("created_at", { ascending: false })
                          .limit(200)
                      : code === "R-PP"
                        ? admin
                            .from("pricing_intelligence")
                            .select(
                              "id, competitor_name, snapshot_date, pricing_model, tiers, packaging_observations, pricing_velocity, recent_changes, positioning_implications, sources, created_at",
                            )
                            .eq("brand_id", DEMO_BRAND_ID)
                            .order("created_at", { ascending: false })
                            .limit(200)
                        : code === "R-WL"
                          ? admin
                              .from("win_loss_analyses")
                              .select(
                                "id, deal_id, deal_date, outcome, account_name, account_segment, account_size, competitor, primary_factors, key_quotes, patterns_observed, recommendation, sources, created_at",
                              )
                              .eq("brand_id", DEMO_BRAND_ID)
                              .order("created_at", { ascending: false })
                              .limit(200)
                          : code === "R-EV"
                            ? admin
                                .from("customer_evidence")
                                .select(
                                  "id, customer_name, customer_segment, evidence_type, content, attribution, evidence_date, positioning_alignment, legal_status, sources, created_at",
                                )
                                .eq("brand_id", DEMO_BRAND_ID)
                                .order("created_at", { ascending: false })
                                .limit(200)
                            : code === "R-PF"
                              ? admin
                                  .from("product_feedback")
                                  .select(
                                    "id, source, feedback_date, customer_segment, raw_excerpt, themed_summary, linked_roadmap_item_id, severity, recurrence_count, recommendation, sources, created_at",
                                  )
                                  .eq("brand_id", DEMO_BRAND_ID)
                                  .order("created_at", { ascending: false })
                                  .limit(200)
                              : code === "S-AR"
                                ? admin
                                    .from("analyst_briefings")
                                    .select(
                                      "id, analyst_firm, analyst_name, briefing_date, briefing_type, key_messages, proof_points, competitor_framing, questions_likely, positioning_anchor, sources, created_at",
                                    )
                                    .eq("brand_id", DEMO_BRAND_ID)
                                    .order("created_at", { ascending: false })
                                    .limit(200)
                                : code === "S-LP"
                                  ? admin
                                      .from("launch_plans")
                                      .select(
                                        "id, launch_name, launch_type, launch_date_target, target_personas, messaging_pillars, channel_plan, success_metrics, positioning_anchor, sources, created_at",
                                      )
                                      .eq("brand_id", DEMO_BRAND_ID)
                                      .order("created_at", { ascending: false })
                                      .limit(200)
                                  : code === "R-BR"
                                    ? Promise.resolve({ data: [], error: null }) // R-BR fans out below
                                    : code === "D-CN"
                                      ? admin
                                          .from("counter_narrative_memos")
                                          .select(
                                            "id, triggering_signal_id, triggering_signal_summary, competitor_named, category, rep_talking_points, suggested_linkedin_post, email_reply_template, positioning_anchor, sources, approval_status, risk_tier, created_at",
                                          )
                                          .eq("brand_id", DEMO_BRAND_ID)
                                          .order("created_at", { ascending: false })
                                          .limit(200)
                                      : code === "X-EM" || code === "X-LI" || code === "X-OR" || code === "X-AP"
                                        ? admin
                                            .from("campaign_sends")
                                            .select(
                                              "id, channel_type, source, artifact_table, artifact_id, audience_descriptor, audience_size, external_send_id, status, sent_at, error_message",
                                            )
                                            .eq("brand_id", DEMO_BRAND_ID)
                                            .eq(
                                              "channel_type",
                                              code === "X-EM"
                                                ? "resend"
                                                : code === "X-LI"
                                                  ? "linkedin"
                                                  : code === "X-OR"
                                                    ? "outreach"
                                                    : "apollo",
                                            )
                                            .order("sent_at", { ascending: false })
                                            .limit(50)
                                        : code === "S-CP"
                                          ? admin
                                              .from("campaign_performance")
                                              .select(
                                                "id, scope, scope_value, window_label, sends_count, open_rate_pct, click_through_rate_pct, reply_rate_pct, attributed_pipeline_usd, outperforms_baseline_pct, winning_theme, losing_theme, narrative, recommendation, sources, created_at",
                                              )
                                              .eq("brand_id", DEMO_BRAND_ID)
                                              .order("created_at", { ascending: false })
                                              .limit(50)
                                          : code === "D-OB" || code === "D-QB" || code === "D-HP" || code === "D-WW" || code === "D-XP" || code === "D-RT"
                                            ? admin
                                                .from("enablement_assets")
                                                .select(
                                                  "id, asset_type, audience, title, body_markdown, source_refs, last_refreshed_at, freshness_state, version, produced_by, approval_status, risk_tier, created_at",
                                                )
                                                .eq("brand_id", DEMO_BRAND_ID)
                                                .eq(
                                                  "asset_type",
                                                  code === "D-OB"
                                                    ? "objection_handler"
                                                    : code === "D-QB"
                                                      ? "qbr_template"
                                                      : code === "D-HP"
                                                        ? "customer_health_playbook"
                                                        : code === "D-WW"
                                                          ? "win_wire"
                                                          : code === "D-XP"
                                                            ? "expansion_play"
                                                            : "renewal_talk_track",
                                                )
                                                .order("created_at", { ascending: false })
                                                .limit(50)
                                            : code === "R-CR"
                                              ? admin
                                                  .from("super_user_cohorts")
                                                  .select(
                                                    "id, version, is_active, cohort_name, methodology, filter_criteria, cohort_accounts, account_count, excluded_accounts, legacy_concentration_pct, segment_dominance_pct, sources, approval_status, risk_tier, created_at",
                                                  )
                                                  .eq("brand_id", DEMO_BRAND_ID)
                                                  .order("created_at", { ascending: false })
                                                  .limit(50)
                                              : Promise.resolve({ data: [], error: null }),
    ]);

    latestRun = latestRunRes.data ?? null;
    runs30dCount = runCountRes.count ?? 0;

    if (code === "R-MS") {
      const allSignals = (dataRes.data ?? []) as Signal[];
      pastSignals = allSignals;
      latestSignals = [...allSignals]
        .sort((a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0))
        .slice(0, 6);
    } else if (code === "R-CI") {
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
    } else if (code === "S-RM") {
      const allItems = (dataRes.data ?? []) as RoadmapItem[];
      pastRoadmap = allItems;
      latestRoadmap = [...allItems]
        .sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
        .slice(0, 8);
    } else if (code === "S-PO") {
      const allElements = (dataRes.data ?? []) as PositioningElement[];
      pastPositioning = allElements;
      latestPositioning = sortPositioningElements(
        dedupeLatestPerType(allElements),
      );
    } else if (code === "S-BC") {
      const allCards = (dataRes.data ?? []) as Battlecard[];
      pastBattlecards = allCards;
      const seen = new Set<string>();
      const latestPerCompetitor: Battlecard[] = [];
      for (const c of allCards) {
        const name = c.competitor_name ?? "";
        if (name && !seen.has(name)) {
          seen.add(name);
          latestPerCompetitor.push(c);
        }
      }
      latestBattlecards = latestPerCompetitor;
    } else if (code === "R-CF") {
      const allThemes = (dataRes.data ?? []) as FeedbackTheme[];
      pastThemes = allThemes;
      const seen = new Set<string>();
      const latestPerTheme: FeedbackTheme[] = [];
      for (const t of allThemes) {
        const name = t.theme_name ?? "";
        if (name && !seen.has(name)) {
          seen.add(name);
          latestPerTheme.push(t);
        }
      }
      latestThemes = latestPerTheme;
    } else if (code === "D-MG") {
      pastContent = (dataRes.data ?? []) as ContentOutput[];
    } else if (code === "D-SN") {
      pastCollateral = (dataRes.data ?? []) as SalesCollateral[];
    } else if (code === "R-PP") {
      const allPricing = (dataRes.data ?? []) as PricingIntel[];
      pastPricing = allPricing;
      // Latest snapshot per competitor (rows come created_at DESC).
      const seen = new Set<string>();
      const latestPerCompetitor: PricingIntel[] = [];
      for (const p of allPricing) {
        const name = p.competitor_name ?? "";
        if (name && !seen.has(name)) {
          seen.add(name);
          latestPerCompetitor.push(p);
        }
      }
      latestPricing = latestPerCompetitor;
      // Pull the active brand's cost model so R-PP can show our-side margin
      // alongside competitor pricing. Separate query so the R-PP path stays
      // independent of the main dataRes branch.
      const adminForCost = await createAdminClient();
      const { data: costRows } = await adminForCost
        .from("product_cost_model")
        .select(
          "id, tier_name, tier_order, cogs_compute_usd, cogs_storage_usd, cogs_llm_usd, cogs_third_party_usd, cogs_payments_pct, cogs_payments_fixed_usd, cogs_support_usd, cogs_other_usd, list_price_usd, effective_price_usd, gross_margin_pct, margin_floor_pct",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .order("tier_order", { ascending: true });
      costModelTiers = (costRows ?? []) as CostModelTier[];
    } else if (code === "R-WL") {
      const all = (dataRes.data ?? []) as WinLoss[];
      pastWinLoss = all;
      latestWinLoss = all.slice(0, 8);
    } else if (code === "R-EV") {
      const all = (dataRes.data ?? []) as CustomerEvidence[];
      pastEvidence = all;
      latestEvidence = all.slice(0, 10);
    } else if (code === "R-PF") {
      const all = (dataRes.data ?? []) as ProductFeedback[];
      pastFeedback = all;
      latestFeedback = [...all]
        .sort((a, b) => (b.recurrence_count ?? 0) - (a.recurrence_count ?? 0))
        .slice(0, 8);
    } else if (code === "S-AR") {
      const all = (dataRes.data ?? []) as AnalystBriefing[];
      pastBriefings = all;
      latestBriefings = all.slice(0, 6);
    } else if (code === "S-LP") {
      const all = (dataRes.data ?? []) as LaunchPlan[];
      pastLaunches = all;
      latestLaunches = all.slice(0, 6);
    } else if (code === "D-CN") {
      const all = (dataRes.data ?? []) as CounterNarrative[];
      pastMemos = all;
      latestMemos = all.slice(0, 8);
    } else if (code === "X-EM" || code === "X-LI" || code === "X-OR" || code === "X-AP") {
      channelSends = (dataRes.data ?? []) as CampaignSend[];
    } else if (code === "S-CP") {
      performanceRows = (dataRes.data ?? []) as CampaignPerformance[];
    } else if (code === "D-OB" || code === "D-QB" || code === "D-HP" || code === "D-WW" || code === "D-XP" || code === "D-RT") {
      enablementAssets = (dataRes.data ?? []) as EnablementAsset[];
    } else if (code === "R-CR") {
      cohorts = (dataRes.data ?? []) as SuperUserCohort[];
    } else if (code === "R-BR") {
      // R-BR writes to four tables. Fan out the reads in parallel.
      const [voiceRes, proofRes, capRes, personaRes] = await Promise.all([
        admin
          .from("brand_voice_rules")
          .select(
            "id, rule_type, rule, rationale, example_before, example_after, sources, created_at",
          )
          .eq("brand_id", DEMO_BRAND_ID)
          .order("created_at", { ascending: false })
          .limit(60),
        admin
          .from("brand_proof_points")
          .select(
            "id, proof_type, claim, attribution, customer_name, customer_segment, positioning_alignment, legal_status, sources, created_at",
          )
          .eq("brand_id", DEMO_BRAND_ID)
          .order("created_at", { ascending: false })
          .limit(60),
        admin
          .from("product_capabilities")
          .select(
            "id, capability_name, category, feature_description, buyer_benefit, competitive_gap, status, sources, created_at",
          )
          .eq("brand_id", DEMO_BRAND_ID)
          .order("created_at", { ascending: false })
          .limit(60),
        admin
          .from("buyer_personas")
          .select(
            "id, persona_name, title, segment, pain_points, goals, triggers, watering_holes, decision_criteria, created_at, updated_at",
          )
          .eq("brand_id", DEMO_BRAND_ID)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      voiceRules = (voiceRes.data ?? []) as VoiceRule[];
      proofPoints = (proofRes.data ?? []) as ProofPoint[];
      capabilities = (capRes.data ?? []) as ProductCapability[];
      personas = (personaRes.data ?? []) as BuyerPersona[];
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
          eyebrow={`Workflow ${agent.code}`}
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

      {isLive && code === "R-MS" && (
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

      {isLive && code === "R-CI" && (
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
                agent — R-CI generates one dossier per competitor in
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

      {isLive && code === "S-RM" && (
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
                agent — S-RM produces 5–8 UVFV-scored items in ~30–60 seconds.
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

      {isLive && code === "D-MG" && (
        <section>
          <SectionDivider
            title="Messaging library"
            sub={`Channel-aware · ${pastContent.length} messages`}
          />
          {pastContent.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
              No messages yet. Click <strong className="text-text">Run now</strong> to fire D-MG — it produces 6–10 channel-aware messages anchored to positioning.
            </div>
          ) : (
            <div className="space-y-2">
              {pastContent.map((c) => (
                <ContentCard key={c.id} content={c} />
              ))}
            </div>
          )}
        </section>
      )}

      {isLive && code === "D-SN" && (
        <section>
          <SectionDivider
            title="Sales collateral"
            sub={`${pastCollateral.length} pieces`}
          />
          {pastCollateral.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
              No collateral yet. Click <strong className="text-text">Run now</strong> to fire D-SN — it produces 4–6 collateral pieces (narrative arc, one-pager, SKO outline, exec briefing).
            </div>
          ) : (
            <div className="space-y-3">
              {pastCollateral.map((p) => (
                <CollateralCard key={p.id} piece={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {isLive && code === "R-CF" && (
        <>
          <section>
            <SectionDivider
              title="Current themes"
              sub={`Unique themes · ${latestThemes.length}`}
            />
            {latestThemes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No themes yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire R-CF — it
                synthesizes 5–8 feedback themes from the market context in
                ~30–45 seconds.
              </div>
            ) : (
              <div className="space-y-2">
                {latestThemes.map((t) => (
                  <ThemeCard key={t.id} theme={t} />
                ))}
              </div>
            )}
          </section>

          {pastThemes.length > latestThemes.length && (
            <section>
              <SectionDivider
                title="Past themes"
                sub={`Archive · ${pastThemes.length} total`}
              />
              <div className="space-y-2">
                {pastThemes.map((t) => (
                  <ThemeCard key={t.id} theme={t} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isLive && code === "S-BC" && (
        <>
          <section>
            <SectionDivider
              title="Current battlecards"
              sub={`One per competitor · ${latestBattlecards.length}`}
            />
            {latestBattlecards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No battlecards yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire the
                agent — S-BC generates one battlecard per competitor in ~30–60
                seconds, pulling from positioning + dossiers.
              </div>
            ) : (
              <div className="space-y-3">
                {latestBattlecards.map((c) => (
                  <BattlecardCard key={c.id} card={c} />
                ))}
              </div>
            )}
          </section>

          {pastBattlecards.length > latestBattlecards.length && (
            <section>
              <SectionDivider
                title="Past battlecards"
                sub={`Archive · ${pastBattlecards.length} total`}
              />
              <div className="space-y-2">
                {pastBattlecards.map((c) => (
                  <BattlecardCard key={c.id} card={c} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isLive && code === "S-PO" && (
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
                agent — S-PO produces all 5 elements in ~30–45 seconds.
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

      {isLive && code === "R-PP" && (
        <>
          <section>
            <SectionDivider
              title="Your gross margin"
              sub={
                costModelTiers.length > 0
                  ? `Per tier · ${costModelTiers.length}`
                  : "Configure cost model"
              }
            />
            <MarginOverview tiers={costModelTiers} />
          </section>

          <section>
            <SectionDivider
              title="Latest pricing snapshots"
              sub={`One per competitor · ${latestPricing.length}`}
            />
            {latestPricing.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No pricing snapshots yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire the
                agent — R-PP produces one snapshot per competitor in ~30–60
                seconds.
              </div>
            ) : (
              <div className="space-y-2">
                {latestPricing.map((p) => (
                  <PricingIntelCard key={p.id} intel={p} />
                ))}
              </div>
            )}
          </section>

          {pastPricing.length > latestPricing.length && (
            <section>
              <SectionDivider
                title="Past snapshots"
                sub={`Archive · ${pastPricing.length} total`}
              />
              <div className="space-y-2">
                {pastPricing.map((p) => (
                  <PricingIntelCard key={p.id} intel={p} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isLive && code === "R-WL" && (
        <>
          <section>
            <SectionDivider
              title="Recent win/loss"
              sub={`Last 8 deals · ${latestWinLoss.length}`}
            />
            {latestWinLoss.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No win/loss data yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire the
                agent — R-WL synthesizes from dummy CRM data + R-CI dossiers.
              </div>
            ) : (
              <div className="space-y-2">
                {latestWinLoss.map((w) => (
                  <WinLossCard key={w.id} analysis={w} />
                ))}
              </div>
            )}
          </section>
          {pastWinLoss.length > latestWinLoss.length && (
            <section>
              <SectionDivider
                title="Past deals"
                sub={`Archive · ${pastWinLoss.length} total`}
              />
              <div className="space-y-2">
                {pastWinLoss.map((w) => (
                  <WinLossCard key={w.id} analysis={w} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isLive && code === "R-EV" && (
        <>
          <section>
            <SectionDivider
              title="Customer evidence"
              sub={`Recent · ${latestEvidence.length}`}
            />
            {latestEvidence.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No evidence yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire the
                agent — R-EV curates quotes, case studies, and metrics from
                review and NPS sources.
              </div>
            ) : (
              <div className="space-y-2">
                {latestEvidence.map((e) => (
                  <EvidenceCard key={e.id} evidence={e} />
                ))}
              </div>
            )}
          </section>
          {pastEvidence.length > latestEvidence.length && (
            <section>
              <SectionDivider
                title="Full library"
                sub={`Archive · ${pastEvidence.length} total`}
              />
              <div className="space-y-2">
                {pastEvidence.map((e) => (
                  <EvidenceCard key={e.id} evidence={e} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isLive && code === "R-PF" && (
        <>
          <section>
            <SectionDivider
              title="Top product feedback"
              sub={`By recurrence · ${latestFeedback.length}`}
            />
            {latestFeedback.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No feedback synthesized yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire R-PF —
                it clusters support tickets, sales-call notes, and NPS verbatims
                into themes with severity scoring.
              </div>
            ) : (
              <div className="space-y-2">
                {latestFeedback.map((f) => (
                  <ProductFeedbackCard key={f.id} feedback={f} />
                ))}
              </div>
            )}
          </section>
          {pastFeedback.length > latestFeedback.length && (
            <section>
              <SectionDivider
                title="All feedback"
                sub={`Archive · ${pastFeedback.length} total`}
              />
              <div className="space-y-2">
                {pastFeedback.map((f) => (
                  <ProductFeedbackCard key={f.id} feedback={f} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isLive && code === "S-AR" && (
        <>
          <section>
            <SectionDivider
              title="Briefing prep"
              sub={`Latest · ${latestBriefings.length}`}
            />
            {latestBriefings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No briefings yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire S-AR —
                it generates briefing prep using S-PO, R-CI, S-RM, and R-EV.
              </div>
            ) : (
              <div className="space-y-2">
                {latestBriefings.map((b) => (
                  <AnalystBriefingCard key={b.id} briefing={b} />
                ))}
              </div>
            )}
          </section>
          {pastBriefings.length > latestBriefings.length && (
            <section>
              <SectionDivider
                title="Past briefings"
                sub={`Archive · ${pastBriefings.length} total`}
              />
              <div className="space-y-2">
                {pastBriefings.map((b) => (
                  <AnalystBriefingCard key={b.id} briefing={b} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isLive && (code === "X-EM" || code === "X-LI" || code === "X-OR" || code === "X-AP") && (
        <>
          <section>
            <SectionDivider
              title="Recent sends"
              sub={`${channelSends.length} via this channel · mock-first`}
            />
            {channelSends.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No sends yet. The distribution adapters take an approved D-MG /
                D-SN / D-CN artifact and ship it. Synthetic metrics events
                generate immediately so S-CP has data to analyze. Real API
                credentials swap in via admin settings without code changes.
              </div>
            ) : (
              <div className="space-y-2">
                {channelSends.map((s) => (
                  <DistributionCard key={s.id} send={s} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {isLive && (code === "D-OB" || code === "D-QB" || code === "D-HP" || code === "D-WW" || code === "D-XP" || code === "D-RT") && (
        <>
          <section>
            <SectionDivider
              title="Library entries"
              sub={`${enablementAssets.length} written · HITL-gated`}
            />
            {enablementAssets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No assets yet. Click <strong className="text-text">Run now</strong>{" "}
                to synthesize. Output lands in the unified enablement library
                and the Review Queue.
              </div>
            ) : (
              <div className="space-y-2">
                {enablementAssets.map((a) => (
                  <EnablementAssetCard key={a.id} asset={a} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {isLive && code === "R-CR" && (
        <>
          <section>
            <SectionDivider
              title="Super user cohorts"
              sub={`${cohorts.length} versions · Gate 1`}
            />
            {cohorts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No cohorts yet. Click{" "}
                <strong className="text-text">Run now</strong> to analyze the
                customer base. R-CR ranks accounts by NRR + LTV + adoption,
                filters support-burdened or low-adoption accounts, and writes
                a top-decile cohort that lands in HITL Gate 1 before
                downstream R-CE / R-VC / S-IC read from it.
              </div>
            ) : (
              <div className="space-y-3">
                {cohorts.map((c) => (
                  <SuperUserCohortCard key={c.id} cohort={c} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {isLive && code === "S-CP" && (
        <>
          <section>
            <SectionDivider
              title="Performance rollups"
              sub={`${performanceRows.length} written · closed-loop input to S-PO + D-MG`}
            />
            {performanceRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No rollups yet. Run S-CP after the distribution adapters have
                fired so there are sends + metrics to analyze. Output writes
                campaign_performance rows that S-PO positioning and D-MG
                messaging read in their next Build Context.
              </div>
            ) : (
              <div className="space-y-2">
                {performanceRows.map((p) => (
                  <PerformanceCard key={p.id} perf={p} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {isLive && code === "D-CN" && (
        <>
          <section>
            <SectionDivider
              title="Recent counter-narrative memos"
              sub={`${latestMemos.length} drafted · gated by HITL approval`}
            />
            {latestMemos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No memos yet. Click <strong className="text-text">Run now</strong>{" "}
                to apply the compound trigger rule against the latest R-MS
                signals (impact ≥ 8, OR impact ≥ 7 + bearish + sensitive
                category). Scheduled firing is paused for now to keep API
                credit consumption deliberate.
              </div>
            ) : (
              <div className="space-y-2">
                {latestMemos.map((m) => (
                  <CounterNarrativeCard key={m.id} memo={m} />
                ))}
              </div>
            )}
          </section>
          {pastMemos.length > latestMemos.length && (
            <section>
              <SectionDivider
                title="Past memos"
                sub={`Archive · ${pastMemos.length} total`}
              />
              <div className="space-y-2">
                {pastMemos.map((m) => (
                  <CounterNarrativeCard key={m.id} memo={m} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isLive && code === "R-BR" && (
        <>
          <section>
            <SectionDivider
              title="Buyer personas"
              sub={`${personas.length} extracted`}
            />
            {personas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No personas yet. Start the{" "}
                <Link
                  href="/onboarding/brand-code"
                  className="text-accent underline"
                >
                  conversational onboarding
                </Link>{" "}
                to populate brand-code from a ~12-question chat.
              </div>
            ) : (
              <div className="space-y-2">
                {personas.map((p) => (
                  <PersonaCard key={p.id} persona={p} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionDivider
              title="Brand voice rules"
              sub={`${voiceRules.length} rules · banned phrases, preferred terminology, tone guidance`}
            />
            {voiceRules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No voice rules yet. R-BR extracts them from your &ldquo;3 words
                marketing should never say&rdquo; / &ldquo;3 they should say more&rdquo;
                answers in onboarding.
              </div>
            ) : (
              <div className="space-y-2">
                {voiceRules.map((r) => (
                  <VoiceRuleCard key={r.id} rule={r} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionDivider
              title="Proof points"
              sub={`${proofPoints.length} extracted · metrics, customer quotes, validation`}
            />
            {proofPoints.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No proof points yet. R-BR turns your customer-quote and proudest-metric
                answers into structured, attribution-tagged records.
              </div>
            ) : (
              <div className="space-y-2">
                {proofPoints.map((p) => (
                  <ProofPointCard key={p.id} point={p} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionDivider
              title="Product capabilities"
              sub={`${capabilities.length} capabilities · feature → benefit → competitive gap`}
            />
            {capabilities.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No capabilities yet. R-BR maps your &ldquo;3 features prospects don&rsquo;t
                fully understand&rdquo; answer into structured capability records.
              </div>
            ) : (
              <div className="space-y-2">
                {capabilities.map((c) => (
                  <CapabilityCard key={c.id} capability={c} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {isLive && code === "S-LP" && (
        <>
          <section>
            <SectionDivider
              title="Active launch plans"
              sub={`Latest · ${latestLaunches.length}`}
            />
            {latestLaunches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
                No launches planned yet. Click{" "}
                <strong className="text-text">Run now</strong> to fire S-LP —
                it produces a channel-aware launch plan anchored to S-PO
                positioning.
              </div>
            ) : (
              <div className="space-y-2">
                {latestLaunches.map((l) => (
                  <LaunchPlanCard key={l.id} plan={l} />
                ))}
              </div>
            )}
          </section>
          {pastLaunches.length > latestLaunches.length && (
            <section>
              <SectionDivider
                title="Past launches"
                sub={`Archive · ${pastLaunches.length} total`}
              />
              <div className="space-y-2">
                {pastLaunches.map((l) => (
                  <LaunchPlanCard key={l.id} plan={l} compact />
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
