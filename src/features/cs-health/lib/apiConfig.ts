// ============================================================
// Phase C: the BYOK config moved to the app-wide module so all
// workflows and the CS copilot share ONE credential store (managed
// in /settings). This file re-exports for back-compat with the
// ported cs-health components.
// ============================================================

export * from "@/lib/llm/apiConfig";
