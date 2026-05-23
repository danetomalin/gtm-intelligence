// Demo content for the Throughline app. Mirrors the Gradial-portfolio
// narrative style but written from Throughline's perspective. Real data
// comes from Supabase once A0–A9 is wired to write back to the tenant.

export const demoBrand = {
  id: "demo-brand-id",
  name: "Throughline",
  website_url: "https://throughline.io",
  category: "AI Native Workflow Modernization System",
};

export const overviewStats = [
  { label: "Time saved per week", value: "12 hrs", sublabel: "per PMM seat" },
  { label: "Brands monitored", value: "1", sublabel: "Throughline pilot" },
  { label: "Agents shipping", value: "9", sublabel: "A0 → A9 chain" },
  { label: "Tenant isolation", value: "RLS", sublabel: "Postgres-enforced" },
];

export const overviewBlurb =
  "Throughline runs the GTM intelligence work product marketing, customer success, sales, and product teams have always built by hand. Nine agents move in sequence from brand initialization through positioning, battlecards, and sales narrative, with every output landing in a tenant-scoped store the team can read like a dashboard.";

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
  "Product marketing is hitting an inflection in 2026. The work is moving from artisanal (briefs, narratives, battlecards built by hand) to operational (the same outputs shipped weekly, scoped per brand, fed by structured intelligence). Most PMM teams haven't made the jump because the tooling treats marketing as content production instead of operational reasoning. Throughline closes the gap by deploying a nine-agent pipeline that produces the actual work product PMM owns — not generated drafts to be edited, finished intelligence to be shipped.";

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
    body: "Throughline replaces the work product, not the workflow. Output lands inside the systems the team already uses — Notion, Slack, Salesforce, n8n — instead of asking the team to context-switch into a new tool.",
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

export const agentTooling = [
  {
    name: "Brand Initializer",
    code: "A0",
    purpose:
      "Form-driven brand setup. Seeds product context, business rules, buyer personas, and competitor list from a brand brief.",
    cadence: "On brand onboarding",
    status: "shipping",
  },
  {
    name: "Competitive Intelligence",
    code: "A1",
    purpose:
      "Per-competitor dossier with strategic move, messaging drift, pricing intelligence, product signals, and competitive landmines.",
    cadence: "Weekly per competitor",
    status: "shipping",
  },
  {
    name: "Market Signal Engine",
    code: "A2",
    purpose:
      "News, funding rounds, product launches. Every signal passes through the Moloco-First filters: So What test, strategic divergence, impact 1–10, sentiment.",
    cadence: "Daily scan",
    status: "shipping",
  },
  {
    name: "Roadmap Steering",
    code: "A3",
    purpose:
      "UVFV scoring (Usable, Valuable, Feasible, Viable) on every roadmap candidate. Output: BUILD / INVESTIGATE / DEFER / KILL with rationale.",
    cadence: "Monthly review",
    status: "shipping",
  },
  {
    name: "Customer Feedback Synth",
    code: "A4",
    purpose:
      "Clusters NPS, support tickets, and call transcripts into theme rollups with urgency and revenue impact scoring.",
    cadence: "Weekly",
    status: "shipping",
  },
  {
    name: "Positioning Engine",
    code: "A5",
    purpose:
      "Five-element framework: Competitive Alternatives, Distinct Capabilities, Differentiated Value, Best-Fit Accounts, Market Category.",
    cadence: "Monthly + on-demand",
    status: "shipping",
  },
  {
    name: "Messaging Generator",
    code: "A6",
    purpose:
      "Channel-aware messaging library plus campaign briefs across 10 channels. Each message ties back to a positioning anchor.",
    cadence: "Weekly + on-demand",
    status: "shipping",
  },
  {
    name: "Battlecard Generator",
    code: "A7",
    purpose:
      "Per-competitor battlecards using Kellogg functional/monetary/psychological value-prop structure plus kill points and objection handling.",
    cadence: "Quarterly + on-demand",
    status: "shipping",
  },
  {
    name: "Sales Narrative",
    code: "A8",
    purpose:
      "5-act narrative arc tying competitive intel, market signals, and positioning into executive-ready storytelling for sales kickoff and board updates.",
    cadence: "Quarterly",
    status: "shipping",
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
