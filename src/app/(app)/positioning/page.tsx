import { PageHeader, SectionDivider } from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID, DEMO_BRAND_NAME } from "@/lib/demo-context";
import {
  PositioningElementCard,
  sortPositioningElements,
  dedupeLatestPerType,
  type PositioningElement,
} from "../agents/[code]/positioning-card";

export const dynamic = "force-dynamic";

type Brand = {
  name: string | null;
  additional_context: string | null;
};

export default async function PositioningPage() {
  const admin = await createAdminClient();

  const [brandRes, elementsRes] = await Promise.all([
    admin
      .from("brands")
      .select("name, additional_context")
      .eq("id", DEMO_BRAND_ID)
      .maybeSingle(),
    admin
      .from("positioning_elements")
      .select(
        "id, element_type, content, evidence, last_change_reason, created_at, updated_at",
      )
      .eq("brand_id", DEMO_BRAND_ID)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const brand = (brandRes.data as Brand | null) ?? null;
  const brandName = brand?.name || DEMO_BRAND_NAME || "this brand";

  const allElements = (elementsRes.data as PositioningElement[]) ?? [];
  const currentElements = sortPositioningElements(
    dedupeLatestPerType(allElements),
  );

  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Positioning framework"
        title={`${brandName} · five-element positioning`}
        subtitle={`The April Dunford framework applied to ${brandName}. Each element is paired with the evidence that supports it, so the positioning isn't theoretical — it's traceable to research.`}
      />

      <section>
        {currentElements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-12 text-center text-sm text-text-muted">
            No positioning elements yet. Run{" "}
            <strong className="text-text">S-PO (Positioning Engine)</strong>{" "}
            to generate the five elements from the latest competitive
            landscape and customer evidence.
          </div>
        ) : (
          <div className="space-y-3">
            {currentElements.map((el, idx) => (
              <PositioningElementCard
                key={el.id}
                element={el}
                index={idx + 1}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionDivider
          title="Refresh + audit trail"
          sub={`${allElements.length} element versions across all runs`}
        />
        <p className="text-sm text-text-muted leading-relaxed">
          Positioning is regenerated whenever S-PO runs — typically after
          customer evidence, win/loss, or competitor signals shift the
          underlying inputs. Each run writes a fresh version per element type;
          the current view above is the latest version, and the full history
          lives on the{" "}
          <a href="/agents/s-po" className="text-accent hover:underline">
            S-PO workflow page
          </a>
          .
        </p>
      </section>
    </div>
  );
}
