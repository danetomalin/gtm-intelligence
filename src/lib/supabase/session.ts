// ============================================================
// SESSION HELPER (server-side)
//
// Resolves the current Supabase user → profile row → org +
// role. Returns null when unauthenticated, when the profile row
// is missing (unprovisioned auth user), or when Supabase env
// vars aren't configured.
//
// Use from server components / route handlers to gate UI and
// drive RLS scoping. The mirror of cs-health's
// lib/supabase/session.ts, adapted to Throughline's schema
// (`profiles` table instead of `org_members`, role
// 'owner'|'admin'|'member' from migration 0001).
// ============================================================

import { createClient } from "./server";

export type ProfileRole = "owner" | "admin" | "member";

export interface SessionContext {
  userId: string;
  email: string;
  orgId: string;
  orgName: string | null;
  role: ProfileRole;
  // True when the user can administer the org (owners + admins).
  // Mirrors the cs-health 'is admin' check used to gate Settings
  // → Team and shared-credential management.
  isAdmin: boolean;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const row = data[0] as {
    organization_id: string;
    role: ProfileRole;
    organizations:
      | { name: string }
      | { name: string }[]
      | null;
  };

  const orgName = Array.isArray(row.organizations)
    ? row.organizations[0]?.name ?? null
    : row.organizations?.name ?? null;

  return {
    userId: user.id,
    email: user.email ?? "",
    orgId: row.organization_id,
    orgName,
    role: row.role,
    isAdmin: row.role === "owner" || row.role === "admin",
  };
}

// Convenience guards for /api/* route handlers. Mirrors the
// cs-health _guards.ts pattern.

import { NextResponse } from "next/server";

export type GuardResult =
  | { ok: true; ctx: SessionContext }
  | { ok: false; response: NextResponse };

export async function requireSession(): Promise<GuardResult> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, ctx };
}

export async function requireAdmin(): Promise<GuardResult> {
  const session = await requireSession();
  if (!session.ok) return session;
  if (!session.ctx.isAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "forbidden", reason: "admin role required" },
        { status: 403 },
      ),
    };
  }
  return session;
}
