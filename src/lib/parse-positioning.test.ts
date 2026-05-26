import { describe, it, expect } from "vitest";
import { parsePositioningBody } from "./parse-positioning";

describe("parsePositioningBody", () => {
  it("returns null for empty / missing input", () => {
    expect(parsePositioningBody(null)).toBeNull();
    expect(parsePositioningBody(undefined)).toBeNull();
    expect(parsePositioningBody("")).toBeNull();
    expect(parsePositioningBody("   ")).toBeNull();
  });

  it("returns null for plain prose without structure", () => {
    expect(
      parsePositioningBody(
        "Throughline replaces the in-house Notion-and-Slack toolchain with a tenant-scoped store the org owns.",
      ),
    ).toBeNull();
  });

  it("parses a numbered list with Does/Falls/Tolerated attributes", () => {
    const body =
      "1. In-house PMM toolchain: - Does well: Flexible, low cost. - Falls short: Fragmented. - Tolerated because: Existing habits. 2. Kompyte: - Does well: Automated monitoring. - Falls short: Passive intelligence. - Tolerated because: Baseline surveillance.";
    const out = parsePositioningBody(body);
    expect(out?.kind).toBe("items");
    if (out?.kind !== "items") return;
    expect(out.items.length).toBe(2);
    expect(out.items[0].title).toBe("In-house PMM toolchain");
    expect(out.items[0].attributes).toEqual([
      { label: "Does well", value: "Flexible, low cost" },
      { label: "Falls short", value: "Fragmented" },
      { label: "Tolerated because", value: "Existing habits" },
    ]);
    expect(out.items[1].title).toBe("Kompyte");
    expect(out.items[1].attributes.length).toBe(3);
  });

  it("preserves parens and commas in the item title", () => {
    const body =
      "1. In-house PMM toolchain (e.g., spreadsheets, Notion, Slack): - Does well: A. - Falls short: B. 2. Kompyte: - Does well: C.";
    const out = parsePositioningBody(body);
    expect(out?.kind).toBe("items");
    if (out?.kind !== "items") return;
    expect(out.items[0].title).toBe(
      "In-house PMM toolchain (e.g., spreadsheets, Notion, Slack)",
    );
  });

  it("ignores stray digit-period sequences inside content (e.g. version numbers)", () => {
    // Only "1. " "2. " at boundary positions should split; "v2.0" mid-sentence
    // must not break the parse.
    const body =
      "1. Kompyte: - Does well: Crawls competitor sites. - Falls short: Stops at v2.0 features. 2. Crayon: - Does well: AI capture.";
    const out = parsePositioningBody(body);
    expect(out?.kind).toBe("items");
    if (out?.kind !== "items") return;
    expect(out.items.length).toBe(2);
    expect(out.items[0].attributes[1].value).toBe("Stops at v2.0 features");
  });

  it("handles items without a colon after the title", () => {
    // Some titles may not have a colon — the parser splits on the first " - "
    const body =
      "1. The Notion-and-Slack default - Does well: Flexible. - Falls short: Owner-dependent. 2. Crayon - Does well: Battlecards.";
    const out = parsePositioningBody(body);
    expect(out?.kind).toBe("items");
    if (out?.kind !== "items") return;
    expect(out.items[0].title).toBe("The Notion-and-Slack default");
    expect(out.items[0].attributes[0]).toEqual({
      label: "Does well",
      value: "Flexible",
    });
  });

  it("returns flat attributes when body has dashes but no numbered list", () => {
    const body =
      "- Functional: Replace 4 hours per week. - Monetary: 12 hrs saved per seat. - Psychological: Continuity through rotation.";
    const out = parsePositioningBody(body);
    expect(out?.kind).toBe("attributes");
    if (out?.kind !== "attributes") return;
    expect(out.attributes).toEqual([
      { label: "Functional", value: "Replace 4 hours per week" },
      { label: "Monetary", value: "12 hrs saved per seat" },
      { label: "Psychological", value: "Continuity through rotation" },
    ]);
  });

  it("returns null when only a single numbered item is present (not a list)", () => {
    // A single "1. " marker isn't enough to confirm intentional list structure
    const body = "1. The category framing is workflow modernization.";
    expect(parsePositioningBody(body)).toBeNull();
  });

  it("strips trailing punctuation from attribute values", () => {
    const body =
      "1. A: - Does well: Thing one. - Falls short: Thing two; 2. B: - Does well: Thing three,";
    const out = parsePositioningBody(body);
    expect(out?.kind).toBe("items");
    if (out?.kind !== "items") return;
    expect(out.items[0].attributes[0].value).toBe("Thing one");
    expect(out.items[0].attributes[1].value).toBe("Thing two");
  });
});
