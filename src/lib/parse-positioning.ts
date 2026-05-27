// S-PO writes element bodies as numbered lists with dash-prefixed sub-attributes:
//
//   "1. Title A: - Does well: X. - Falls short: Y. - Tolerated because: Z.
//    2. Title B: - Does well: ..."
//
// Rendered raw, this is a wall of text. This parser detects the structure and
// breaks it into items + attributes so the card can render a table-style layout.
// Falls back gracefully: if no numbered list is detected, callers render the
// original string as a paragraph.

export type PositioningAttribute = {
  label: string;
  value: string;
};

export type PositioningItem = {
  index: number;
  title: string;
  attributes: PositioningAttribute[];
  // Any text that came before the first dash-attribute. Used for short
  // descriptive items that don't follow the Does/Falls/Tolerated pattern.
  leadText?: string;
};

export type ParsedPositioning =
  | { kind: "items"; items: PositioningItem[] }
  | { kind: "attributes"; attributes: PositioningAttribute[] }
  | null;

// Minimal shape the composer needs from a positioning_elements row.
type ComposerElement = {
  element_type: string | null;
  content: string | null;
};

// Tidy an element's content for splicing into the composed statement:
// trim whitespace, drop a single trailing period, collapse internal
// newlines. Optionally lowercase the first letter for mid-sentence joins.
function tidy(s: string | null | undefined, lowerFirst = false): string {
  if (!s) return "";
  let t = s.trim().replace(/\s+/g, " ").replace(/\.\s*$/, "");
  if (lowerFirst && t.length > 0) {
    // Only lowercase if it's not an acronym / proper noun start we want to
    // preserve. Heuristic: lowercase the first char unless the first word is
    // all-caps (likely an acronym).
    const firstWord = t.split(" ")[0];
    if (firstWord !== firstWord.toUpperCase()) {
      t = t.charAt(0).toLowerCase() + t.slice(1);
    }
  }
  return t;
}

/**
 * Compose an April Dunford-style positioning statement from the five
 * elements. Deterministic — built directly from the approved element
 * content so it stays in sync and is traceable to research. Returns null
 * if the core elements (market_category + differentiated_value) are
 * missing, since the statement would be too thin to be useful.
 *
 * Template:
 *   "For [best_fit_accounts], [brand] is [market_category] that
 *    [differentiated_value]. Unlike [competitive_alternatives], [brand]
 *    [distinct_capabilities]."
 */
export function composePositioningStatement(
  elements: ComposerElement[],
  brandName: string,
): string | null {
  const byType = new Map<string, string>();
  for (const el of elements) {
    if (el.element_type && el.content) {
      // First occurrence wins (callers pass deduped-latest already).
      if (!byType.has(el.element_type)) byType.set(el.element_type, el.content);
    }
  }

  const bestFit = tidy(byType.get("best_fit_accounts"), true);
  const marketCategory = tidy(byType.get("market_category"), true);
  const diffValue = tidy(byType.get("differentiated_value"), true);
  const alternatives = tidy(byType.get("competitive_alternatives"), true);
  const distinctCaps = tidy(byType.get("distinct_capabilities"), true);

  // Need at least a category + value to say anything meaningful.
  if (!marketCategory && !diffValue) return null;

  const brand = brandName?.trim() || "This brand";
  const parts: string[] = [];

  // Sentence 1: For X, Brand is a Y that delivers Z.
  let s1 = "";
  if (bestFit) s1 += `For ${bestFit}, `;
  s1 += `${brand} is ${marketCategory || "a category-defining solution"}`;
  if (diffValue) s1 += ` that ${diffValue}`;
  s1 += ".";
  parts.push(s1);

  // Sentence 2: Unlike A, Brand B.
  if (alternatives && distinctCaps) {
    parts.push(`Unlike ${alternatives}, ${brand} ${distinctCaps}.`);
  } else if (distinctCaps) {
    parts.push(`${brand.charAt(0).toUpperCase() + brand.slice(1)} ${distinctCaps}.`);
  }

  return parts.join(" ");
}

const NUMBERED_PREFIX = /(?:^|\s)(\d+)\.\s/g;
const TRAILING_PUNCT = /[.,;]\s*$/;

// Gemini sprays markdown markers all over its output — `**bold**` around
// titles, leading `* ` bullet prefixes on values, sometimes orphan `**`
// runs when the closing pair wraps across the parser's title/value split.
// Strip aggressively so the structured card renders clean prose.
function stripMarkdown(s: string): string {
  return s
    // Orphan `**` runs (leading or trailing, with optional whitespace)
    .replace(/^\s*\*\*+\s*/g, "")
    .replace(/\s*\*\*+\s*$/g, "")
    // Inline `**bold**` → `bold`
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    // Leading single `*` bullet (must be followed by space to avoid eating
    // inline emphasis in the middle of a sentence)
    .replace(/^\s*\*\s+/, "")
    // Stray leading `*` with no space (rare but happens)
    .replace(/^\s*\*+\s*/, "")
    .trim();
}

function cleanValue(s: string): string {
  return stripMarkdown(s.replace(TRAILING_PUNCT, "")).trim();
}

// Splits on dash boundaries: "^- " at the very start, or " - " mid-text.
// The first chunk is whatever came before the first dash (the leadText);
// remaining chunks are "Label: value" attributes.
const DASH_SPLIT = /(?:^|\s)-\s/;

function parseAttributesFromTail(tail: string): {
  leadText: string;
  attributes: PositioningAttribute[];
} {
  const t = tail.trim();
  if (!t) return { leadText: "", attributes: [] };

  const parts = t.split(DASH_SPLIT);
  const leadText = stripMarkdown((parts[0] ?? "").trim());
  const attributes: PositioningAttribute[] = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i].trim();
    if (!chunk) continue;
    const colonIdx = chunk.indexOf(":");
    if (colonIdx === -1) continue;
    const label = stripMarkdown(chunk.slice(0, colonIdx).trim());
    const value = cleanValue(chunk.slice(colonIdx + 1));
    if (label && value) attributes.push({ label, value });
  }
  return { leadText, attributes };
}

/**
 * Try to parse an S-PO body string into a structured form.
 *
 * Returns:
 *  - `{ kind: "items", ... }` when at least two numbered items are detected
 *  - `{ kind: "attributes", ... }` when the body is a flat list of dash-prefixed
 *    "Label: value" pairs with no numbered structure
 *  - `null` when no recognizable structure is found — caller should render
 *    the body as a plain paragraph
 */
export function parsePositioningBody(body: string | null | undefined): ParsedPositioning {
  if (!body || typeof body !== "string") return null;
  const trimmed = body.trim();
  if (!trimmed) return null;

  // First try the numbered-list pattern. matchAll across global regex gives us
  // the start offset of every "N. " marker; slice between consecutive markers.
  const matches = Array.from(trimmed.matchAll(NUMBERED_PREFIX));
  // Filter to "leading" markers — must be at index 0 or preceded by whitespace.
  const valid = matches.filter((m) => {
    const idx = m.index ?? 0;
    return idx === 0 || /\s/.test(trimmed[idx]);
  });

  if (valid.length >= 2) {
    const items: PositioningItem[] = [];
    for (let i = 0; i < valid.length; i++) {
      const m = valid[i];
      const startIdx = m.index ?? 0;
      // Skip the "N. " prefix
      const prefixLen = m[0].length;
      const contentStart = startIdx + prefixLen;
      const contentEnd =
        i + 1 < valid.length ? valid[i + 1].index ?? trimmed.length : trimmed.length;
      const rawIdx = parseInt(m[1], 10);
      let rest = trimmed.slice(contentStart, contentEnd).trim();
      // Strip terminal punctuation between items
      rest = rest.replace(/[.,;]\s*$/, "");
      if (!rest) continue;

      // Title = everything up to the first colon OR first " - " (whichever
      // comes first). Empty title falls back to "Item N".
      const colonIdx = rest.indexOf(":");
      const dashIdx = rest.indexOf(" - ");
      let titleEnd: number;
      if (colonIdx === -1 && dashIdx === -1) {
        titleEnd = rest.length;
      } else if (colonIdx === -1) {
        titleEnd = dashIdx;
      } else if (dashIdx === -1) {
        titleEnd = colonIdx;
      } else {
        titleEnd = Math.min(colonIdx, dashIdx);
      }
      const title = stripMarkdown(
        rest.slice(0, titleEnd).replace(/[:.\s]+$/, "").trim(),
      );
      const tail = rest.slice(titleEnd + 1).trim();
      const { leadText, attributes } = parseAttributesFromTail(tail);
      items.push({
        index: rawIdx,
        title: title || `Item ${rawIdx}`,
        attributes,
        leadText: leadText && leadText !== title ? leadText : undefined,
      });
    }
    if (items.length >= 2) {
      return { kind: "items", items };
    }
  }

  // Second try: flat list of dash-prefixed attributes, no numbered items.
  // Pattern: "- Field: value. - Field: value."
  if (trimmed.startsWith("-") || trimmed.includes(" - ")) {
    const { attributes } = parseAttributesFromTail(trimmed);
    if (attributes.length >= 2) {
      return { kind: "attributes", attributes };
    }
  }

  return null;
}
