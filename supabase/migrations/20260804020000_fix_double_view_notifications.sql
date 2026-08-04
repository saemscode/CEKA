-- =========================================================================
-- CEKA: Fix Double Notifications on Resource Views
-- Migration: 20260804_fix_double_view_notifications.sql
-- =========================================================================
-- PROBLEM: Two triggers fire on every INSERT into resource_views:
--   1. notify_resource_view()            -> "Thanks for reading" (no dedup)
--   2. notify_resource_view_connection() -> "Keep exploring"     (broken dedup)
-- SOLUTION:
--   Drop trigger 1 entirely. Replace trigger 2 with a 24h cooldown per resource+user.
-- =========================================================================

-- 1. Drop the "Thanks for reading" trigger (no dedup = always duplicates)
DROP TRIGGER IF EXISTS notify_resource_view_trigger ON public.resource_views;
DROP TRIGGER IF EXISTS on_resource_view_notification ON public.resource_views;
DROP FUNCTION IF EXISTS public.notify_resource_view() CASCADE;

-- 2. Replace the "Keep exploring" trigger with a properly deduped version
CREATE OR REPLACE FUNCTION public.notify_resource_view_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_user_id uuid;
  v_resource_type text;
BEGIN
  v_user_id := NEW.user_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  v_resource_type := NEW.resource_type;

  -- Dedup: one nudge per (user_id, resource_id) per 24 hours
  IF EXISTS (
    SELECT 1
    FROM public.user_notifications
    WHERE
      user_id = v_user_id
      AND source_type = 'system'
      AND metadata->>'resource_id' = NEW.resource_id
      AND created_at > now() - interval '24 hours'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (
    user_id, source_type, source_id, title, message, link, category, priority, metadata
  ) VALUES (
    v_user_id, 'system', NULL, 'Keep exploring civic knowledge',
    CASE v_resource_type
      WHEN 'document'   THEN 'Nice, you just read a civic document. Did you know you can sign petitions directly from the Bills tracker?'
      WHEN 'blog_post'  THEN 'Great read! There are more articles on bills affecting Kenyans right now. Check the tracker.'
      WHEN 'resource'   THEN 'You are doing the research. Ready to take action? A campaign might need your support today.'
      ELSE 'Keep exploring. Every article makes you a more informed citizen.'
    END,
    CASE v_resource_type
      WHEN 'document'  THEN '/legislative-tracker'
      WHEN 'blog_post' THEN '/legislative-tracker'
      ELSE '/campaigns'
    END,
    'general', 'low',
    jsonb_build_object('resource_id', NEW.resource_id, 'resource_type', v_resource_type)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_resource_view_connection_trigger ON public.resource_views;

CREATE TRIGGER notify_resource_view_connection_trigger
  AFTER INSERT ON public.resource_views
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_resource_view_connection();

-- 3. Clean up past "Thanks for reading" spam
DELETE FROM public.user_notifications
WHERE source_type = 'resource_view' AND title = 'Thanks for reading';

-- 4. Deduplicate older "Keep exploring" backlog (keep newest per resource+user)
DELETE FROM public.user_notifications
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, metadata->>'resource_id'
        ORDER BY created_at DESC
      ) AS rn
    FROM public.user_notifications
    WHERE source_type = 'system' AND metadata ? 'resource_id'
  ) ranked
  WHERE rn > 1
);
