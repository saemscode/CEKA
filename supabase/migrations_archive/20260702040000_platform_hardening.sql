-- Migration: Platform Verification, Constitution & Credits Hub
-- Description: Sets up the official Verification protocols, the dynamic Constitution database, and the gamified Engagement Ledger.

-- 1. Profiles Update for Verification & Gamification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civic_credits integer DEFAULT 0;

-- 2. Civic Credit Ledger
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    action_type text NOT NULL,
    description text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT credit_ledger_pkey PRIMARY KEY (id)
);

-- Secure RPC to award points
CREATE OR REPLACE FUNCTION award_civic_credits(recipient_id uuid, points integer, action_name text, note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.credit_ledger(user_id, amount, action_type, description)
    VALUES (recipient_id, points, action_name, note);
    
    UPDATE public.profiles
    SET civic_credits = civic_credits + points
    WHERE id = recipient_id;
END;
$$;

-- 3. Dynamic Constitution & Search Vectors
CREATE TABLE IF NOT EXISTS public.constitution_articles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    chapter integer NOT NULL,
    part integer NULL,
    article integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED,
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT constitution_articles_pkey PRIMARY KEY (id),
    CONSTRAINT constitution_articles_article_key UNIQUE (article)
);

CREATE INDEX IF NOT EXISTS constitution_articles_search_idx ON public.constitution_articles USING GIN (search_vector);

-- Enable RLS
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constitution_articles ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Public can view constitution" ON public.constitution_articles FOR SELECT USING (true);
CREATE POLICY "Users can view own ledger" ON public.credit_ledger FOR SELECT USING (auth.uid() = user_id);
