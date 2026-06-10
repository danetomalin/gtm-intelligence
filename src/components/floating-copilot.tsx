"use client";
// Floating workspace copilot — the ✦ button pinned bottom-right of a
// dashboard, opening a chat panel. Shared by Customer Health ("Jon")
// and Marketing Health ("Mara"); each workspace supplies its own
// persona + data-aware system prompt. Runs on the default BYOK
// credential profile from Settings.

import { useEffect, useRef, useState } from "react";
import { callLLM, type LlmMessage } from "@/features/cs-health/lib/llmClient";
import { isConfigured, loadApiConfig } from "@/lib/llm/apiConfig";

interface ChatMessage extends LlmMessage {
  error?: boolean;
}

export function FloatingCopilot({
  name,
  description,
  systemPrompt,
  suggestions,
}: {
  name: string; // "Jon"
  description: string; // intro card copy
  systemPrompt: string;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setKeyConfigured(isConfigured(loadApiConfig()));
      inputRef.current?.focus();
    }
  }, [open]);

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
      setMessages([...next, { role: "assistant", content: `${err}${err.includes("API key") ? " Open Settings (bottom-left) to add credentials." : ""}`, error: true }]);
    }
  }

  return (
    <>
      {/* Floating toggle */}
      <button
        type="button"
        aria-label={open ? `Close Ask ${name}` : `Ask ${name}`}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed", right: 24, bottom: 24, zIndex: 60,
          width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "var(--primary)", color: "white", fontSize: 20,
          boxShadow: "0 6px 24px hsl(var(--foreground) / 0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 150ms ease-in-out",
        }}
      >
        {open ? "×" : "✦"}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={`Ask ${name}`}
          style={{
            position: "fixed", right: 24, bottom: 88, zIndex: 60,
            width: 420, maxWidth: "calc(100vw - 48px)",
            height: 600, maxHeight: "calc(100vh - 130px)",
            display: "flex", flexDirection: "column",
            background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
            borderRadius: "1rem", boxShadow: "0 12px 48px hsl(var(--foreground) / 0.18)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--card))", flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)" }}>
              <span style={{ color: "var(--primary)" }}>✦</span> Ask {name}
            </div>
          </div>

          {/* Conversation */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "14px 16px" }}>
            {messages.length === 0 && (
              <div>
                <div style={{ fontSize: 12.5, color: "var(--fg-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                  {description}
                  {!keyConfigured && (
                    <span style={{ display: "block", marginTop: 8, color: "hsl(28 90% 38%)" }}>
                      No API credentials yet — add them in Settings (bottom-left) first.
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {suggestions.map((p) => (
                    <button key={p} onClick={() => send(p)} style={{ textAlign: "left", padding: "11px 14px", fontSize: 12.5, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", background: "hsl(var(--card))", color: "var(--fg-primary)", lineHeight: 1.4 }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "85%", padding: "9px 13px", fontSize: 12.5, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "break-word",
                  borderRadius: m.role === "user" ? "0.9rem 0.9rem 0.25rem 0.9rem" : "0.9rem 0.9rem 0.9rem 0.25rem",
                  background: m.role === "user" ? "var(--primary)" : m.error ? "hsl(var(--destructive) / 0.12)" : "hsl(var(--card))",
                  border: m.role === "assistant" && !m.error ? "1px solid hsl(var(--border))" : "none",
                  color: m.role === "user" ? "white" : m.error ? "hsl(359 75% 42%)" : "var(--fg-primary)",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div style={{ padding: "9px 13px", fontSize: 12, borderRadius: "0.9rem 0.9rem 0.9rem 0.25rem", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "var(--fg-tertiary)" }}>
                  Thinking — large models can take up to a minute…
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--card))", flexShrink: 0, alignItems: "center" }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${name}…`}
              aria-label="Chat message"
              style={{ flex: 1, height: 40, padding: "0 14px", fontSize: 12.5, border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", background: "hsl(var(--background))", color: "var(--fg-primary)", outline: "none", minWidth: 0 }}
            />
            <button type="submit" disabled={busy || !input.trim()} style={{ height: 40, padding: "0 16px", fontSize: 12.5, cursor: busy ? "wait" : "pointer", border: "none", borderRadius: "0.75rem", background: "var(--primary)", color: "white", opacity: busy || !input.trim() ? 0.5 : 1 }}>
              Send
            </button>
            {messages.length > 0 && (
              <button type="button" onClick={() => setMessages([])} style={{ height: 40, padding: "0 8px", fontSize: 11.5, cursor: "pointer", border: "none", borderRadius: "0.75rem", background: "none", color: "var(--fg-tertiary)" }}>
                Clear
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
