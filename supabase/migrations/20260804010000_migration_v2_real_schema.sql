-- ============================================================
-- CEKA News Intelligence Engine - Migration v2
-- Written against the actual backup.sql schema, not assumptions.
--
-- Correction from the first pass: does NOT create news_sources,
-- signals, or feed_snapshot. Those already exist in your database
-- under different names and would have been parallel duplicate
-- systems:
--   news_sources   -> scraper_sources   (extended, not replaced)
--   signals        -> bill_news_mentions (extended, not replaced)
--   feed_snapshot  -> trending_cache     (reused as-is, RLS policy added)
--   pipeline_locks -> pipeline_locks     (already exists, untouched)
--
-- Only two genuinely new tables: nios, nio_relations. Nothing in
-- your schema covers "event", as distinct from "article" or "bill".
--
-- Embedding dimension: 768, matching discussions.embedding and its
-- hnsw index - not document_embeddings' 1536. Two different
-- dimensions already coexist in your database; 768 is the one with
-- an actual index behind it, and it's what gemini-embedding-001
-- outputs at output_dimensionality=768 (see embedding_engine.py).
-- ============================================================

-- ------------------------------------------------------------
-- 1. scraper_sources: add tiering and credibility columns
-- ------------------------------------------------------------
alter table public.scraper_sources
    add column if not exists domain text,
    add column if not exists tier smallint,
    add column if not exists source_type text,
    add column if not exists credibility_weight numeric(4,3),
    add column if not exists country text default 'KE';

do $$
begin
    alter table public.scraper_sources
        add constraint scraper_sources_tier_check check (tier between 1 and 4);
exception
    when duplicate_object then null;
end $$;

do $$
begin
    alter table public.scraper_sources
        add constraint scraper_sources_source_type_check
        check (source_type in ('official','established_media','digital_media','social'));
exception
    when duplicate_object then null;
end $$;

do $$
begin
    alter table public.scraper_sources
        add constraint scraper_sources_credibility_weight_check
        check (credibility_weight between 0 and 1);
exception
    when duplicate_object then null;
end $$;

-- Backfill domain from url for existing rows (idempotent, only touches nulls)
update public.scraper_sources
set domain = regexp_replace(regexp_replace(url, '^https?://(www\.)?', ''), '/.*$', '')
where domain is null and url is not null;

-- Deduplicate rows before creating the unique index
DELETE FROM public.scraper_sources
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY domain ORDER BY id ASC) as rn
    FROM public.scraper_sources
    WHERE domain IS NOT NULL
  ) t WHERE rn > 1
);

create unique index if not exists idx_scraper_sources_domain on public.scraper_sources (domain) where domain is not null;

-- ------------------------------------------------------------
-- 2. bill_news_mentions: relax to general civic signals,
--    add enrichment/fusion columns. bill_id stays populated for
--    every row your existing bill scraper produces; it becomes
--    optional only for signals that are not about a specific bill.
-- ------------------------------------------------------------
alter table public.bill_news_mentions
    alter column bill_id drop not null;

alter table public.bill_news_mentions
    add column if not exists source_id uuid references public.scraper_sources(id),
    add column if not exists clean_content text,
    add column if not exists embedding public.vector(768),
    add column if not exists story_dna jsonb,
    add column if not exists entities jsonb,
    add column if not exists claims jsonb,
    add column if not exists matched_nio_id uuid,
    add column if not exists enrichment_status text default 'pending',
    add column if not exists fusion_status text default 'pending';

do $$
begin
    alter table public.bill_news_mentions
        add constraint bill_news_mentions_enrichment_status_check
        check (enrichment_status in ('pending','enriched','failed'));
exception
    when duplicate_object then null;
end $$;

do $$
begin
    alter table public.bill_news_mentions
        add constraint bill_news_mentions_fusion_status_check
        check (fusion_status in ('pending','fused','failed'));
exception
    when duplicate_object then null;
end $$;

-- Every row that already exists is bill-tied and came from your own
-- verified legislative scraper - treat it as already fused/enriched
-- so the frontend filter below (fusion_status = 'fused') doesn't
-- hide news that's on the site today.
update public.bill_news_mentions
set fusion_status = 'fused', enrichment_status = 'enriched'
where bill_id is not null and fusion_status = 'pending';

-- The existing unique index is (bill_id, content_hash) - fine for
-- bill-tied rows, but Postgres treats NULL bill_id values as
-- distinct, so it would not stop duplicate general (non-bill)
-- signals. Partial index closes that gap without touching the
-- existing one.
create unique index if not exists idx_bill_news_mentions_hash_no_bill
    on public.bill_news_mentions (content_hash)
    where bill_id is null and content_hash is not null;

create index if not exists idx_bill_news_mentions_enrichment_status on public.bill_news_mentions (enrichment_status);
create index if not exists idx_bill_news_mentions_fusion_status on public.bill_news_mentions (fusion_status);
create index if not exists idx_bill_news_mentions_embedding on public.bill_news_mentions using hnsw (embedding public.vector_cosine_ops);

-- ------------------------------------------------------------
-- 3. nios: News Intelligence Objects. Genuinely new - nothing in
--    the existing schema models a cross-source, cross-bill event.
-- ------------------------------------------------------------
create table if not exists public.nios (
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
    related_bill_id uuid references public.bills(id),
    embedding public.vector(768),
    fusion_cursor int not null default 0,
    fusion_working_memory jsonb not null default '{}'::jsonb,
    last_signal_at timestamptz,
    confidence_decayed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_nios_state on public.nios (state);
create index if not exists idx_nios_importance on public.nios (importance desc);
create index if not exists idx_nios_last_signal_at on public.nios (last_signal_at desc);
create index if not exists idx_nios_embedding on public.nios using hnsw (embedding public.vector_cosine_ops);
create index if not exists idx_nios_related_bill_id on public.nios (related_bill_id);

do $$
begin
    alter table public.bill_news_mentions
        add constraint bill_news_mentions_matched_nio_id_fkey
        foreign key (matched_nio_id) references public.nios(id) on delete set null;
exception
    when duplicate_object then null;
end $$;

create or replace function public.set_nios_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_nios_updated_at on public.nios;
create trigger trg_nios_updated_at
    before update on public.nios
    for each row
    execute function public.set_nios_updated_at();

comment on table public.nios is 'News Intelligence Objects - fused civic events, each backed by one or more bill_news_mentions rows as evidence. related_bill_id is set only when the event centers on one specific tracked bill; general civic news leaves it null.';

-- ------------------------------------------------------------
-- 4. nio_relations: graph edges between events/topics. New.
-- ------------------------------------------------------------
create table if not exists public.nio_relations (
    id uuid primary key default gen_random_uuid(),
    nio_id uuid not null references public.nios(id) on delete cascade,
    related_nio_id uuid not null references public.nios(id) on delete cascade,
    relation_type text not null default 'related'
        check (relation_type in ('related','parent_topic','child_event','contradicts','supersedes')),
    created_at timestamptz not null default now(),
    unique (nio_id, related_nio_id, relation_type)
);

-- ------------------------------------------------------------
-- 5. RLS - follow the exact convention already in use on bills
--    and bill_news_mentions: admin-managed write, public read.
-- ------------------------------------------------------------
alter table public.nios enable row level security;
alter table public.nio_relations enable row level security;

drop policy if exists "Admins can manage nios" on public.nios;
create policy "Admins can manage nios" on public.nios
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read access for nios" on public.nios;
create policy "Public read access for nios" on public.nios
    for select using (true);

drop policy if exists "Admins can manage nio_relations" on public.nio_relations;
create policy "Admins can manage nio_relations" on public.nio_relations
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read access for nio_relations" on public.nio_relations;
create policy "Public read access for nio_relations" on public.nio_relations
    for select using (true);

-- trending_cache already has RLS enabled with zero policies defined,
-- which means anon/authenticated currently get nothing from it (only
-- service_role, which bypasses RLS, can read it today). Feed
-- synthesis writes NIOs here as content_type = 'civic_intel' - the
-- frontend needs read access to actually show them.
drop policy if exists "Public read access for trending_cache" on public.trending_cache;
create policy "Public read access for trending_cache" on public.trending_cache
    for select using (true);

drop policy if exists "Admins can manage trending_cache" on public.trending_cache;
create policy "Admins can manage trending_cache" on public.trending_cache
    using (public.is_admin()) with check (public.is_admin());

-- content_id/content_type is how feed_synthesis upserts; without a
-- unique constraint every run inserts new rows instead of refreshing
-- existing ones.
create unique index if not exists idx_trending_cache_content on public.trending_cache (content_id, content_type);

-- ------------------------------------------------------------
-- 6. user_notifications: add a source_type for NIO-driven alerts
--    that are not about one specific bill. 'bill_update' stays
--    exactly as-is for the existing bill flow in LegislativeTracker.tsx.
-- ------------------------------------------------------------
alter table public.user_notifications drop constraint if exists user_notifications_source_type_check;
alter table public.user_notifications add constraint user_notifications_source_type_check
    check (source_type = ANY (ARRAY[
        'chat_message'::text, 'chat_mention'::text, 'chat_reply'::text, 'blog_comment'::text,
        'blog_mention'::text, 'volunteer_opportunity'::text, 'volunteer_application'::text,
        'bill_update'::text, 'campaign_update'::text, 'discussion_reply'::text, 'system'::text,
        'moderation'::text, 'event_reminder'::text, 'community_member'::text, 'resource_view'::text,
        'reading_milestone'::text, 'nps_request'::text, 'credit_change'::text, 'settings_change'::text,
        'civic_intel_update'::text
    ]));

-- ------------------------------------------------------------
-- 7. Semantic search over nios, mirroring the exact signature
--    pattern of match_documents / match_constitution already in
--    your database.
-- ------------------------------------------------------------
create or replace function public.match_nios(
    query_embedding public.vector,
    match_threshold double precision,
    match_count integer
) returns table(
    id uuid,
    canonical_headline text,
    summary_short text,
    state text,
    importance numeric,
    similarity double precision
)
language plpgsql
set search_path to 'public'
as $$
begin
    return query
    select
        nios.id,
        nios.canonical_headline,
        nios.summary_short,
        nios.state,
        nios.importance,
        1 - (nios.embedding <=> query_embedding) as similarity
    from public.nios
    where nios.embedding is not null
      and 1 - (nios.embedding <=> query_embedding) > match_threshold
    order by similarity desc
    limit match_count;
end;
$$;

grant execute on function public.match_nios(public.vector, double precision, integer) to anon;
grant execute on function public.match_nios(public.vector, double precision, integer) to authenticated;
grant execute on function public.match_nios(public.vector, double precision, integer) to service_role;
