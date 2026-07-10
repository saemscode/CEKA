-- ============================================================
-- CEKA Bill Pipeline Enhancement Migration
-- 20260601000000_bill_enhancements.sql
-- ============================================================

-- 1. Extend bills table with new intelligence columns
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS ai_concerns      JSONB    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tabloid_summary  TEXT;

-- 2. Add FCM token storage to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- 3. User responses to bills
CREATE TABLE IF NOT EXISTS public.bill_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response    TEXT NOT NULL CHECK (char_length(response) > 0 AND char_length(response) <= 5000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for bill_responses
ALTER TABLE public.bill_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all bill responses"
  ON public.bill_responses FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own bill responses"
  ON public.bill_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bill responses"
  ON public.bill_responses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bill responses"
  ON public.bill_responses FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Pre-made social share templates per bill
CREATE TABLE IF NOT EXISTS public.social_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('twitter', 'whatsapp', 'instagram', 'general')),
  template    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for social_templates — public read
ALTER TABLE public.social_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active social templates"
  ON public.social_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage social templates"
  ON public.social_templates FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bill_responses_bill_id ON public.bill_responses(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_responses_user_id ON public.bill_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_social_templates_bill_id ON public.social_templates(bill_id);
CREATE INDEX IF NOT EXISTS idx_bills_analysis_status ON public.bills(analysis_status);

-- 6. Enable realtime for bill_responses so chat bridge works
ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_responses;
