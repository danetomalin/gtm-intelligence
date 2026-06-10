"use client";
// Settings panel — fixed bottom-left entry point.
// Sections: Account, Notifications, API Keys (BYOK), Data Sources.
// All preferences persist in localStorage until Supabase auth lands
// (Throughline merge) — then these move to per-org rows.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ApiKeysSection from "@/features/cs-health/components/ApiSettings";
import ResourcesSection from "@/features/cs-health/components/ResourcesSection";
import { isConfigured, loadApiConfig } from "@/features/cs-health/lib/apiConfig";
import { INTEGRATION_CATALOG, loadConnectedSources, toggleConnectedSource } from "@/features/cs-health/lib/integrations";

type Section = "account" | "notifications" | "api" | "sources" | "resources";

const label: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "var(--fg-secondary)", marginBottom: 6, display: "block" };
const input: React.CSSProperties = { width: "100%", height: 36, padding: "0 12px", fontSize: 13, border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", color: "var(--fg-primary)", background: "hsl(var(--card))", outline: "none", boxSizing: "border-box" };
const btnPrimary: React.CSSProperties = { height: 36, padding: "0 18px", fontSize: 13, fontWeight: 400, cursor: "pointer", border: "none", borderRadius: "0.75rem", background: "var(--primary)", color: "white", transition: "all 150ms ease-in-out" };

// ---------- Account ----------

interface AccountInfo { name: string; email: string; company: string; role: string }
const ACCOUNT_KEY = "cs-health.account";

function AccountSection() {
  const [acct, setAcct] = useState<AccountInfo>({ name: "", email: "", company: "", role: "" });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACCOUNT_KEY);
      if (raw) setAcct(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  function save() {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acct));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  const fields: { key: keyof AccountInfo; lbl: string; ph: string }[] = [
    { key: "name", lbl: "Name", ph: "Your name" },
    { key: "email", lbl: "Email", ph: "you@company.com" },
    { key: "company", lbl: "Company", ph: "Company name" },
    { key: "role", lbl: "Role", ph: "e.g. VP Customer Success" },
  ];
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5, marginBottom: 16 }}>
        Profile details used in reports, exports, and alert delivery.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {fields.map((f) => (
          <div key={f.key}>
            <span style={label}>{f.lbl}</span>
            <input type={f.key === "email" ? "email" : "text"} value={acct[f.key]} placeholder={f.ph} onChange={(e) => setAcct({ ...acct, [f.key]: e.target.value })} style={input} />
          </div>
        ))}
      </div>
      <button onClick={save} style={btnPrimary}>
        {saved ? "Saved ✓" : "Save"}
      </button>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid hsl(var(--border))", fontSize: 11, color: "var(--fg-tertiary)", lineHeight: 1.6 }}>
        Sign-in, team management, and per-org settings arrive with the multi-tenant release. Today this profile lives in your browser only.
      </div>
    </div>
  );
}

// ---------- Notifications ----------

interface AlertPrefs {
  weeklyDigest: boolean;
  tier1Alerts: boolean;
  renewalWindow: boolean;
  expansionReady: boolean;
  confidenceDrops: boolean;
  channel: "email" | "slack";
}
const ALERTS_KEY = "cs-health.alerts";
const DEFAULT_ALERTS: AlertPrefs = { weeklyDigest: true, tier1Alerts: true, renewalWindow: true, expansionReady: false, confidenceDrops: false, channel: "email" };

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 40, height: 22, borderRadius: 999, border: "none", cursor: "pointer", background: on ? "hsl(var(--success))" : "hsl(var(--muted))", position: "relative", flexShrink: 0, transition: "background 150ms ease-in-out" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "hsl(var(--card))", transition: "left 150ms ease-in-out", boxShadow: "0 1px 2px hsl(var(--foreground) / 0.2)" }} />
    </button>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState<AlertPrefs>(DEFAULT_ALERTS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ALERTS_KEY);
      if (raw) setPrefs({ ...DEFAULT_ALERTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);
  function update(next: AlertPrefs) {
    setPrefs(next);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
  }
  const rows: { key: keyof Omit<AlertPrefs, "channel">; lbl: string; desc: string }[] = [
    { key: "tier1Alerts", lbl: "Tier 1 overrides", desc: "Immediate alert on exec/champion departure, CSAT < 3.0, cancel notice, exec escalation" },
    { key: "renewalWindow", lbl: "Renewal window entry", desc: "When an account enters the 3-4 month renewal window" },
    { key: "expansionReady", lbl: "Expansion ready", desc: "When an account crosses into the Expansion Ready band (70+)" },
    { key: "confidenceDrops", lbl: "Data confidence drops", desc: "When an account's confidence score falls below 50 (sentiment-dominant forecast)" },
    { key: "weeklyDigest", lbl: "Weekly digest", desc: "Monday morning portfolio summary — band movement, priority actions, renewal pipeline" },
  ];
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5, marginBottom: 16 }}>
        Alert preferences. Delivery wiring (email/Slack) ships with the notification service; preferences set here will carry over.
      </div>
      {rows.map((r) => (
        <div key={r.key} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid hsl(var(--muted))" }}>
          <Toggle on={prefs[r.key]} onClick={() => update({ ...prefs, [r.key]: !prefs[r.key] })} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-primary)" }}>{r.lbl}</div>
            <div style={{ fontSize: 11, color: "var(--fg-secondary)", marginTop: 2, lineHeight: 1.4 }}>{r.desc}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 14 }}>
        <span style={label}>Delivery channel</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["email", "slack"] as const).map((c) => (
            <button key={c} onClick={() => update({ ...prefs, channel: c })} style={{ padding: "7px 18px", fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", background: prefs.channel === c ? "var(--fg-primary)" : "white", color: prefs.channel === c ? "white" : "var(--fg-secondary)", textTransform: "capitalize" }}>
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Data Sources ----------

const STATUS_STYLE: Record<string, { bg: string; text: string; lbl: string }> = {
  connected: { bg: "hsl(var(--success) / 0.12)", text: "hsl(135 59% 32%)", lbl: "CONNECTED" },
  available: { bg: "#eff6ff", text: "#1d4ed8", lbl: "AVAILABLE" },
  planned: { bg: "hsl(var(--muted))", text: "var(--fg-secondary)", lbl: "PLANNED" },
};

function DataSourcesSection() {
  const [connected, setConnected] = useState<string[]>([]);
  useEffect(() => setConnected(loadConnectedSources()), []);
  const connectedCount = connected.length;
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.6, marginBottom: 6 }}>
        Each connected source raises the Data Confidence score&apos;s source-diversity component and unlocks specific VAR inputs. Connectors below are the build roadmap — connections here are simulated until OAuth wiring lands.
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "hsl(135 59% 32%)", background: "hsl(var(--success) / 0.12)", padding: "6px 10px", borderRadius: "0.5rem", marginBottom: 16, display: "inline-block" }}>
        {connectedCount} source{connectedCount === 1 ? "" : "s"} connected
      </div>
      {INTEGRATION_CATALOG.map((cat) => (
        <div key={cat.id} style={{ border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-primary)" }}>
              {cat.label}
              <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", color: cat.priority === "P0" ? "hsl(359 75% 42%)" : cat.priority === "P1" ? "hsl(28 90% 38%)" : "var(--fg-secondary)", marginLeft: 8 }}>{cat.priority}</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--fg-tertiary)" }}>feeds: {cat.pillars.join(" · ")}</div>
          </div>
          <div style={{ fontSize: 10, color: "var(--fg-secondary)", lineHeight: 1.5, marginBottom: 10 }}>{cat.rationale}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {cat.integrations.map((integ) => {
              const isConn = connected.includes(integ.id);
              const st = isConn ? STATUS_STYLE.connected : STATUS_STYLE[integ.status];
              const clickable = integ.status !== "planned";
              return (
                <button
                  key={integ.id}
                  disabled={!clickable}
                  onClick={() => clickable && setConnected(toggleConnectedSource(integ.id))}
                  title={clickable ? (isConn ? "Disconnect" : "Connect (simulated)") : "On the roadmap"}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", fontSize: 11, fontWeight: 600, border: `1px solid ${isConn ? "#1a664433" : "hsl(var(--border))"}`, borderRadius: "0.5rem", background: isConn ? "hsl(var(--success) / 0.12)" : "white", color: clickable ? "var(--fg-primary)" : "var(--fg-tertiary)", cursor: clickable ? "pointer" : "default" }}
                >
                  {integ.name}
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", padding: "1px 5px", borderRadius: "0.5rem", background: st.bg, color: st.text }}>{st.lbl}</span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: "var(--fg-tertiary)", lineHeight: 1.5 }}>
            {cat.signals.join(" · ")}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Panel shell ----------

const SECTIONS: { id: Section; lbl: string }[] = [
  { id: "account", lbl: "Account" },
  { id: "notifications", lbl: "Notifications" },
  { id: "api", lbl: "API Keys" },
  { id: "sources", lbl: "Data Sources" },
  { id: "resources", lbl: "Resources" },
];

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("account");
  const [apiConfigured, setApiConfigured] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 680px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setApiConfigured(isConfigured(loadApiConfig()));
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", border: "none", borderTop: "1px solid hsl(var(--border))", background: "transparent", color: "var(--fg-secondary)", textAlign: "left" }}
      >
        <span style={{ fontSize: 13, lineHeight: 1 }}>⚙</span>
        Settings
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: apiConfigured ? "hsl(var(--success))" : "hsl(var(--muted))", display: "inline-block", marginLeft: "auto" }} />
      </button>

      {open && mounted && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "hsl(var(--foreground) / 0.45)", zIndex: 100, display: "flex", alignItems: isNarrow ? "flex-end" : "center", justifyContent: "center", padding: isNarrow ? 0 : 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", width: isNarrow ? "100%" : 760, maxWidth: isNarrow ? "100%" : "94vw", height: isNarrow ? "92vh" : "min(620px, 88vh)", display: "flex", flexDirection: isNarrow ? "column" : "row", boxShadow: "0 8px 40px hsl(var(--foreground) / 0.18)" }}>
            {/* Section nav — left column on desktop, horizontal strip on narrow screens */}
            {isNarrow ? (
              <div style={{ borderBottom: "1px solid hsl(var(--border))", padding: "12px 14px 0", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg-primary)" }}>Settings</div>
                  <button onClick={() => setOpen(false)} style={{ border: "none", background: "none", fontSize: 18, color: "var(--fg-secondary)", cursor: "pointer", padding: 4 }}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 10 }}>
                  {SECTIONS.map((s) => (
                    <button key={s.id} onClick={() => setSection(s.id)} style={{ padding: "7px 12px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", background: section === s.id ? "var(--fg-primary)" : "white", color: section === s.id ? "white" : "var(--fg-secondary)" }}>
                      {s.lbl}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ width: 170, borderRight: "1px solid hsl(var(--border))", padding: "20px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg-primary)", padding: "0 18px", marginBottom: 16 }}>Settings</div>
                {SECTIONS.map((s) => (
                  <button key={s.id} onClick={() => setSection(s.id)} style={{ textAlign: "left", padding: "9px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", borderLeft: `3px solid ${section === s.id ? "var(--fg-primary)" : "transparent"}`, background: section === s.id ? "hsl(var(--border))" : "transparent", color: section === s.id ? "var(--fg-primary)" : "var(--fg-secondary)" }}>
                    {s.lbl}
                    {s.id === "api" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: apiConfigured ? "hsl(var(--success))" : "hsl(var(--muted))", display: "inline-block", marginLeft: 7 }} />}
                  </button>
                ))}
                <div style={{ marginTop: "auto", padding: "0 18px", fontSize: 9, color: "var(--fg-tertiary)", lineHeight: 1.5 }}>
                  Preferences stored in this browser until team accounts ship.
                </div>
              </div>
            )}
            {/* Content */}
            <div style={{ flex: 1, padding: isNarrow ? "16px 16px 24px" : "22px 24px", overflowY: "auto", minHeight: 0 }}>
              {!isNarrow && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-primary)" }}>{SECTIONS.find((s) => s.id === section)?.lbl}</div>
                  <button onClick={() => setOpen(false)} style={{ border: "none", background: "none", fontSize: 16, color: "var(--fg-secondary)", cursor: "pointer" }}>✕</button>
                </div>
              )}
              {section === "account" && <AccountSection />}
              {section === "notifications" && <NotificationsSection />}
              {section === "api" && <ApiKeysSection />}
              {section === "sources" && <DataSourcesSection />}
              {section === "resources" && <ResourcesSection />}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
