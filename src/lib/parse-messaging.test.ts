import { describe, it, expect } from "vitest";
import { parseMessagingBody } from "./parse-messaging";

describe("parseMessagingBody", () => {
  it("returns null for empty / nullish input", () => {
    expect(parseMessagingBody(null)).toBeNull();
    expect(parseMessagingBody(undefined)).toBeNull();
    expect(parseMessagingBody("")).toBeNull();
    expect(parseMessagingBody("   ")).toBeNull();
  });

  it("returns null when no section markers are present", () => {
    expect(
      parseMessagingBody(
        "Throughline writes the GTM intelligence work product PMM teams have always built by hand.",
      ),
    ).toBeNull();
  });

  it("parses the standard three-section template", () => {
    const body =
      "SOMETHING COOL WE DO: Throughline's AI-Native pipeline proactively identifies GTM opportunities. " +
      "HOW IT'S DIFFERENT: Unlike fragmented in-house tools, Throughline reduces manual cycles by up to 40%. " +
      "SHOW SOME PROOF: Early adopters have seen a 40% reduction in manual research time.";
    const out = parseMessagingBody(body);
    expect(out).not.toBeNull();
    expect(out?.tiles.length).toBe(3);
    expect(out?.tiles[0].label).toBe("Something cool we do");
    expect(out?.tiles[0].value).toContain("AI-Native pipeline");
    expect(out?.tiles[1].label).toBe("How it's different");
    expect(out?.tiles[1].value).toContain("Unlike fragmented");
    expect(out?.tiles[2].label).toBe("Show some proof");
    expect(out?.tiles[2].value).toContain("Early adopters");
  });

  it("strips trailing colons and whitespace from the marker before the value starts", () => {
    const body =
      "SOMETHING COOL WE DO:   Centralized GTM Asset Repository. " +
      "HOW IT'S DIFFERENT:  Forget message drift. " +
      "SHOW SOME PROOF: 25% reduction in message drift.";
    const out = parseMessagingBody(body);
    expect(out?.tiles[0].value).toBe("Centralized GTM Asset Repository.");
    expect(out?.tiles[1].value).toBe("Forget message drift.");
    expect(out?.tiles[2].value).toBe("25% reduction in message drift.");
  });

  it("handles a body with only two of the three sections", () => {
    const body =
      "SOMETHING COOL WE DO: A thing. HOW IT'S DIFFERENT: Another thing.";
    const out = parseMessagingBody(body);
    expect(out?.tiles.length).toBe(2);
  });

  it("returns null when only one section is detected", () => {
    expect(
      parseMessagingBody("SOMETHING COOL WE DO: Just the one section."),
    ).toBeNull();
  });

  it("is case-insensitive on the marker labels", () => {
    const body =
      "Something cool we do: A. How it's different: B. Show some proof: C.";
    const out = parseMessagingBody(body);
    expect(out?.tiles.length).toBe(3);
    expect(out?.tiles[0].value).toBe("A.");
  });

  it("accepts newline-separated sections too", () => {
    const body =
      "SOMETHING COOL WE DO: A.\nHOW IT'S DIFFERENT: B.\nSHOW SOME PROOF: C.";
    const out = parseMessagingBody(body);
    expect(out?.tiles.length).toBe(3);
  });

  it("preserves the canonical tile order regardless of source order", () => {
    // Body lists proof first, then cool, then different
    const body =
      "SHOW SOME PROOF: P. SOMETHING COOL WE DO: C. HOW IT'S DIFFERENT: D.";
    const out = parseMessagingBody(body);
    expect(out?.tiles.map((t) => t.label)).toEqual([
      "Something cool we do",
      "How it's different",
      "Show some proof",
    ]);
  });
});
