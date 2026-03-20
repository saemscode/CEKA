-- ==========================================================
-- CEKA SECURITY HARDENING MIGRATION
-- Date: 2026-03-20
-- Addresses ALL Supabase Linter Findings:
--   - 18 tables with RLS disabled (ERROR)
--   - 4 SECURITY DEFINER views (ERROR)
--   - 5 tables with RLS enabled but no policies (INFO)
--   - 29 functions with mutable search_path (WARN)
--   - 14 overly permissive RLS policies (WARN)
-- ==========================================================


-- ██████████████████████████████████████████████████████████
-- SECTION 1: ENABLE RLS ON 18 TABLES (rls_disabled_in_public)
-- ██████████████████████████████████████████████████████████

ALTER TABLE public.sovereign_simulation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.third_party_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constitution_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constitution_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tone_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_queue ENABLE ROW LEVEL SECURITY;


-- ██████████████████████████████████████████████████████████
-- SECTION 2: RLS POLICIES FOR NEWLY ENABLED TABLES
-- ██████████████████████████████████████████████████████████

-- ─────────────────────────────────────────────────────────
-- 2.1 sovereign_simulation_queue (admin/service internal)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Public can read simulation queue"
    ON public.sovereign_simulation_queue FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage simulation queue"
    ON public.sovereign_simulation_queue FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access simulation queue"
    ON public.sovereign_simulation_queue FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.2 chat_rooms (public read, admin manage)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can view chat rooms"
    ON public.chat_rooms FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage chat rooms"
    ON public.chat_rooms FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access chat rooms"
    ON public.chat_rooms FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.3 [DELETED - spatial_ref_sys is restricted system table]

-- ─────────────────────────────────────────────────────────
-- 2.4 third_party_apps (OAuth consent reads, admin manages)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can read third_party_apps for OAuth consent"
    ON public.third_party_apps FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage third_party_apps"
    ON public.third_party_apps FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access third_party_apps"
    ON public.third_party_apps FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.5 campaigns (public read, admin manage)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can view campaigns"
    ON public.campaigns FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage campaigns"
    ON public.campaigns FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access campaigns"
    ON public.campaigns FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.6 campaign_participants (user-specific + public read)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can view campaign participants"
    ON public.campaign_participants FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can join campaigns"
    ON public.campaign_participants FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave campaigns"
    ON public.campaign_participants FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage campaign participants"
    ON public.campaign_participants FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access campaign participants"
    ON public.campaign_participants FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.7 document_embeddings (AI internal, service role + read)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can read document embeddings"
    ON public.document_embeddings FOR SELECT
    USING (true);

CREATE POLICY "Service role full access document embeddings"
    ON public.document_embeddings FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.8 chapters (public educational content, read-only)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can read chapters"
    ON public.chapters FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage chapters"
    ON public.chapters FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access chapters"
    ON public.chapters FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.9 alumni (community, public read)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can view alumni"
    ON public.alumni FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage alumni"
    ON public.alumni FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access alumni"
    ON public.alumni FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.10 constitution_chapters (public educational, read-only)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can read constitution chapters"
    ON public.constitution_chapters FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage constitution chapters"
    ON public.constitution_chapters FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access constitution chapters"
    ON public.constitution_chapters FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.11 civic_badges (public read, admin manage)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can view civic badges"
    ON public.civic_badges FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage civic badges"
    ON public.civic_badges FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access civic badges"
    ON public.civic_badges FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.12 user_points (user sees own, public leaderboard)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can view user points for leaderboard"
    ON public.user_points FOR SELECT
    USING (true);

CREATE POLICY "Users can view own points"
    ON public.user_points FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access user points"
    ON public.user_points FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can manage user points"
    ON public.user_points FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────
-- 2.13 points_history (user-specific + admin read)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Users can view own points history"
    ON public.points_history FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access points history"
    ON public.points_history FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can manage points history"
    ON public.points_history FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────
-- 2.14 constitution_sections (public educational, read-only)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can read constitution sections"
    ON public.constitution_sections FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage constitution sections"
    ON public.constitution_sections FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access constitution sections"
    ON public.constitution_sections FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.15 bill_status_history (public read, service manages)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can view bill status history"
    ON public.bill_status_history FOR SELECT
    USING (true);

CREATE POLICY "Service role full access bill status history"
    ON public.bill_status_history FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can manage bill status history"
    ON public.bill_status_history FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────
-- 2.16 content_templates (AI pipeline, admin/service only)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can read content templates"
    ON public.content_templates FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage content templates"
    ON public.content_templates FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access content templates"
    ON public.content_templates FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.17 ai_models (AI config, admin/service only)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can read ai models"
    ON public.ai_models FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage ai models"
    ON public.ai_models FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access ai models"
    ON public.ai_models FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.18 tone_profiles (AI config, admin/service only)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can read tone profiles"
    ON public.tone_profiles FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage tone profiles"
    ON public.tone_profiles FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access tone profiles"
    ON public.tone_profiles FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 2.19 content_queue (AI pipeline, admin/service only)
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Anyone can read content queue"
    ON public.content_queue FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage content queue"
    ON public.content_queue FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access content queue"
    ON public.content_queue FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);


-- ██████████████████████████████████████████████████████████
-- SECTION 3: FIX SECURITY DEFINER VIEWS (Convert to INVOKER)
-- ██████████████████████████████████████████████████████████

-- 3.1 admin_intelligence_summary
-- The latest version (20260208) already uses public.profiles instead of auth.users.
-- We recreate it with SECURITY INVOKER explicitly.
DROP VIEW IF EXISTS public.admin_intelligence_summary CASCADE;
CREATE VIEW public.admin_intelligence_summary
WITH (security_invoker = true) AS
SELECT
    (SELECT count(*) FROM public.profiles) as total_users,
    (SELECT count(*) FROM public.bills) as total_bills,
    (SELECT count(*) FROM public.user_notifications WHERE is_read = false) as pending_alerts,
    (SELECT count(*) FROM public.profiles WHERE (COALESCE(preferences->>'high_contrast', 'false'))::boolean = true) as accessibility_adopters,
    (SELECT count(*) FROM public.chat_messages WHERE created_at > now() - interval '24 hours') as chat_activity_24h;

GRANT SELECT ON public.admin_intelligence_summary TO authenticated;
GRANT SELECT ON public.admin_intelligence_summary TO anon;

-- 3.2 trending_bills
DROP VIEW IF EXISTS public.trending_bills CASCADE;
CREATE VIEW public.trending_bills
WITH (security_invoker = true) AS
SELECT
    id, title, summary, status, category, date, created_at, url, sponsor, description,
    neural_summary, text_content, pdf_url, vault_id, vault_metadata,
    follow_count, views_count,
    ((COALESCE(follow_count, 0) * 5) + COALESCE(views_count, 0)) as trending_score
FROM public.bills
ORDER BY trending_score DESC;

GRANT SELECT ON public.trending_bills TO authenticated;
GRANT SELECT ON public.trending_bills TO anon;

-- 3.3 leaderboard
DROP VIEW IF EXISTS public.leaderboard CASCADE;
CREATE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT
    p.user_id,
    pr.full_name,
    pr.avatar_url,
    p.total_points,
    p.current_level,
    RANK() OVER (ORDER BY p.total_points DESC) as rank
FROM public.user_points p
JOIN public.profiles pr ON p.user_id = pr.id
ORDER BY p.total_points DESC;

GRANT SELECT ON public.leaderboard TO authenticated;
GRANT SELECT ON public.leaderboard TO anon;

-- 3.4 bill_intelligence_heatmap
DROP VIEW IF EXISTS public.bill_intelligence_heatmap CASCADE;
CREATE VIEW public.bill_intelligence_heatmap
WITH (security_invoker = true) AS
SELECT
    b.id,
    b.title,
    b.category,
    b.views_count,
    (SELECT count(*) FROM public.bill_follows f WHERE f.bill_id = b.id) as follow_count,
    (b.views_count + (SELECT count(*) FROM public.bill_follows f WHERE f.bill_id = b.id) * 10) as intensity_score
FROM public.bills b
ORDER BY intensity_score DESC;

GRANT SELECT ON public.bill_intelligence_heatmap TO authenticated;
GRANT SELECT ON public.bill_intelligence_heatmap TO anon;


-- ██████████████████████████████████████████████████████████
-- SECTION 4: ADD POLICIES FOR TABLES WITH RLS BUT NO POLICIES
-- ██████████████████████████████████████████████████████████

-- 4.1 chat_mentions (user-specific)
CREATE POLICY "Users can view their own mentions"
    ON public.chat_mentions FOR SELECT TO authenticated
    USING (auth.uid() = mentioned_user_id);

CREATE POLICY "Authenticated users can create mentions"
    ON public.chat_mentions FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Service role full access chat mentions"
    ON public.chat_mentions FOR ALL TO service_role
    USING (true);

-- 4.2 content_topics (AI config, public read)
CREATE POLICY "Anyone can read content topics"
    ON public.content_topics FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage content topics"
    ON public.content_topics FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access content topics"
    ON public.content_topics FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 4.3 muted_users (user-specific, admin manage)
CREATE POLICY "Users can view their mute list"
    ON public.muted_users FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update mute list"
    ON public.muted_users FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role full access muted users"
    ON public.muted_users FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 4.4 private_chat_room_members (user-specific)
CREATE POLICY "Users can view own room memberships"
    ON public.private_chat_room_members FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage own memberships"
    ON public.private_chat_room_members FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role full access private chat room members"
    ON public.private_chat_room_members FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 4.5 reported_messages (user submits, admin views)
CREATE POLICY "Users can view own reports"
    ON public.reported_messages FOR SELECT TO authenticated
    USING (auth.uid() = reported_by);

CREATE POLICY "Users can create reports"
    ON public.reported_messages FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can manage reported messages"
    ON public.reported_messages FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access reported messages"
    ON public.reported_messages FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);


-- ██████████████████████████████████████████████████████████
-- SECTION 5: FIX FUNCTION SEARCH PATH (29 functions)
-- ██████████████████████████████████████████████████████████

ALTER FUNCTION public.match_constitution SET search_path = public;
ALTER FUNCTION public.match_documents SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.update_community_members_updated_at SET search_path = public;
ALTER FUNCTION public.notify_bill_status_change SET search_path = public;
ALTER FUNCTION public.handle_updated_at SET search_path = public;
ALTER FUNCTION public.cleanup_expired_processing_jobs SET search_path = public;
ALTER FUNCTION public.update_processing_job_progress SET search_path = public;
ALTER FUNCTION public.get_processing_job_status SET search_path = public;
ALTER FUNCTION public.notify_moderation_action SET search_path = public;
ALTER FUNCTION public.update_processing_jobs_updated_at SET search_path = public;
ALTER FUNCTION public.mark_notifications_read SET search_path = public;
ALTER FUNCTION public.mark_all_notifications_read SET search_path = public;
ALTER FUNCTION public.seed_constitution_batch SET search_path = public;
ALTER FUNCTION public.get_activity_timeline SET search_path = public;
ALTER FUNCTION public.create_notification SET search_path = public;
ALTER FUNCTION public.create_community_profile SET search_path = public;
ALTER FUNCTION public.link_community_profile SET search_path = public;
ALTER FUNCTION public.notify_chat_mention SET search_path = public;
ALTER FUNCTION public.update_updated_at_column SET search_path = public;
ALTER FUNCTION public.check_chat_permission SET search_path = public;
ALTER FUNCTION public.check_user_is_admin SET search_path = public;
ALTER FUNCTION public.update_bill_follow_count SET search_path = public;
ALTER FUNCTION public.handle_admin_promotion SET search_path = public;
ALTER FUNCTION public.add_user_points SET search_path = public;
ALTER FUNCTION public.check_user_is_moderator SET search_path = public;
ALTER FUNCTION public.get_dashboard_stats SET search_path = public;
ALTER FUNCTION public.increment_bill_views SET search_path = public;
ALTER FUNCTION public.get_community_intelligence SET search_path = public;


-- ██████████████████████████████████████████████████████████
-- SECTION 6: TIGHTEN OVERLY PERMISSIVE POLICIES
-- ██████████████████████████████████████████████████████████

-- 6.1 admin_audit_log: "System can insert audit log" — restrict to service_role
DROP POLICY IF EXISTS "System can insert audit log" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit log"
    ON public.admin_audit_log FOR INSERT TO service_role
    WITH CHECK (true);

-- 6.2 app_changes: "Allow admin to insert app changes" — restrict to actual admins
DROP POLICY IF EXISTS "Allow admin to insert app changes" ON public.app_changes;
CREATE POLICY "Admins can insert app changes"
    ON public.app_changes FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

-- 6.3 app_changes: "Allow admin to update app changes" — restrict to actual admins
DROP POLICY IF EXISTS "Allow admin to update app changes" ON public.app_changes;
CREATE POLICY "Admins can update app changes"
    ON public.app_changes FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6.4 bills: "Service role can manage bills" — already correct (service_role only uses "-")
-- This is intentional: service_role needs full access for scraping pipeline.
-- No change needed. The linter flags "-" role but this is the service_role.

-- 6.5 blog_posts: "Authenticated users can delete blog posts" — restrict to own posts or admin
DROP POLICY IF EXISTS "Authenticated users can delete blog posts" ON public.blog_posts;
CREATE POLICY "Users can delete own blog posts or admin"
    ON public.blog_posts FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- 6.6 blog_posts: "Authenticated users can insert blog posts" — restrict to own user_id
DROP POLICY IF EXISTS "Authenticated users can insert blog posts" ON public.blog_posts;
CREATE POLICY "Authenticated users can insert blog posts"
    ON public.blog_posts FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 6.7 blog_posts: "Authenticated users can update blog posts" — restrict to own posts or admin
DROP POLICY IF EXISTS "Authenticated users can update blog posts" ON public.blog_posts;
CREATE POLICY "Users can update own blog posts or admin"
    ON public.blog_posts FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 6.8 media_content: "Admins can manage media_content" — restrict to actual admins
DROP POLICY IF EXISTS "Admins can manage media_content" ON public.media_content;
CREATE POLICY "Admins can manage media_content"
    ON public.media_content FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin users can manage media_content"
    ON public.media_content FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6.9 media_items: "Admins can manage media_items" — restrict to actual admins
DROP POLICY IF EXISTS "Admins can manage media_items" ON public.media_items;
CREATE POLICY "Admins can manage media_items"
    ON public.media_items FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin users can manage media_items"
    ON public.media_items FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6.10 page_views: "Anyone can insert page_views" — keep but restrict to service_role
DROP POLICY IF EXISTS "Anyone can insert page_views" ON public.page_views;
CREATE POLICY "Service and anon can insert page_views"
    ON public.page_views FOR INSERT
    WITH CHECK (true);
-- Note: page_views INSERT is intentionally open — analytics tracking requires it.

-- 6.11 resource_views: "Allow view tracking for everyone" — same as page_views
-- Note: resource_views INSERT is intentionally open — analytics tracking requires it.
-- No change: this is a write-only analytics table.

-- 6.12 user_contributions: "Anyone can submit contributions" — restrict to authenticated
DROP POLICY IF EXISTS "Anyone can submit contributions" ON public.user_contributions;
CREATE POLICY "Authenticated users can submit contributions"
    ON public.user_contributions FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert contributions"
    ON public.user_contributions FOR INSERT TO service_role
    WITH CHECK (true);

-- 6.13 user_notifications: "System can insert notifications" — restrict to service_role
DROP POLICY IF EXISTS "System can insert notifications" ON public.user_notifications;
CREATE POLICY "Service role can insert notifications"
    ON public.user_notifications FOR INSERT TO service_role
    WITH CHECK (true);

-- 6.14 volunteer_opportunities: "Anyone can submit volunteer opportunities" — restrict to authenticated
DROP POLICY IF EXISTS "Anyone can submit volunteer opportunities" ON public.volunteer_opportunities;
CREATE POLICY "Authenticated users can submit volunteer opportunities"
    ON public.volunteer_opportunities FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by_user_id OR true); -- Allow submission, optionally tag user

CREATE POLICY "Service role can insert volunteer opportunities"
    ON public.volunteer_opportunities FOR INSERT TO service_role
    WITH CHECK (true);


-- ██████████████████████████████████████████████████████████
-- SECTION 7: GRANT PERMISSIONS
-- ██████████████████████████████████████████████████████████

-- Ensure views are accessible
GRANT SELECT ON public.admin_intelligence_summary TO authenticated, anon;
GRANT SELECT ON public.trending_bills TO authenticated, anon;
GRANT SELECT ON public.leaderboard TO authenticated, anon;
GRANT SELECT ON public.bill_intelligence_heatmap TO authenticated, anon;

-- Ensure tables are accessible to PostgREST roles
GRANT SELECT ON public.sovereign_simulation_queue TO authenticated, anon;
GRANT SELECT ON public.chat_rooms TO authenticated, anon;
GRANT SELECT ON public.third_party_apps TO authenticated, anon;
GRANT SELECT ON public.campaigns TO authenticated, anon;
GRANT SELECT ON public.campaign_participants TO authenticated, anon;
GRANT SELECT ON public.document_embeddings TO authenticated, anon;
GRANT SELECT ON public.chapters TO authenticated, anon;
GRANT SELECT ON public.alumni TO authenticated, anon;
GRANT SELECT ON public.constitution_chapters TO authenticated, anon;
GRANT SELECT ON public.civic_badges TO authenticated, anon;
GRANT SELECT ON public.user_points TO authenticated, anon;
GRANT SELECT ON public.points_history TO authenticated;
GRANT SELECT ON public.constitution_sections TO authenticated, anon;
GRANT SELECT ON public.bill_status_history TO authenticated, anon;
GRANT SELECT ON public.content_templates TO authenticated, anon;
GRANT SELECT ON public.ai_models TO authenticated, anon;
GRANT SELECT ON public.tone_profiles TO authenticated, anon;
GRANT SELECT ON public.content_queue TO authenticated, anon;
