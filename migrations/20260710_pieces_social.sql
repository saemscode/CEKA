-- ============================================================
-- Migration: 20260710_pieces_social.sql
-- Pieces Social Interactions & Premium Download Transactions
-- Run in Supabase SQL Editor or via `supabase db push`
-- ============================================================

-- -------------------------------------------------------
-- 1. media_interactions
--    Tracks Like, Save (bookmark-to-collection), and Share
--    events per user per media_content piece.
-- -------------------------------------------------------
create table if not exists public.media_interactions (
    id                 uuid primary key default gen_random_uuid(),
    user_id            uuid not null references auth.users(id) on delete cascade,
    media_content_id   uuid not null,  -- references media_content(id); typed as uuid to avoid FK dep on untracked table
    interaction_type   text not null check (interaction_type in ('like', 'save', 'share')),
    created_at         timestamptz not null default now(),

    -- One row per user/content/type — prevents double-likes, double-saves
    unique (user_id, media_content_id, interaction_type)
);

-- Indexes for batch lookups (MediaFeed mount-time query)
create index if not exists idx_media_interactions_content_id
    on public.media_interactions (media_content_id);

create index if not exists idx_media_interactions_user_id
    on public.media_interactions (user_id);

create index if not exists idx_media_interactions_type
    on public.media_interactions (media_content_id, interaction_type);

-- -------------------------------------------------------
-- RLS: media_interactions
-- -------------------------------------------------------
alter table public.media_interactions enable row level security;

-- PUBLIC: read like counts only — anyone can see likes (for public counters)
-- Saves are private (user_id = auth.uid() guard below)
create policy "media_interactions_select_likes_public"
    on public.media_interactions
    for select
    using (interaction_type = 'like');

-- PRIVATE: each user can read their own saves and shares
create policy "media_interactions_select_own"
    on public.media_interactions
    for select
    using (auth.uid() = user_id);

-- Users can only insert their own interactions
create policy "media_interactions_insert_own"
    on public.media_interactions
    for insert
    with check (auth.uid() = user_id);

-- Users can only delete their own interactions
create policy "media_interactions_delete_own"
    on public.media_interactions
    for delete
    using (auth.uid() = user_id);


-- -------------------------------------------------------
-- 2. piece_transactions
--    Tracks the lifecycle of each premium download payment.
--    Created (pending) BEFORE Paystack popup opens.
--    Updated to 'verified' by the Paystack webhook edge function.
--    Updated to 'delivered' after client receives the signed URL.
-- -------------------------------------------------------
create table if not exists public.piece_transactions (
    id               uuid primary key default gen_random_uuid(),

    -- Paystack reference — also serves as idempotency key
    reference        text not null unique,
    idempotency_key  text not null unique,

    -- Nullable for anonymous payers (email-only payment flow)
    user_id          uuid references auth.users(id) on delete set null,
    user_email       text not null,

    -- The content being purchased
    content_id       uuid,  -- references media_content(id), soft-ref to avoid FK dep
    content_slug     text not null,
    asset_path       text not null,
    tier             text not null,
    amount_kes       integer not null,

    -- Lifecycle
    status           text not null default 'pending'
                         check (status in ('pending', 'verified', 'delivered', 'failed', 'refunded')),
    verified_at      timestamptz,
    delivered_at     timestamptz,
    created_at       timestamptz not null default now()
);

-- Indexes
create index if not exists idx_piece_transactions_status_created
    on public.piece_transactions (status, created_at);

create index if not exists idx_piece_transactions_user_id
    on public.piece_transactions (user_id);

create index if not exists idx_piece_transactions_reference
    on public.piece_transactions (reference);

-- -------------------------------------------------------
-- RLS: piece_transactions
-- -------------------------------------------------------
alter table public.piece_transactions enable row level security;

-- Users can see their own transactions only
create policy "piece_transactions_select_own"
    on public.piece_transactions
    for select
    using (auth.uid() = user_id);

-- Client can insert their own pending transaction
create policy "piece_transactions_insert_own"
    on public.piece_transactions
    for insert
    with check (auth.uid() = user_id or user_id is null);

-- Client can update delivered_at on their own verified transactions (mark delivered)
create policy "piece_transactions_update_own"
    on public.piece_transactions
    for update
    using (auth.uid() = user_id and status = 'verified')
    with check (status = 'delivered');

-- Service role (webhook edge function) can update anything — no RLS restriction
-- (service_role key bypasses RLS by default in Supabase)

-- -------------------------------------------------------
-- 3. Enable Realtime on piece_transactions
--    Required for client-side Realtime listener on payment verification.
-- -------------------------------------------------------
-- Run via Supabase Dashboard: Database -> Replication -> piece_transactions (enable)
-- Or via CLI: supabase realtime enable piece_transactions
-- SQL equivalent (Supabase internal publication):
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and tablename = 'piece_transactions'
    ) then
        alter publication supabase_realtime add table public.piece_transactions;
    end if;
end;
$$;

-- Enable Realtime on media_interactions too (for future live like-count updates)
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and tablename = 'media_interactions'
    ) then
        alter publication supabase_realtime add table public.media_interactions;
    end if;
end;
$$;
