-- Creates persistent tracking for HeyGen video assembly/render jobs.
-- Includes legacy draft columns because existing /api/assembly/drafts also writes to this table.
CREATE TABLE IF NOT EXISTS video_assembly_drafts (
  id BIGSERIAL PRIMARY KEY,
  video_id TEXT UNIQUE,
  script_text TEXT NOT NULL DEFAULT '',
  avatar_id TEXT NOT NULL DEFAULT '',
  voice_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'completed', 'failed')),
  video_url TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  error_message TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  components JSONB,
  style TEXT,
  voice TEXT,
  background TEXT,
  aspect TEXT,
  saved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_assembly_drafts_video_id
  ON video_assembly_drafts (video_id);

CREATE INDEX IF NOT EXISTS idx_video_assembly_drafts_status
  ON video_assembly_drafts (status);
