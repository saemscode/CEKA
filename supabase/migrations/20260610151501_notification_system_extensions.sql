-- =====================================================
-- 1. NOTIFICATION PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_category_key UNIQUE (user_id, category),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT notification_preferences_category_check CHECK (
    category = ANY (ARRAY[
      'follow_confirmation', 'new_bill', 'bill_status_change', 
      'volunteer_application', 'campaign_update', 'system'
    ])
  )
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences (user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_notification_preferences
BEFORE UPDATE ON notification_preferences
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Helper function: checks if user wants a notification category (default true)
CREATE OR REPLACE FUNCTION user_wants_notification(p_user_id uuid, p_category text)
RETURNS boolean AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT enabled INTO v_enabled
  FROM notification_preferences
  WHERE user_id = p_user_id AND category = p_category;
  RETURN COALESCE(v_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own preferences" ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 2. VOLUNTEER APPLICATION STATUS NOTIFICATIONS
-- =====================================================
CREATE OR REPLACE FUNCTION notify_volunteer_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_title text;
  v_message text;
  v_priority text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  
  IF NOT user_wants_notification(NEW.user_id, 'volunteer_application') THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'under_review' THEN
      v_title := 'Your application is under review';
      v_message := 'We have received your volunteer application and it is currently being reviewed by our team. We will update you shortly.';
      v_priority := 'normal';
    WHEN 'approved' THEN
      v_title := 'Your volunteer application was approved';
      v_message := 'Congratulations! Your application has been approved. Welcome to the CEKA volunteer team.';
      v_priority := 'high';
    WHEN 'rejected' THEN
      v_title := 'Update on your volunteer application';
      v_message := 'Thank you for applying. After review, we are unable to move forward with your application at this time. We encourage you to apply again in the future.';
      v_priority := 'normal';
    ELSE RETURN NEW;
  END CASE;

  INSERT INTO user_notifications (user_id, source_type, source_id, title, message, link, category, priority)
  VALUES (NEW.user_id, 'volunteer_application', NEW.id, v_title, v_message, '/account/volunteer', 'general', v_priority);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_volunteer_status_change ON volunteer_applications;
CREATE TRIGGER on_volunteer_status_change
  AFTER UPDATE OF status ON volunteer_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_volunteer_status_change();

-- =====================================================
-- 3. BILL FOLLOW CONFIRMATION
-- =====================================================
CREATE OR REPLACE FUNCTION notify_bill_followed()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT user_wants_notification(NEW.user_id, 'follow_confirmation') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_notifications
    WHERE user_id = NEW.user_id
      AND source_type = 'bill_update'
      AND source_id = NEW.bill_id
      AND category = 'follow_confirmation'
  ) THEN
    INSERT INTO user_notifications (user_id, source_type, source_id, title, message, link, category, priority)
    SELECT
      NEW.user_id,
      'bill_update',
      NEW.bill_id,
      'You are now following a Bill',
      'You are now following "' || b.title || '". We will keep you updated as it progresses.',
      CASE WHEN b.slug IS NOT NULL THEN '/bill/' || b.slug ELSE '/bill/' || NEW.bill_id::text END,
      'follow_confirmation',
      'normal'
    FROM bills b WHERE b.id = NEW.bill_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bill_follow ON bill_follows;
CREATE TRIGGER on_bill_follow
  AFTER INSERT ON bill_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_bill_followed();

-- =====================================================
-- 4. NEW BILL DROPPED NOTIFICATION
-- =====================================================
CREATE OR REPLACE FUNCTION notify_new_bill_dropped()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_notifications (user_id, source_type, source_id, title, message, link, category, priority, metadata)
    SELECT
      p.id,
      'bill_update',
      NEW.id,
      'New Bill dropped today',
      '"' || NEW.title || '" has just been added to CEKA. Read the summary and follow it to stay updated.',
      CASE WHEN NEW.slug IS NOT NULL THEN '/bill/' || NEW.slug ELSE '/bill/' || NEW.id::text END,
      'new_bill',
      'normal',
      jsonb_build_object('bill_id', NEW.id, 'bill_no', NEW.bill_no, 'pdf_url', NEW.pdf_url, 'category', NEW.category)
    FROM profiles p
    WHERE user_wants_notification(p.id, 'new_bill') = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_bill_dropped ON bills;
CREATE TRIGGER on_new_bill_dropped
  AFTER INSERT ON bills
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_bill_dropped();

-- =====================================================
-- 5. BILL STATUS CHANGE NOTIFICATION
-- =====================================================
CREATE OR REPLACE FUNCTION notify_followers_bill_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO user_notifications (user_id, source_type, source_id, title, message, link, category, priority)
    SELECT
      f.user_id,
      'bill_update',
      NEW.id,
      'Bill status changed: ' || NEW.title,
      'The bill "' || NEW.title || '" has moved from ' || OLD.status || ' to ' || NEW.status || '.',
      CASE WHEN NEW.slug IS NOT NULL THEN '/bill/' || NEW.slug ELSE '/bill/' || NEW.id::text END,
      'bill_status_change',
      'high'
    FROM bill_follows f
    WHERE f.bill_id = NEW.id
      AND user_wants_notification(f.user_id, 'bill_status_change') = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bill_status_change_notify ON bills;
CREATE TRIGGER on_bill_status_change_notify
  AFTER UPDATE OF status ON bills
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_bill_status_change();
