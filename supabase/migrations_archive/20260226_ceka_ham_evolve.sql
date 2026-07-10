-- ==========================================
-- CEKA HAM EVOLUTION MIGRATION
-- 2026-02-26: Database & Infrastructure
-- ==========================================

-- 1. EXTEND ROLES
-- Adding 'scholar' and 'journalist' for enhanced tiering
DO $$ 
BEGIN 
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'scholar';
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'journalist';
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Skipping type extension (likely already added or running in restricted env)';
END $$;

-- 2. NASAKA RELEASES (APK/AAB Tracking)
CREATE TABLE IF NOT EXISTS public.nasaka_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    version_code integer NOT NULL UNIQUE,
    version_name text NOT NULL,
    changelog text,
    download_url text NOT NULL,
    release_date timestamp with time zone DEFAULT now(),
    is_alpha boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. CIVIC DATA API (Zero-Trust Key Management)
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash text NOT NULL UNIQUE,
    key_prefix text NOT NULL, -- First 8 chars for identification
    name text NOT NULL, -- e.g. "My Website"
    scopes text[] DEFAULT '{bill_read}', -- e.g. {'bill_read', 'audit_read'}
    rate_limit integer DEFAULT 100, -- requests per hour
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);

-- 4. THE PEOPLES AUDITOR (Community Voting & Feedback)
-- Integrated directly into the Chat page for high-engagement auditing
CREATE TABLE IF NOT EXISTS public.peoples_audits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type text CHECK (vote_type IN ('audit_request', 'upvote', 'downvote')),
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(bill_id, user_id, vote_type)
);

-- 5. REGIONAL GOVERNANCE HIERARCHY (Budget Tracking Basis)
CREATE TABLE IF NOT EXISTS public.kenya_governance (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    level integer NOT NULL, -- 1: National (Gov), 2: County (47), 3: Constituency (290), 4: Ward (1450)
    region_name text NOT NULL,
    parent_id uuid REFERENCES public.kenya_governance(id),
    codes jsonb DEFAULT '{}'::jsonb, -- e.g. {iebc_code: "001", gov_code: "K001"}
    metadata jsonb DEFAULT '{}'::jsonb, -- e.g. {leader_name: "...", budget_id: "..."}
    created_at timestamp with time zone DEFAULT now()
);

-- 6. ENABLE RLS & POLICIES

-- Nasaka Versions
ALTER TABLE public.nasaka_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view releases" ON public.nasaka_versions;
CREATE POLICY "Public can view releases" ON public.nasaka_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage releases" ON public.nasaka_versions;
CREATE POLICY "Admins can manage releases" ON public.nasaka_versions FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User API Keys
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own keys" ON public.user_api_keys;
CREATE POLICY "Users can manage own keys" ON public.user_api_keys FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all keys" ON public.user_api_keys;
CREATE POLICY "Admins can view all keys" ON public.user_api_keys FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Peoples Audits
ALTER TABLE public.peoples_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can audit" ON public.peoples_audits;
CREATE POLICY "Users can audit" ON public.peoples_audits FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own audit" ON public.peoples_audits;
CREATE POLICY "Users can update own audit" ON public.peoples_audits FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view audits" ON public.peoples_audits;
CREATE POLICY "Public can view audits" ON public.peoples_audits FOR SELECT USING (true);

-- Kenya Governance
ALTER TABLE public.kenya_governance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view governance hierarchy" ON public.kenya_governance;
CREATE POLICY "Public can view governance hierarchy" ON public.kenya_governance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage governance hierarchy" ON public.kenya_governance;
CREATE POLICY "Admins can manage governance hierarchy" ON public.kenya_governance FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 7. SYSTEM SETTINGS FOR HAM
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('civic_data_api_enabled', '"true"', 'Toggle for external API access'),
    ('bill_audit_voting_enabled', '"true"', 'Toggle for community-driven audit requests')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 8. REALTIME ENABLEMENT
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.nasaka_versions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.peoples_audits;
EXCEPTION WHEN OTHERS THEN END $$;
