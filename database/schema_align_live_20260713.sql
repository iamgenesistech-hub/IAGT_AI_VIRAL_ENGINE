-- =====================================================================
-- EVICS — Live Schema Alignment Migration (2026-07-13)
-- =====================================================================
-- WHY: The restored Supabase project was seeded from an older/simpler
-- schema than backend/server.js targets. Several write endpoints
-- (video generation, publishing, product profit-audit, script writer,
-- scan logging) reference columns that do not exist on the live tables,
-- so their INSERT/UPDATE calls silently fail and nothing persists.
--
-- This migration is SAFE to run repeatedly:
--   * Only ADDs columns (never drops/renames) via ADD COLUMN IF NOT EXISTS
--   * Backfills creatives.script from the existing export_payload JSON
--   * No data is lost; existing columns are untouched
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- (Runs as the postgres role, so no service key is needed here.)
-- =====================================================================

-- ---------- creatives (script persistence + rejection tracking) ----------
ALTER TABLE public.creatives
  ADD COLUMN IF NOT EXISTS script            text,
  ADD COLUMN IF NOT EXISTS rejection_reason  text,
  ADD COLUMN IF NOT EXISTS source            text DEFAULT 'auto-generate';

-- Backfill script from the rich export_payload written by the generator
UPDATE public.creatives
SET script = export_payload->>'videoScript'
WHERE (script IS NULL OR script = '')
  AND export_payload ? 'videoScript';

-- ---------- evics_trends (scan/audit log metadata) ----------
ALTER TABLE public.evics_trends
  ADD COLUMN IF NOT EXISTS source       text,
  ADD COLUMN IF NOT EXISTS scan_amount  integer;

-- ---------- evics_products (profit-audit persistence) ----------
ALTER TABLE public.evics_products
  ADD COLUMN IF NOT EXISTS shopify_id       text,
  ADD COLUMN IF NOT EXISTS handle           text,
  ADD COLUMN IF NOT EXISTS revenue          numeric(12,2),
  ADD COLUMN IF NOT EXISTS last_audited_at  timestamptz;

-- ---------- evics_renders (media/video output persistence) ----------
ALTER TABLE public.evics_renders
  ADD COLUMN IF NOT EXISTS job_id         text,
  ADD COLUMN IF NOT EXISTS video_url      text,
  ADD COLUMN IF NOT EXISTS thumbnail_url  text,
  ADD COLUMN IF NOT EXISTS duration       text,
  ADD COLUMN IF NOT EXISTS script         text,
  ADD COLUMN IF NOT EXISTS parameters     jsonb,
  ADD COLUMN IF NOT EXISTS source         text,
  ADD COLUMN IF NOT EXISTS render_status  text,
  ADD COLUMN IF NOT EXISTS elite_vault    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS roas           numeric(12,2),
  ADD COLUMN IF NOT EXISTS revenue        numeric(12,2),
  ADD COLUMN IF NOT EXISTS media_type     text,
  ADD COLUMN IF NOT EXISTS published_to   text,
  ADD COLUMN IF NOT EXISTS published_at   timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz DEFAULT now();

-- Helpful index for media lookups by generation job id
CREATE INDEX IF NOT EXISTS idx_evics_renders_job_id ON public.evics_renders (job_id);

-- =====================================================================
-- Verify (optional): list the columns after running
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_schema='public'
--     AND table_name IN ('creatives','evics_trends','evics_products','evics_renders')
--   ORDER BY table_name, ordinal_position;
-- =====================================================================
