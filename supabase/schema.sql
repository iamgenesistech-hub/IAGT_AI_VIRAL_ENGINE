create extension if not exists pgcrypto;

create table if not exists public.viral_ads (
  id text primary key,
  platform text,
  category text,
  title text not null,
  hook text,
  views bigint default 0,
  engagement numeric(10,2) default 0,
  velocity numeric(10,2) default 0,
  conversion numeric(10,2) default 0,
  cta text,
  tags jsonb default '[]'::jsonb,
  product_match text,
  emotion text,
  structure jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  score numeric(10,2) default 0,
  angle text,
  shopify_product_id text unique,
  product_url text,
  image_url text,
  source text default 'workspace',
  price numeric(10,2),
  benefits jsonb default '[]'::jsonb,
  active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.shopify_products (
  id text primary key,
  title text not null,
  handle text,
  vendor text,
  product_type text,
  status text,
  tags text,
  published_at timestamptz,
  image_url text,
  raw_data jsonb default '{}'::jsonb,
  synced_at timestamptz default now()
);

create table if not exists public.shopify_collections (
  id text primary key,
  title text not null,
  handle text,
  body_html text,
  published boolean default false,
  raw_data jsonb default '{}'::jsonb,
  synced_at timestamptz default now()
);

create table if not exists public.creatives (
  id text primary key,
  status text default 'Draft',
  product text,
  format text,
  hook text,
  asset text,
  channel text,
  score numeric(10,2) default 0,
  approved boolean default false,
  export_payload jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.publishing_queue (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  publish_at timestamptz,
  display_time text,
  content text,
  status text default 'Queued',
  creative_id text,
  created_at timestamptz default now()
);

create table if not exists public.workflow_steps (
  id text primary key,
  step_time text,
  title text not null,
  description text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.ai_board_advisors (
  id text primary key,
  display_name text not null,
  real_world_reference text,
  advisory_label text,
  board_seat text not null,
  division text,
  category text not null,
  platform_connection text,
  short_description text,
  core_principles jsonb default '[]'::jsonb,
  evaluation_questions jsonb default '[]'::jsonb,
  decision_weights jsonb default '{}'::jsonb,
  guardrails jsonb default '[]'::jsonb,
  preferred_output_style text,
  prohibited_claims jsonb default '[]'::jsonb,
  source_notes jsonb default '[]'::jsonb,
  active boolean default true,
  sample_recommendation_logic text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_board_evaluations (
  id uuid primary key default gen_random_uuid(),
  proposal_title text not null,
  proposal_type text,
  target_area text,
  business_context text,
  requested_decision text,
  relevant_data jsonb default '{}'::jsonb,
  selected_advisors jsonb default '[]'::jsonb,
  advisor_evaluations jsonb default '[]'::jsonb,
  consensus_score numeric(10,2),
  final_recommendation text check (final_recommendation in ('approve', 'modify', 'reject', 'needs_data')),
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  compliance_notes jsonb default '[]'::jsonb,
  next_actions jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.ai_board_decision_logs (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid references public.ai_board_evaluations(id) on delete cascade,
  action_taken text,
  execution_status text,
  result_notes text,
  created_at timestamptz default now()
);

alter table public.viral_ads replica identity full;
alter table public.products replica identity full;
alter table public.shopify_products replica identity full;
alter table public.shopify_collections replica identity full;
alter table public.creatives replica identity full;
alter table public.publishing_queue replica identity full;
alter table public.workflow_steps replica identity full;
alter table public.ai_board_advisors replica identity full;
alter table public.ai_board_evaluations replica identity full;
alter table public.ai_board_decision_logs replica identity full;

create index if not exists idx_products_active_score on public.products (active, score desc);
create index if not exists idx_shopify_products_synced_at on public.shopify_products (synced_at desc);
create index if not exists idx_shopify_collections_synced_at on public.shopify_collections (synced_at desc);
create index if not exists idx_creatives_score on public.creatives (score desc);
create index if not exists idx_publishing_queue_publish_at on public.publishing_queue (publish_at asc);
create index if not exists idx_workflow_steps_sort_order on public.workflow_steps (sort_order asc);
create index if not exists idx_ai_board_advisors_category on public.ai_board_advisors (category);
create index if not exists idx_ai_board_advisors_division on public.ai_board_advisors (division);
create index if not exists idx_ai_board_advisors_active on public.ai_board_advisors (active);
create index if not exists idx_ai_board_evaluations_created_at on public.ai_board_evaluations (created_at desc);
create index if not exists idx_ai_board_evaluations_target_area on public.ai_board_evaluations (target_area);
create index if not exists idx_ai_board_decision_logs_evaluation_id on public.ai_board_decision_logs (evaluation_id);

alter table public.viral_ads disable row level security;
alter table public.products disable row level security;
alter table public.shopify_products disable row level security;
alter table public.shopify_collections disable row level security;
alter table public.creatives disable row level security;
alter table public.publishing_queue disable row level security;
alter table public.workflow_steps disable row level security;
alter table public.ai_board_advisors disable row level security;
alter table public.ai_board_evaluations disable row level security;
alter table public.ai_board_decision_logs disable row level security;
