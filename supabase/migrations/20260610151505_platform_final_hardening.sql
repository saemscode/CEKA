-- =====================================================
-- CEKA PLATFORM HARDENING — FINAL LAYER
-- 1. NPS response column on profiles
-- 2. pg_cron 1-day event reminder job
-- 3. add_user_points() safety guard (idempotent)
-- =====================================================

-- ── 1. NPS RESPONSE COLUMN ────────────────────────────────────────────────
-- Stores the user's most recent NPS answer from the signature notification.
-- Values: 'very_likely' | 'maybe' | 'not_likely' | NULL (unanswered)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nps_response      text
    CHECK (nps_response IN ('very_likely','maybe','not_likely')),
  ADD COLUMN IF NOT EXISTS nps_responded_at  timestamptz,
  ADD COLUMN IF NOT EXISTS nps_source        text; -- e.g. 'signature', 'campaign'

-- RPC for frontend to log the NPS tap
CREATE OR REPLACE FUNCTION public.record_nps_response(
  p_user_id uuid,
  p_response text,
  p_source   text DEFAULT 'signature'
) RETURNS void AS $$
BEGIN
  IF p_response NOT IN ('very_likely','maybe','not_likely') THEN
    RAISE EXCEPTION 'Invalid NPS response value: %', p_response;
  END IF;
  UPDATE public.profiles
  SET
    nps_response     = p_response,
    nps_responded_at = now(),
    nps_source       = p_source
  WHERE id = p_user_id;

  -- Mark the notification as read/handled
  UPDATE public.user_notifications
  SET
    is_read   = true,
    metadata  = metadata || jsonb_build_object('nps_answered', true, 'nps_response', p_response)
  WHERE user_id = p_user_id
    AND source_type = 'system'
    AND (metadata->>'nps_type') = 'signature'
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 2. pg_cron: 1-DAY BEFORE EVENT REMINDER ─────────────────────────────
-- Runs every day at 08:00 EAT (UTC+3 = 05:00 UTC).
-- Finds all civic_events where event_date = tomorrow.
-- Sends a reminder to all users who have NOT already received a reminder
-- (checked via notification metadata.reminder_sent = true).

-- Helper function that the cron job calls:
CREATE OR REPLACE FUNCTION public.send_event_day_before_reminders()
RETURNS void AS $$
DECLARE
  v_event RECORD;
BEGIN
  -- Find events happening tomorrow
  FOR v_event IN
    SELECT id, title, event_date, start_time, external_link, category
    FROM public.civic_events
    WHERE event_date = (now() + interval '1 day')::date
  LOOP
    -- Notify all users, skip those who already have a reminder notification for this event
    INSERT INTO public.user_notifications (
      user_id, source_type, source_id, title, message, link, category, priority, metadata
    )
    SELECT
      p.id,
      'system',
      v_event.id,
      'Tomorrow: ' || v_event.title,
      'Reminder: "' || v_event.title || '" is happening tomorrow' ||
        CASE WHEN v_event.start_time IS NOT NULL THEN ' at ' || to_char(v_event.start_time, 'HH24:MI') ELSE '' END ||
        '. Mark your calendar!',
      COALESCE(v_event.external_link, '/'),
      'general',
      'high',
      jsonb_build_object('event_date', v_event.event_date, 'reminder_sent', true, 'reminder_type', '1_day')
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_notifications un
      WHERE un.user_id = p.id
        AND un.source_id = v_event.id
        AND un.metadata @> '{"reminder_type":"1_day"}'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule with pg_cron (runs in Supabase via the pg_cron extension)
-- 05:00 UTC = 08:00 EAT
SELECT cron.schedule(
  'ceka_event_day_before_reminder',
  '0 5 * * *',
  $$SELECT public.send_event_day_before_reminders();$$
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ceka_event_day_before_reminder'
);


-- ── 3. SAFETY GUARD: add_user_points() idempotent upsert ─────────────────
-- If add_user_points() does not exist yet, this creates a stub that is safe
-- to run even before the canonical migration, preventing cascading failures.
CREATE OR REPLACE FUNCTION public.add_user_points(
  p_user_id    uuid,
  p_points     int,
  p_action_type text DEFAULT 'general',
  p_description text DEFAULT ''
) RETURNS int AS $$
DECLARE
  v_total int;
BEGIN
  -- Upsert the aggregate row
  INSERT INTO public.user_points (user_id, total_points, current_level, updated_at)
  VALUES (p_user_id, p_points, 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_points = public.user_points.total_points + EXCLUDED.total_points,
        updated_at   = now();

  -- Write audit record
  INSERT INTO public.points_history (user_id, points, action_type, description)
  VALUES (p_user_id, p_points, p_action_type, p_description);

  -- Update level based on level_config thresholds
  UPDATE public.user_points up
  SET current_level = COALESCE((
    SELECT MAX(lc.level)
    FROM public.level_config lc
    WHERE lc.min_points <= up.total_points
  ), 1)
  WHERE up.user_id = p_user_id;

  SELECT total_points INTO v_total FROM public.user_points WHERE user_id = p_user_id;
  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 4. SAFETY GUARD: award_civic_credits() idempotent stub ───────────────
CREATE OR REPLACE FUNCTION public.award_civic_credits(
  p_user_id    uuid,
  p_amount     int,
  p_action_type text DEFAULT 'general',
  p_description text DEFAULT ''
) RETURNS void AS $$
BEGIN
  INSERT INTO public.credit_ledger (user_id, amount, action_type, description)
  VALUES (p_user_id, p_amount, p_action_type, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
