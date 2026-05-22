"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingForm({ userEmail: _userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      organizationName: String(form.get("organizationName") ?? ""),
      brandName: String(form.get("brandName") ?? ""),
      websiteUrl: String(form.get("websiteUrl") ?? ""),
      additionalContext: String(form.get("additionalContext") ?? ""),
    };
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error (${res.status})`);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field
        name="organizationName"
        label="Organization"
        placeholder="Acme Inc."
        required
      />
      <Field
        name="brandName"
        label="Brand to analyze"
        placeholder="Acme"
        required
        help="The company name as a prospect would say it."
      />
      <Field
        name="websiteUrl"
        label="Website URL"
        placeholder="https://acme.com"
        type="url"
        required
      />
      <Field
        name="additionalContext"
        label="Additional context"
        placeholder="What's the product, who's the buyer, what's the wedge?"
        as="textarea"
      />
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-md bg-accent-strong px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent disabled:opacity-50"
      >
        {submitting ? "Starting your run…" : "Start the intelligence run"}
      </button>
      {error && (
        <p className="text-sm text-danger bg-danger-bg/40 rounded-md p-3 border border-danger/20">
          {error}
        </p>
      )}
      <p className="text-xs text-text-dim">
        First runs take 12–15 minutes. You can leave this page; your dashboard
        will populate once the chain finishes.
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required,
  help,
  as = "input",
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  help?: string;
  as?: "input" | "textarea";
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-xs font-medium uppercase tracking-wider text-text-dim"
      >
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={name}
          name={name}
          required={required}
          placeholder={placeholder}
          rows={4}
          className="block w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          className="block w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      )}
      {help && <p className="text-xs text-text-dim">{help}</p>}
    </div>
  );
}
