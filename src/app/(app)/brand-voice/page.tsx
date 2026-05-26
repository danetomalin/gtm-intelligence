import { PageHeader, SectionDivider } from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID, DEMO_BRAND_NAME } from "@/lib/demo-context";

export const dynamic = "force-dynamic";

type Brand = {
  name: string | null;
  additional_context: string | null;
};

type VoiceRule = {
  id: string;
  rule_type: string | null;
  rule: string | null;
  rationale: string | null;
  example_before: string | null;
  example_after: string | null;
};

type ProofPoint = {
  id: string;
  proof_type: string | null;
  claim: string | null;
  positioning_alignment: string | null;
};

export default async function BrandVoicePage() {
  const admin = await createAdminClient();

  const [brandRes, rulesRes, proofRes] = await Promise.all([
    admin
      .from("brands")
      .select("name, additional_context")
      .eq("id", DEMO_BRAND_ID)
      .maybeSingle(),
    admin
      .from("brand_voice_rules")
      .select("id, rule_type, rule, rationale, example_before, example_after")
      .eq("brand_id", DEMO_BRAND_ID)
      .order("created_at", { ascending: true })
      .limit(20),
    admin
      .from("brand_proof_points")
      .select("id, proof_type, claim, positioning_alignment")
      .eq("brand_id", DEMO_BRAND_ID)
      .order("created_at", { ascending: true })
      .limit(8),
  ]);

  const brand = (brandRes.data as Brand | null) ?? null;
  const brandName = brand?.name || DEMO_BRAND_NAME || "this brand";
  const rules = (rulesRes.data as VoiceRule[]) ?? [];
  const proofs = (proofRes.data as ProofPoint[]) ?? [];

  // Central thesis = brand.additional_context (the source of truth for what
  // the brand does + who it's for). Falls back to a generic line when no
  // brand context has been captured yet.
  const centralThesis =
    brand?.additional_context ||
    `${brandName}'s central thesis hasn't been captured yet. Run R-BR (Brand Code Ingestion) to extract the brand's voice, proof, and customer context.`;

  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Brand voice & narrative"
        title={`${brandName} · brand voice`}
        subtitle="The brand's central thesis, voice rules, and proof points. Everything here is captured during R-BR and reused by every downstream workflow that produces customer-facing content."
      />

      <section>
        <SectionDivider title="Central thesis" sub="What the brand stands for" />
        <div className="rounded-lg border border-border bg-card px-6 py-6 border-l-2 border-l-accent">
          <p className="text-base text-text leading-relaxed">{centralThesis}</p>
        </div>
      </section>

      <section>
        <SectionDivider
          title="Voice rules"
          sub={`${rules.length} captured`}
        />
        {rules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
            No voice rules captured yet. Run{" "}
            <strong className="text-text">R-BR (Brand Code Ingestion)</strong>{" "}
            to extract the brand's tone, preferred terms, and forbidden phrases.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rules.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border bg-card px-5 py-4 space-y-2"
              >
                <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
                  {r.rule_type || "rule"}
                </div>
                <p className="text-sm text-text leading-relaxed">{r.rule}</p>
                {r.rationale && (
                  <p className="text-xs text-text-muted leading-relaxed">
                    {r.rationale}
                  </p>
                )}
                {(r.example_before || r.example_after) && (
                  <div className="border-t border-border pt-2 space-y-1 text-xs">
                    {r.example_before && (
                      <div>
                        <span className="text-text-dim">Before: </span>
                        <span className="text-text-muted">{r.example_before}</span>
                      </div>
                    )}
                    {r.example_after && (
                      <div>
                        <span className="text-text-dim">After: </span>
                        <span className="text-text">{r.example_after}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {proofs.length > 0 && (
        <section>
          <SectionDivider
            title="Proof points"
            sub={`${proofs.length} ready to cite`}
          />
          <ul className="space-y-2">
            {proofs.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-border bg-card px-5 py-4"
              >
                <div className="text-[10px] uppercase tracking-wider text-text-dim mb-1">
                  {p.proof_type || "proof"}
                </div>
                <p className="text-sm text-text leading-relaxed">{p.claim}</p>
                {p.positioning_alignment && (
                  <p className="text-xs text-text-muted leading-relaxed mt-1">
                    Anchors: {p.positioning_alignment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
