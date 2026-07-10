-- ================================================
-- CEKA Legislative Intelligence Migration (FINAL HARDENED)
-- Date: 2026-04-17
-- Description: Hardened schema alignment for Stages, News, Corroboration, and User Vaults
-- ================================================

-- 1. ENHANCE 'bills' TABLE
DO $$ 
BEGIN
    -- Backblaze B2 Mirror URL
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bills' AND column_name = 'b2_url') THEN
        ALTER TABLE public.bills ADD COLUMN b2_url text;
    END IF;

    -- Corroboration Score (0-100)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bills' AND column_name = 'corroboration_score') THEN
        ALTER TABLE public.bills ADD COLUMN corroboration_score integer DEFAULT 0;
    END IF;

    -- Legislative House (National Assembly / Senate)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bills' AND column_name = 'house') THEN
        ALTER TABLE public.bills ADD COLUMN house text;
    END IF;

    -- Intelligence Source Registry (JSONB for high-fidelity news metadata)
    -- We use 'verified_sources' to avoid conflict with existing 'sources' text column.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bills' AND column_name = 'verified_sources') THEN
        ALTER TABLE public.bills ADD COLUMN verified_sources jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. CREATE 'bill_news_mentions' TABLE
CREATE TABLE IF NOT EXISTS public.bill_news_mentions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    source_name text NOT NULL,
    source_domain text NOT NULL,
    headline text NOT NULL,
    snippet text,
    article_url text NOT NULL,
    article_date text,
    content_hash text,
    scraped_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Unique index for news deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_news_mentions_hash_bill 
ON public.bill_news_mentions (bill_id, content_hash);

-- Index for searching mentions by bill
CREATE INDEX IF NOT EXISTS idx_bill_news_mentions_bill_id 
ON public.bill_news_mentions (bill_id);

-- 3. ENHANCE 'bill_follows' TABLE FOR VAULTING
DO $$ 
BEGIN
    -- User-Specific Civic Pack URL (Signed B2 URL)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bill_follows' AND column_name = 'vault_url') THEN
        ALTER TABLE public.bill_follows ADD COLUMN vault_url text;
    END IF;

    -- Last refreshed at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bill_follows' AND column_name = 'vault_refreshed_at') THEN
        ALTER TABLE public.bill_follows ADD COLUMN vault_refreshed_at timestamp with time zone;
    END IF;
END $$;

-- 4. ENABLE RLS & POLICIES
ALTER TABLE public.bill_news_mentions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read news mentions
DROP POLICY IF EXISTS "Public read access for bill_news_mentions" ON public.bill_news_mentions;
CREATE POLICY "Public read access for bill_news_mentions"
    ON public.bill_news_mentions FOR SELECT
    USING (true);

-- Only admins/service role can manage news mentions
DROP POLICY IF EXISTS "Admins can manage bill_news_mentions" ON public.bill_news_mentions;
CREATE POLICY "Admins can manage bill_news_mentions"
    ON public.bill_news_mentions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    ));

-- 6. REFRESH INTELLIGENCE VIEWS (DROPPING FIRST TO AVOID COLUMN NAME/TYPE MISMATCH 42P16)
DROP VIEW IF EXISTS public.bill_intelligence_heatmap CASCADE;
CREATE OR REPLACE VIEW public.bill_intelligence_heatmap AS
SELECT
    b.id,
    b.title,
    b.category,
    b.status,
    COALESCE(b.views_count, 0) as views_count,
    COALESCE(b.corroboration_score, 0) as corroboration_score,
    (SELECT count(*) FROM public.bill_follows f WHERE f.bill_id = b.id) as follow_count,
    (COALESCE(b.views_count, 0) + (SELECT count(*) FROM public.bill_follows f WHERE f.bill_id = b.id) * 10 + COALESCE(b.corroboration_score, 0)) as intensity_score
FROM public.bills b
ORDER BY intensity_score DESC;

-- 7. REFRESH ADMIN SUMMARY
DROP VIEW IF EXISTS public.admin_intelligence_summary CASCADE;
CREATE OR REPLACE VIEW public.admin_intelligence_summary AS
SELECT
    (SELECT count(*) FROM auth.users) as total_users,
    (SELECT count(*) FROM public.bills) as total_bills,
    (SELECT count(*) FROM public.bill_news_mentions) as total_news_mentions,
    (SELECT count(*) FROM public.user_notifications WHERE is_read = false) as pending_alerts;

