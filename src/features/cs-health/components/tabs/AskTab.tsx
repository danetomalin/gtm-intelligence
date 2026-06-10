"use client";
// Ask Jon — full-page chat tab. Portfolio-aware: the system
// prompt carries the live scored portfolio, churn history, and
// trend signals. Runs on the BYOK key from Settings → API Keys.

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScoredAccount } from "@/features/cs-health/lib/types";
import { buildSystemPrompt, SUGGESTED_PROMPTS } from "@/features/cs-health/lib/chatContext";
import { usePortfolio } from "@/features/cs-health/components/PortfolioProvider";
import { callLLM, type LlmMessage } from "@/features/cs-health/lib/llmClient";
import { isConfigured, loadApiConfig } from "@/features/cs-health/lib/apiConfig";

interface ChatMessage extends LlmMessage {
  error?: boolean;
}

export default function AskTab({ allScored }: { allScored: ScoredAccount[] }) {
  const portfolio = usePortfolio();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const systemPrompt = useMemo(() => buildSystemPrompt(allScored, portfolio), [allScored, portfolio]);

  useEffect(() => {
    setKeyConfigured(isConfigured(loadApiConfig()));
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    const history = next.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    const res = await callLLM(history, { maxTokens: 2048, system: systemPrompt });
    setBusy(false);
    if (res.ok && res.text.trim()) {
      setMessages([...next, { role: "assistant", content: res.text }]);
    } else {
      const err = res.error ?? (res.ok ? "The model returned an empty response — thinking models may need a larger token budget or a different model name." : "Request failed.");
      setMessages([...next, { role: "assistant", content: `${err}${err.includes("API key") ? " Open Settings → API Keys (bottom-left) to configure a provider." : ""}`, error: true }]);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 150px)", maxWidth: 860, margin: "0 auto" }}>
      {/* Conversation */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: 16 }}>
        {messages.length === 0 && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "1rem", padding: "22px 24px", marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-primary)", letterSpacing: "-0.01em", marginBottom: 6 }}>
                <span style={{ color: "var(--primary)" }}>✦</span> Ask Jon anything about your portfolio
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.6 }}>
                Jon sees every account, VAR score, override, renewal forecast, expansion signal, and churn learning on this dashboard — and answers with names and numbers, not generalities.
                {!keyConfigured && <span style={{ display: "block", marginTop: 8, color: "hsl(28 90% 38%)" }}>No API key configured yet — add one in Settings → API Keys (bottom-left) first.</span>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {SUGGESTED_PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)} style={{ textAlign: "left", padding: "13px 16px", minHeight: 44, fontSize: 13, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", background: "hsl(var(--card))", color: "var(--fg-primary)", transition: "all 150ms ease-in-out", lineHeight: 1.4 }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            <div style={{
              maxWidth: "80%", padding: "11px 16px", fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "break-word",
              borderRadius: m.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
              background: m.role === "user" ? "var(--primary)" : m.error ? "hsl(var(--destructive) / 0.12)" : "hsl(var(--card))",
              border: m.role === "assistant" && !m.error ? "1px solid hsl(var(--border))" : "none",
              color: m.role === "user" ? "white" : m.error ? "hsl(359 75% 42%)" : "var(--fg-primary)",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{ padding: "11px 16px", fontSize: 13, borderRadius: "1rem 1rem 1rem 0.25rem", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "var(--fg-tertiary)" }}>
              Thinking — large models can take up to a minute…
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid hsl(var(--border))", flexShrink: 0, alignItems: "center" }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Jon about your portfolio…"
          aria-label="Chat message"
          style={{ flex: 1, height: 44, padding: "0 16px", fontSize: 13.5, border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", background: "hsl(var(--card))", color: "var(--fg-primary)", outline: "none" }}
        />
        <button type="submit" disabled={busy || !input.trim()} style={{ height: 44, padding: "0 22px", fontSize: 13, fontWeight: 400, cursor: busy ? "wait" : "pointer", border: "none", borderRadius: "0.75rem", background: "var(--primary)", color: "white", opacity: busy || !input.trim() ? 0.5 : 1, transition: "all 150ms ease-in-out" }}>
          Send
        </button>
        {messages.length > 0 && (
          <button type="button" onClick={() => setMessages([])} style={{ height: 44, padding: "0 12px", fontSize: 12, cursor: "pointer", border: "none", borderRadius: "0.75rem", background: "none", color: "var(--fg-tertiary)" }}>
            Clear
          </button>
        )}
      </form>
    </div>
  );
}
