-- ============================================================
-- CEKA News Intelligence Engine - Schema
-- Additive migration. Does not alter, rename, or drop any
-- existing table (bills, bills_staging, pipeline_locks, etc).
-- Run once against the Supabase project that will host the
-- news pipeline (Pieces project or Mother project - pick one
-- and keep every news_intelligence table in it, since signals
-- and nios are joined constantly).
-- ============================================================

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- news_sources: tiered source registry
-- ------------------------------------------------------------
create table if not exists news_sources (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    domain text not null unique,
    tier smallint not null check (tier between 1 and 4),
    source_type text not null check (source_type in ('official','established_media','digital_media','social')),
    credibility_weight numeric(4,3) not null check (credibility_weight between 0 and 1),
    country text not null default 'KE',
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- signals: raw normalized capture from every source
-- ------------------------------------------------------------
create table if not exists signals (
    id uuid primary key default gen_random_uuid(),
    source_id uuid references news_sources(id),
    url text not null,
    title text,
    raw_content text,
    clean_content text,
    published_at timestamptz,
    captured_at timestamptz not null default now(),
    content_hash text not null,
    embedding vector(768),
    story_dna jsonb,
    entities jsonb,
    claims jsonb,
    matched_nio_id uuid,
    enrichment_status text not null default 'pending'
        check (enrichment_status in ('pending','enriched','failed')),
    fusion_status text not null default 'pending'
        check (fusion_status in ('pending','fused','failed')),
    created_at timestamptz not null default now(),
    unique (source_id, content_hash)
);

create index if not exists idx_signals_enrichment_status on signals (enrichment_status);
create index if not exists idx_signals_fusion_status on signals (fusion_status);
create index if not exists idx_signals_captured_at on signals (captured_at desc);
create index if not exists idx_signals_embedding on signals using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ------------------------------------------------------------
-- nios: News Intelligence Objects - the living event record
-- ------------------------------------------------------------
create table if not exists nios (
    id uuid primary key default gen_random_uuid(),
    canonical_headline text,
    headline_candidates jsonb not null default '[]'::jsonb,
    state text not null default 'detected'
        check (state in ('detected','emerging','corroborating','verified','developing','stable','historical')),
    confidence numeric(5,2) not null default 0,
    importance numeric(5,2) not null default 0,
    velocity numeric(5,2) not null default 0,
    story_dna jsonb,
    summary_short text,
    summary_medium text,
    timeline jsonb not null default '[]'::jsonb,
    evidence jsonb not null default '[]'::jsonb,
    topics text[] not null default '{}',
    embedding vector(768),
    fusion_cursor int not null default 0,
    fusion_working_memory jsonb not null default '{}'::jsonb,
    last_signal_at timestamptz,
    confidence_decayed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_nios_state on nios (state);
create index if not exists idx_nios_importance on nios (importance desc);
create index if not exists idx_nios_last_signal_at on nios (last_signal_at desc);
create index if not exists idx_nios_embedding on nios using ivfflat (embedding vector_cosine_ops) with (lists = 50);

do $$
begin
    alter table signals
        add constraint fk_signals_matched_nio
        foreign key (matched_nio_id) references nios(id) on delete set null;
exception
    when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- nio_relations: graph edges between related events/topics
-- ------------------------------------------------------------
create table if not exists nio_relations (
    id uuid primary key default gen_random_uuid(),
    nio_id uuid not null references nios(id) on delete cascade,
    related_nio_id uuid not null references nios(id) on delete cascade,
    relation_type text not null default 'related'
        check (relation_type in ('related','parent_topic','child_event','contradicts','supersedes')),
    created_at timestamptz not null default now(),
    unique (nio_id, related_nio_id, relation_type)
);

-- ------------------------------------------------------------
-- feed_snapshot: the synthesized public feed, generated on a cron
-- ------------------------------------------------------------
create table if not exists feed_snapshot (
    id uuid primary key default gen_random_uuid(),
    generated_at timestamptz not null default now(),
    nio_ids uuid[] not null,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_feed_snapshot_generated_at on feed_snapshot (generated_at desc);

-- ------------------------------------------------------------
-- pipeline_locks: reused from the existing legislative
-- news-intel script if already present. Created defensively.
-- ------------------------------------------------------------
create table if not exists pipeline_locks (
    lock_type text primary key,
    created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- updated_at trigger for nios
-- ------------------------------------------------------------
create or replace function set_nios_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_nios_updated_at on nios;
create trigger trg_nios_updated_at
    before update on nios
    for each row
    execute function set_nios_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table news_sources enable row level security;
alter table signals enable row level security;
alter table nios enable row level security;
alter table nio_relations enable row level security;
alter table feed_snapshot enable row level security;
alter table pipeline_locks enable row level security;

drop policy if exists service_role_all_news_sources on news_sources;
create policy service_role_all_news_sources on news_sources
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists service_role_all_signals on signals;
create policy service_role_all_signals on signals
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists service_role_all_nios on nios;
create policy service_role_all_nios on nios
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists service_role_all_nio_relations on nio_relations;
create policy service_role_all_nio_relations on nio_relations
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists service_role_all_feed_snapshot on feed_snapshot;
create policy service_role_all_feed_snapshot on feed_snapshot
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists service_role_all_pipeline_locks on pipeline_locks;
create policy service_role_all_pipeline_locks on pipeline_locks
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Public read-only access to the synthesized feed only.
-- Raw signals and full NIO internals (fusion_working_memory,
-- evidence detail) stay service-role only.
drop policy if exists public_read_feed_snapshot on feed_snapshot;
create policy public_read_feed_snapshot on feed_snapshot
    for select using (true);

create or replace view public_nios as
    select id, canonical_headline, state, confidence, importance,
           summary_short, summary_medium, timeline, topics, updated_at
    from nios
    where state in ('verified','developing','stable');

grant select on public_nios to anon, authenticated;
grant select on feed_snapshot to anon, authenticated;
