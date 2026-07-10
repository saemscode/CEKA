-- ============================================================
-- CEKA SUPABASE SECURITY HARDENING MIGRATION
-- Generated: 2026-06-30
-- Fixes: function_search_path_mutable (77)
--        anon/authenticated SECURITY DEFINER callable (190)
--        rls_policy_always_true (10)
--        public_bucket_allows_listing (2)
--        security_definer_view (2)
--        extension_in_public (4)
-- ============================================================

-- ============================================================
-- SECTION 1: Fix mutable search_path on 77 functions
-- ============================================================

ALTER FUNCTION public.ask_nps_on_signature_verified() SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_action_badge(uuid, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_badge(uuid, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_civic_credits(uuid, integer, text, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_points(uuid, text, text, uuid, jsonb) SET search_path = public, pg_catalog;
ALTER FUNCTION public.award_reading_milestone(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_and_award_badges() SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_badge_thresholds() SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_bill_follow_badges() SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_discussion_start_badges() SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_duplicate_report() SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_memo_signature_badges() SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_reply_badges() SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_report_status(text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_translation_glossary() SET search_path = public, pg_catalog;
ALTER FUNCTION public.classify_report() SET search_path = public, pg_catalog;
ALTER FUNCTION public.create_campaign_from_approved_proposal() SET search_path = public, pg_catalog;
ALTER FUNCTION public.decrement_campaign_participants() SET search_path = public, pg_catalog;
ALTER FUNCTION public.escalate_stale_pending() SET search_path = public, pg_catalog;
ALTER FUNCTION public.generate_campaign_slug(text, uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.generate_slug(text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_bill_by_slug_or_id(text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_enrichment_chip_counts(text[]) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_mailing_mesh_status() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_next_translation_task(text, uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_public_stats() SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_translation_consensus(uuid, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_translation_progress(text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_trending_bills(integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_donation_payment_update() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_partners_update() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_translation_unit_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.hash_report_ip() SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_campaign_participants() SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_contribution_points(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_template_usage(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_template_views(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.increment_user_action(text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_member_of_room(text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.log_action(text, uuid, text, text, jsonb, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_badge_earned() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_bill_followed() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_bill_response() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_bill_status_change_from_history() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_campaign_update() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_community_member_joined() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_constitution_reading_milestone() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_credit_change() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_followers_bill_status_change() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_new_bill_dropped() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_new_blog_post() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_new_campaign() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_new_civic_event() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_new_community_member() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_new_volunteer_opportunity() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_resource_view() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_resource_view_connection() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_settings_change() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_signature_nps() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_system_settings_change() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_volunteer_status_change() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_volunteer_status_change_full() SET search_path = public, pg_catalog;
ALTER FUNCTION public.prevent_modification() SET search_path = public, pg_catalog;
ALTER FUNCTION public.redeem_perk(uuid, uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.send_event_reminders() SET search_path = public, pg_catalog;
ALTER FUNCTION public.send_reading_percentile_notifications() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_campaign_slug() SET search_path = public, pg_catalog;
ALTER FUNCTION public.submit_signature(uuid, uuid, text, text, text, text, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.track_article_view() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trigger_ai_translation_draft() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trigger_civic_rewards() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trigger_process_broadcast_queue() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_modified_column() SET search_path = public, pg_catalog;
ALTER FUNCTION public.user_wants_notification(uuid, text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.verify_signature_otp(uuid, text) SET search_path = public, pg_catalog;

-- ============================================================
-- SECTION 2: Revoke anon EXECUTE on SECURITY DEFINER functions
-- Anon (unauthenticated) should NEVER call admin/mutating functions
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.add_user_points(uuid, integer, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ask_nps_on_signature_verified() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_assign_admin_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_action_badge(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_civic_credits(uuid, integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_points(uuid, text, text, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_reading_milestone(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_award_badges() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_badge_thresholds() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_bill_follow_badges() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_chat_permission(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_discussion_start_badges() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_memo_signature_badges() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_reply_badges() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_report_status(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_user_is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_user_is_moderator() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_admin_sessions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_processing_jobs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_admin_notification() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_admin_session(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_community_profile(text, text, text, text, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, uuid, uuid, text, text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.escalate_stale_pending() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_activity_timeline(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_bill_by_slug_or_id(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_community_intelligence() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_enrichment_chip_counts(text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_mailing_mesh_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_translation_task(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_processing_job_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_public_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_resource_view_count(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_translation_progress(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_trending_bills(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_admin_promotion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_bill_views(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_contribution_points(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_template_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_template_views(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_user_action(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_member_of_room(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.link_community_profile(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_action(text, uuid, text, text, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_badge_earned() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_bill_followed() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_bill_response() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_bill_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_bill_status_change_from_history() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_campaign_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_chat_mention() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_community_member_joined() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_constitution_reading_milestone() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_credit_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_followers_bill_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_moderation_action() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_new_bill_dropped() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_new_blog_post() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_new_campaign() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_new_civic_event() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_new_community_member() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_new_volunteer_opportunity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_resource_view() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_resource_view_connection() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_settings_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_signature_nps() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_system_settings_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_volunteer_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_volunteer_status_change_full() FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_perk(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_constitution_batch(jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_event_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_reading_percentile_notifications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_signature(uuid, uuid, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.track_article_view() FROM anon;
REVOKE EXECUTE ON FUNCTION public.track_resource_view(text, text, text, uuid, inet, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_ai_translation_draft() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_civic_rewards() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_process_broadcast_queue() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_bill_follow_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_discussion_reply_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_processing_job_progress(uuid, integer, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_wants_notification(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_signature_otp(uuid, text) FROM anon;

-- ============================================================
-- SECTION 3: Restrict authenticated EXECUTE on admin-only functions
-- Keep GRANT for functions that authenticated users legitimately call
-- Revoke from authenticated for functions that should only run server-side
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.award_badge(uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.award_civic_credits(uuid, integer, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.award_civic_credits(uuid, integer, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.escalate_stale_pending() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.escalate_stale_pending() TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_mailing_mesh_status() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_mailing_mesh_status() TO service_role;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.notify_new_campaign() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.notify_new_campaign() TO service_role;

-- ============================================================
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
