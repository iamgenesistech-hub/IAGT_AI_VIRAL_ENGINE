-- Migration file to create missing tables used by the EVICS server.js backend.
-- Targets PostgreSQL/Supabase database.

CREATE TABLE IF NOT EXISTS public.evics_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  angle text,
  score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evics_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'Inactive',
  budget numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evics_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source text,
  scan_amount integer DEFAULT 0,
  hook text,
  category text,
  platform text,
  confidence text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_assembly_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  components jsonb,
  duration text,
  style text,
  voice text,
  background text,
  aspect text,
  saved_at timestamptz DEFAULT now(),
  status text DEFAULT 'Draft',
  video_url text,
  error_message text,
  idempotency_key text UNIQUE,
  render_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS evics_products_score_idx ON public.evics_products (score DESC);
CREATE INDEX IF NOT EXISTS evics_trends_created_at_idx ON public.evics_trends (created_at DESC);
CREATE INDEX IF NOT EXISTS video_assembly_drafts_saved_at_idx ON public.video_assembly_drafts (saved_at DESC);
