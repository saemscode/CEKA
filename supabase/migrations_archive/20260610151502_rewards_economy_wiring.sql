-- =====================================================
-- CEKA REWARDS ECONOMY WIRING
-- Uses ONLY the canonical infrastructure:
--   - public.user_points        (aggregate table)
--   - public.points_history     (audit log)
--   - public.add_user_points()  (single safe RPC to award)
--   - public.civic_badges       (badge definitions registry)
--   - public.user_badges        (user <> badge join, badge_id FK)
--   - public.level_config       (level thresholds + titles)
--   - public.leaderboard        (derived view)
--   - public.credit_ledger      (civic credits : award_civic_credits())
-- =====================================================

-- =====================================================
-- 1. AUTOMATED POINTS VIA CANONICAL add_user_points()
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_civic_rewards()
RETURNS TRIGGER AS $$
BEGIN
  -- Bill Follows: +10 pts (legislative)
  IF TG_TABLE_NAME = 'bill_follows' AND TG_OP = 'INSERT' THEN
    PERFORM public.add_user_points(
      NEW.user_id, 10, 'legislative', 'Followed a Bill'
    );
    PERFORM award_civic_credits(
      NEW.user_id, 10, 'bill_follow', 'Credits for following a Bill'
    );

  -- Campaign Participation: +25 pts (contribution)
  ELSIF TG_TABLE_NAME = 'campaign_participants' AND TG_OP = 'INSERT' THEN
    PERFORM public.add_user_points(
      NEW.user_id, 25, 'contribution', 'Joined a Campaign'
    );
    PERFORM award_civic_credits(
      NEW.user_id, 25, 'campaign_join', 'Credits for joining a Campaign'
    );

  -- Approved Campaign Proposal: +100 pts (bonus)
  ELSIF TG_TABLE_NAME = 'campaign_proposals' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
      PERFORM public.add_user_points(
        NEW.user_id, 100, 'bonus', 'Campaign Proposal Approved'
      );
      PERFORM award_civic_credits(
        NEW.user_id, 100, 'proposal_approved', 'Credits for Approved Proposal'
      );
    END IF;

  -- Volunteer Application Approved: +150 pts (service)
  ELSIF TG_TABLE_NAME = 'volunteer_applications' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
      PERFORM public.add_user_points(
        NEW.user_id, 150, 'service', 'Volunteer Application Approved'
      );
      PERFORM award_civic_credits(
        NEW.user_id, 150, 'volunteer_approved', 'Credits for Approved Volunteer Role'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wire triggers
DROP TRIGGER IF EXISTS tr_reward_bill_follow ON bill_follows;
CREATE TRIGGER tr_reward_bill_follow
  AFTER INSERT ON bill_follows
  FOR EACH ROW EXECUTE FUNCTION trigger_civic_rewards();

DROP TRIGGER IF EXISTS tr_reward_campaign_join ON campaign_participants;
CREATE TRIGGER tr_reward_campaign_join
  AFTER INSERT ON campaign_participants
  FOR EACH ROW EXECUTE FUNCTION trigger_civic_rewards();

DROP TRIGGER IF EXISTS tr_reward_proposal_approved ON campaign_proposals;
CREATE TRIGGER tr_reward_proposal_approved
  AFTER UPDATE ON campaign_proposals
  FOR EACH ROW EXECUTE FUNCTION trigger_civic_rewards();

DROP TRIGGER IF EXISTS tr_reward_volunteer_approved ON volunteer_applications;
CREATE TRIGGER tr_reward_volunteer_approved
  AFTER UPDATE ON volunteer_applications
  FOR EACH ROW EXECUTE FUNCTION trigger_civic_rewards();


-- =====================================================
-- 2. AUTOMATED BADGE AWARDING
-- Uses badge_id FK from civic_badges registry.
-- Awarding is INSERT-safe via ON CONFLICT DO NOTHING.
-- =====================================================

CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_total   int;
  v_count   int;
  v_badge   uuid;
BEGIN
  -- Get canonical total from user_points (the aggregate table)
  SELECT total_points INTO v_total FROM public.user_points WHERE user_id = NEW.user_id;
  v_total := COALESCE(v_total, 0);

  -- Badge: "Civic Starter" — first 50 points
  SELECT id INTO v_badge FROM public.civic_badges WHERE name = 'Civic Starter' AND is_active = true;
  IF v_badge IS NOT NULL AND v_total >= 50 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (NEW.user_id, v_badge)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Badge: "Policy Watcher" — followed 5+ bills
  SELECT count(*) INTO v_count FROM public.bill_follows WHERE user_id = NEW.user_id;
  SELECT id INTO v_badge FROM public.civic_badges WHERE name = 'Policy Watcher' AND is_active = true;
  IF v_badge IS NOT NULL AND v_count >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (NEW.user_id, v_badge)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Badge: "Community Pillar" — 5+ resource contributions
  SELECT count(*) INTO v_count FROM public.user_contributions WHERE user_id = NEW.user_id AND status = 'approved';
  SELECT id INTO v_badge FROM public.civic_badges WHERE name = 'Community Pillar' AND is_active = true;
  IF v_badge IS NOT NULL AND v_count >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (NEW.user_id, v_badge)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Badge: "Vanguard" — 500+ total points
  SELECT id INTO v_badge FROM public.civic_badges WHERE name = 'Vanguard' AND is_active = true;
  IF v_badge IS NOT NULL AND v_total >= 500 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (NEW.user_id, v_badge)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Badge: "Constitutional Scholar" — from civic_badges criteria_type 'quiz'
  -- Awarded separately when quiz results fire; included here for completeness.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wire badge check trigger to points_history (fires every time points are added)
DROP TRIGGER IF EXISTS tr_badge_check ON public.points_history;
CREATE TRIGGER tr_badge_check
  AFTER INSERT ON public.points_history
  FOR EACH ROW EXECUTE FUNCTION check_and_award_badges();


-- =====================================================
-- 3. SEED: level_config (if not already seeded)
-- =====================================================
INSERT INTO public.level_config (level, min_points, title) VALUES
  (1,    0,    'Civic Newcomer'),
  (2,    50,   'Civic Starter'),
  (3,    150,  'Policy Watcher'),
  (4,    350,  'Active Citizen'),
  (5,    700,  'Community Pillar'),
  (6,    1200, 'Civic Champion'),
  (7,    2000, 'Vanguard'),
  (8,    3500, 'Democracy Guardian'),
  (9,    6000, 'Constitution Scholar'),
  (10,   10000,'Civic Legend')
ON CONFLICT (level) DO NOTHING;


-- =====================================================
-- 4. SEED: civic_badges registry (if not already seeded)
-- Seeds the badges referenced by check_and_award_badges()
-- =====================================================
INSERT INTO public.civic_badges (name, description, criteria_type, criteria_value, category, trigger_type, trigger_value, is_active) VALUES
  ('Civic Starter',        'Earned your first 50 civic points',           'points',       50,  'engagement',   'points',       50,   true),
  ('Policy Watcher',       'Followed 5 or more bills',                    'contribution', 5,   'legislative',  'bill_follows', 5,    true),
  ('Vanguard',             'Accumulated 500+ civic points',               'points',       500, 'leadership',   'points',       500,  true),
  ('Community Pillar',     'Contributed 5 verified resources',            'contribution', 5,   'community',    'contributions',5,    true),
  ('Constitutional Scholar','Completed the Bill of Rights quiz perfectly', 'quiz',         100, 'education',    'quiz_score',   100,  true),
  ('Active Citizen',       'Participated in 3 live town hall sessions',   'attendance',   3,   'events',       'attendance',   3,    true)
ON CONFLICT (name) DO NOTHING;
