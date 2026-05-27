// Per-format renderers for deployment_formats rows. Each renderer takes the
// row's body_json + title and returns a { buffer, mimeType, extension }
// triple ready to upload to Supabase Storage. The bucket is single-tenant
// for now; tenant scoping happens in the upload path.

import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx";
import PptxGenJS from "pptxgenjs";
import PDFDocument from "pdfkit";

export type RenderResult = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

// Brand kit pulled from the brands row at render time. Every field is
// optional; the renderer falls back to neutral defaults so the call works
// even when a brand hasn't filled in their kit yet.
export type BrandKit = {
  brandName?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  fontFamily?: string | null;
  footerText?: string | null;
};

export type DeploymentFormatRow = {
  id: string;
  format_type: string | null;
  title: string | null;
  body_json: unknown;
  body_markdown: string | null;
};

// Sensible defaults when a brand hasn't filled in its kit yet.
const DEFAULT_PRIMARY = "#1A1A1A";
const DEFAULT_SECONDARY = "#F5F5F5";

function asObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MD_MIME = "text/markdown";
const PDF_MIME = "application/pdf";

/**
 * Dispatch a deployment_format row to the correct renderer based on
 * format_type. The brand kit argument is optional — when provided, the
 * branded PDF renderers use it for colors / logo / footer; when absent,
 * neutral defaults are used.
 */
export async function renderDeployment(
  fmt: DeploymentFormatRow,
  brand: BrandKit = {},
): Promise<RenderResult> {
  switch (fmt.format_type) {
    case "one_pager":
      return renderOnePagerPdf(fmt, brand);
    case "infographic":
      return renderInfographicPdf(fmt, brand);
    case "slide_deck":
      return renderSlideDeckPptx(fmt);
    case "linkedin_carousel":
      return renderCarouselPptx(fmt);
    case "video_script":
      return renderVideoScriptDocx(fmt);
    case "faq":
      return renderFaqDocx(fmt);
    case "email_sequence":
      return renderEmailSequenceMarkdown(fmt);
    case "linkedin_post":
      return renderLinkedInPostMarkdown(fmt);
    default:
      throw new Error(
        `No renderer for format_type=${fmt.format_type ?? "(null)"}`,
      );
  }
}

// =============================================================================
// PDF renderers (branded, pdfkit-based)
// =============================================================================

// Fetches an image URL into a Buffer. Returns null on any failure so the
// renderer can fall back to a text wordmark when the logo is unreachable.
async function fetchImage(url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const ab = await resp.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

// Capture pdfkit output into a Buffer. pdfkit streams chunks; we collect
// them and join when end() fires.
function pdfBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

// Branded one-pager. Top band in primary_color carries the title + logo.
// Section headings repeat the primary color. CTA gets a secondary tint
// wash. Footer carries the brand attribution.
async function renderOnePagerPdf(
  fmt: DeploymentFormatRow,
  brand: BrandKit,
): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const sections = Array.isArray(body.sections)
    ? (body.sections as Array<Record<string, unknown>>)
    : [];
  const cta = typeof body.cta === "string" ? body.cta : null;

  const primary = brand.primaryColor || DEFAULT_PRIMARY;
  const secondary = brand.secondaryColor || DEFAULT_SECONDARY;
  const brandName = brand.brandName || "";
  const footer =
    brand.footerText || (brandName ? `${brandName} · all rights reserved` : "");
  const logo = await fetchImage(brand.logoUrl);

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: { Title: fmt.title ?? "One-pager", Author: brandName || undefined },
  });
  const out = pdfBuffer(doc);

  // Header band
  const pageWidth = doc.page.width;
  const headerHeight = 90;
  doc.rect(0, 0, pageWidth, headerHeight).fill(primary);

  // Logo (top-right) if available, else brand name wordmark
  if (logo) {
    try {
      doc.image(logo, pageWidth - 90, 28, { fit: [40, 40] });
    } catch {
      // Bad image bytes — fall through to wordmark below.
    }
  }
  if (!logo && brandName) {
    doc
      .fillColor("#FFFFFF")
      .fontSize(14)
      .text(brandName, pageWidth - 200, 32, { width: 150, align: "right" });
  }

  // Title in the band
  doc
    .fillColor("#FFFFFF")
    .fontSize(22)
    .text(fmt.title ?? "Untitled", 50, 32, { width: pageWidth - 250 });

  // Body
  let cursorY = headerHeight + 28;
  doc.y = cursorY;
  doc.x = 50;
  for (const s of sections) {
    const heading = typeof s.heading === "string" ? s.heading : null;
    const sectionBody = typeof s.body === "string" ? s.body : null;
    if (heading) {
      doc
        .moveDown(0.4)
        .fillColor(primary)
        .fontSize(13)
        .text(heading.toUpperCase(), { characterSpacing: 0.5 });
    }
    if (sectionBody) {
      doc
        .moveDown(0.2)
        .fillColor("#1A1A1A")
        .fontSize(11)
        .text(sectionBody, { lineGap: 2 });
    }
  }

  // CTA box
  if (cta) {
    doc.moveDown(1);
    const ctaY = doc.y;
    const ctaH = 56;
    doc
      .rect(50, ctaY, pageWidth - 100, ctaH)
      .fill(secondary);
    doc
      .fillColor(primary)
      .fontSize(10)
      .text("CALL TO ACTION", 65, ctaY + 12, { characterSpacing: 0.5 });
    doc
      .fillColor("#1A1A1A")
      .fontSize(13)
      .text(cta, 65, ctaY + 28, { width: pageWidth - 130 });
  }

  // Footer
  if (footer) {
    const footerY = doc.page.height - 40;
    doc
      .fillColor("#999999")
      .fontSize(9)
      .text(footer, 50, footerY, {
        width: pageWidth - 100,
        align: "center",
      });
  }

  doc.end();
  const buffer = await out;
  return { buffer, mimeType: PDF_MIME, extension: "pdf" };
}

// Branded infographic. Grid of section cards, each highlighting a single
// datapoint + headline in the brand colors. Visual emphasis on the
// datapoint number so it reads at a glance.
async function renderInfographicPdf(
  fmt: DeploymentFormatRow,
  brand: BrandKit,
): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const sections = Array.isArray(body.sections)
    ? (body.sections as Array<Record<string, unknown>>)
    : [];

  const primary = brand.primaryColor || DEFAULT_PRIMARY;
  const secondary = brand.secondaryColor || DEFAULT_SECONDARY;
  const brandName = brand.brandName || "";
  const footer =
    brand.footerText || (brandName ? `${brandName} · all rights reserved` : "");
  const logo = await fetchImage(brand.logoUrl);

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: { Title: fmt.title ?? "Infographic", Author: brandName || undefined },
  });
  const out = pdfBuffer(doc);

  const pageWidth = doc.page.width;

  // Header band
  doc.rect(0, 0, pageWidth, 90).fill(primary);
  if (logo) {
    try {
      doc.image(logo, pageWidth - 90, 28, { fit: [40, 40] });
    } catch {
      // ignored
    }
  } else if (brandName) {
    doc
      .fillColor("#FFFFFF")
      .fontSize(14)
      .text(brandName, pageWidth - 200, 32, { width: 150, align: "right" });
  }
  doc
    .fillColor("#FFFFFF")
    .fontSize(22)
    .text(fmt.title ?? "Untitled", 50, 32, { width: pageWidth - 250 });

  // 2-column grid of section cards
  const gridTop = 130;
  const colWidth = (pageWidth - 100 - 20) / 2; // 20px gutter
  const rowHeight = 160;
  sections.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 50 + col * (colWidth + 20);
    const y = gridTop + row * (rowHeight + 16);
    if (y + rowHeight > doc.page.height - 60) return; // skip overflow

    doc.rect(x, y, colWidth, rowHeight).fill(secondary);

    const kind = typeof s.kind === "string" ? s.kind : null;
    const datapoint = typeof s.datapoint === "string" ? s.datapoint : null;
    const headline = typeof s.headline === "string" ? s.headline : null;

    if (kind) {
      doc
        .fillColor(primary)
        .fontSize(9)
        .text(kind.toUpperCase(), x + 16, y + 14, {
          characterSpacing: 0.6,
        });
    }
    if (datapoint) {
      doc
        .fillColor(primary)
        .fontSize(34)
        .text(datapoint, x + 16, y + 36, { width: colWidth - 32 });
    }
    if (headline) {
      doc
        .fillColor("#1A1A1A")
        .fontSize(11)
        .text(headline, x + 16, y + 86, {
          width: colWidth - 32,
          lineGap: 1,
        });
    }
  });

  if (footer) {
    const footerY = doc.page.height - 40;
    doc
      .fillColor("#999999")
      .fontSize(9)
      .text(footer, 50, footerY, {
        width: pageWidth - 100,
        align: "center",
      });
  }

  doc.end();
  const buffer = await out;
  return { buffer, mimeType: PDF_MIME, extension: "pdf" };
}

// =============================================================================
// DOCX renderers
// =============================================================================

async function renderVideoScriptDocx(
  fmt: DeploymentFormatRow,
): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const scenes = Array.isArray(body.scenes)
    ? (body.scenes as Array<Record<string, unknown>>)
    : [];

  const children: Paragraph[] = [];
  if (fmt.title) {
    children.push(
      new Paragraph({
        text: fmt.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 240 },
      }),
    );
  }

  scenes.forEach((s, i) => {
    const sceneNum = i + 1;
    const duration = s.duration_sec != null ? ` · ${String(s.duration_sec)}s` : "";
    children.push(
      new Paragraph({
        text: `Scene ${sceneNum}${duration}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
    );
    if (s.visual) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Visual: ", bold: true }),
            new TextRun(String(s.visual)),
          ],
          spacing: { after: 80 },
        }),
      );
    }
    if (s.voiceover) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "VO: ", bold: true }),
            new TextRun(String(s.voiceover)),
          ],
          spacing: { after: 160 },
        }),
      );
    }
  });

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  return { buffer, mimeType: DOCX_MIME, extension: "docx" };
}

async function renderFaqDocx(fmt: DeploymentFormatRow): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const pairs = Array.isArray(body.qa_pairs)
    ? (body.qa_pairs as Array<Record<string, unknown>>)
    : [];

  const children: Paragraph[] = [];
  if (fmt.title) {
    children.push(
      new Paragraph({
        text: fmt.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 240 },
      }),
    );
  }

  pairs.forEach((qa) => {
    if (qa.q) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Q. ", bold: true }),
            new TextRun({ text: String(qa.q), bold: true }),
          ],
          spacing: { before: 200, after: 80 },
        }),
      );
    }
    if (qa.a) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "A. " }),
            new TextRun(String(qa.a)),
          ],
          spacing: { after: 200 },
        }),
      );
    }
  });

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  return { buffer, mimeType: DOCX_MIME, extension: "docx" };
}

// =============================================================================
// PPTX renderers
// =============================================================================

async function renderSlideDeckPptx(
  fmt: DeploymentFormatRow,
): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const slides = Array.isArray(body.slides)
    ? (body.slides as Array<Record<string, unknown>>)
    : [];

  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";

  // Cover slide if title present
  if (fmt.title) {
    const cover = pres.addSlide();
    cover.background = { color: "FFFFFF" };
    cover.addText(fmt.title, {
      x: 0.5,
      y: 2.5,
      w: 12,
      h: 1.5,
      fontSize: 36,
      bold: true,
      align: "left",
      color: "1A1A1A",
    });
  }

  slides.forEach((s, i) => {
    const slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };

    const slideTitle = typeof s.title === "string" ? s.title : `Slide ${i + 1}`;
    slide.addText(slideTitle, {
      x: 0.5,
      y: 0.4,
      w: 12,
      h: 0.7,
      fontSize: 24,
      bold: true,
      align: "left",
      color: "1A1A1A",
    });

    const bullets = Array.isArray(s.bullets)
      ? (s.bullets as unknown[]).map((b) => ({ text: String(b) }))
      : null;
    if (bullets && bullets.length > 0) {
      slide.addText(bullets, {
        x: 0.5,
        y: 1.3,
        w: 12,
        h: 5,
        fontSize: 16,
        bullet: true,
        color: "333333",
        paraSpaceAfter: 8,
      });
    }

    if (s.speaker_notes) {
      slide.addNotes(String(s.speaker_notes));
    }
  });

  // pptxgenjs returns various output formats. Buffer mode gives us a
  // Node Buffer suitable for direct upload to Supabase Storage.
  const buf = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  return { buffer: buf, mimeType: PPTX_MIME, extension: "pptx" };
}

async function renderCarouselPptx(
  fmt: DeploymentFormatRow,
): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const slides = Array.isArray(body.slides)
    ? (body.slides as Array<Record<string, unknown>>)
    : [];

  const pres = new PptxGenJS();
  // LinkedIn carousels are square — use a custom 1080x1080 layout.
  pres.defineLayout({ name: "LI_CAROUSEL", width: 10, height: 10 });
  pres.layout = "LI_CAROUSEL";

  slides.forEach((s, i) => {
    const slide = pres.addSlide();
    slide.background = { color: "F5F5F5" };

    const slideTitle = typeof s.title === "string" ? s.title : `Slide ${i + 1}`;
    slide.addText(slideTitle, {
      x: 0.5,
      y: 0.8,
      w: 9,
      h: 1.2,
      fontSize: 32,
      bold: true,
      align: "left",
      color: "1A1A1A",
    });

    if (s.body) {
      slide.addText(String(s.body), {
        x: 0.5,
        y: 2.2,
        w: 9,
        h: 6,
        fontSize: 18,
        align: "left",
        color: "333333",
      });
    }

    // Page number footer
    slide.addText(`${i + 1} / ${slides.length}`, {
      x: 0.5,
      y: 9.2,
      w: 9,
      h: 0.4,
      fontSize: 12,
      align: "right",
      color: "999999",
    });
  });

  const buf = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  return { buffer: buf, mimeType: PPTX_MIME, extension: "pptx" };
}

// =============================================================================
// Markdown renderers
// =============================================================================

function bufferFromString(s: string): Buffer {
  return Buffer.from(s, "utf-8");
}

async function renderEmailSequenceMarkdown(
  fmt: DeploymentFormatRow,
): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const emails = Array.isArray(body.emails)
    ? (body.emails as Array<Record<string, unknown>>)
    : [];

  const lines: string[] = [];
  lines.push(`# ${fmt.title ?? "Email sequence"}`, "");

  emails.forEach((e, i) => {
    const days = e.send_after_days != null ? ` · send +${String(e.send_after_days)}d` : "";
    lines.push(`## Email ${i + 1}${days}`, "");
    if (e.subject) lines.push(`**Subject:** ${String(e.subject)}`, "");
    if (e.preview) lines.push(`*Preview:* ${String(e.preview)}`, "");
    if (e.body) lines.push(String(e.body), "");
    lines.push("---", "");
  });

  return {
    buffer: bufferFromString(lines.join("\n")),
    mimeType: MD_MIME,
    extension: "md",
  };
}

async function renderLinkedInPostMarkdown(
  fmt: DeploymentFormatRow,
): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const lines: string[] = [];

  if (fmt.title) lines.push(`# ${fmt.title}`, "");
  if (body.hook) lines.push(`**${String(body.hook)}**`, "");
  if (body.body) lines.push(String(body.body), "");
  if (body.cta) lines.push("", `> ${String(body.cta)}`, "");
  if (Array.isArray(body.hashtags) && body.hashtags.length > 0) {
    lines.push(
      "",
      (body.hashtags as unknown[])
        .map((t) => `#${String(t).replace(/^#/, "")}`)
        .join(" "),
    );
  }

  return {
    buffer: bufferFromString(lines.join("\n")),
    mimeType: MD_MIME,
    extension: "md",
  };
}

// Note: infographic now renders as a branded PDF (renderInfographicPdf
// above). The old markdown-spec renderer has been removed.
