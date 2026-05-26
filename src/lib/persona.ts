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

// Returns the static output items for a lens. "all" merges every role's items,
// de-duplicated by href, preserving first-occurrence order.
export function outputsForLens(lens: Lens): WorkspaceOutput[] {
  if (lens !== "all") {
    return LENS_OUTPUTS[lens] ?? [];
  }
  const seen = new Set<string>();
  const merged: WorkspaceOutput[] = [];
  for (const role of WORKSPACE_ROLES) {
    for (const item of LENS_OUTPUTS[role]) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      merged.push(item);
    }
  }
  return merged;
}
