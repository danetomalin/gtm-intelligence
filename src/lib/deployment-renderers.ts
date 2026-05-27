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
  AlignmentType,
} from "docx";
import PptxGenJS from "pptxgenjs";

export type RenderResult = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

export type DeploymentFormatRow = {
  id: string;
  format_type: string | null;
  title: string | null;
  body_json: unknown;
  body_markdown: string | null;
};

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

/**
 * Dispatch a deployment_format row to the correct renderer based on
 * format_type. Throws if no renderer matches the type.
 */
export async function renderDeployment(
  fmt: DeploymentFormatRow,
): Promise<RenderResult> {
  switch (fmt.format_type) {
    case "one_pager":
      return renderOnePagerDocx(fmt);
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
    case "infographic":
      // Infographic is image-gen territory — punt to a markdown spec the
      // user can hand to a designer for now.
      return renderInfographicSpecMarkdown(fmt);
    default:
      throw new Error(
        `No renderer for format_type=${fmt.format_type ?? "(null)"}`,
      );
  }
}

// =============================================================================
// DOCX renderers
// =============================================================================

async function renderOnePagerDocx(
  fmt: DeploymentFormatRow,
): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const sections = Array.isArray(body.sections)
    ? (body.sections as Array<Record<string, unknown>>)
    : [];
  const cta = typeof body.cta === "string" ? body.cta : null;

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

  for (const s of sections) {
    const heading = typeof s.heading === "string" ? s.heading : null;
    const sectionBody = typeof s.body === "string" ? s.body : null;
    if (heading) {
      children.push(
        new Paragraph({
          text: heading,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        }),
      );
    }
    if (sectionBody) {
      children.push(
        new Paragraph({
          children: [new TextRun(sectionBody)],
          spacing: { after: 160 },
        }),
      );
    }
  }

  if (cta) {
    children.push(
      new Paragraph({
        text: "Call to action",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: cta, bold: true })],
        spacing: { after: 160 },
      }),
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });
  const buffer = await Packer.toBuffer(doc);
  return { buffer, mimeType: DOCX_MIME, extension: "docx" };
}

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

async function renderInfographicSpecMarkdown(
  fmt: DeploymentFormatRow,
): Promise<RenderResult> {
  const body = asObject(fmt.body_json);
  const sections = Array.isArray(body.sections)
    ? (body.sections as Array<Record<string, unknown>>)
    : [];

  const lines: string[] = [];
  lines.push(`# ${fmt.title ?? "Infographic spec"}`, "");
  lines.push(
    "Hand this brief to a designer (or feed it to an image-generation step).",
    "",
  );

  sections.forEach((s, i) => {
    lines.push(`## Section ${i + 1}`);
    if (s.kind) lines.push(`*Kind:* ${String(s.kind)}`);
    if (s.headline) lines.push(`**${String(s.headline)}**`);
    if (s.datapoint) lines.push(`*Datapoint:* ${String(s.datapoint)}`);
    if (s.visual_prompt) lines.push(`*Visual prompt:* ${String(s.visual_prompt)}`);
    lines.push("");
  });

  return {
    buffer: bufferFromString(lines.join("\n")),
    mimeType: MD_MIME,
    extension: "md",
  };
}
