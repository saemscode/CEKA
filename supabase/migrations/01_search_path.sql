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