-- EVICS Sprint 1 reliability indexes
-- Safe to run multiple times in Supabase/Postgres.

CREATE INDEX IF NOT EXISTS idx_evics_trends_created_at
  ON public.evics_trends (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evics_trends_platform
  ON public.evics_trends (platform);

CREATE INDEX IF NOT EXISTS idx_creatives_status
  ON public.creatives (status);

CREATE INDEX IF NOT EXISTS idx_creatives_score
  ON public.creatives (score DESC);

CREATE INDEX IF NOT EXISTS idx_evics_renders_status
  ON public.evics_renders (status);

CREATE INDEX IF NOT EXISTS idx_publishing_queue_publish_at
  ON public.publishing_queue (publish_at);
