"use client";
// Collapsible Settings section — SectionDivider styling with a
// chevron toggle so the page stays scannable as sections grow.

import { useState } from "react";

export function CollapsibleSection({
  title,
  sub,
  defaultOpen = false,
  children,
}: {
  title: string;
  sub?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-baseline justify-between pb-3 mb-5 border-b border-border text-left group"
      >
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <span className="text-text-dim text-sm transition group-hover:text-text">
            {open ? "▾" : "▸"}
          </span>
          {title}
        </h2>
        {sub && (
          <div className="text-xs uppercase tracking-wider text-text-muted">
            {sub}
          </div>
        )}
      </button>
      {open && children}
    </section>
  );
}
