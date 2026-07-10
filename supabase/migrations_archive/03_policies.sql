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