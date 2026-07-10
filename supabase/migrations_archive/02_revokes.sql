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