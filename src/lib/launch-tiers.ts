// Capability 7 Launch Readiness — tier matrix.
//
// Each launch tier maps to a set of required artifacts produced by specific
// agents. L-OR (Launch Orchestrator) reads this matrix at run time and fires
// the listed agents with `launch_id` in extras.
//
// Hard-coded in v1 per Decision #4 of Cap 7 open questions. Per-tenant
// override lands when a customer asks (new `launch_tier_rules` table).

export type LaunchTier =
  | "flagship"
  | "feature"
  | "bugfix"
  | "revenue_growth"
  | "revenue_retention";

export const LAUNCH_TIERS: LaunchTier[] = [
  "flagship",
  "feature",
  "bugfix",
  "revenue_growth",
  "revenue_retention",
];

export const TIER_LABEL: Record<LaunchTier, string> = {
  flagship: "Flagship",
  feature: "Feature",
  bugfix: "Bug Fix",
  revenue_growth: "Revenue Growth",
  revenue_retention: "Revenue Retention",
};

export const TIER_TAGLINE: Record<LaunchTier, string> = {
  flagship: "Category-defining launch. Full readiness pack across every layer.",
  feature: "Net-new functionality. Core messaging + sales + objection set.",
  bugfix: "Customer-meaningful fix. Internal comms; optional customer note.",
  revenue_growth: "Pricing / packaging / expansion. Sales-led plus distribution.",
  revenue_retention: "Churn-prevention / renewal-driving. CS-led artifacts.",
};

// Map from artifact spec to the agent that produces it and the table it lands
// in. Some agents (D-MG) produce different *quantities* depending on tier;
// quantity is enforced by the agent's system message, not by this matrix.
//
// `quantity` is a hint shown to the reviewer in the UI ("3 channels expected"),
// not a hard contract.
export type ArtifactSpec = {
  agent_code: string;
  artifact_table: string;
  label: string;
  audience: "marketing" | "sales" | "cs" | "internal" | "external";
  quantity?: string;
};

export type TierEntry = ArtifactSpec & { required: boolean };

const SPEC: Record<string, ArtifactSpec> = {
  "S-LP": {
    agent_code: "S-LP",
    artifact_table: "launch_plans",
    label: "Launch plan",
    audience: "internal",
  },
  "D-MG": {
    agent_code: "D-MG",
    artifact_table: "content_outputs",
    label: "Messaging",
    audience: "marketing",
  },
  "D-SN": {
    agent_code: "D-SN",
    artifact_table: "sales_collateral",
    label: "Sales narrative",
    audience: "sales",
  },
  "S-BC": {
    agent_code: "S-BC",
    artifact_table: "battlecards",
    label: "Battlecard refresh",
    audience: "sales",
  },
  "S-AR": {
    agent_code: "S-AR",
    artifact_table: "analyst_briefings",
    label: "Analyst briefing prep",
    audience: "external",
  },
  "D-OB": {
    agent_code: "D-OB",
    artifact_table: "enablement_assets",
    label: "Objection handler set",
    audience: "sales",
  },
  "D-QB": {
    agent_code: "D-QB",
    artifact_table: "enablement_assets",
    label: "QBR template section",
    audience: "cs",
  },
  "D-HP": {
    agent_code: "D-HP",
    artifact_table: "enablement_assets",
    label: "Customer health playbook",
    audience: "cs",
  },
  "D-XP": {
    agent_code: "D-XP",
    artifact_table: "enablement_assets",
    label: "Expansion play",
    audience: "cs",
  },
  "D-RT": {
    agent_code: "D-RT",
    artifact_table: "enablement_assets",
    label: "Renewal talk track",
    audience: "cs",
  },
  "D-WW": {
    agent_code: "D-WW",
    artifact_table: "enablement_assets",
    label: "Win wire (post-launch)",
    audience: "internal",
  },
  "X-EM": {
    agent_code: "X-EM",
    artifact_table: "campaign_sends",
    label: "Email distribution",
    audience: "external",
  },
  "X-LI": {
    agent_code: "X-LI",
    artifact_table: "campaign_sends",
    label: "LinkedIn distribution",
    audience: "external",
  },
  "X-OR": {
    agent_code: "X-OR",
    artifact_table: "campaign_sends",
    label: "Outreach sequence",
    audience: "external",
  },
  "X-AP": {
    agent_code: "X-AP",
    artifact_table: "campaign_sends",
    label: "Apollo sequence",
    audience: "external",
  },
};

function req(agent: string, quantity?: string): TierEntry {
  return { ...SPEC[agent]!, required: true, quantity };
}
function opt(agent: string, quantity?: string): TierEntry {
  return { ...SPEC[agent]!, required: false, quantity };
}

export const TIER_MATRIX: Record<LaunchTier, TierEntry[]> = {
  flagship: [
    req("S-LP"),
    req("D-MG", "5 channels"),
    req("D-SN"),
    req("S-BC", "all competitors"),
    req("S-AR"),
    req("D-OB"),
    opt("D-QB", "new section"),
    opt("D-XP"),
    req("D-WW"),
    req("X-EM"),
    req("X-LI"),
    req("X-OR"),
    opt("X-AP"),
  ],
  feature: [
    req("S-LP"),
    req("D-MG", "3 channels"),
    opt("D-SN"),
    req("S-BC", "top 2 competitors"),
    opt("S-AR"),
    req("D-OB"),
    opt("D-WW"),
    req("X-EM"),
    req("X-LI"),
  ],
  bugfix: [
    opt("S-LP"),
    req("D-MG", "internal-only"),
    opt("X-EM"),
  ],
  revenue_growth: [
    req("S-LP"),
    req("D-MG", "3 channels"),
    req("D-SN"),
    req("S-BC", "top 2 competitors"),
    req("D-OB"),
    req("D-QB"),
    req("D-XP"),
    opt("D-WW"),
    req("X-EM"),
    req("X-LI"),
    req("X-OR"),
    req("X-AP"),
  ],
  revenue_retention: [
    req("S-LP"),
    req("D-MG", "2 channels"),
    opt("D-SN"),
    opt("D-OB", "refresh existing"),
    req("D-QB"),
    req("D-HP"),
    req("D-RT"),
    req("X-EM"),
    req("X-LI", undefined),
  ],
};

export function requiredCountForTier(tier: LaunchTier): number {
  return TIER_MATRIX[tier].filter((e) => e.required).length;
}

export function totalCountForTier(tier: LaunchTier): number {
  return TIER_MATRIX[tier].length;
}

export function isValidTier(t: string): t is LaunchTier {
  return (LAUNCH_TIERS as string[]).includes(t);
}
