import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { InlineMd } from "./inline-md";

describe("InlineMd", () => {
  it("renders plain text unchanged", () => {
    const { container } = render(<InlineMd>Hello world</InlineMd>);
    expect(container.textContent).toBe("Hello world");
    expect(container.querySelector("strong")).toBeNull();
  });

  it("converts a single **bold** run to <strong>", () => {
    const { container } = render(
      <InlineMd>{"Throughline helps **B2B SaaS PMM leaders** ship faster."}</InlineMd>,
    );
    const strong = container.querySelector("strong");
    expect(strong?.textContent).toBe("B2B SaaS PMM leaders");
    expect(container.textContent).toBe(
      "Throughline helps B2B SaaS PMM leaders ship faster.",
    );
  });

  it("handles multiple bold runs in one string (non-greedy match)", () => {
    const { container } = render(
      <InlineMd>{"**A** and **B** and not C."}</InlineMd>,
    );
    const strongs = container.querySelectorAll("strong");
    expect(strongs.length).toBe(2);
    expect(strongs[0].textContent).toBe("A");
    expect(strongs[1].textContent).toBe("B");
  });

  it("preserves text between bold runs", () => {
    const { container } = render(
      <InlineMd>{"start **mid** end"}</InlineMd>,
    );
    expect(container.textContent).toBe("start mid end");
  });

  it("preserves unmatched ** literally (no half-bolds)", () => {
    const { container } = render(<InlineMd>{"this is ** broken"}</InlineMd>);
    expect(container.textContent).toBe("this is ** broken");
    expect(container.querySelector("strong")).toBeNull();
  });

  it("returns null for empty / nullish input", () => {
    const { container: c1 } = render(<InlineMd>{null}</InlineMd>);
    expect(c1.textContent).toBe("");
    const { container: c2 } = render(<InlineMd>{undefined}</InlineMd>);
    expect(c2.textContent).toBe("");
    const { container: c3 } = render(<InlineMd>{""}</InlineMd>);
    expect(c3.textContent).toBe("");
  });

  it("renders newlines as <br />", () => {
    const { container } = render(
      <InlineMd>{"line one\nline two\nline three"}</InlineMd>,
    );
    expect(container.querySelectorAll("br").length).toBe(2);
    // textContent collapses <br />, so the visible text is concatenated
    expect(container.textContent).toBe("line oneline twoline three");
  });

  it("handles bold spanning a single line within a multi-line block", () => {
    const { container } = render(
      <InlineMd>{"intro\n**heading** body"}</InlineMd>,
    );
    const strong = container.querySelector("strong");
    expect(strong?.textContent).toBe("heading");
    expect(container.querySelectorAll("br").length).toBe(1);
  });
});
