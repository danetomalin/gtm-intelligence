// ============================================================
// DATA SOURCE INTEGRATION CATALOG — the hypothesis for what it
// takes to make the VAR model run on real data.
// Each source maps to specific VAR pillars and engine inputs, and
// each connected source raises the Data Confidence score's
// "source diversity" component (Section 2B).
// Status here is mock until real OAuth/connector work lands.
// ============================================================

export type IntegrationStatus = "connected" | "available" | "planned";

export interface Integration {
  id: string;
  name: string;
  status: IntegrationStatus;
}

export interface IntegrationCategory {
  id: string;
  label: string;
  pillars: string[]; // which VAR pillars / engines this feeds
  signals: string[]; // concrete model inputs powered by this category
  priority: "P0" | "P1" | "P2"; // build priority for a real product
  rationale: string;
  integrations: Integration[];
}

export const INTEGRATION_CATALOG: IntegrationCategory[] = [
  {
    id: "crm",
    label: "CRM & Revenue",
    pillars: ["Account master", "Value", "Renewal engine"],
    signals: ["Account & contact structure", "Contract terms + renewal dates", "ARR / expansion history", "CSM & AE sentiment fields", "Churn reason codes at close"],
    priority: "P0",
    rationale: "The account spine. Nothing else can be joined without it, and renewal dates drive stage assignment.",
    integrations: [
      { id: "salesforce", name: "Salesforce", status: "available" },
      { id: "hubspot", name: "HubSpot", status: "available" },
    ],
  },
  {
    id: "product",
    label: "Product Analytics",
    pillars: ["Adoption"],
    signals: ["User penetration (named users)", "Feature breadth", "Usage frequency vs. cohort", "Adoption trajectory 60-90d", "Workflow integration depth", "Output utilization (AI products)"],
    priority: "P0",
    rationale: "The Adoption pillar is the strongest leading indicator set, and named-user data is the most commonly missing input (maturity framework's hardest gap).",
    integrations: [
      { id: "segment", name: "Segment", status: "available" },
      { id: "mixpanel", name: "Mixpanel", status: "available" },
      { id: "amplitude", name: "Amplitude", status: "available" },
      { id: "pendo", name: "Pendo", status: "planned" },
    ],
  },
  {
    id: "support",
    label: "Support",
    pillars: ["Adoption sub-score", "Relationship sub-score"],
    signals: ["Ticket volume trend (2x spike trigger)", "% tickets on core features", "Repeat issue rate", "Resolution vs. SLA", "Support CSAT (Tier 1 trigger below 3.0)", "Escalation frequency + severity"],
    priority: "P0",
    rationale: "Feeds both pillars and two override triggers. High signal-to-effort ratio — support APIs are mature.",
    integrations: [
      { id: "zendesk", name: "Zendesk", status: "available" },
      { id: "intercom", name: "Intercom", status: "available" },
      { id: "freshdesk", name: "Freshdesk", status: "planned" },
    ],
  },
  {
    id: "survey",
    label: "Survey & Voice of Customer",
    pillars: ["Relationship", "Outcomes (NPS/CSAT)"],
    signals: ["NPS by stakeholder seniority (Tier 1 detractor trigger)", "CSAT score + completion rate", "Verbatim theme + sentiment (NLP)", "Score-verbatim divergence"],
    priority: "P1",
    rationale: "Score-verbatim divergence is more predictive than the score alone — requires verbatim text access, not just numbers.",
    integrations: [
      { id: "qualtrics", name: "Qualtrics", status: "available" },
      { id: "delighted", name: "Delighted", status: "available" },
      { id: "surveymonkey", name: "SurveyMonkey", status: "planned" },
    ],
  },
  {
    id: "conversation",
    label: "Conversation Intelligence",
    pillars: ["Relationship (Emerging Signals)"],
    signals: ["Meeting tone trajectory", "Topic drift: strategic → transactional", "Engagement patterns (who attends, question volume)", "Champion language shift detection"],
    priority: "P1",
    rationale: "Powers the meeting tone trajectory metric — the highest-value emerging signal. Gong API access is the gating factor.",
    integrations: [
      { id: "gong", name: "Gong", status: "available" },
      { id: "chorus", name: "Chorus", status: "planned" },
      { id: "fireflies", name: "Fireflies", status: "planned" },
    ],
  },
  {
    id: "email",
    label: "Email & Calendar",
    pillars: ["Relationship"],
    signals: ["Email response latency trend", "Exec touchpoint frequency", "Champion communication cadence", "Ghosting detection (no reply N days)", "QBR completion from calendar"],
    priority: "P1",
    rationale: "Response latency slowdown is one of the most consistent early churn signals. Metadata only — no message content needed.",
    integrations: [
      { id: "google", name: "Google Workspace", status: "available" },
      { id: "microsoft", name: "Microsoft 365", status: "available" },
    ],
  },
  {
    id: "finance",
    label: "Finance & Billing",
    pillars: ["Value", "Renewal engine", "Outcomes (GDR/NDR)"],
    signals: ["ARR ground truth", "Contraction events", "Payment health / late invoices", "Expansion bookings"],
    priority: "P2",
    rationale: "CRM usually carries ARR adequately at first; direct billing data matters once GDR/NDR reporting must tie to finance.",
    integrations: [
      { id: "stripe", name: "Stripe", status: "available" },
      { id: "netsuite", name: "NetSuite", status: "planned" },
    ],
  },
  {
    id: "warehouse",
    label: "Data Warehouse & Files",
    pillars: ["All pillars (bulk feed)"],
    signals: ["Direct VAR metric feed from customer's modeled data", "Historical backfill for trend baselines", "CSV import for cold start / Tier 1 maturity companies"],
    priority: "P0",
    rationale: "The bypass lane: mature companies feed the model straight from Snowflake/dbt. CSV import is the day-one onboarding path for everyone else.",
    integrations: [
      { id: "snowflake", name: "Snowflake", status: "available" },
      { id: "bigquery", name: "BigQuery", status: "planned" },
      { id: "csv", name: "CSV Import", status: "connected" },
    ],
  },
];

// ---------- mock connection state (localStorage) ----------

const STORAGE_KEY = "cs-health.connectedSources";

export function loadConnectedSources(): string[] {
  if (typeof window === "undefined") return ["csv"];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : ["csv"];
  } catch {
    return ["csv"];
  }
}

export function toggleConnectedSource(id: string): string[] {
  const current = loadConnectedSources();
  const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id];
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
