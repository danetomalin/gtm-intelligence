// Persona Lens — Capability 1 in PLAN.md.
// Role taxonomy + title-to-role lookup. Decision 2026-05-22 (#1): onboarding
// asks for a free-text job title and maps it via this lookup. User can override
// if the auto-detected role looks wrong.

export type Role =
  | "marketing"
  | "sales"
  | "product"
  | "customer_success"
  | "admin";

// Ordered most-specific to least-specific. First match wins. Matching is
// case-insensitive via the regex `i` flag. Specific roles (e.g. "product
// marketing") must appear before broader ones (e.g. plain "product") so the
// claim lands correctly.
const TITLE_PATTERNS: { pattern: RegExp; role: Role }[] = [
  { pattern: /product\s*marketing|\bpmm\b/i, role: "marketing" },
  { pattern: /customer\s*success|customer\s*experience|\bcsm\b|\bcs\s*lead\b/i, role: "customer_success" },
  { pattern: /\bsales\b|\bae\b|account\s*executive|\bbdr\b|\bsdr\b|\brevops\b|sales\s*engineer/i, role: "sales" },
  { pattern: /demand\s*gen|\bmarketing\b|content\s*marketing|growth/i, role: "marketing" },
  { pattern: /\bproduct\b|product\s*manager|\bpm\b/i, role: "product" },
  { pattern: /founder|\bceo\b|\bcoo\b|\bcto\b|chief|admin/i, role: "admin" },
];

/**
 * Maps a free-text title to a Role. Returns `null` if the title doesn't match
 * any known pattern. Callers should surface the auto-detected role in the
 * onboarding UI and let the user override.
 */
export function titleToRole(title: string | null | undefined): Role | null {
  if (!title) return null;
  for (const { pattern, role } of TITLE_PATTERNS) {
    if (pattern.test(title)) return role;
  }
  return null;
}

// Roles that get a dedicated workspace landing page. `admin` is intentionally
// excluded: admins see the same landing as marketing by default and switch
// workspaces via the sidebar pill.
export const WORKSPACE_ROLES: Role[] = [
  "marketing",
  "sales",
  "product",
  "customer_success",
];

export const ROLE_LABEL: Record<Role, string> = {
  marketing: "Marketing",
  sales: "Sales",
  product: "Product",
  customer_success: "Customer Success",
  admin: "Admin",
};

// Short label for the sidebar pill (limited horizontal space).
export const ROLE_LABEL_SHORT: Record<Role, string> = {
  marketing: "Marketing",
  sales: "Sales",
  product: "Product",
  customer_success: "CS",
  admin: "Admin",
};

export const ROLE_TAGLINE: Record<Role, string> = {
  marketing: "Positioning, messaging, market signals",
  sales: "Battlecards, narratives, what to say next",
  product: "Roadmap, feedback themes, competitive product signals",
  customer_success: "Customer evidence, escalations, value articulation",
  admin: "All views, configuration",
};

export function isValidRole(input: string): input is Role {
  return (WORKSPACE_ROLES as string[]).includes(input) || input === "admin";
}

// ─── Workspace lens (sidebar) ────────────────────────────────────────────────
// `Lens` extends `Role` with an "all" option for the admin view that shows
// every role's outputs and workflows. The sidebar dropdown switches between
// these. Default lens is "all" until the user picks (persisted via localStorage).

export type Lens = Role | "all";

export const LENS_OPTIONS: Lens[] = [
  "all",
  "marketing",
  "sales",
  "product",
  "customer_success",
];

export const LENS_LABEL: Record<Lens, string> = {
  all: "All workspaces",
  marketing: "Marketing",
  sales: "Sales",
  product: "Product",
  customer_success: "Customer Success",
  admin: "Admin",
};

export type WorkspaceOutput = {
  name: string;
  href: string;
  hint: string;
};

// Per-role static output pages (non-workflow surfaces). The workspace
// dashboard always leads; role-specific deliverable pages follow.
export const LENS_OUTPUTS: Record<Role, WorkspaceOutput[]> = {
  marketing: [
    {
      name: "Marketing dashboard",
      href: "/workspace/marketing",
      hint: "Role-specific landing",
    },
    {
      name: "Market Context",
      href: "/market-context",
      hint: "Category dynamics",
    },
    { name: "Brand Voice", href: "/brand-voice", hint: "Thesis + pillars" },
    { name: "Positioning", href: "/positioning", hint: "5-element framework" },
  ],
  sales: [
    {
      name: "Sales dashboard",
      href: "/workspace/sales",
      hint: "Role-specific landing",
    },
  ],
  product: [
    {
      name: "Product dashboard",
      href: "/workspace/product",
      hint: "Role-specific landing",
    },
  ],
  customer_success: [
    {
      name: "CS dashboard",
      href: "/workspace/customer_success",
      hint: "Role-specific landing",
    },
    {
      name: "Customer Health",
      href: "/customer-health",
      hint: "VAR health model portfolio",
    },
  ],
  admin: [],
};

// Filters a workflow list to those tagged with `lensRole`. When the lens is
// "all", every workflow is returned. Stable iteration order: source list order.
export function filterWorkflowsForLens<T extends { roles: Role[] }>(
  workflows: T[],
  lens: Lens,
): T[] {
  if (lens === "all") return workflows;
  return workflows.filter((w) => w.roles.includes(lens));
}

// Returns the static output items for a lens.
//
// For the "all" lens, the layout is:
//   1. Every role dashboard, ordered by workflow count desc (Marketing first
//      because it has the most workflow coverage today, then Sales, Product,
//      CS). This way the sidebar lead-with what's most operationally relevant.
//   2. Non-dashboard outputs (Market Context, Brand Voice, Positioning) after,
//      preserving role-source order for stability.
//
// If `workflows` is omitted we fall back to LENS_ORDER (alphabetical-ish role
// order). When sidebar passes the live agentTooling list, the dashboards
// re-rank as workflows are added.
export function outputsForLens(
  lens: Lens,
  workflows?: { roles: Role[] }[],
): WorkspaceOutput[] {
  if (lens !== "all") {
    return LENS_OUTPUTS[lens] ?? [];
  }

  // Per-role workflow count powers dashboard ordering.
  const counts: Partial<Record<Role, number>> = {};
  if (workflows && workflows.length > 0) {
    for (const w of workflows) {
      for (const role of w.roles) {
        counts[role] = (counts[role] ?? 0) + 1;
      }
    }
  }

  // Sort the customer-facing roles by count desc. Ties break by the static
  // WORKSPACE_ROLES order (marketing → sales → product → CS) so behavior is
  // stable when the agentTooling list isn't provided.
  const sortedRoles = [...WORKSPACE_ROLES].sort((a, b) => {
    const diff = (counts[b] ?? 0) - (counts[a] ?? 0);
    if (diff !== 0) return diff;
    return WORKSPACE_ROLES.indexOf(a) - WORKSPACE_ROLES.indexOf(b);
  });

  const seen = new Set<string>();
  const dashboards: WorkspaceOutput[] = [];
  const extras: WorkspaceOutput[] = [];

  for (const role of sortedRoles) {
    const items = LENS_OUTPUTS[role] ?? [];
    // First item per role is the role dashboard by convention; everything
    // after it is a non-dashboard output (only Marketing has any currently).
    const [dashboard, ...rest] = items;
    if (dashboard && !seen.has(dashboard.href)) {
      seen.add(dashboard.href);
      dashboards.push(dashboard);
    }
    for (const item of rest) {
      if (!seen.has(item.href)) {
        seen.add(item.href);
        extras.push(item);
      }
    }
  }

  return [...dashboards, ...extras];
}

// ─── Workflow layer grouping (sidebar) ───────────────────────────────────────
// Each workflow's code starts with a layer prefix (R-/S-/D-/X- plus the
// legacy A0). The sidebar groups workflows under layer-named subheaders so
// the section header carries the layer info and individual rows can drop the
// per-workflow code badge.

export type LayerKey = "R" | "S" | "D" | "X" | "A" | "I";

export const LAYER_ORDER: LayerKey[] = ["R", "S", "D", "X", "I", "A"];

export const LAYER_LABEL: Record<LayerKey, string> = {
  R: "Research",
  S: "Synthesis",
  D: "Delivery",
  X: "Distribution",
  I: "Integrations",
  A: "Setup",
};

export type WorkflowGroup<T> = {
  key: LayerKey;
  label: string;
  workflows: T[];
};

/**
 * Returns the layer key for a workflow code. Falls back to "A" for anything
 * that doesn't match a known prefix so unexpected codes don't disappear.
 */
export function layerForCode(code: string): LayerKey {
  const first = code?.[0]?.toUpperCase();
  if (first === "R" || first === "S" || first === "D" || first === "X" || first === "I") {
    return first;
  }
  return "A";
}

/**
 * Groups workflows by layer prefix and returns groups in LAYER_ORDER, omitting
 * empty groups. Caller is expected to have already filtered the workflow list
 * to the current lens via filterWorkflowsForLens.
 */
export function groupWorkflowsByLayer<T extends { code: string }>(
  workflows: T[],
): WorkflowGroup<T>[] {
  const buckets = new Map<LayerKey, T[]>();
  for (const w of workflows) {
    const layer = layerForCode(w.code);
    if (!buckets.has(layer)) buckets.set(layer, []);
    buckets.get(layer)!.push(w);
  }
  const groups: WorkflowGroup<T>[] = [];
  for (const key of LAYER_ORDER) {
    const items = buckets.get(key);
    if (!items || items.length === 0) continue;
    groups.push({ key, label: LAYER_LABEL[key], workflows: items });
  }
  return groups;
}
