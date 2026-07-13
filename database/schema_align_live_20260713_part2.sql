-- =====================================================================
-- EVICS — Live Schema Alignment Migration, PART 2 (2026-07-13)
-- =====================================================================
-- WHY: video_assembly_drafts on the live project is a stub table that only
-- has (id, duration, saved_at). The Video Assembly workspace saves drafts
-- with components/style/voice/background/aspect, so every save currently
-- fails with: "Could not find the 'aspect' column ... in the schema cache".
--
-- This migration is SAFE to run repeatedly (ADD COLUMN IF NOT EXISTS only,
-- no drops/renames, no data loss). Run AFTER schema_align_live_20260713.sql.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- =====================================================================

ALTER TABLE public.video_assembly_drafts
  ADD COLUMN IF NOT EXISTS components  text,
  ADD COLUMN IF NOT EXISTS style       text,
  ADD COLUMN IF NOT EXISTS voice       text,
  ADD COLUMN IF NOT EXISTS background  text,
  ADD COLUMN IF NOT EXISTS aspect      text;

-- =====================================================================
-- Verify (optional):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='video_assembly_drafts'
--   ORDER BY ordinal_position;
-- =====================================================================
