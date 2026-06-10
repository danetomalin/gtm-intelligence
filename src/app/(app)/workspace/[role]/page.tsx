import { notFound, redirect } from "next/navigation";
import { WORKSPACE_ROLES } from "@/lib/persona";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return WORKSPACE_ROLES.map((role) => ({ role }));
}

// Legacy persona workspace route. Both in-scope role landings merged
// into dedicated health areas on 2026-06-09:
//   marketing         -> /marketing-health  (Phase B.1)
//   customer_success  -> /customer-health   (Phase B/B2)
// Sales + Product were removed from scope the same day. The old
// per-role landing components live in git history (pre-B2) if a
// future re-scope brings them back.
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: rawRole } = await params;
  const role = rawRole.toLowerCase();
  if (role === "marketing") redirect("/marketing-health");
  if (role === "customer_success") redirect("/customer-health");
  notFound();
}
