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
