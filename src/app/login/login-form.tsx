"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mode = params.get("mode") === "signup" ? "signup" : "signin";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${params.get("redirect") ?? "/dashboard"}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "Check your email — we sent a magic sign-in link. It expires in 1 hour.",
      );
    }
    setSubmitting(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="space-y-2 mb-8 text-center">
        <div className="text-[11px] font-medium uppercase tracking-[1.5px] text-accent">
          Throughline
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signup" ? "Get started" : "Welcome back"}
        </h1>
        <p className="text-sm text-text-muted">
          We&rsquo;ll email you a magic link — no password needed.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-wider text-text-dim"
          >
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="you@company.com"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-accent-strong px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send magic link"}
        </button>

        {message && (
          <p className="text-sm text-win bg-win-bg/40 rounded-md p-3 border border-win/20">
            {message}
          </p>
        )}
        {error && (
          <p className="text-sm text-danger bg-danger-bg/40 rounded-md p-3 border border-danger/20">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
