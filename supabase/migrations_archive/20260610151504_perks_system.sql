-- =====================================================
-- CEKA PERKS CATALOGUE + REDEMPTION SYSTEM
-- Uses ONLY canonical infrastructure:
--   - public.user_points    (aggregate points)
--   - public.points_history (audit log via add_user_points)
--   - public.credit_ledger  (civic credits)
-- =====================================================

-- ── 1. PERKS CATALOGUE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.perks_catalogue (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  description    text NOT NULL,
  category       text NOT NULL DEFAULT 'general',
  cost_points    int  NOT NULL DEFAULT 0,
  cost_credits   int  NOT NULL DEFAULT 0,
  icon_url       text,
  is_active      boolean NOT NULL DEFAULT true,
  stock          int,                     -- NULL = unlimited
  redemption_limit_per_user int DEFAULT 1,
  valid_from     timestamptz DEFAULT now(),
  valid_until    timestamptz,
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perks_catalogue_pkey PRIMARY KEY (id),
  CONSTRAINT perks_catalogue_name_key UNIQUE (name),
  CONSTRAINT perks_cost_check CHECK (cost_points >= 0 AND cost_credits >= 0)
);

ALTER TABLE public.perks_catalogue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active perks" ON public.perks_catalogue
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage perks" ON public.perks_catalogue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
  );

-- ── 2. PERK REDEMPTIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.perk_redemptions (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  perk_id        uuid NOT NULL REFERENCES public.perks_catalogue(id) ON DELETE CASCADE,
  redeemed_at    timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','fulfilled','cancelled')),
  points_spent   int NOT NULL DEFAULT 0,
  credits_spent  int NOT NULL DEFAULT 0,
  notes          text,
  CONSTRAINT perk_redemptions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_perk_redemptions_user ON public.perk_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_perk ON public.perk_redemptions(perk_id);

ALTER TABLE public.perk_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own redemptions" ON public.perk_redemptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own redemptions" ON public.perk_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all redemptions" ON public.perk_redemptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
  );

-- ── 3. REDEEM_PERK() RPC ──────────────────────────────────────────────────
-- Validates balance, deducts points/credits, inserts redemption row.
-- Returns: { success: bool, reason: text, redemption_id: uuid }
CREATE OR REPLACE FUNCTION public.redeem_perk(
  p_user_id uuid,
  p_perk_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_perk         public.perks_catalogue%ROWTYPE;
  v_points       int;
  v_credits      int;
  v_redeemed     int;
  v_redemption_id uuid;
BEGIN
  -- 1. Fetch perk
  SELECT * INTO v_perk FROM public.perks_catalogue WHERE id = p_perk_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Perk not found or inactive');
  END IF;

  -- 2. Check validity window
  IF v_perk.valid_until IS NOT NULL AND now() > v_perk.valid_until THEN
    RETURN jsonb_build_object('success', false, 'reason', 'This perk has expired');
  END IF;

  -- 3. Check per-user redemption limit
  SELECT COUNT(*) INTO v_redeemed
  FROM public.perk_redemptions
  WHERE user_id = p_user_id AND perk_id = p_perk_id AND status != 'cancelled';
  IF v_perk.redemption_limit_per_user IS NOT NULL AND v_redeemed >= v_perk.redemption_limit_per_user THEN
    RETURN jsonb_build_object('success', false, 'reason', 'You have already redeemed this perk the maximum number of times');
  END IF;

  -- 4. Check stock
  IF v_perk.stock IS NOT NULL THEN
    SELECT COUNT(*) INTO v_redeemed FROM public.perk_redemptions
    WHERE perk_id = p_perk_id AND status != 'cancelled';
    IF v_redeemed >= v_perk.stock THEN
      RETURN jsonb_build_object('success', false, 'reason', 'This perk is out of stock');
    END IF;
  END IF;

  -- 5. Check point balance
  SELECT COALESCE(total_points, 0) INTO v_points FROM public.user_points WHERE user_id = p_user_id;
  IF v_perk.cost_points > 0 AND v_points < v_perk.cost_points THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Insufficient civic points. Need ' || v_perk.cost_points || ', have ' || v_points);
  END IF;

  -- 6. Check credit balance
  IF v_perk.cost_credits > 0 THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_credits FROM public.credit_ledger WHERE user_id = p_user_id;
    IF v_credits < v_perk.cost_credits THEN
      RETURN jsonb_build_object('success', false, 'reason', 'Insufficient civic credits. Need ' || v_perk.cost_credits || ', have ' || v_credits);
    END IF;
  END IF;

  -- 7. Deduct points: insert a NEGATIVE points_history row via the raw audit table
  IF v_perk.cost_points > 0 THEN
    INSERT INTO public.points_history (user_id, points, action_type, description)
    VALUES (p_user_id, -v_perk.cost_points, 'redemption', 'Redeemed perk: ' || v_perk.name);
    UPDATE public.user_points
    SET total_points = total_points - v_perk.cost_points,
        updated_at   = now()
    WHERE user_id = p_user_id;
  END IF;

  -- 8. Deduct credits
  IF v_perk.cost_credits > 0 THEN
    INSERT INTO public.credit_ledger (user_id, amount, action_type, description)
    VALUES (p_user_id, -v_perk.cost_credits, 'redemption', 'Redeemed perk: ' || v_perk.name);
  END IF;

  -- 9. Insert redemption record
  INSERT INTO public.perk_redemptions (user_id, perk_id, points_spent, credits_spent)
  VALUES (p_user_id, p_perk_id, v_perk.cost_points, v_perk.cost_credits)
  RETURNING id INTO v_redemption_id;

  -- 10. Notify user
  INSERT INTO public.user_notifications (user_id, source_type, source_id, title, message, link, category, priority)
  VALUES (
    p_user_id, 'system', v_redemption_id,
    'Perk redeemed: ' || v_perk.name,
    'You have successfully redeemed "' || v_perk.name || '". ' || v_perk.description || '. Your account has been updated.',
    '/account',
    'milestone',
    'high'
  );

  RETURN jsonb_build_object('success', true, 'redemption_id', v_redemption_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. SEED: INITIAL PERKS CATALOGUE ─────────────────────────────────────
INSERT INTO public.perks_catalogue (name, description, category, cost_points, cost_credits, is_active) VALUES
  ('Featured Profile',      'Your profile is featured on the CEKA home page for 7 days',             'visibility',  500,  0,   true),
  ('Priority Review',       'Your resource submission is reviewed within 24 hours',                  'productivity', 300,  0,   true),
  ('CEKA Verified Badge',   'Display a verified civic contributor badge on your profile',            'recognition', 1000, 0,   true),
  ('AI Civic Briefing',     'Receive a personalized AI-generated weekly civic summary via email',    'intelligence', 0,    100, true),
  ('Campaign Boost',        'Your active campaign is pinned to the top of /campaigns for 48 hours', 'visibility',  750,  0,   true),
  ('Extended AI Access',    'Unlock 50 bonus CEKA AI queries per month for 30 days',                'intelligence', 0,    200, true),
  ('Constitution Deep Dive','Access detailed AI analysis for any 3 constitution articles of choice', 'education',   250,  0,   true),
  ('Custom County Alert',   'Get real-time alerts for any bill tagged with your selected county',    'legislative', 200,  0,   true)
ON CONFLICT (name) DO NOTHING;
