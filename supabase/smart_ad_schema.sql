-- SMART AD SYSTEM UPGRADE
-- Complete schema initialization for dynamic Ad rotation, scheduling, and analytics

-- 1. CREATE PROMO_ADS TABLE
CREATE TABLE IF NOT EXISTS public.promo_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT NOT NULL,
    cta_label TEXT NOT NULL,
    cta_url TEXT NOT NULL,
    background_color TEXT DEFAULT '#1A6BFF',
    image_url TEXT,
    logo_url TEXT,
    tier TEXT CHECK (tier IN ('standard', 'premium', 'collab')),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    is_collab BOOLEAN DEFAULT false,
    external BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    priority_weight INTEGER DEFAULT 1,
    ad_category TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE ANALYTICS TABLE WITH STRICT EVENT TYPE CONSTRAINT
CREATE TABLE IF NOT EXISTS public.ad_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.promo_ads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.promo_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_analytics ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES FOR PROMO_ADS (Drop first to prevent 42710 Error on re-runs)
DROP POLICY IF EXISTS "Allow public to read active promo_ads" ON public.promo_ads;
CREATE POLICY "Allow public to read active promo_ads" 
ON public.promo_ads FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "Allow admins full access to promo_ads" ON public.promo_ads;
CREATE POLICY "Allow admins full access to promo_ads" 
ON public.promo_ads FOR ALL TO authenticated USING (auth.role() = 'authenticated');

-- 5. POLICIES FOR AD_ANALYTICS (Drop first to prevent 42710 Error on re-runs)
DROP POLICY IF EXISTS "Allow public inserts into ad_analytics" ON public.ad_analytics;
CREATE POLICY "Allow public inserts into ad_analytics" 
ON public.ad_analytics FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admins to read ad_analytics" ON public.ad_analytics;
CREATE POLICY "Allow admins to read ad_analytics" 
ON public.ad_analytics FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

-- 6. SEED DATA (Run once to mirror existing hardcoded site ads)
-- Using a DO block to prevent duplicate seeding if run multiple times
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.promo_ads WHERE title = 'Now Supporting Bitcoin Donations') THEN
        INSERT INTO public.promo_ads (title, subtitle, description, cta_label, cta_url, background_color, tier, is_active, ad_category, priority_weight)
        VALUES ('Now Supporting Bitcoin Donations', 'CEKA', 'Support civic education with Bitcoin, Lightning, or Liquid. Fast, borderless, secure.', 'Donate Bitcoin', '/donate', '#F7931A', 'standard', true, 'support', 10);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.promo_ads WHERE title = 'Legislative Tracker') THEN
        INSERT INTO public.promo_ads (title, subtitle, description, cta_label, cta_url, background_color, tier, is_active, ad_category, priority_weight)
        VALUES ('Legislative Tracker', 'New Tool', 'Stay up-to-date with the latest Bills and legislative action across Kenya.', 'Open Tracker', '/legislative-tracker', '#10B981', 'standard', true, 'feature', 5);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.promo_ads WHERE title = 'Find your IEBC Office in seconds') THEN
        INSERT INTO public.promo_ads (title, subtitle, description, cta_label, cta_url, background_color, tier, is_active, ad_category, priority_weight)
        VALUES ('Find your IEBC Office in seconds', 'Nasaka', 'Fast, simple, and hassle-free access to all 290 constituencies and 47 county offices. Works offline, tailored for Kenyan citizens.', 'Download on Play Store', 'https://play.google.com/store/apps/details?id=com.nasaka.app&hl=en', '#1A6BFF', 'standard', true, 'feature', 5);
    END IF;
END $$;
