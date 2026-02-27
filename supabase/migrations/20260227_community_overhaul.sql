-- ================================================
-- CEKA COMMUNITY ENGINE OVERHAUL (GO HAM)
-- 2026-02-27: Dynamic Rooms, Polls, & Campaigns
-- ================================================

-- 1. PUBLIC ROOMS INFRASTRUCTURE
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_rooms (
    id text PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    category text NOT NULL DEFAULT 'general',
    icon_name text DEFAULT 'Hash',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Seed Initial Production Rooms (Aligned with Campaigns)
INSERT INTO public.public_rooms (id, name, slug, description, category, icon_name)
VALUES 
    ('voter-hub', 'Voter Registration Hub', 'voter-hub', 'Coordinating the 2027 voter registration drive across all 290 constituencies.', 'sovereignty', 'UserCheck'),
    ('stop-gbv', 'Protection Watch (#StopGBV)', 'stop-gbv', 'Crisis response and policy advocacy to end Gender-Based Violence.', 'rights', 'Shield'),
    ('the-arena', 'Civic Pulse (#Distractions)', 'the-arena', 'Filtering the noise: Deep discourse on governance vs state distractions.', 'governance', 'Zap'),
    ('constitution-audit', 'Constitution Audit', 'constitution-audit', 'Tracking the spirit and letter of our supreme law.', 'judicial', 'Scale'),
    ('budget-watch', 'National Budget Watch', 'budget-watch', 'Tracking public expenditure and revenue transparency.', 'finance', 'TrendingUp')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. POLLS INFRASTRUCTURE
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.polls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question text NOT NULL,
    description text,
    category text,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.poll_options (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
    option_text text NOT NULL,
    order_index integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(poll_id, user_id)
);

-- Seed Initial Poll
DO $$
DECLARE
    v_poll_id uuid;
BEGIN
    -- Only insert if doesn't exist to avoid duplicates if migration is rerun
    IF NOT EXISTS (SELECT 1 FROM public.polls WHERE question = '2027 Voter Readiness') THEN
        INSERT INTO public.polls (question, description, category)
        VALUES ('2027 Voter Readiness', 'Have you confirmed your registration status in the latest IEBC cleanup?', 'voter-hub')
        RETURNING id INTO v_poll_id;

        INSERT INTO public.poll_options (poll_id, option_text, order_index)
        VALUES 
            (v_poll_id, 'Yes, fully confirmed', 0),
            (v_poll_id, 'No, but plan to soon', 1),
            (v_poll_id, 'Experiencing system issues', 2),
            (v_poll_id, 'Not yet of voting age', 3);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Poll seeding skipped: %', SQLERRM;
END $$;

-- 3. CAMPAIGNS PRODUCTION SEED
-- ------------------------------------------
-- Avoid duplicates on migration rerun by removing old seeds first
DELETE FROM public.campaigns WHERE title IN ('Voter Registration Drive', '#StopGBV', '#Distractions');

INSERT INTO public.campaigns (id, title, description, organizer, status, goal_count, current_count)
VALUES 
    (gen_random_uuid(), 'Voter Registration Drive', 'Massive grassroots movement to register 5 million new voters before 2027.', 'CEKA Sovereignty Hub', 'active', 5000000, 124500),
    (gen_random_uuid(), '#StopGBV', 'A national movement for safety, justice and zero-tolerance policy against Gender-Based Violence.', 'CEKA Human Rights', 'active', 100000, 32400),
    (gen_random_uuid(), '#Distractions', 'Exposing state-sponsored narratives designed to divert attention from key governance failures.', 'CEKA Governance Watch', 'active', 250000, 89200);

-- 4. ENABLE RLS
-- ------------------------------------------
ALTER TABLE public.public_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
    CREATE POLICY "Public can view rooms" ON public.public_rooms FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN END $$;

DO $$ BEGIN
    CREATE POLICY "Public can view polls" ON public.polls FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN END $$;

DO $$ BEGIN
    CREATE POLICY "Public can view options" ON public.poll_options FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN END $$;

DO $$ BEGIN
    CREATE POLICY "Users can vote once" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view their votes" ON public.poll_votes FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN END $$;

-- Admin Policies for Management
DO $$ BEGIN
    CREATE POLICY "Admins can manage rooms" ON public.public_rooms FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN OTHERS THEN END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage polls" ON public.polls FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN OTHERS THEN END $$;

-- 5. REALTIME ENABLEMENT
-- ------------------------------------------
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.public_rooms;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
EXCEPTION WHEN OTHERS THEN END $$;

-- 6. RPC FOR COMMUNITY INTELLIGENCE
-- ------------------------------------------
CREATE OR REPLACE FUNCTION public.get_community_intelligence()
RETURNS jsonb AS $$
DECLARE
    v_total_discussions bigint;
    v_active_citizens bigint;
    v_live_actions bigint;
BEGIN
    SELECT count(*) INTO v_total_discussions FROM public.discussions;
    SELECT count(*) INTO v_active_citizens FROM public.profiles;
    
    -- Live actions: message count + votes + discussion replies in last 24h
    SELECT 
        (SELECT count(*) FROM public.chat_messages WHERE created_at > now() - interval '24 hours') +
        (SELECT count(*) FROM public.poll_votes WHERE created_at > now() - interval '24 hours') +
        (SELECT count(*) FROM public.discussion_replies WHERE created_at > now() - interval '24 hours')
    INTO v_live_actions;

    RETURN jsonb_build_object(
        'totalDiscussions', v_total_discussions,
        'activeUsers', v_active_citizens,
        'todayActivity', v_live_actions
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
