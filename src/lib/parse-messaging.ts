// D-MG writes each message as a single string with three labeled sections:
//
//   "SOMETHING COOL WE DO: ...
//    HOW IT'S DIFFERENT: ...
//    SHOW SOME PROOF: ..."
//
// Rendered as one paragraph it's hard to scan. This parser splits the body on
// the three markers so the card can render each section as its own labeled
// tile. Falls back to a plain-prose render when the markers aren't present
// (legacy rows, freeform copy, drafts that haven't followed the template).

export type MessagingTile = {
  label: string;
  value: string;
};

export type ParsedMessaging = {
  tiles: MessagingTile[];
};

// Order matters: tile rendering follows this sequence.
const SECTION_DEFS: { key: "cool" | "different" | "proof"; label: string; markers: RegExp[] }[] = [
  {
    key: "cool",
    label: "Something cool we do",
    markers: [
      /something\s+cool\s+we\s+do/i,
      /what\s+we\s+do/i,
      /cool\s+thing/i,
    ],
  },
  {
    key: "different",
    label: "How it's different",
    markers: [
      /how\s+it'?s\s+different/i,
      /why\s+it'?s\s+different/i,
      /what'?s\s+different/i,
    ],
  },
  {
    key: "proof",
    label: "Show some proof",
    markers: [
      /show\s+some\s+proof/i,
      /proof\s+point/i,
      /the\s+proof/i,
    ],
  },
];

/**
 * Parse a D-MG body string into the three-tile structure. Returns `null` if
 * fewer than two section markers are detected — caller renders the original
 * body as plain prose in that case.
 */
export function parseMessagingBody(
  body: string | null | undefined,
): ParsedMessaging | null {
  if (!body || typeof body !== "string") return null;
  const trimmed = body.trim();
  if (!trimmed) return null;

  // Find each marker's earliest match position in the body. Use the start
  // position so we can slice the body into ordered regions.
  const hits: { key: string; label: string; start: number; markerLen: number }[] = [];
  for (const def of SECTION_DEFS) {
    for (const m of def.markers) {
      const match = trimmed.match(m);
      if (match && typeof match.index === "number") {
        // First marker wins for the section
        const existing = hits.find((h) => h.key === def.key);
        if (!existing || match.index < existing.start) {
          if (existing) {
            existing.start = match.index;
            existing.markerLen = match[0].length;
          } else {
            hits.push({
              key: def.key,
              label: def.label,
              start: match.index,
              markerLen: match[0].length,
            });
          }
        }
        break; // first marker that matches for a section wins
      }
    }
  }

  if (hits.length < 2) return null;

  // Sort by position so we can carve regions; carve values into a key→value
  // map first, then emit tiles in canonical SECTION_DEFS order so the
  // framework structure is preserved regardless of body order.
  const positional = [...hits].sort((a, b) => a.start - b.start);
  const valuesByKey = new Map<string, string>();
  for (let i = 0; i < positional.length; i++) {
    const cur = positional[i];
    const next = positional[i + 1];
    let valueStart = cur.start + cur.markerLen;
    while (
      valueStart < trimmed.length &&
      /[:\s\-–—.]/.test(trimmed[valueStart])
    ) {
      valueStart++;
    }
    const valueEnd = next ? next.start : trimmed.length;
    const value = trimmed.slice(valueStart, valueEnd).trim();
    if (value) valuesByKey.set(cur.key, value);
  }

  const tiles: MessagingTile[] = [];
  for (const def of SECTION_DEFS) {
    const v = valuesByKey.get(def.key);
    if (v) tiles.push({ label: def.label, value: v });
  }

  if (tiles.length < 2) return null;
  return { tiles };
}
