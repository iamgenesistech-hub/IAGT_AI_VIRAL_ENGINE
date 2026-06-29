-- ============================================================
-- EVICS Complete Schema v2
-- IAGT AI Viral Engine — iamgenesistech.myshopify.com
--
-- Run this in the Supabase SQL editor.
-- All statements use CREATE TABLE IF NOT EXISTS and
-- ALTER TABLE ADD COLUMN IF NOT EXISTS — safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 1. evics_trends — viral trend data from scanning
-- ─────────────────────────────────────────────────────────────
create table if not exists public.evics_trends (
  id          bigserial primary key,
  title       text,
  hook        text,
  platform    text,
  category    text,
  confidence  text,
  viral_score integer,
  emotion     text,
  structure   text,
  action      text,
  source      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists evics_trends_platform_idx    on public.evics_trends (platform);
create index if not exists evics_trends_created_at_idx  on public.evics_trends (created_at desc);
create index if not exists evics_trends_viral_score_idx on public.evics_trends (viral_score desc);

-- ─────────────────────────────────────────────────────────────
-- 2. evics_products — IAGT product catalog with profit intelligence
-- ─────────────────────────────────────────────────────────────
create table if not exists public.evics_products (
  id              bigserial primary key,
  name            text unique,
  category        text,
  sku             text,
  score           integer default 0,
  angle           text,
  goals           text[],
  benefits        text[],
  is_bundle       boolean default false,
  -- Phase 2 profit intelligence columns
  profit_score    numeric(10,2) default 0,
  tier            text default 'Tier 3',
  days_in_tier4   integer default 0,
  last_tiered_at  timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists evics_products_name_idx         on public.evics_products (name);
create index if not exists evics_products_profit_score_idx on public.evics_products (profit_score desc);
create index if not exists evics_products_tier_idx         on public.evics_products (tier);

-- ─────────────────────────────────────────────────────────────
-- 3. creatives — generated ad creative library
-- ─────────────────────────────────────────────────────────────
create table if not exists public.creatives (
  id          bigserial primary key,
  status      text not null default 'Draft',
  product     text not null default '',
  format      text not null default '',
  hook        text not null default '',
  script      text,
  asset       text,
  channel     text,
  score       integer default 0,
  approved    boolean not null default false,
  source      text default 'auto-generate',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists creatives_status_idx    on public.creatives (status);
create index if not exists creatives_approved_idx  on public.creatives (approved);
create index if not exists creatives_score_idx     on public.creatives (score desc);
create index if not exists creatives_product_idx   on public.creatives (product);

-- ─────────────────────────────────────────────────────────────
-- 4. evics_renders — video render job tracking
-- ─────────────────────────────────────────────────────────────
create table if not exists public.evics_renders (
  id              bigserial primary key,
  platform        text,
  status          text default 'pending',
  job_id          text,
  video_url       text,
  script          text,
  parameters      jsonb,
  source          text,
  -- Phase 3 render grading columns
  render_grade    numeric(5,2),
  render_status   text,
  elite_vault     boolean default false,
  -- ROAS tracking
  roas            numeric(10,2),
  revenue         numeric(10,2),
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists evics_renders_platform_idx   on public.evics_renders (platform);
create index if not exists evics_renders_status_idx     on public.evics_renders (status);
create index if not exists evics_renders_job_id_idx     on public.evics_renders (job_id);
create index if not exists evics_renders_created_at_idx on public.evics_renders (created_at desc);
create index if not exists evics_renders_elite_vault_idx on public.evics_renders (elite_vault) where elite_vault = true;

-- ─────────────────────────────────────────────────────────────
-- 5. publishing_queue — distribution queue
-- ─────────────────────────────────────────────────────────────
create table if not exists public.publishing_queue (
  id           bigserial primary key,
  channel      text not null,
  content      text,
  creative_id  bigint,
  status       text not null default 'Queued',
  publish_at   timestamptz,
  scheduled_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists publishing_queue_status_idx      on public.publishing_queue (status);
create index if not exists publishing_queue_channel_idx     on public.publishing_queue (channel);
create index if not exists publishing_queue_publish_at_idx  on public.publishing_queue (publish_at);

-- ─────────────────────────────────────────────────────────────
-- 6. video_assembly_drafts — saved assembly workspace drafts
-- ─────────────────────────────────────────────────────────────
create table if not exists public.video_assembly_drafts (
  id            bigserial primary key,
  name          text not null default 'Untitled Draft',
  hook          text,
  product       text,
  script        text,
  format        text,
  platform      text,
  duration      text,
  aspect        text,
  style         text,
  voice         text,
  background    text,
  components    jsonb default '[]',
  render_config jsonb default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists video_assembly_drafts_created_at_idx on public.video_assembly_drafts (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 7. shopify_products — Shopify product cache
-- ─────────────────────────────────────────────────────────────
create table if not exists public.shopify_products (
  id           text primary key,
  shopify_id   text,
  title        text not null,
  name         text,
  handle       text,
  status       text,
  product_type text,
  category     text,
  price        text,
  sku          text,
  inventory_quantity integer default 0,
  image        text,
  tags         text,
  vendor       text,
  body_html    text,
  variants_count integer default 1,
  synced_at    timestamptz not null default now()
);
create index if not exists shopify_products_synced_at_idx    on public.shopify_products (synced_at desc);
create index if not exists shopify_products_product_type_idx on public.shopify_products (product_type);
create index if not exists shopify_products_status_idx       on public.shopify_products (status);

-- ─────────────────────────────────────────────────────────────
-- 8. shopify_collections — Shopify collection cache
-- ─────────────────────────────────────────────────────────────
create table if not exists public.shopify_collections (
  id          text primary key,
  shopify_id  text,
  title       text not null,
  handle      text,
  body_html   text,
  image       text,
  sort_order  text,
  synced_at   timestamptz not null default now()
);
create index if not exists shopify_collections_synced_at_idx on public.shopify_collections (synced_at desc);

-- ─────────────────────────────────────────────────────────────
-- ADD MISSING COLUMNS TO EXISTING TABLES (safe ALTER TABLE)
-- Run these even if the table already exists from evics_dashboard_schema.sql
-- ─────────────────────────────────────────────────────────────

-- creatives: add script column if missing
alter table public.creatives add column if not exists script text;
alter table public.creatives add column if not exists source text default 'auto-generate';
alter table public.creatives add column if not exists updated_at timestamptz default now();

-- evics_products: add profit intelligence columns if missing
alter table public.evics_products add column if not exists profit_score numeric(10,2) default 0;
alter table public.evics_products add column if not exists tier text default 'Tier 3';
alter table public.evics_products add column if not exists days_in_tier4 integer default 0;
alter table public.evics_products add column if not exists last_tiered_at timestamptz;

-- evics_renders: add render grading + ROAS columns if missing
alter table public.evics_renders add column if not exists render_grade numeric(5,2);
alter table public.evics_renders add column if not exists render_status text;
alter table public.evics_renders add column if not exists elite_vault boolean default false;
alter table public.evics_renders add column if not exists roas numeric(10,2);
alter table public.evics_renders add column if not exists revenue numeric(10,2);
alter table public.evics_renders add column if not exists updated_at timestamptz default now();

-- publishing_queue: add content column if missing
alter table public.publishing_queue add column if not exists content text;
alter table public.publishing_queue add column if not exists scheduled_at timestamptz;

-- shopify_products: add normalized columns if missing (from shopifyLiveConnector normalizeProduct)
alter table public.shopify_products add column if not exists shopify_id text;
alter table public.shopify_products add column if not exists name text;
alter table public.shopify_products add column if not exists category text;
alter table public.shopify_products add column if not exists price text;
alter table public.shopify_products add column if not exists sku text;
alter table public.shopify_products add column if not exists inventory_quantity integer default 0;
alter table public.shopify_products add column if not exists image text;
alter table public.shopify_products add column if not exists vendor text;
alter table public.shopify_products add column if not exists body_html text;
alter table public.shopify_products add column if not exists variants_count integer default 1;

-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES — Enable service_role full access, anon/authenticated read
-- ─────────────────────────────────────────────────────────────

alter table public.evics_trends          enable row level security;
alter table public.evics_products        enable row level security;
alter table public.creatives             enable row level security;
alter table public.evics_renders         enable row level security;
alter table public.publishing_queue      enable row level security;
alter table public.video_assembly_drafts enable row level security;
alter table public.shopify_products      enable row level security;
alter table public.shopify_collections   enable row level security;

-- Drop existing policies before recreating (idempotent)
drop policy if exists "evics full access evics_trends"          on public.evics_trends;
drop policy if exists "evics read evics_trends"                 on public.evics_trends;
drop policy if exists "evics full access evics_products"        on public.evics_products;
drop policy if exists "evics read evics_products"               on public.evics_products;
drop policy if exists "evics full access creatives"             on public.creatives;
drop policy if exists "evics read creatives"                    on public.creatives;
drop policy if exists "evics full access evics_renders"         on public.evics_renders;
drop policy if exists "evics read evics_renders"                on public.evics_renders;
drop policy if exists "evics full access publishing_queue"      on public.publishing_queue;
drop policy if exists "evics read publishing_queue"             on public.publishing_queue;
drop policy if exists "evics full access video_assembly_drafts" on public.video_assembly_drafts;
drop policy if exists "evics read video_assembly_drafts"        on public.video_assembly_drafts;
drop policy if exists "evics full access shopify_products"      on public.shopify_products;
drop policy if exists "evics read shopify_products"             on public.shopify_products;
drop policy if exists "evics full access shopify_collections"   on public.shopify_collections;
drop policy if exists "evics read shopify_collections"          on public.shopify_collections;

-- service_role gets full access (used by backend)
create policy "evics full access evics_trends"
  on public.evics_trends for all to service_role using (true) with check (true);
create policy "evics full access evics_products"
  on public.evics_products for all to service_role using (true) with check (true);
create policy "evics full access creatives"
  on public.creatives for all to service_role using (true) with check (true);
create policy "evics full access evics_renders"
  on public.evics_renders for all to service_role using (true) with check (true);
create policy "evics full access publishing_queue"
  on public.publishing_queue for all to service_role using (true) with check (true);
create policy "evics full access video_assembly_drafts"
  on public.video_assembly_drafts for all to service_role using (true) with check (true);
create policy "evics full access shopify_products"
  on public.shopify_products for all to service_role using (true) with check (true);
create policy "evics full access shopify_collections"
  on public.shopify_collections for all to service_role using (true) with check (true);

-- anon / authenticated get read access (used by dashboard frontend)
create policy "evics read evics_trends"
  on public.evics_trends for select to anon, authenticated using (true);
create policy "evics read evics_products"
  on public.evics_products for select to anon, authenticated using (true);
create policy "evics read creatives"
  on public.creatives for select to anon, authenticated using (true);
create policy "evics read evics_renders"
  on public.evics_renders for select to anon, authenticated using (true);
create policy "evics read publishing_queue"
  on public.publishing_queue for select to anon, authenticated using (true);
create policy "evics read video_assembly_drafts"
  on public.video_assembly_drafts for select to anon, authenticated using (true);
create policy "evics read shopify_products"
  on public.shopify_products for select to anon, authenticated using (true);
create policy "evics read shopify_collections"
  on public.shopify_collections for select to anon, authenticated using (true);

-- ─────────────────────────────────────────────────────────────
-- SEED DATA — minimal starter rows so Demo mode has real hooks
-- ─────────────────────────────────────────────────────────────

insert into public.evics_products (name, category, sku, score, angle, goals, benefits, is_bundle)
values
  ('Sea Moss Mineral Gel', 'Sea moss', 'SEAMOSS-GEL-001', 96, 'daily mineral ritual', '{"energy","immunity","skin"}', '{"92 trace minerals","thyroid support","gut health"}', false),
  ('Metabolic Ignite', 'Weight loss', 'MET-IGNITE-001', 91, 'morning reset', '{"fat loss","energy","metabolism"}', '{"thermogenic blend","appetite control","energy boost"}', false),
  ('Genesis Glow Collagen', 'Beauty', 'GLOW-COLL-001', 88, 'skin confidence', '{"glowing skin","anti-aging","hair growth"}', '{"marine collagen","hyaluronic acid","biotin"}', false),
  ('Focus Formula', 'Cognitive', 'FOCUS-001', 84, 'mental clarity', '{"focus","memory","productivity"}', '{"lions mane","bacopa","alpha gpc"}', false),
  ('Sea Moss + Collagen Bundle', 'Bundle', 'BUNDLE-001', 82, 'total wellness ritual', '{"minerals","beauty","immunity"}', '{"sea moss","collagen","combined savings"}', true)
on conflict (name) do nothing;

insert into public.evics_trends (title, hook, platform, category, confidence, viral_score, emotion)
values
  ('Sea Moss Morning Ritual', 'Nobody talks about this morning mineral habit...', 'TikTok', 'Sea moss', 'High', 94, 'Curiosity'),
  ('7-Day Skin Glow Challenge', 'I tried collagen for 7 days — here is what happened', 'Instagram', 'Beauty', 'High', 91, 'Before-after'),
  ('Metabolism Reset Hack', 'This one thing changed my energy levels in 3 days', 'TikTok', 'Weight loss', 'High', 89, 'Transformation'),
  ('Founder Desk Focus Routine', 'I run a 7-figure business from my desk. This is my focus stack.', 'YouTube', 'Cognitive', 'Medium', 85, 'Authority')
on conflict do nothing;

-- ---------------------------------------------------------------
-- EVICS AFFILIATE HUB SCHEMA
-- Added: Affiliates, Clicks, Earnings, Payouts
-- ---------------------------------------------------------------

-- Affiliate profiles
CREATE TABLE IF NOT EXISTS affiliates (
  id                TEXT PRIMARY KEY,
  code              TEXT UNIQUE NOT NULL,
  name              TEXT,
  email             TEXT UNIQUE,
  btc_address       TEXT,
  referral_code     TEXT,
  tier              TEXT NOT NULL DEFAULT 'starter',  -- starter|growth|elite|diamond
  status            TEXT NOT NULL DEFAULT 'active',   -- active|suspended|pending
  total_clicks      INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_earnings    NUMERIC(12,2) DEFAULT 0,
  pending_payout    NUMERIC(12,2) DEFAULT 0,
  active_campaigns  INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Click tracking � every affiliate link click
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  affiliate_id    TEXT REFERENCES affiliates(id) ON DELETE CASCADE,
  product_id      TEXT,
  product_name    TEXT,
  source          TEXT DEFAULT 'phone-app',  -- phone-app|web|email|social
  ip_address      TEXT,
  user_agent      TEXT,
  referral_url    TEXT,
  converted       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Earnings records � one row per confirmed conversion
CREATE TABLE IF NOT EXISTS affiliate_earnings (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  affiliate_id    TEXT REFERENCES affiliates(id) ON DELETE CASCADE,
  campaign_name   TEXT,
  product_name    TEXT,
  product_id      TEXT,
  order_id        TEXT,
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  evics_fee       NUMERIC(10,2) DEFAULT 0,
  net_amount      NUMERIC(10,2) DEFAULT 0,
  commission_rate NUMERIC(5,4) DEFAULT 0.15,
  status          TEXT DEFAULT 'pending',  -- pending|approved|released|held|rejected
  conversion_date TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Payout requests and history
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  affiliate_id   TEXT REFERENCES affiliates(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  method         TEXT DEFAULT 'btc',  -- btc|paypal|bank
  address        TEXT,
  status         TEXT DEFAULT 'pending',  -- pending|processing|completed|failed
  txid           TEXT,
  notes          TEXT,
  requested_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at  ON affiliate_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate_id ON affiliate_earnings(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_status    ON affiliate_earnings(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);

-- RLS � service role can read/write all; affiliates can only read their own data
ALTER TABLE affiliates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts  ENABLE ROW LEVEL SECURITY;

-- Service role bypass (backend uses service role key)
CREATE POLICY "service_all_affiliates"         ON affiliates         FOR ALL USING (true);
CREATE POLICY "service_all_affiliate_clicks"   ON affiliate_clicks   FOR ALL USING (true);
CREATE POLICY "service_all_affiliate_earnings" ON affiliate_earnings FOR ALL USING (true);
CREATE POLICY "service_all_affiliate_payouts"  ON affiliate_payouts  FOR ALL USING (true);


-- -------------------------------------------------------------
-- PPEP � Product Placement Execution Pipeline tables
-- Added Phase 5 � IAGT AI Viral Engine
-- -------------------------------------------------------------
create table if not exists public.ppep_pipelines (
  id              text primary key,
  affiliate_id    uuid references public.affiliates(id) on delete set null,
  product_id      text,
  product_title   text,
  platform        text default 'tiktok',
  status          text default 'analyzing',
  analysis        jsonb,
  environment     jsonb,
  strategy        jsonb,
  script          jsonb,
  avatar_role     jsonb,
  media_job_id    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ppep_pipelines_affiliate_idx on public.ppep_pipelines (affiliate_id);
create index if not exists ppep_pipelines_status_idx    on public.ppep_pipelines (status);

create table if not exists public.ppep_media_jobs (
  id              text primary key,
  job_id          text,
  pipeline_id     text references public.ppep_pipelines(id) on delete set null,
  affiliate_id    uuid references public.affiliates(id) on delete set null,
  product_id      text,
  platform        text default 'tiktok',
  avatar_id       text,
  script          text,
  status          text default 'draft',
  approved        boolean default false,
  output_media_url text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ppep_media_jobs_pipeline_idx   on public.ppep_media_jobs (pipeline_id);
create index if not exists ppep_media_jobs_affiliate_idx  on public.ppep_media_jobs (affiliate_id);
create index if not exists ppep_media_jobs_status_idx     on public.ppep_media_jobs (status);

create table if not exists public.ppep_campaigns (
  id              text primary key,
  pipeline_id     text references public.ppep_pipelines(id) on delete set null,
  job_id          text,
  affiliate_id    uuid references public.affiliates(id) on delete set null,
  product_id      text,
  platform        text default 'tiktok',
  environment     text,
  avatar_id       text,
  custom_script   text,
  approved        boolean default false,
  status          text default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ppep_campaigns_affiliate_idx on public.ppep_campaigns (affiliate_id);
create index if not exists ppep_campaigns_status_idx    on public.ppep_campaigns (status);

-- Row Level Security
alter table public.ppep_pipelines  enable row level security;
alter table public.ppep_media_jobs enable row level security;
alter table public.ppep_campaigns  enable row level security;

create policy if not exists "service_ppep_pipelines"  on public.ppep_pipelines  for all to service_role using (true);
create policy if not exists "service_ppep_media_jobs" on public.ppep_media_jobs for all to service_role using (true);
create policy if not exists "service_ppep_campaigns"  on public.ppep_campaigns  for all to service_role using (true);

-- -------------------------------------------------------------
-- Affiliate contracts table
-- -------------------------------------------------------------
create table if not exists public.affiliate_contracts (
  id                              text primary key,
  affiliate_id                    uuid references public.affiliates(id) on delete cascade,
  campaign_id                     text,
  supplier_id                     text,
  commission_percent              numeric(5,2) default 15,
  status                          text default 'active',
  signed                          boolean default false,
  brokerage_clause_acknowledged   boolean default false,
  avatar_usage_approved           boolean default false,
  signed_at                       timestamptz,
  expires_at                      timestamptz,
  terms                           text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);
create index if not exists affiliate_contracts_affiliate_idx on public.affiliate_contracts (affiliate_id);
create index if not exists affiliate_contracts_status_idx    on public.affiliate_contracts (status);

alter table public.affiliate_contracts enable row level security;
create policy if not exists "service_affiliate_contracts" on public.affiliate_contracts for all to service_role using (true);


-- -------------------------------------------------------------
-- MEMBERS � Free membership tier system
-- -------------------------------------------------------------
create table if not exists public.members (
  id            text primary key,
  name          text not null,
  email         text unique not null,
  phone         text,
  platform      text default 'other',
  handle        text,
  member_code   text unique,
  referral_code text,
  tier          text default 'seeker',  -- seeker | builder | elite | sovereign
  points        integer default 0,
  status        text default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists members_email_idx  on public.members (email);
create index if not exists members_tier_idx   on public.members (tier);
create index if not exists members_status_idx on public.members (status);

alter table public.members enable row level security;
create policy if not exists "service_members" on public.members for all to service_role using (true);

-- -------------------------------------------------------------
-- WISDOM CONTENT � Educational + Spiritual content library
-- -------------------------------------------------------------
create table if not exists public.wisdom_content (
  id          bigserial primary key,
  category    text not null,  -- financial | spiritual | mindset | health | marketing | community
  title       text not null,
  content     text not null,
  scripture   text,
  affirmation text,
  author      text default 'I AM GENESIS TECH',
  media_url   text,
  is_daily    boolean default false,
  active      boolean default true,
  views       integer default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists wisdom_content_category_idx on public.wisdom_content (category);
create index if not exists wisdom_content_is_daily_idx on public.wisdom_content (is_daily);
create index if not exists wisdom_content_active_idx   on public.wisdom_content (active);

alter table public.wisdom_content enable row level security;
create policy if not exists "service_wisdom_content"  on public.wisdom_content for all to service_role using (true);
create policy if not exists "public_wisdom_read"      on public.wisdom_content for select to anon using (active = true);

-- -------------------------------------------------------------
-- COMMUNITY FEED � Activity feed for co-elevation dashboard
-- -------------------------------------------------------------
create table if not exists public.community_feed (
  id          bigserial primary key,
  type        text default 'join',  -- join | sale | payout | video | tier | wisdom
  user_name   text,
  affiliate_id uuid references public.affiliates(id) on delete set null,
  message     text not null,
  amount      numeric(10,2),
  created_at  timestamptz not null default now()
);
create index if not exists community_feed_type_idx on public.community_feed (type);
create index if not exists community_feed_ts_idx   on public.community_feed (created_at desc);

alter table public.community_feed enable row level security;
create policy if not exists "service_community_feed" on public.community_feed for all to service_role using (true);
create policy if not exists "public_feed_read"       on public.community_feed for select to anon using (true);

-- =====================================================
-- AFFILIATE AVATARS (HeyGen AI Avatars)
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_avatars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id TEXT NOT NULL,
  name TEXT NOT NULL,
  style TEXT DEFAULT 'professional',
  photo_url TEXT,
  voice_file_url TEXT,
  heygen_avatar_id TEXT,
  heygen_voice_clone_id TEXT,
  voice_clone_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE affiliate_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "affiliate_avatars_service_role" ON affiliate_avatars
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_affiliate_avatars_affiliate_id ON affiliate_avatars(affiliate_id);
