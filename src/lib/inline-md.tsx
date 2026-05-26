import { Fragment, type ReactNode } from "react";

// Gemini and other LLMs frequently emit **markdown bold** inside string fields
// even when prompted to write plain prose. Rendered as-is, the asterisks show
// up literally in the UI ("**B2B SaaS PMM leaders**"). This component converts
// **runs** into <strong> spans and leaves the rest of the text untouched.
//
// Intentionally narrow scope: only **bold**. No italics, no links, no headers.
// Anything more complex should use a real markdown renderer.

const BOLD = /\*\*(.+?)\*\*/g;

/**
 * Render a string with `**bold**` runs converted to <strong>. Newlines are
 * preserved as <br /> so callers don't need to pair this with
 * `whitespace-pre-line`. Returns the input string verbatim when no markdown
 * is detected, so it's safe to use on every text field even if most don't
 * need it.
 */
export function InlineMd({ children }: { children: string | null | undefined }) {
  if (!children) return null;
  const nodes = renderInlineMd(children);
  return <>{nodes}</>;
}

/**
 * Lower-level helper that returns the parsed ReactNode[] directly. Useful when
 * you need to wrap the result in a non-default element or compose it.
 */
export function renderInlineMd(text: string): ReactNode[] {
  if (!text) return [];

  // First: split paragraphs by newline so multi-line strings render with line
  // breaks. We do this at the segment level so each line gets its own bold
  // pass and we can drop a <br /> between them.
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const segments = parseBoldSegments(lines[i]);
    out.push(<Fragment key={`l-${i}`}>{segments}</Fragment>);
    if (i < lines.length - 1) {
      out.push(<br key={`br-${i}`} />);
    }
  }
  return out;
}

function parseBoldSegments(line: string): ReactNode[] {
  if (!line.includes("**")) return [line];
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  // matchAll on /\*\*(.+?)\*\*/g — non-greedy so "**A** and **B**" yields two
  // separate bold runs rather than one giant span.
  const matches = Array.from(line.matchAll(BOLD));
  if (matches.length === 0) return [line];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const idx = m.index ?? 0;
    if (idx > lastIndex) {
      nodes.push(line.slice(lastIndex, idx));
    }
    nodes.push(<strong key={`b-${i}`}>{m[1]}</strong>);
    lastIndex = idx + m[0].length;
  }
  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes;
}
