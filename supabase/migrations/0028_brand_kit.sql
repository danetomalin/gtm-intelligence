-- Migration 0028: brand kit fields on `brands`.
--
-- The deployment renderers (one_pager PDF, infographic PDF, eventually
-- slide decks + carousels) need brand-specific visual identity to produce
-- on-brand deliverables. We store the essentials directly on the brands
-- row so a single read in the renderer pipeline pulls everything needed.
--
-- All fields nullable + free-text — the renderer falls back to sensible
-- defaults when a brand hasn't filled them in. A /brand-kit UI lets the
-- user enter them manually; a future R-BR auto-extract step (scrape
-- website CSS + favicon) can pre-populate.

alter table brands
  add column if not exists primary_color   text,
  add column if not exists secondary_color text,
  add column if not exists logo_url        text,
  add column if not exists font_family     text,
  add column if not exists footer_text     text;

comment on column brands.primary_color is
  'Hex color (e.g. #2D1B69) used as the dominant accent in branded PDFs and HTML exports.';
comment on column brands.secondary_color is
  'Hex color used as a secondary tint / background wash in branded artifacts.';
comment on column brands.logo_url is
  'Public URL to a logo image (PNG/SVG/JPG). When null, renderer falls back to the brand name as a wordmark.';
comment on column brands.font_family is
  'Preferred typography family. Renderer maps this to an embedded font when available, otherwise uses a system fallback.';
comment on column brands.footer_text is
  'Legal / contact attribution that lands in the footer of every branded PDF (e.g. "Hims & Hers Health, Inc. · hims.com").';
