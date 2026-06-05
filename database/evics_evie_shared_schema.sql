-- EVICS + EVIE shared architecture schema.
-- Apply in Supabase SQL Editor when database access is available.

create table if not exists public.evics_evie_entities (
  id text primary key,
  entity_type text not null,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evics_evie_rankings (
  id text primary key,
  product_id text not null,
  creator_id text,
  format_id text not null,
  scores jsonb not null default '{}'::jsonb,
  reason_summary text[] not null default '{}',
  selected_at timestamptz not null default now()
);

create table if not exists public.evics_evie_prompt_versions (
  id text primary key,
  version text not null,
  ranking_id text not null,
  prompt_text text not null,
  quality_gates jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.evics_evie_scripts (
  id text primary key,
  prompt_id text not null,
  ranking_id text not null,
  hook text not null,
  scenes jsonb not null default '[]'::jsonb,
  quality_scores jsonb not null default '{}'::jsonb,
  status text not null default 'script-ready',
  created_at timestamptz not null default now()
);

create table if not exists public.evics_evie_render_jobs (
  id text primary key,
  script_id text not null,
  ranking_id text not null,
  provider text not null,
  mode text not null,
  status text not null,
  video_url text,
  blocker text,
  created_at timestamptz not null default now()
);

create table if not exists public.evics_evie_render_events (
  id bigserial primary key,
  render_job_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.evics_evie_compliance_flags (
  id bigserial primary key,
  flow_id text not null,
  passed boolean not null default false,
  flags jsonb not null default '[]'::jsonb,
  rights jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.evics_evie_evidence_records (
  id text primary key,
  flow_id text not null,
  evidence_type text not null,
  artifact_path text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists evics_evie_entities_type_idx on public.evics_evie_entities(entity_type);
create index if not exists evics_evie_rankings_score_idx on public.evics_evie_rankings(((scores->>'overall')::int) desc);
create index if not exists evics_evie_prompt_versions_ranking_idx on public.evics_evie_prompt_versions(ranking_id);
create index if not exists evics_evie_scripts_prompt_idx on public.evics_evie_scripts(prompt_id);
create index if not exists evics_evie_render_jobs_script_idx on public.evics_evie_render_jobs(script_id);
create index if not exists evics_evie_render_events_job_idx on public.evics_evie_render_events(render_job_id);

alter table public.evics_evie_entities enable row level security;
alter table public.evics_evie_rankings enable row level security;
alter table public.evics_evie_prompt_versions enable row level security;
alter table public.evics_evie_scripts enable row level security;
alter table public.evics_evie_render_jobs enable row level security;
alter table public.evics_evie_render_events enable row level security;
alter table public.evics_evie_compliance_flags enable row level security;
alter table public.evics_evie_evidence_records enable row level security;

drop policy if exists "evics evie dashboard read entities" on public.evics_evie_entities;
create policy "evics evie dashboard read entities" on public.evics_evie_entities for select using (true);

drop policy if exists "evics evie dashboard write entities" on public.evics_evie_entities;
create policy "evics evie dashboard write entities" on public.evics_evie_entities for all using (true) with check (true);

drop policy if exists "evics evie dashboard read rankings" on public.evics_evie_rankings;
create policy "evics evie dashboard read rankings" on public.evics_evie_rankings for select using (true);

drop policy if exists "evics evie dashboard write rankings" on public.evics_evie_rankings;
create policy "evics evie dashboard write rankings" on public.evics_evie_rankings for all using (true) with check (true);

drop policy if exists "evics evie dashboard read prompts" on public.evics_evie_prompt_versions;
create policy "evics evie dashboard read prompts" on public.evics_evie_prompt_versions for select using (true);

drop policy if exists "evics evie dashboard write prompts" on public.evics_evie_prompt_versions;
create policy "evics evie dashboard write prompts" on public.evics_evie_prompt_versions for all using (true) with check (true);

drop policy if exists "evics evie dashboard read scripts" on public.evics_evie_scripts;
create policy "evics evie dashboard read scripts" on public.evics_evie_scripts for select using (true);

drop policy if exists "evics evie dashboard write scripts" on public.evics_evie_scripts;
create policy "evics evie dashboard write scripts" on public.evics_evie_scripts for all using (true) with check (true);

drop policy if exists "evics evie dashboard read render jobs" on public.evics_evie_render_jobs;
create policy "evics evie dashboard read render jobs" on public.evics_evie_render_jobs for select using (true);

drop policy if exists "evics evie dashboard write render jobs" on public.evics_evie_render_jobs;
create policy "evics evie dashboard write render jobs" on public.evics_evie_render_jobs for all using (true) with check (true);

drop policy if exists "evics evie dashboard read render events" on public.evics_evie_render_events;
create policy "evics evie dashboard read render events" on public.evics_evie_render_events for select using (true);

drop policy if exists "evics evie dashboard write render events" on public.evics_evie_render_events;
create policy "evics evie dashboard write render events" on public.evics_evie_render_events for all using (true) with check (true);

drop policy if exists "evics evie dashboard read compliance" on public.evics_evie_compliance_flags;
create policy "evics evie dashboard read compliance" on public.evics_evie_compliance_flags for select using (true);

drop policy if exists "evics evie dashboard write compliance" on public.evics_evie_compliance_flags;
create policy "evics evie dashboard write compliance" on public.evics_evie_compliance_flags for all using (true) with check (true);

drop policy if exists "evics evie dashboard read evidence" on public.evics_evie_evidence_records;
create policy "evics evie dashboard read evidence" on public.evics_evie_evidence_records for select using (true);

drop policy if exists "evics evie dashboard write evidence" on public.evics_evie_evidence_records;
create policy "evics evie dashboard write evidence" on public.evics_evie_evidence_records for all using (true) with check (true);
