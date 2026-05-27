import { PageHeader, SectionDivider } from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID, DEMO_BRAND_NAME } from "@/lib/demo-context";
import { BrandKitEditor } from "./editor";

export const dynamic = "force-dynamic";

type Brand = {
  id: string;
  name: string | null;
  website_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  font_family: string | null;
  footer_text: string | null;
};

export default async function BrandKitPage() {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("brands")
    .select(
      "id, name, website_url, primary_color, secondary_color, logo_url, font_family, footer_text",
    )
    .eq("id", DEMO_BRAND_ID)
    .maybeSingle();

  const brand = (data as Brand | null) ?? null;
  const brandName = brand?.name || DEMO_BRAND_NAME || "Brand";

  return (
    <div className="px-8 py-10 max-w-6xl space-y-10">
      <PageHeader
        eyebrow="Setup · Brand kit"
        title={`${brandName} · brand kit`}
        subtitle="Visual identity used to render branded PDFs (one-pagers, infographics) and eventually slide decks. Every approved Library artifact you click 'Render' on inherits these values."
      />

      <section>
        <SectionDivider
          title="Brand colors, logo, and footer"
          sub="Used in PDF exports"
        />
        <BrandKitEditor brand={brand} />
      </section>
    </div>
  );
}
