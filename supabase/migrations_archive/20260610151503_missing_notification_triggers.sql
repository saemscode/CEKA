-- =====================================================
-- CEKA MISSING NOTIFICATION TRIGGERS — FULL SWEEP
-- Covers Items 1-15 from the confirmed specification
-- All queries reference ONLY confirmed schema tables
-- =====================================================

-- =====================================================
-- ITEM 1: BILL RESPONSE NOTIFICATION
-- user_notifications table (source_type='bill_update')
-- =====================================================
CREATE OR REPLACE FUNCTION notify_bill_response()
RETURNS TRIGGER AS $$
DECLARE
  v_bill_title text;
  v_bill_slug  text;
  v_user_name  text;
BEGIN
  SELECT title, slug INTO v_bill_title, v_bill_slug FROM public.bills WHERE id = NEW.bill_id;
  SELECT COALESCE(full_name, email, 'there') INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.user_notifications (
    user_id, source_type, source_id, title, message, link, category, priority
  ) VALUES (
    NEW.user_id,
    'bill_update',
    NEW.bill_id,
    'Thanks for weighing in, ' || v_user_name || '!',
    'Your perspective on "' || COALESCE(v_bill_title, 'this bill') || '" has been recorded. Want to engage with more Bills that shape Kenya? Head to the tracker and keep the conversation going.',
    '/legislative-tracker',
    'general',
    'normal'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bill_response_notify ON public.bill_responses;
CREATE TRIGGER on_bill_response_notify
  AFTER INSERT ON public.bill_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_bill_response();


-- =====================================================
-- ITEM 3: NEW BLOG POST NOTIFICATION
-- Fires when blog_posts.status flips to 'published'
-- =====================================================
CREATE OR REPLACE FUNCTION notify_new_blog_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes TO 'published'
  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'published' THEN
    INSERT INTO public.user_notifications (
      user_id, source_type, source_id, title, message, link, category, priority
    )
    SELECT
      p.id,
      'blog_comment',
      NEW.id,
      'Fresh on the CEKA Blog',
      COALESCE(NEW.author, 'Our team') || ' just published "' || NEW.title || '". Grab a few minutes and dive in.',
      '/blog/' || NEW.slug,
      'general',
      'normal'
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_blog_post_published ON public.blog_posts;
CREATE TRIGGER on_blog_post_published
  AFTER UPDATE OF status ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_blog_post();


-- =====================================================
-- ITEM 4: NEW CAMPAIGN NOTIFICATION
-- Fires when a new campaign is inserted with status 'active'
-- =====================================================
CREATE OR REPLACE FUNCTION notify_new_campaign()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    INSERT INTO public.user_notifications (
      user_id, source_type, source_id, title, message, link, category, priority
    )
    SELECT
      p.id,
      'campaign_update',
      NEW.id,
      'New Campaign just launched',
      '"' || NEW.title || '" is now live' || CASE WHEN NEW.location IS NOT NULL AND NEW.location <> '' THEN ' in ' || NEW.location ELSE '' END || '. Join the movement and make your voice count.',
      '/campaigns',
      'general',
      'normal'
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_campaign_created ON public.campaigns;
CREATE TRIGGER on_campaign_created
  AFTER INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_campaign();


-- =====================================================
-- ITEM 5: BADGE EARNED NOTIFICATION
-- Fires when a new row is inserted into user_badges
-- =====================================================
CREATE OR REPLACE FUNCTION notify_badge_earned()
RETURNS TRIGGER AS $$
DECLARE
  v_badge_name text;
  v_badge_desc text;
  v_user_name  text;
BEGIN
  SELECT name, COALESCE(description, '') INTO v_badge_name, v_badge_desc
    FROM public.civic_badges WHERE id = NEW.badge_id;
  SELECT COALESCE(full_name, 'Civic Hero') INTO v_user_name
    FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.user_notifications (
    user_id, source_type, source_id, title, message, link, category, priority
  ) VALUES (
    NEW.user_id,
    'system',
    NEW.badge_id,
    v_user_name || ', you just earned a badge!',
    'You unlocked the "' || COALESCE(v_badge_name, 'New Badge') || '" badge. ' || v_badge_desc || ' Keep going, your impact matters.',
    '/account',
    'milestone',
    'high'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_badge_earned ON public.user_badges;
CREATE TRIGGER on_badge_earned
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION notify_badge_earned();


-- =====================================================
-- ITEM 6: NEW CIVIC EVENT NOTIFICATION + 1-DAY REMINDER
-- Fires globally on INSERT into civic_events
-- =====================================================
CREATE OR REPLACE FUNCTION notify_new_civic_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_notifications (
    user_id, source_type, source_id, title, message, link, category, priority, metadata
  )
  SELECT
    p.id,
    'system',
    NEW.id,
    'Upcoming: ' || NEW.title,
    'There is a new ' || COALESCE(NEW.category, 'civic') || ' event on ' ||
      to_char(NEW.event_date, 'Day, DD Mon YYYY') ||
      CASE WHEN NEW.start_time IS NOT NULL THEN ' at ' || to_char(NEW.start_time, 'HH24:MI') ELSE '' END ||
      '. Add it to your calendar!',
    COALESCE(NEW.external_link, '/'),
    'general',
    'normal',
    jsonb_build_object('event_date', NEW.event_date, 'reminder_sent', false)
  FROM public.profiles p;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_civic_event_created ON public.civic_events;
CREATE TRIGGER on_civic_event_created
  AFTER INSERT ON public.civic_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_civic_event();


-- =====================================================
-- ITEM 7: COMMUNITY MEMBER JOIN NOTIFICATION + POINTS
-- Fires when community_members.status = 'processed'
-- =====================================================
CREATE OR REPLACE FUNCTION notify_community_member_joined()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.status = 'processed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Try to find matching auth user by email
    SELECT id INTO v_user_id FROM public.profiles WHERE email = NEW.email LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      -- Award welcome points using canonical RPC
      PERFORM public.add_user_points(v_user_id, 25, 'community', 'Joined the CEKA Community');

      -- Award civic credits
      PERFORM award_civic_credits(v_user_id, 25, 'community_join', 'Welcome credits for joining CEKA Community');

      -- Award "Civic Starter" badge if exists
      INSERT INTO public.user_badges (user_id, badge_id)
      SELECT v_user_id, id FROM public.civic_badges WHERE name = 'Civic Starter' AND is_active = true
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      -- Single combined welcome notification
      INSERT INTO public.user_notifications (
        user_id, source_type, source_id, title, message, link, category, priority
      ) VALUES (
        v_user_id,
        'system',
        v_user_id,
        'Welcome to the CEKA Community, ' || NEW.first_name || '!',
        'You just joined a growing community of Kenyans shaping our democracy. You have received 25 welcome points and your first badge. Start by following a Bill that matters to you.',
        '/legislative-tracker',
        'milestone',
        'high'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_community_member_processed ON public.community_members;
CREATE TRIGGER on_community_member_processed
  AFTER UPDATE OF status ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_community_member_joined();


-- =====================================================
-- ITEM 11: SIGNATURE NPS NOTIFICATION
-- Fires when a new signature is created
-- NPS question with 3 responses stored in profile
-- =====================================================
CREATE OR REPLACE FUNCTION notify_signature_nps()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_bill_title text;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles WHERE email = NEW.email LIMIT 1;
  SELECT title INTO v_bill_title FROM public.bills WHERE id = NEW.bill_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id, source_type, source_id, title, message, link, category, priority, metadata
    ) VALUES (
      v_user_id,
      'system',
      NEW.id,
      'Your signature on "' || COALESCE(v_bill_title, 'this bill') || '" was received',
      'Thank you for signing. How likely are you to recommend CEKA to a friend? Tap your answer: [Very likely] [Maybe] [Not likely]',
      '/account',
      'general',
      'normal',
      jsonb_build_object(
        'nps_type', 'signature',
        'nps_options', ARRAY['Very likely', 'Maybe', 'Not likely'],
        'nps_answered', false,
        'source_id', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_signature_nps ON public.signatures;
CREATE TRIGGER on_signature_nps
  AFTER INSERT ON public.signatures
  FOR EACH ROW
  EXECUTE FUNCTION notify_signature_nps();


-- =====================================================
-- ITEM 12: SYSTEM SETTINGS CHANGE NOTIFICATION
-- Fires when system_settings is updated
-- Notifies the user who made the change (updated_by)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_system_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_by IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id, source_type, source_id, title, message, link, category, priority
    ) VALUES (
      NEW.updated_by,
      'system',
      NULL,
      'System setting updated',
      'The setting "' || NEW.key || '" was just updated. Your change is now live across the platform.',
      '/admin',
      'system',
      'normal'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_system_settings_change ON public.system_settings;
CREATE TRIGGER on_system_settings_change
  AFTER UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION notify_system_settings_change();


-- =====================================================
-- ITEM 14: NEW VOLUNTEER OPPORTUNITY NOTIFICATION
-- Notifies all users when a new opportunity drops
-- =====================================================
CREATE OR REPLACE FUNCTION notify_new_volunteer_opportunity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
    INSERT INTO public.user_notifications (
      user_id, source_type, source_id, title, message, link, category, priority
    )
    SELECT
      p.id,
      'volunteer_opportunity',
      NEW.id,
      'New volunteer opportunity: ' || NEW.title,
      NEW.organization || ' is looking for volunteers in ' || NEW.location || '. This could be your next step. Apply now.',
      '/volunteer',
      'general',
      'normal'
    FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_volunteer_opportunity_created ON public.volunteer_opportunities;
CREATE TRIGGER on_volunteer_opportunity_created
  AFTER INSERT ON public.volunteer_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_volunteer_opportunity();


-- =====================================================
-- ITEM 10: RESOURCE VIEW SMART CONNECTION
-- When a user views a resource, surface a related action
-- =====================================================
CREATE OR REPLACE FUNCTION notify_resource_view_connection()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := NEW.user_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  -- Only fire once per resource per user (dedup by source_id + user_id)
  IF EXISTS (
    SELECT 1 FROM public.user_notifications
    WHERE user_id = v_user_id AND source_id::text = NEW.resource_id AND source_type = 'system'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (
    user_id, source_type, source_id, title, message, link, category, priority, metadata
  ) VALUES (
    v_user_id,
    'system',
    NULL,
    'Keep exploring civic knowledge',
    CASE NEW.resource_type
      WHEN 'document'   THEN 'Nice, you just read a civic document. Did you know you can sign petitions directly from the Bills tracker?'
      WHEN 'blog_post'  THEN 'Great read! There are more articles on bills affecting Kenyans right now. Check the tracker.'
      WHEN 'resource'   THEN 'You are doing the research. Ready to take action? A campaign might need your support today.'
      ELSE 'Keep exploring. Every article makes you a more informed citizen.'
    END,
    CASE NEW.resource_type
      WHEN 'document'  THEN '/legislative-tracker'
      WHEN 'blog_post' THEN '/legislative-tracker'
      ELSE '/campaigns'
    END,
    'general',
    'low',
    jsonb_build_object('resource_id', NEW.resource_id, 'resource_type', NEW.resource_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_resource_viewed ON public.resource_views;
CREATE TRIGGER on_resource_viewed
  AFTER INSERT ON public.resource_views
  FOR EACH ROW
  EXECUTE FUNCTION notify_resource_view_connection();


-- =====================================================
-- ITEM 8: CONSTITUTION ARTICLE READING STATS + MILESTONE
-- Tracks reads per user per period and notifies on milestones
-- =====================================================
CREATE TABLE IF NOT EXISTS public.constitution_article_reads (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_id   uuid NOT NULL REFERENCES public.constitution_articles(id) ON DELETE CASCADE,
  read_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT constitution_article_reads_pkey PRIMARY KEY (id),
  CONSTRAINT constitution_article_reads_user_article_key UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_constitution_reads_user ON public.constitution_article_reads (user_id);
CREATE INDEX IF NOT EXISTS idx_constitution_reads_read_at ON public.constitution_article_reads (read_at DESC);

ALTER TABLE public.constitution_article_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reads" ON public.constitution_article_reads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reads" ON public.constitution_article_reads FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION notify_constitution_reading_milestone()
RETURNS TRIGGER AS $$
DECLARE
  v_read_count_week  int;
  v_read_count_total int;
  v_total_readers    int;
  v_user_rank_pct    numeric;
  v_user_name        text;
BEGIN
  -- Count how many articles this user read this week
  SELECT COUNT(*) INTO v_read_count_week
  FROM public.constitution_article_reads
  WHERE user_id = NEW.user_id
    AND read_at >= now() - interval '7 days';

  -- Count total unique articles read by user
  SELECT COUNT(*) INTO v_read_count_total
  FROM public.constitution_article_reads
  WHERE user_id = NEW.user_id;

  -- Award points for each new article read (5 pts per unique article)
  PERFORM public.add_user_points(NEW.user_id, 5, 'education', 'Read a constitutional article');

  -- Milestone notifications at 5, 10, 25, 50, 100 articles total
  IF v_read_count_total IN (5, 10, 25, 50, 100) THEN
    SELECT COALESCE(full_name, 'Reader') INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

    -- Calculate percentile: how many users read fewer articles
    SELECT COUNT(*) INTO v_total_readers FROM (
      SELECT user_id FROM public.constitution_article_reads GROUP BY user_id
    ) r;

    SELECT ROUND((1 - (
      SELECT COUNT(*) FROM (
        SELECT user_id, COUNT(*) as cnt
        FROM public.constitution_article_reads GROUP BY user_id
      ) ranked WHERE cnt >= v_read_count_total
    )::numeric / NULLIF(v_total_readers, 0) * 100), 0) INTO v_user_rank_pct;

    INSERT INTO public.user_notifications (
      user_id, source_type, source_id, title, message, link, category, priority
    ) VALUES (
      NEW.user_id,
      'system',
      NEW.article_id,
      v_user_name || ', you are in the top ' || COALESCE(v_user_rank_pct::text, '?') || '% of constitutional readers!',
      'You have read ' || v_read_count_total || ' constitutional articles. That puts you ahead of most CEKA users this week. Keep reading to get into the top ' ||
        CASE
          WHEN v_user_rank_pct > 30 THEN '30%'
          WHEN v_user_rank_pct > 20 THEN '20%'
          WHEN v_user_rank_pct > 10 THEN '10%'
          ELSE '5%'
        END || '.',
      '/constitution',
      'milestone',
      'high'
    );

    -- Award Constitutional Scholar badge at 50+ articles
    IF v_read_count_total >= 50 THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      SELECT NEW.user_id, id FROM public.civic_badges
      WHERE name = 'Constitutional Scholar' AND is_active = true
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_constitution_article_read ON public.constitution_article_reads;
CREATE TRIGGER on_constitution_article_read
  AFTER INSERT ON public.constitution_article_reads
  FOR EACH ROW
  EXECUTE FUNCTION notify_constitution_reading_milestone();


-- =====================================================
-- ITEM 9: CREDIT LEDGER NOTIFICATION
-- When a credit is awarded, notify the user
-- =====================================================
CREATE OR REPLACE FUNCTION notify_credit_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name text;
BEGIN
  SELECT COALESCE(full_name, 'there') INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

  IF NEW.amount > 0 THEN
    INSERT INTO public.user_notifications (
      user_id, source_type, source_id, title, message, link, category, priority
    ) VALUES (
      NEW.user_id,
      'system',
      NEW.id,
      'You just earned ' || NEW.amount || ' civic credits',
      'Nice work, ' || v_user_name || '! Your ' || NEW.action_type || ' earned you ' || NEW.amount || ' civic credits. Keep going to unlock perks and rewards.',
      '/account',
      'milestone',
      'normal'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wire to credit_ledger (replaces the placeholder notify_credit_change from platform_hardening)
DROP TRIGGER IF EXISTS on_credit_ledger_change ON public.credit_ledger;
CREATE TRIGGER on_credit_ledger_change
  AFTER INSERT ON public.credit_ledger
  FOR EACH ROW
  EXECUTE FUNCTION notify_credit_change();
