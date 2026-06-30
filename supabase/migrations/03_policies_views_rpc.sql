-- SECTION 4: Fix always-true RLS policies (10 issues)
-- ============================================================

-- 4a: Drop redundant service_role policies (service_role bypasses RLS by default)
DROP POLICY IF EXISTS "Service role can manage bills" ON public.bills;
DROP POLICY IF EXISTS "Service role can manage donation_payments" ON public.donation_payments;
DROP POLICY IF EXISTS "Service role can manage fiat_payments" ON public.fiat_payments;

-- 4b: Fix chat_mentions - enforce user_id matches caller
DROP POLICY IF EXISTS "Authenticated users can create mentions" ON public.chat_mentions;
CREATE POLICY "Authenticated users can create mentions"
  ON public.chat_mentions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4c: Fix malpractice_reports - consolidate 3 duplicate always-true INSERT policies into 1
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.malpractice_reports;
CREATE POLICY "Allow anonymous insert for malpractice_reports"
  ON public.malpractice_reports FOR INSERT TO anon, authenticated
  WITH CHECK (true);  -- Anonymous reports allowed; rate-limiting handled in Edge Function

-- 4d: Fix page_views - allow insert but add basic sanity (resource_id not null)
DROP POLICY IF EXISTS "Service and anon can insert page_views" ON public.page_views;
CREATE POLICY "Allow page view inserts"
  ON public.page_views FOR INSERT TO anon, authenticated
  WITH CHECK (resource_id IS NOT NULL);

-- 4e: Fix resource_views - same sanity check
DROP POLICY IF EXISTS "Allow view tracking for everyone" ON public.resource_views;
CREATE POLICY "Allow resource view tracking"
  ON public.resource_views FOR INSERT TO anon, authenticated
  WITH CHECK (resource_id IS NOT NULL);

-- 4f: Fix volunteer_opportunities - enforce submitted_by matches caller
DROP POLICY IF EXISTS "Authenticated users can submit volunteer opportunities" ON public.volunteer_opportunities;
CREATE POLICY "Authenticated users can submit volunteer opportunities"
  ON public.volunteer_opportunities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- ============================================================
-- SECTION 5: Recreate SECURITY DEFINER views as SECURITY INVOKER
-- ============================================================

-- 5a: unified_broadcast_list
DROP VIEW IF EXISTS public.unified_broadcast_list;
CREATE VIEW public.unified_broadcast_list
WITH (security_invoker = true)
AS
 SELECT community_members.id,
    community_members.email,
    community_members.first_name,
    community_members.last_name,
    COALESCE((community_members.first_name || ' '::text) || community_members.last_name,
             community_members.first_name,
             community_members.last_name,
             'Citizen'::text) AS display_name,
    community_members.county,
    community_members.interests,
    community_members.areas_of_interest,
    community_members.status AS membership_status,
    'community'::text AS source_table
   FROM community_members
UNION
 SELECT profiles.id,
    profiles.email,
    split_part(profiles.full_name, ' '::text, 1) AS first_name,
    SUBSTRING(profiles.full_name FROM POSITION((' '::text) IN (profiles.full_name)) + 1) AS last_name,
    profiles.full_name AS display_name,
    NULL::text AS county,
    NULL::text AS interests,
    '{}'::text[] AS areas_of_interest,
    'approved'::text AS membership_status,
    'profile'::text AS source_table
   FROM profiles
  WHERE NOT (profiles.email IN ( SELECT community_members.email FROM community_members));


-- 5b: translation_progress
DROP VIEW IF EXISTS public.translation_progress;
CREATE VIEW public.translation_progress
WITH (security_invoker = true)
AS
 SELECT tu.project_slug AS carousel_id,
    l.code AS lang_code,
    l.name AS language_name,
    count(tu.id) AS total_units,
    count(ts.id) FILTER (WHERE ts.status = 'approved'::text) AS approved_units,
    round(count(ts.id) FILTER (WHERE ts.status = 'approved'::text)::numeric
          / NULLIF(count(tu.id), 0)::numeric * 100::numeric, 2) AS progress_percentage
   FROM translation_units tu
     CROSS JOIN languages l
     LEFT JOIN translation_submissions ts ON tu.id = ts.unit_id AND l.code = ts.lang_code
  WHERE tu.status <> 'archived'::text AND l.is_active = true
  GROUP BY tu.project_slug, l.code, l.name;


-- ============================================================
-- SECTION 6: Fix public storage bucket over-broad SELECT policies
-- ============================================================

-- 6a: avatars bucket - remove duplicate listing policies, keep single read-by-name
DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
-- Note: bucket listing (directory scan) is controlled via the bucket public flag,
-- not SELECT policies. To disable listing, set the bucket to private and use signed URLs.
-- The above policy allows read-by-URL. Disable public bucket listing in the dashboard.

-- 6b: resources bucket - same fix
DROP POLICY IF EXISTS "Resources public read" ON storage.objects;
CREATE POLICY "Resources public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'resources');

-- ============================================================
-- SECTION 7: Enable RLS on tables currently without it
-- ============================================================

ALTER TABLE IF EXISTS public.carousel_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_corrections ENABLE ROW LEVEL SECURITY;

-- Public read for carousel content (needed for the frontend)
DROP POLICY IF EXISTS "Public read carousel_batches" ON public.carousel_batches;
CREATE POLICY "Public read carousel_batches" ON public.carousel_batches
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read carousel_images" ON public.carousel_images;
CREATE POLICY "Public read carousel_images" ON public.carousel_images
  FOR SELECT USING (true);
-- Admin write only (via service role - no explicit policy needed as service_role bypasses RLS)

-- ============================================================
-- SECTION 8: Create donation stats aggregation RPC
-- Replaces the full table scan in ledgerService.ts
-- This runs against the LEDGER Supabase project (ftswzvqwxdwgkvfbwfpx)
-- Run this SQL on that project, not on the main CEKA project
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_successful_donations_summary()
RETURNS TABLE (total_amount bigint, transaction_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    COALESCE(SUM(amount), 0)::bigint AS total_amount,
    COUNT(*)::bigint                 AS transaction_count
  FROM transactions
  WHERE status = 'success';
$$;

-- Grant to anon so the maintenance page (unauthenticated) can call it
GRANT EXECUTE ON FUNCTION public.get_successful_donations_summary() TO anon;
GRANT EXECUTE ON FUNCTION public.get_successful_donations_summary() TO authenticated;
