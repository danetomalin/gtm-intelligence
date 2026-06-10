// ============================================================
// Marketing Health — deterministic mock data (Phase B.1, re-themed
// to Deputy 2026-06-10). Workforce-management campaign portfolio so
// the marketing story lines up with the demo brand: SMB rivals
// (Homebase, When I Work) bidding on branded search, a healthcare
// shift-ops launch ramping, the compliance content hub compounding.
// Numbers unchanged from the original set — names/notes only.
// Swap for Supabase reads in a later phase — UI reads only DATA.
// ============================================================

import type { Campaign, FunnelStage, MarketingTrendMetric } from "./types";
import { deriveSignal } from "./rollups";

const campaigns: Campaign[] = [
  // ── Paid search ─────────────────────────────────────────────
  {
    id: "C01",
    name: "Scheduling Software — Branded Defense",
    channel: "paid_search",
    objective: "demand_gen",
    status: "active",
    owner: "Maya R.",
    startedAt: "2026-01-12",
    weekly: {
      spend: [42000, 44000, 51000, 58000],
      impressions: [310000, 305000, 318000, 322000],
      clicks: [12400, 12100, 12600, 12300],
      mqls: [410, 396, 378, 344],
      pipeline: [510000, 488000, 452000, 405000],
    },
    note: "Homebase and When I Work bidding on Deputy branded terms — CPC up 31%, CPL climbing 3 straight weeks.",
  },
  {
    id: "C02",
    name: "Employee Scheduling Non-Brand — Search",
    channel: "paid_search",
    objective: "demand_gen",
    status: "active",
    owner: "Maya R.",
    startedAt: "2025-09-01",
    weekly: {
      spend: [38000, 38500, 37800, 38200],
      impressions: [288000, 292000, 285000, 290000],
      clicks: [9800, 9900, 9750, 9850],
      mqls: [365, 372, 360, 368],
      pipeline: [398000, 405000, 392000, 401000],
    },
  },
  {
    id: "C03",
    name: "Healthcare Shift Ops Launch — Search",
    channel: "paid_search",
    objective: "launch",
    status: "active",
    owner: "Jordan P.",
    startedAt: "2026-05-04",
    weekly: {
      spend: [22000, 26000, 30000, 34000],
      impressions: [148000, 175000, 210000, 248000],
      clicks: [4400, 5600, 7100, 8900],
      mqls: [128, 168, 224, 296],
      pipeline: [98000, 142000, 196000, 264000],
    },
    note: "Launch ramp ahead of plan — CPL falling as quality score improves.",
  },
  // ── Paid social ─────────────────────────────────────────────
  {
    id: "C04",
    name: "Hourly Work Stories — IG/TikTok",
    channel: "paid_social",
    objective: "brand",
    status: "active",
    owner: "Sam K.",
    startedAt: "2026-02-02",
    weekly: {
      spend: [31000, 31500, 33800, 36200],
      impressions: [2050000, 2010000, 1890000, 1760000],
      clicks: [22500, 21400, 19200, 17100],
      mqls: [188, 176, 158, 139],
      pipeline: [142000, 131000, 118000, 102000],
    },
    note: "Homebase's free-tier push is bidding into the same SMB audiences — CPM up, engagement down.",
  },
  {
    id: "C05",
    name: "Retail Ops Retargeting",
    channel: "paid_social",
    objective: "demand_gen",
    status: "active",
    owner: "Sam K.",
    startedAt: "2025-11-10",
    weekly: {
      spend: [18500, 18200, 18800, 18600],
      impressions: [640000, 632000, 655000, 648000],
      clicks: [14100, 13900, 14400, 14200],
      mqls: [232, 228, 238, 234],
      pipeline: [255000, 249000, 262000, 258000],
    },
  },
  // ── Content / SEO ───────────────────────────────────────────
  {
    id: "C06",
    name: "Workforce Compliance Content Hub",
    channel: "content_seo",
    objective: "brand",
    status: "active",
    owner: "Lena T.",
    startedAt: "2025-08-18",
    weekly: {
      spend: [9000, 9000, 9000, 9000],
      impressions: [410000, 428000, 452000, 480000],
      clicks: [30700, 32200, 34100, 36400],
      mqls: [205, 214, 228, 244],
      pipeline: [168000, 176000, 188000, 202000],
    },
    note: "Organic compounding — compliance hub now beats paid social on pipeline per dollar.",
  },
  {
    id: "C07",
    name: "Fair Workweek SEO Cluster",
    channel: "content_seo",
    objective: "demand_gen",
    status: "active",
    owner: "Lena T.",
    startedAt: "2025-06-02",
    weekly: {
      spend: [6500, 6500, 6500, 6500],
      impressions: [355000, 348000, 361000, 352000],
      clicks: [24800, 24300, 25200, 24600],
      mqls: [186, 182, 189, 184],
      pipeline: [171000, 167000, 174000, 169000],
    },
  },
  // ── Email + lifecycle ───────────────────────────────────────
  {
    id: "C08",
    name: "Welcome Series — Healthcare Shift Ops",
    channel: "email",
    objective: "launch",
    status: "active",
    owner: "Priya D.",
    startedAt: "2026-05-04",
    weekly: {
      spend: [2500, 2500, 2500, 2500],
      impressions: [48000, 61000, 78000, 99000],
      clicks: [5300, 6900, 9000, 11600],
      mqls: [96, 126, 166, 218],
      pipeline: [72000, 95000, 126000, 168000],
    },
  },
  {
    id: "C09",
    name: "Winback — Lapsed Hospitality Accounts",
    channel: "lifecycle",
    objective: "lifecycle",
    status: "active",
    owner: "Priya D.",
    startedAt: "2026-03-09",
    weekly: {
      spend: [4200, 4200, 4200, 4200],
      impressions: [125000, 122000, 118000, 96000],
      clicks: [7500, 7200, 6700, 5100],
      mqls: [148, 141, 129, 98],
      pipeline: [122000, 116000, 104000, 78000],
    },
    note: "Deliverability slip after the June template change — inbox placement down 9pts.",
  },
  {
    id: "C10",
    name: "Seat Expansion Nudges",
    channel: "lifecycle",
    objective: "lifecycle",
    status: "active",
    owner: "Priya D.",
    startedAt: "2025-10-06",
    weekly: {
      spend: [3100, 3100, 3100, 3100],
      impressions: [88000, 90000, 87000, 91000],
      clicks: [6100, 6300, 6000, 6400],
      mqls: [122, 126, 119, 128],
      pipeline: [98000, 102000, 95000, 104000],
    },
  },
  // ── LinkedIn ────────────────────────────────────────────────
  {
    id: "C11",
    name: "Future of Hourly Work — Thought Leadership",
    channel: "linkedin",
    objective: "brand",
    status: "active",
    owner: "Jordan P.",
    startedAt: "2026-01-19",
    weekly: {
      spend: [12500, 12500, 13000, 13000],
      impressions: [420000, 435000, 441000, 459000],
      clicks: [5900, 6100, 6200, 6500],
      mqls: [74, 78, 79, 84],
      pipeline: [88000, 94000, 96000, 103000],
    },
  },
  {
    id: "C12",
    name: "Enterprise Retail ABM",
    channel: "linkedin",
    objective: "demand_gen",
    status: "paused",
    owner: "Jordan P.",
    startedAt: "2026-02-23",
    weekly: {
      spend: [8000, 8000, 0, 0],
      impressions: [96000, 92000, 0, 0],
      clicks: [1400, 1310, 0, 0],
      mqls: [22, 19, 0, 0],
      pipeline: [60000, 52000, 0, 0],
    },
    note: "Paused pending ICP refresh — CPL 3x the blended target.",
  },
  // ── Webinars + partner ──────────────────────────────────────
  {
    id: "C13",
    name: "Compliance Webinar Series",
    channel: "webinars",
    objective: "demand_gen",
    status: "active",
    owner: "Lena T.",
    startedAt: "2025-12-01",
    weekly: {
      spend: [7500, 7500, 7500, 7500],
      impressions: [36000, 38000, 35000, 39000],
      clicks: [2900, 3100, 2800, 3150],
      mqls: [88, 94, 85, 96],
      pipeline: [124000, 132000, 119000, 136000],
    },
  },
  {
    id: "C14",
    name: "Payroll Partner Co-Marketing",
    channel: "partner",
    objective: "demand_gen",
    status: "active",
    owner: "Sam K.",
    startedAt: "2026-04-06",
    weekly: {
      spend: [11000, 11000, 11000, 11000],
      impressions: [205000, 212000, 221000, 228000],
      clicks: [8200, 8500, 8900, 9200],
      mqls: [142, 148, 155, 161],
      pipeline: [158000, 165000, 173000, 180000],
    },
  },
];

// ── Funnel (all channels, weekly, oldest -> newest) ───────────
const funnel: FunnelStage[] = [
  { id: "sessions", label: "Sessions", unit: "count", weekly: [612000, 628000, 641000, 655000] },
  { id: "leads", label: "Leads", unit: "count", weekly: [14800, 15200, 15400, 15900] },
  { id: "mqls", label: "MQLs", unit: "count", weekly: [2406, 2470, 2508, 2594] },
  { id: "sqls", label: "SQLs", unit: "count", weekly: [842, 858, 845, 824] },
  { id: "opps", label: "Opportunities", unit: "count", weekly: [296, 301, 288, 271] },
  { id: "pipeline", label: "Pipeline $", unit: "dollars", weekly: [2464000, 2519000, 2495000, 2570000] },
];

// ── Aggregate trend metrics (Emerging Signals tab) ────────────
const trend = (
  label: string,
  unit: string,
  weeks: number[],
  higherIsBetter: boolean,
  note: string,
): MarketingTrendMetric => ({
  label,
  unit,
  weeks,
  higherIsBetter,
  signal: deriveSignal(weeks, higherIsBetter),
  note,
});

const aggregateTrends: MarketingTrendMetric[] = [
  trend("Blended CAC", "$", [318, 322, 341, 367], false,
    "Up 14% over 4 weeks — driven almost entirely by branded-search CPC inflation from SMB scheduling rivals."),
  trend("Branded search CPC", "$", [4.1, 4.3, 4.9, 5.6], false,
    "Homebase and When I Work bidding on Deputy branded terms. Defense budget decision needed."),
  trend("Email deliverability", "% inbox", [97.2, 96.8, 92.1, 88.3], false,
    "Slipping since the June template change. Lifecycle MQLs falling in lockstep — fix before scaling winback."),
  trend("Paid social CPM", "$", [11.2, 11.5, 12.6, 13.8], false,
    "Homebase's free-tier campaign bidding into the same SMB audiences. Consider creative refresh or audience shift."),
  trend("Organic sessions", "weekly", [298000, 312000, 331000, 354000], true,
    "Compliance hub compounding — fourth straight week of growth, now the cheapest MQL source."),
  trend("MQL → SQL rate", "%", [35.0, 34.7, 33.7, 31.8], false,
    "Volume up but quality dipping — launch-campaign MQLs converting 8pts below portfolio average. Tighten scoring."),
  trend("Webinar attendance rate", "%", [42, 44, 41, 45], true,
    "Healthy and stable. Compliance series remains the highest pipeline-per-dollar demand program."),
  trend("Brand search volume", "weekly", [88000, 90000, 93000, 97000], true,
    "Healthcare shift-ops launch lifting branded queries — halo effect visible within 5 weeks of launch."),
];

export function generateMarketingData() {
  return { campaigns, funnel, aggregateTrends };
}

export const MARKETING_DATA = generateMarketingData();

export type MarketingData = ReturnType<typeof generateMarketingData>;
