-- CEKA Dynamic Campaigns Schema (ALTER EXISTING SCHEMA)

-- 1. Alter existing Campaigns Core Table
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS detailed_description TEXT,
  ADD COLUMN IF NOT EXISTS target_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raised_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT false;

-- We already have campaign_participants? Let's check if we can reuse it or alter it.
-- Since it already exists in the UI list, let's make sure it has the right shape:
CREATE TABLE IF NOT EXISTS public.campaign_participants (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, campaign_id)
);

-- 2. Campaign Proposals (User submission + moderation + Paystack)
CREATE TABLE IF NOT EXISTS public.campaign_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    goal TEXT,
    type TEXT,
    content TEXT,
    target_amount NUMERIC,
    location TEXT,
    status TEXT DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    is_boosted BOOLEAN DEFAULT false,
    paystack_reference TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Campaign Updates (Creator posts)
CREATE TABLE IF NOT EXISTS public.campaign_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    date TIMESTAMPTZ DEFAULT now()
);

-- 4. Campaign Supporters (Donations)
CREATE TABLE IF NOT EXISTS public.campaign_supporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'KES',
    comment TEXT,
    date TIMESTAMPTZ DEFAULT now()
);

-- RLS Setup
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_supporters ENABLE ROW LEVEL SECURITY;

-- Policies for Campaigns (Public read, Admin write)
DROP POLICY IF EXISTS "Campaigns are visible to everyone" ON public.campaigns;
CREATE POLICY "Campaigns are visible to everyone" ON public.campaigns FOR SELECT USING (true);

-- Policies for Proposals
DROP POLICY IF EXISTS "Users can insert their own proposals" ON public.campaign_proposals;
CREATE POLICY "Users can insert their own proposals" ON public.campaign_proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own proposals" ON public.campaign_proposals;
CREATE POLICY "Users can view their own proposals" ON public.campaign_proposals FOR SELECT USING (auth.uid() = user_id);

-- Policies for Participants
DROP POLICY IF EXISTS "Public can view campaign participants" ON public.campaign_participants;
CREATE POLICY "Public can view campaign participants" ON public.campaign_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can follow campaigns" ON public.campaign_participants;
CREATE POLICY "Users can follow campaigns" ON public.campaign_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unfollow campaigns" ON public.campaign_participants;
CREATE POLICY "Users can unfollow campaigns" ON public.campaign_participants FOR DELETE USING (auth.uid() = user_id);

-- Policies for Updates
DROP POLICY IF EXISTS "Updates are visible to everyone" ON public.campaign_updates;
CREATE POLICY "Updates are visible to everyone" ON public.campaign_updates FOR SELECT USING (true);

-- Policies for Supporters
DROP POLICY IF EXISTS "Supporters are visible to everyone" ON public.campaign_supporters;
CREATE POLICY "Supporters are visible to everyone" ON public.campaign_supporters FOR SELECT USING (true);

-- Functions and Triggers
CREATE OR REPLACE FUNCTION increment_campaign_participants() 
RETURNS TRIGGER AS $$
BEGIN
  -- We increment both current_count and goal_count for simplicity? Wait, goal_count is target signatures.
  -- The user's schema uses current_count for signature participants.
  UPDATE public.campaigns SET current_count = COALESCE(current_count, 0) + 1 WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_participant_added ON public.campaign_participants;
CREATE TRIGGER campaign_participant_added
AFTER INSERT ON public.campaign_participants
FOR EACH ROW EXECUTE FUNCTION increment_campaign_participants();

CREATE OR REPLACE FUNCTION decrement_campaign_participants() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.campaigns SET current_count = COALESCE(current_count, 0) - 1 WHERE id = OLD.campaign_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_participant_removed ON public.campaign_participants;
CREATE TRIGGER campaign_participant_removed
AFTER DELETE ON public.campaign_participants
FOR EACH ROW EXECUTE FUNCTION decrement_campaign_participants();
