"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Brand = {
  id: string;
  name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  font_family: string | null;
  footer_text: string | null;
};

const COMMON_FONTS = [
  "Inter",
  "Helvetica",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Roboto",
  "system-ui",
];

// Inline editor for the brand kit. Saves via the same /api/brand-kit
// endpoint as the auto-extract step will use later. Renders a live
// preview of the header band so the user can sanity-check the colors
// before they show up in a downloaded PDF.
export function BrandKitEditor({ brand }: { brand: Brand | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [primary, setPrimary] = useState(brand?.primary_color ?? "#1A1A1A");
  const [secondary, setSecondary] = useState(
    brand?.secondary_color ?? "#F5F5F5",
  );
  const [logoUrl, setLogoUrl] = useState(brand?.logo_url ?? "");
  const [fontFamily, setFontFamily] = useState(brand?.font_family ?? "Inter");
  const [footerText, setFooterText] = useState(brand?.footer_text ?? "");

  if (!brand) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
        No active brand. Create one via{" "}
        <a href="/onboarding" className="text-accent hover:underline">
          /onboarding
        </a>{" "}
        first.
      </div>
    );
  }

  async function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const resp = await fetch("/api/brand-kit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            brandId: brand!.id,
            primary_color: primary || null,
            secondary_color: secondary || null,
            logo_url: logoUrl || null,
            font_family: fontFamily || null,
            footer_text: footerText || null,
          }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${resp.status}`);
        }
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Primary color (hex)">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="h-10 w-10 rounded border border-border bg-card cursor-pointer"
            />
            <input
              type="text"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              placeholder="#115E59"
              className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:border-text-dim focus:outline-none font-mono"
            />
          </div>
        </Field>

        <Field label="Secondary color (hex)">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="h-10 w-10 rounded border border-border bg-card cursor-pointer"
            />
            <input
              type="text"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              placeholder="#F5F0E6"
              className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:border-text-dim focus:outline-none font-mono"
            />
          </div>
        </Field>

        <Field label="Logo URL (PNG / SVG / JPG)">
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://www.example.com/logo.png"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:border-text-dim focus:outline-none"
          />
          <p className="text-[11px] text-text-dim mt-1">
            Used in the PDF header. Empty = brand name renders as a wordmark.
          </p>
        </Field>

        <Field label="Font family">
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:border-text-dim focus:outline-none"
          >
            {COMMON_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Footer text">
          <input
            type="text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Hims & Hers Health, Inc. · hims.com"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:border-text-dim focus:outline-none"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className={cn(
              "rounded-md bg-accent text-white px-4 py-2 text-sm font-semibold transition hover:opacity-90",
              pending && "opacity-60",
            )}
          >
            {pending ? "Saving…" : "Save brand kit"}
          </button>
          {saved && (
            <span className="text-xs text-win">Saved ✓</span>
          )}
          {error && (
            <span className="text-xs text-danger font-mono">{error}</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">
          Live preview
        </div>
        <div className="rounded-lg overflow-hidden border border-border">
          <div
            className="px-5 py-5 flex items-center justify-between gap-3"
            style={{ background: primary }}
          >
            <span
              className="text-base font-semibold"
              style={{ color: "#FFFFFF" }}
            >
              {brand.name ?? "Brand"} · sample one-pager title
            </span>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="logo"
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <span className="text-xs text-white opacity-80">
                {brand.name ?? "Brand"}
              </span>
            )}
          </div>
          <div className="px-5 py-4 bg-card text-text">
            <div
              className="text-xs uppercase tracking-wider font-semibold mb-1"
              style={{ color: primary }}
            >
              Section heading
            </div>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              Body copy uses the default text color. The accent treatments —
              section headings, the CTA box, the footer attribution — all
              consume the primary + secondary colors above.
            </p>
            <div
              className="rounded-md p-3"
              style={{ background: secondary }}
            >
              <div
                className="text-[10px] uppercase tracking-wider font-semibold mb-1"
                style={{ color: primary }}
              >
                Call to action
              </div>
              <div className="text-sm text-text">
                Sample CTA copy in the secondary wash.
              </div>
            </div>
          </div>
          <div className="px-5 py-2 bg-card border-t border-border">
            <p className="text-[11px] text-text-dim text-center">
              {footerText || "(empty footer)"}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-text-dim">
          Preview reflects the rendered PDF header band, section heading
          accent, CTA wash, and footer. Slide decks and carousels will pick
          this up in a later pass.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
