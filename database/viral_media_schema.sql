-- Viral Product Media Engine schema
-- Additive, namespaced tables for the isolated /viral-media workspace.

create extension if not exists pgcrypto;

create table if not exists viral_media_products (
  id uuid primary key default gen_random_uuid(),
  shopify_product_id text not null unique,
  product_handle text not null unique,
  product_name text not null,
  sku text,
  collection_name text,
  product_category text,
  best_seller_rank integer,
  product_image_url text,
  product_page_url text,
  status text not null default 'Not Started',
  jordan_video_status text not null default 'Not Started',
  ai_cinematic_status text not null default 'Not Started',
  export_formats text[] not null default array['9:16']::text[],
  published_platforms text[] not null default array[]::text[],
  viral_score numeric(5,2) not null default 0,
  conversion_score numeric(5,2) not null default 0,
  engagement_score numeric(5,2) not null default 0,
  board_review_status text not null default 'Needs Review',
  learning_loop_status text not null default 'Not Started',
  last_generated_at timestamptz,
  next_recommended_action text,
  campaign_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_product_media_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  product_handle text,
  product_name text,
  asset_type text not null default 'image',
  asset_name text,
  source_url text,
  storage_url text,
  preview_url text,
  status text not null default 'Not Started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_video_campaigns (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text not null unique,
  product_handle text not null,
  product_name text not null,
  sku text,
  collection_name text,
  product_category text,
  best_seller_rank integer,
  publish_mode text not null default 'Manual Approval',
  video_type text not null default 'Jordan Avatar Trust Video',
  platform_priority jsonb not null default '[]'::jsonb,
  target_platforms jsonb not null default '[]'::jsonb,
  status text not null default 'Not Started',
  board_review_status text not null default 'Needs Review',
  learning_loop_status text not null default 'Not Started',
  viral_score numeric(5,2) not null default 0,
  conversion_score numeric(5,2) not null default 0,
  engagement_score numeric(5,2) not null default 0,
  next_recommended_action text,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_briefs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  product_handle text not null,
  product_name text not null,
  sku text,
  product_category text,
  video_type text not null,
  brief_json jsonb not null default '{}'::jsonb,
  status text not null default 'Brief Generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_scripts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  brief_id uuid references viral_media_briefs(id) on delete set null,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  script_text text not null,
  hook_options jsonb not null default '[]'::jsonb,
  cta_options jsonb not null default '[]'::jsonb,
  avatar_id text,
  voice_id text,
  status text not null default 'Script Generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_concepts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  script_id uuid references viral_media_scripts(id) on delete set null,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  concept_json jsonb not null default '{}'::jsonb,
  status text not null default 'Media Assets Ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_scores (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  asset_id uuid,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  hook_strength numeric(5,2) not null default 0,
  first_three_second_impact numeric(5,2) not null default 0,
  visual_motion_strength numeric(5,2) not null default 0,
  product_clarity numeric(5,2) not null default 0,
  benefit_clarity numeric(5,2) not null default 0,
  cta_strength numeric(5,2) not null default 0,
  caption_readability numeric(5,2) not null default 0,
  emotional_pull numeric(5,2) not null default 0,
  platform_fit numeric(5,2) not null default 0,
  trend_alignment numeric(5,2) not null default 0,
  brand_consistency numeric(5,2) not null default 0,
  compliance_safety numeric(5,2) not null default 0,
  rewatch_potential numeric(5,2) not null default 0,
  share_potential numeric(5,2) not null default 0,
  conversion_potential numeric(5,2) not null default 0,
  viral_score numeric(5,2) not null default 0,
  conversion_score numeric(5,2) not null default 0,
  engagement_score numeric(5,2) not null default 0,
  status text not null default 'Needs Review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_renders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  asset_id uuid,
  score_id uuid references viral_media_scores(id) on delete set null,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  render_provider text,
  render_job_id text,
  video_id text,
  video_url text,
  thumbnail_url text,
  render_status text not null default 'Not Started',
  status text not null default 'Not Started',
  duration_seconds numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_exports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  render_id uuid references viral_media_renders(id) on delete set null,
  asset_id uuid,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  aspect_ratio text not null,
  width integer not null,
  height integer not null,
  export_type text not null,
  file_url text,
  storage_url text,
  status text not null default 'Not Started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_publishing (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  render_id uuid references viral_media_renders(id) on delete set null,
  export_id uuid references viral_media_exports(id) on delete set null,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  platform text not null,
  preferred_aspect_ratio text,
  ideal_length_seconds numeric(8,2),
  caption text,
  hashtags text[],
  cta text,
  thumbnail_url text,
  scheduled_at timestamptz,
  published_url text,
  post_id text,
  performance_metrics jsonb not null default '{}'::jsonb,
  next_action text,
  status text not null default 'Manual Approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_performance_metrics (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  publish_id uuid references viral_media_publishing(id) on delete set null,
  product_handle text not null,
  product_name text not null,
  sku text,
  platform text not null,
  views numeric(18,2) not null default 0,
  watch_time numeric(18,2) not null default 0,
  three_second_hold_rate numeric(8,4) not null default 0,
  average_view_duration numeric(18,2) not null default 0,
  completion_rate numeric(8,4) not null default 0,
  likes numeric(18,2) not null default 0,
  comments numeric(18,2) not null default 0,
  shares numeric(18,2) not null default 0,
  saves numeric(18,2) not null default 0,
  clicks numeric(18,2) not null default 0,
  ctr numeric(8,4) not null default 0,
  add_to_cart_rate numeric(8,4) not null default 0,
  conversion_rate numeric(8,4) not null default 0,
  revenue numeric(18,2) not null default 0,
  roas numeric(18,2) not null default 0,
  status text not null default 'Performance Tracking',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_learning_loop (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  render_id uuid references viral_media_renders(id) on delete set null,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  question text,
  answer text,
  metric_name text,
  metric_value numeric(18,2),
  insight_json jsonb not null default '{}'::jsonb,
  status text not null default 'Learning Loop Updated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_board_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  asset_id uuid,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  reviewer_role text not null,
  approval_score numeric(5,2) not null default 0,
  recommended_improvements jsonb not null default '[]'::jsonb,
  revised_hook text,
  revised_cta text,
  revised_platform_strategy text,
  regeneration_reason text,
  final_publish_decision text,
  status text not null default 'Needs Review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_creative_templates (
  id uuid primary key default gen_random_uuid(),
  template_name text not null,
  video_type text not null,
  platform text,
  template_json jsonb not null default '{}'::jsonb,
  status text not null default 'Approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_hook_tests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  hook_text text not null,
  hook_score numeric(5,2) not null default 0,
  winner boolean not null default false,
  status text not null default 'Not Started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_cta_tests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  product_handle text not null,
  product_name text not null,
  sku text,
  video_type text not null,
  cta_text text not null,
  cta_score numeric(5,2) not null default 0,
  winner boolean not null default false,
  status text not null default 'Not Started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_audience_segments (
  id uuid primary key default gen_random_uuid(),
  segment_name text not null,
  segment_profile jsonb not null default '{}'::jsonb,
  platform_priority jsonb not null default '[]'::jsonb,
  status text not null default 'Approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_media_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  asset_id uuid,
  product_handle text not null,
  product_name text not null,
  sku text,
  job_type text not null,
  provider text,
  job_payload jsonb not null default '{}'::jsonb,
  external_job_id text,
  job_status text not null default 'Not Started',
  status text not null default 'Not Started',
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_regeneration_queue (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  asset_id uuid,
  product_handle text not null,
  product_name text not null,
  sku text,
  reason text not null,
  regeneration_focus text,
  priority integer not null default 50,
  retry_count integer not null default 0,
  status text not null default 'Needs Regeneration',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists viral_media_similar_ads (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references viral_media_products(id) on delete cascade,
  campaign_id text,
  product_handle text not null,
  product_name text not null,
  sku text,
  source_platform text not null,
  source_query text,
  source_url text not null,
  author text,
  description text,
  caption text,
  hashtags text[] not null default array[]::text[],
  format_key text not null,
  format_label text not null,
  similarity_score numeric(5,2) not null default 0,
  engagement_score numeric(5,2) not null default 0,
  ai_score numeric(5,2) not null default 0,
  ai_grade text,
  selected_for_script boolean not null default false,
  status text not null default 'Scraped Similar Ad',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_viral_media_products_status on viral_media_products(status);
create index if not exists idx_viral_media_products_handle on viral_media_products(product_handle);
create index if not exists idx_viral_media_campaigns_product_id on viral_media_video_campaigns(product_id);
create index if not exists idx_viral_media_briefs_campaign_id on viral_media_briefs(campaign_id);
create index if not exists idx_viral_media_scripts_campaign_id on viral_media_scripts(campaign_id);
create index if not exists idx_viral_media_concepts_campaign_id on viral_media_concepts(campaign_id);
create index if not exists idx_viral_media_scores_campaign_id on viral_media_scores(campaign_id);
create index if not exists idx_viral_media_renders_campaign_id on viral_media_renders(campaign_id);
create index if not exists idx_viral_media_exports_campaign_id on viral_media_exports(campaign_id);
create index if not exists idx_viral_media_publishing_campaign_id on viral_media_publishing(campaign_id);
create index if not exists idx_viral_media_learning_campaign_id on viral_media_learning_loop(campaign_id);
create index if not exists idx_viral_media_board_reviews_campaign_id on viral_media_board_reviews(campaign_id);
create index if not exists idx_viral_media_generation_jobs_campaign_id on viral_media_media_generation_jobs(campaign_id);
create index if not exists idx_viral_media_regen_campaign_id on viral_media_regeneration_queue(campaign_id);
create index if not exists idx_viral_media_similar_ads_product_handle on viral_media_similar_ads(product_handle);
create index if not exists idx_viral_media_similar_ads_campaign_id on viral_media_similar_ads(campaign_id);
