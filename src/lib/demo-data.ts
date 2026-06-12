// Demo content for the Throughline app. Mirrors the Gradial-portfolio
// narrative style but written from Throughline's perspective. Real data
// comes from Supabase once the full workflow chain is wired to write back to the tenant.

export const demoBrand = {
  id: "demo-brand-id",
  name: "Throughline",
  website_url: "https://throughline.io",
  category: "AI Native Workflow Modernization System",
};

// Stat row values that don't drift with platform changes. The "Workflows
// shipping" stat is computed at render time from agentTooling.length so it
// always reflects reality. Keeping this export for any consumer that needs
// the non-count stats; the dashboard derives the full set inline.
export const overviewStats = [
  { label: "Time saved per week", value: "12 hrs", sublabel: "per PMM seat" },
  { label: "Brands monitored", value: "1", sublabel: "Throughline pilot" },
  { label: "Tenant isolation", value: "RLS", sublabel: "Postgres-enforced" },
];

export const overviewBlurb =
  "Throughline runs the GTM intelligence work product marketing, customer success, sales, and product teams have always built by hand. Agents move in sequence from brand initialization through positioning, battlecards, and sales narrative, with every output landing in a tenant-scoped store the team can read like a dashboard.";

export const marketContextStats = [
  {
    label: "PMM activities powered by AI by 2028",
    value: "67%",
    source: "Gartner",
  },
  {
    label: "Enterprises planning agentic AI deployment",
    value: "60%",
    source: "within 2 years",
  },
  {
    label: "Median time-to-positioning at growth-stage SaaS",
    value: "9 wks",
    source: "internal benchmark",
  },
  {
    label: "GTM intelligence + sales enablement TAM",
    value: "$8.2B",
    source: "2027 projection",
  },
];

export const marketContextNarrative =
  "Product marketing is hitting an inflection in 2026. The work is moving from artisanal (briefs, narratives, battlecards built by hand) to operational (the same outputs shipped weekly, scoped per brand, fed by structured intelligence). Most PMM teams haven't made the jump because the tooling treats marketing as content production instead of operational reasoning. Throughline closes the gap by deploying a multi-agent pipeline that produces the actual work product PMM owns. Finished intelligence ready to ship, not drafts to edit.";

export const competitiveLandscape = [
  {
    name: "Crayon",
    category: "Competitive Intelligence Platform",
    profile:
      "Battlecard incumbent, 1,000+ customers, focused on competitor monitoring and sales enablement. Strong on signal capture, weak on synthesis into PMM work product.",
    edge:
      "Throughline produces the finished positioning + narrative, not just the raw competitive feed.",
  },
  {
    name: "Klue",
    category: "Sales Battlecards",
    profile:
      "Battlecard-first, deep CRM integration. Owns the sales-enablement seat but leaves positioning, messaging, and narrative as unsolved upstream problems.",
    edge:
      "Throughline writes both the battlecards and the positioning framework they should be built on top of.",
  },
  {
    name: "Kompyte / Semrush",
    category: "Web-Monitoring Suite",
    profile:
      "Crawls competitor sites, alerts on changes. Useful as a signal source but produces no synthesis or recommended action.",
    edge:
      "Throughline ingests Kompyte-class signals and converts them into competitive landmines, messaging adjustments, and roadmap recommendations.",
  },
  {
    name: "In-house PMM toolchain",
    category: "Spreadsheets + Notion + Loom",
    profile:
      "The default state at most growth-stage SaaS companies. Ad-hoc, owner-dependent, breaks when the PMM rotates.",
    edge:
      "Throughline replaces the toolchain with a tenant-scoped system the org owns, not the individual.",
  },
];

export const centralThesis =
  "Product marketing has never been the bottleneck. The work product PMM owns has been the bottleneck — always behind, always reset when someone leaves, always rebuilt from scratch when leadership changes. Throughline ships that work product on a weekly cadence, owned by the org instead of the individual, so the PMM function compounds.";

export const voicePillars = [
  {
    name: "Workflow-native",
    body: "Throughline replaces the work product, not the workflow. Output lands inside the systems the team already uses — Notion, Slack, Salesforce — instead of asking the team to context-switch into a new tool.",
  },
  {
    name: "Operationalized PMM",
    body: "Every output is built on a methodology with a name (five-element positioning, UVFV scoring, Kellogg battlecard structure). The PMM team can trust that the intelligence shipping each Monday was reasoned, not generated.",
  },
  {
    name: "Tenant-isolated by default",
    body: "Multi-brand from day one. Every row in every table carries a tenant_id. The agency, the platform, and the in-house PMM at a parent company can all run side-by-side without leaking signal.",
  },
];

export const throughLine = [
  "PMM teams are growing slower than the work demands",
  "Tooling treats PMM as content production, not operational reasoning",
  "Throughline ships the operational work product on a weekly cadence",
  "PMM compounds instead of resetting on every team change",
];

// Each workflow tagged with `roles: Role[]`. The sidebar workspace dropdown reads
// this to filter the visible workflow list. Multi-role tags (e.g. S-BC on
// sales + marketing) surface the workflow in both lenses. A0 + R-BR are tagged
// admin since onboarding is org-setup, not day-to-day work.
import type { Role } from "@/lib/persona";

export type AgentToolingItem = {
  name: string;
  code: string;
  purpose: string;
  cadence: string;
  status: string;
  roles: Role[];
};

export const agentTooling: AgentToolingItem[] = [
  {
    name: "Brand Initializer",
    code: "A0",
    purpose:
      "Form-driven brand setup. Seeds product context, business rules, buyer personas, and competitor list from a brand brief.",
    cadence: "On brand onboarding",
    status: "shipping",
    roles: ["admin"],
  },
  {
    name: "Competitive Intelligence",
    code: "R-CI",
    purpose:
      "Per-competitor dossier with strategic move, messaging drift, pricing intelligence, product signals, and competitive landmines.",
    cadence: "Weekly per competitor",
    status: "shipping",
    roles: ["marketing", "sales", "product"],
  },
  {
    name: "Market Signal Engine",
    code: "R-MS",
    purpose:
      "News, funding rounds, product launches. Every signal passes through the Throughline filters: So What test, strategic divergence, impact 1–10, sentiment.",
    cadence: "Daily scan",
    status: "shipping",
    roles: ["marketing", "sales", "product"],
  },
  {
    name: "Roadmap Steering",
    code: "S-RM",
    purpose:
      "UVFV scoring (Usable, Valuable, Feasible, Viable) on every roadmap candidate. Output: BUILD / INVESTIGATE / DEFER / KILL with rationale.",
    cadence: "Monthly review",
    status: "shipping",
    roles: ["product"],
  },
  {
    name: "Customer Feedback Synth",
    code: "R-CF",
    purpose:
      "Clusters NPS, support tickets, and call transcripts into theme rollups with urgency and revenue impact scoring.",
    cadence: "Weekly",
    status: "shipping",
    roles: ["marketing", "product", "customer_success"],
  },
  {
    name: "Positioning Engine",
    code: "S-PO",
    purpose:
      "Five-element framework: Competitive Alternatives, Distinct Capabilities, Differentiated Value, Best-Fit Accounts, Market Category.",
    cadence: "Monthly + on-demand",
    status: "shipping",
    roles: ["marketing"],
  },
  {
    name: "Messaging Generator",
    code: "D-MG",
    purpose:
      "Channel-aware messaging library plus campaign briefs across 10 channels. Each message ties back to a positioning anchor.",
    cadence: "Weekly + on-demand",
    status: "shipping",
    roles: ["marketing"],
  },
  {
    name: "Battlecard Generator",
    code: "S-BC",
    purpose:
      "Per-competitor battlecards using Kellogg functional/monetary/psychological value-prop structure plus kill points and objection handling.",
    cadence: "Quarterly + on-demand",
    status: "shipping",
    roles: ["sales", "marketing"],
  },
  {
    name: "Sales Narrative",
    code: "D-SN",
    purpose:
      "5-act narrative arc tying competitive intel, market signals, and positioning into executive-ready storytelling for sales kickoff and board updates.",
    cadence: "Quarterly",
    status: "shipping",
    roles: ["sales"],
  },
  {
    name: "Pricing & Packaging",
    code: "R-PP",
    purpose:
      "Per-competitor pricing snapshot: model (tiered/usage/seat), tier breakdown, recent changes, and the positioning implications of each shift. Synthesizes from R-CI dossiers and R-MS pricing signals.",
    cadence: "Weekly per competitor",
    status: "shipping",
    roles: ["marketing", "product"],
  },
  {
    name: "Win/Loss Analyst",
    code: "R-WL",
    purpose:
      "Per-deal teardown: outcome, primary factors, key quotes from rep notes, patterns across deals, and the recommendation that follows. Reads dummy CRM data + R-CI dossiers.",
    cadence: "Weekly batch",
    status: "shipping",
    roles: ["sales", "marketing"],
  },
  {
    name: "Customer Evidence",
    code: "R-EV",
    purpose:
      "Curated library of customer quotes, case studies, NPS verbatims, and metrics with attribution and legal status. Source-of-truth for proof in messaging and analyst materials.",
    cadence: "Weekly + on-demand",
    status: "shipping",
    roles: ["customer_success", "marketing", "sales"],
  },
  {
    name: "Product Feedback",
    code: "R-PF",
    purpose:
      "Themed product feedback from support tickets, sales calls, NPS, and interviews. Severity-scored, recurrence-tracked, linked back to roadmap items where applicable.",
    cadence: "Weekly",
    status: "shipping",
    roles: ["product", "customer_success"],
  },
  {
    name: "Analyst Relations",
    code: "S-AR",
    purpose:
      "Briefing prep for Gartner / Forrester / IDC: key messages, proof points, competitor framing, and likely questions. Synthesizes from S-PO, R-CI, S-RM, and R-EV.",
    cadence: "Per briefing",
    status: "shipping",
    roles: ["marketing"],
  },
  {
    name: "Launch Planning",
    code: "S-LP",
    purpose:
      "Channel-aware launch plan: target personas, messaging pillars, channel plan, and success metrics. Reads S-PO positioning, buyer_personas, and existing content_outputs.",
    cadence: "Per launch",
    status: "shipping",
    roles: ["marketing", "product"],
  },
  {
    name: "Brand Repository",
    code: "R-BR",
    purpose:
      "Brand Code Ingestion. Conversational onboarding (~12 questions) feeds Claude Sonnet, which extracts brand voice rules, proof points, product capabilities, and buyer personas. Every downstream agent reads from these tables.",
    cadence: "On brand onboarding + on demand",
    status: "shipping",
    roles: ["admin", "marketing"],
  },
  {
    name: "Counter-Narrative Responder",
    code: "D-CN",
    purpose:
      "Designed for autonomous firing on R-MS signals. Currently runs on-demand only (scheduled trigger disabled to avoid API credit consumption). Drafts a one-page counter-narrative (rep talking points, suggested LinkedIn post, email reply template) for every signal that meets the compound trigger rule (impact 8+ OR impact 7 + bearish + sensitive category).",
    cadence: "On-demand (auto-trigger paused)",
    status: "shipping",
    roles: ["marketing", "sales"],
  },
  {
    name: "Email Distributor",
    code: "X-EM",
    purpose:
      "Mock-first Resend adapter (PLAN §4d). Sends an approved content_outputs or counter_narrative artifact and writes synthetic open / click / reply events to campaign_metrics so S-CP can analyze. Real credentials swap in via admin settings without code changes.",
    cadence: "On-demand",
    status: "shipping",
    roles: ["marketing"],
  },
  {
    name: "LinkedIn Queue",
    code: "X-LI",
    purpose:
      "Mock-first LinkedIn adapter. Queues an approved artifact for posting and writes synthetic impressions / reactions / replies to campaign_metrics. Real account integration swaps in later; queue + manual paste is the v1 real path.",
    cadence: "On-demand",
    status: "shipping",
    roles: ["marketing"],
  },
  {
    name: "Outreach Distributor",
    code: "X-OR",
    purpose:
      "Mock-first Outreach.io sequence adapter. Synthetic sequence engagement (open / reply / book) until real Outreach credentials are connected. Always sends a sample of 50 personas from buyer_personas + customer_evidence for realism.",
    cadence: "On-demand",
    status: "shipping",
    roles: ["sales"],
  },
  {
    name: "Apollo Distributor",
    code: "X-AP",
    purpose:
      "Mock-first Apollo.io sequence adapter. Mirrors X-OR's pattern with Apollo-specific event names. Real-credential swap-in deferred until Apollo workspace is provisioned for the tenant.",
    cadence: "On-demand",
    status: "shipping",
    roles: ["sales"],
  },
  {
    name: "Campaign Performance Analyst",
    code: "S-CP",
    purpose:
      "Reads campaign_metrics (real or mock) and writes campaign_performance rollups: which messaging theme is winning, which channels outperform, attributed pipeline. Feeds S-PO positioning and D-MG messaging so the next refresh weighs winning themes more heavily. This is the closed loop.",
    cadence: "On-demand (weekly recommended)",
    status: "shipping",
    roles: ["marketing", "sales"],
  },
  {
    name: "Objection Handler",
    code: "D-OB",
    purpose:
      "Synthesizes battlecards + win/loss patterns + buyer personas into structured objection-handler entries (objection, why it comes up, response framework, proof point, escalation path). Sales-facing collateral asset.",
    cadence: "Quarterly + on demand",
    status: "shipping",
    roles: ["sales"],
  },
  {
    name: "QBR Template",
    code: "D-QB",
    purpose:
      "Generates a customer-segment-tailored QBR deck outline: success milestones, expansion signals, risk flags, recommended next-quarter agenda. Reads customer_evidence + product_feedback + feedback_themes.",
    cadence: "Quarterly per segment",
    status: "shipping",
    roles: ["customer_success"],
  },
  {
    name: "Customer Health Playbook",
    code: "D-HP",
    purpose:
      "Customer-success playbook keyed to a health pattern: early-warning signals, intervention scripts, escalation paths, recovery proof. Reads product_feedback + feedback_themes + customer_evidence.",
    cadence: "Monthly + on demand",
    status: "shipping",
    roles: ["customer_success"],
  },
  {
    name: "Win Wire",
    code: "D-WW",
    purpose:
      "Post-deal teardown for internal celebration + replication: deal arc, decisive moment, who said what, replicable plays. Reads win_loss_analyses + battlecards. Internal-facing.",
    cadence: "Per closed-won deal",
    status: "shipping",
    roles: ["sales", "marketing"],
  },
  {
    name: "Expansion Play",
    code: "D-XP",
    purpose:
      "Account-expansion playbook: triggers to watch for, the multi-thread plan (who to engage where), expansion talk track, and the proof points that land. Reads customer_evidence + product_capabilities + buyer_personas. CS + AE collaboration asset.",
    cadence: "Per account or quarterly",
    status: "shipping",
    roles: ["customer_success", "sales"],
  },
  {
    name: "Renewal Talk Track",
    code: "D-RT",
    purpose:
      "Renewal-call playbook keyed to a customer-health pattern: value-realized recap script, risk acknowledgement, expansion bridge, deal-saver play. Reads customer_evidence + product_feedback + campaign_performance (so winning themes inform the talk track).",
    cadence: "Per renewal cycle",
    status: "shipping",
    roles: ["customer_success"],
  },
  {
    name: "Customer Revenue Analyst",
    code: "R-CR",
    purpose:
      "First of four ICP sub-agents. Sorts the customer base by NRR + LTV + adoption signals, filters out support-burdened or low-adoption accounts, outputs a top-decile 'super user' cohort. Lands in HITL Gate 1 so PMM can scrub legacy whales before R-CE enrichment + R-VC voice extraction run downstream.",
    cadence: "Quarterly + on demand",
    status: "shipping",
    roles: ["marketing", "sales", "product"],
  },
  {
    name: "Customer Enrichment",
    code: "R-CE",
    purpose:
      "Second ICP sub-agent. Takes the approved super-user cohort domains and looks up firmographics, technographic stack, and corporate trigger signals via web search and (eventually) Apollo / Clearbit / BuiltWith APIs. Outputs a clustered enrichment matrix that feeds S-IC.",
    cadence: "After every approved cohort",
    status: "shipping",
    roles: ["marketing", "sales", "product"],
  },
  {
    name: "Voice of Customer",
    code: "R-VC",
    purpose:
      "Third ICP sub-agent. Extracts the emotional why and compelling events behind purchases from customer evidence + win/loss notes + (eventually) Gong/Chorus transcripts. Captures pain vocabulary verbatim. Lands in HITL Gate 2 with a single-customer drift indicator so PMM can spot over-indexing on a vocal outlier before S-IC synthesizes.",
    cadence: "After every approved cohort",
    status: "shipping",
    roles: ["marketing", "sales", "customer_success"],
  },
  {
    name: "ICP Synthesizer",
    code: "S-IC",
    purpose:
      "Final ICP sub-agent. Merges the quant cohort + enrichment with the qual voice-of-customer pains into the canonical ICP playbook: firmographics, technographics, triggers, primary pains, buying committee, anti-ICP. One active row per brand, versioned. On approval, auto-refreshes S-PO's best-fit-accounts element.",
    cadence: "Quarterly + on demand",
    status: "shipping",
    roles: ["marketing", "sales", "product"],
  },
  {
    name: "Daily Brief",
    code: "S-DB",
    purpose:
      "Powers the 'what should I focus on today' panel at the top of the dashboard. Reads pending HITL load, high-impact market signals, launches in flight, margin floor breaches, and stale runs — synthesizes 3-5 ranked focus items via Gemini Flash. Operator-only surface; no HITL gate.",
    cadence: "On demand (click the Brief me button)",
    status: "shipping",
    roles: ["marketing", "sales", "product", "customer_success", "admin"],
  },
];

export const positioningElements = [
  {
    label: "Competitive alternatives",
    body: "Spreadsheets, scattered Slack threads, an analyst PDF a teammate emailed last quarter, and the half-finished battlecard wiki nobody updates.",
    evidence:
      "47 of 50 surveyed Series B–D PMM teams reported their primary 'system' is a Notion page maintained by one person.",
  },
  {
    label: "Distinct capabilities",
    body: "Workflow-native intelligence that runs the same way every Monday, writes back to a single tenant-scoped store, and uses methodologies with names so the output is auditable.",
    evidence:
      "Nine-agent pipeline shipping A0→A9 in 12–15 minutes per run, every output traceable to a framework row in the methodology table.",
  },
  {
    label: "Differentiated value",
    body: "Replace 4–6 hours per week of competitive intel grunt work with a dashboard that updates while the team sleeps. Continuity through PMM rotation — the work product compounds with the org, not the individual.",
    evidence:
      "Pilot benchmarks: 12 hrs/week saved per seat, 9-week median compress to 2-week iteration cycle on positioning updates.",
  },
  {
    label: "Best-fit accounts",
    body: "PMM and product leaders at 50–500 person B2B SaaS companies in competitive categories with quarterly positioning cycles, where intelligence work is currently owner-dependent and at risk of resetting on team changes.",
    evidence:
      "ICP confirmed across 12 customer-discovery conversations: Series B–D B2B SaaS, $20M–$200M ARR, 1–3 PMM seats, multi-competitor categories.",
  },
  {
    label: "Market category",
    body: "AI Native Workflow Modernization System for enterprise GTM teams. Adjacent to competitive intelligence and sales enablement platforms, but the category framing is workflow modernization, not point tooling.",
    evidence:
      "Throughline isn't shipped as a battlecard tool or a CI platform. It's positioned as the operating system PMM functions are built on.",
  },
];
