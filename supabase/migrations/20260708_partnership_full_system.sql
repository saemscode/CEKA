-- ══════════════════════════════════════════════════════════════════
-- CEKA Partnership System — Full Production Migration
-- Covers: schema fixes, audit trail, proposals, analytics, RLS hardening
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Fix partners table schema inconsistency
--    (PartnerManager uses signed_agreement_url, migration used agreement_pdf_url)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS signed_agreement_url TEXT,
  ADD COLUMN IF NOT EXISTS org_logo_url         TEXT,
  ADD COLUMN IF NOT EXISTS org_bio              TEXT,
  ADD COLUMN IF NOT EXISTS access_level         TEXT NOT NULL DEFAULT 'sponsor'
    CHECK (access_level IN ('sponsor', 'reviewer', 'co_author')),
  ADD COLUMN IF NOT EXISTS revoked_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tos_version          TEXT;

-- Backfill signed_agreement_url from agreement_pdf_url if it exists
UPDATE public.partners
  SET signed_agreement_url = agreement_pdf_url
  WHERE signed_agreement_url IS NULL AND agreement_pdf_url IS NOT NULL;

-- Fix tier check to match PartnerManager ('silver','gold','platinum')
ALTER TABLE public.partners
  DROP CONSTRAINT IF EXISTS partners_tier_check;
ALTER TABLE public.partners
  ADD CONSTRAINT partners_tier_check
    CHECK (tier IN ('free','silver','gold','platinum'));

-- ─────────────────────────────────────────────────────────────────
-- 2. Agreements / Legal Audit Log
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_agreements_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  tos_version   TEXT NOT NULL,
  agreed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address    TEXT,
  document_hash TEXT  -- SHA-256 hash of the legal doc version
);

CREATE INDEX IF NOT EXISTS idx_agreements_log_partner ON public.partner_agreements_log(partner_id);
CREATE INDEX IF NOT EXISTS idx_agreements_log_user    ON public.partner_agreements_log(user_id);

ALTER TABLE public.partner_agreements_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view agreements log"    ON public.partner_agreements_log;
DROP POLICY IF EXISTS "Partners view own agreements"  ON public.partner_agreements_log;

CREATE POLICY "Admins view agreements log" ON public.partner_agreements_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND email = 'civiceducationkenya@gmail.com')
  );

CREATE POLICY "Partners view own agreements" ON public.partner_agreements_log
  FOR SELECT USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────
-- 3. Native Collaboration Proposals Table
--    (replaces WhatsApp hook for in-app proposal routing)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.collaboration_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  media_item_id   UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  campaign_id     UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  proposed_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  proposal_text   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'converted', 'rejected', 'archived')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  -- Which invite was created from this proposal (nullable until converted)
  resulting_invite_id UUID REFERENCES public.collaboration_invites(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_proposals_partner   ON public.collaboration_proposals(partner_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status    ON public.collaboration_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_media     ON public.collaboration_proposals(media_item_id);

ALTER TABLE public.collaboration_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage proposals"      ON public.collaboration_proposals;
DROP POLICY IF EXISTS "Partners view own proposals"  ON public.collaboration_proposals;
DROP POLICY IF EXISTS "Partners create proposals"    ON public.collaboration_proposals;

CREATE POLICY "Admins manage proposals" ON public.collaboration_proposals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND email = 'civiceducationkenya@gmail.com')
  );

CREATE POLICY "Partners view own proposals" ON public.collaboration_proposals
  FOR SELECT USING (proposed_by = auth.uid());

CREATE POLICY "Partners create proposals" ON public.collaboration_proposals
  FOR INSERT WITH CHECK (
    proposed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ally'
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- 4. Add access_level + soft-delete to campaign_collaborations
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.campaign_collaborations
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'sponsor'
    CHECK (access_level IN ('sponsor', 'reviewer', 'co_author')),
  ADD COLUMN IF NOT EXISTS revoked_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partner_id   UUID REFERENCES public.partners(id) ON DELETE SET NULL;

-- Index for partner-based lookups
CREATE INDEX IF NOT EXISTS idx_campaign_collabs_partner
  ON public.campaign_collaborations(partner_id);

-- ─────────────────────────────────────────────────────────────────
-- 5. Add partner_id to collaboration_invites (link to formal partner)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.collaboration_invites
  ADD COLUMN IF NOT EXISTS partner_id  UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────
-- 6. Partner Analytics Table
--    Aggregated telemetry per collaboration
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_analytics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  media_item_id         UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  campaign_id           UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  event_type            TEXT NOT NULL
    CHECK (event_type IN ('view','slide_complete','share','download','collab_click')),
  event_count           BIGINT NOT NULL DEFAULT 1,
  recorded_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(partner_id, media_item_id, campaign_id, event_type, recorded_date)
);

CREATE INDEX IF NOT EXISTS idx_partner_analytics_partner ON public.partner_analytics(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_analytics_date    ON public.partner_analytics(recorded_date);

ALTER TABLE public.partner_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage analytics"    ON public.partner_analytics;
DROP POLICY IF EXISTS "Partners view own analytics" ON public.partner_analytics;

CREATE POLICY "Admins manage analytics" ON public.partner_analytics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND email = 'civiceducationkenya@gmail.com')
  );

CREATE POLICY "Partners view own analytics" ON public.partner_analytics
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM public.partners WHERE submitted_by_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- 7. RPC: Upsert analytics event (called from frontend)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.track_partner_event(
  p_partner_id    UUID,
  p_media_item_id UUID DEFAULT NULL,
  p_campaign_id   UUID DEFAULT NULL,
  p_event_type    TEXT DEFAULT 'view'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.partner_analytics
    (partner_id, media_item_id, campaign_id, event_type, event_count, recorded_date)
  VALUES
    (p_partner_id, p_media_item_id, p_campaign_id, p_event_type, 1, CURRENT_DATE)
  ON CONFLICT (partner_id, media_item_id, campaign_id, event_type, recorded_date)
  DO UPDATE SET event_count = partner_analytics.event_count + 1;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- 8. RPC: Get partner dashboard summary
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_partner_dashboard(p_partner_id UUID)
RETURNS TABLE (
  event_type    TEXT,
  total_events  BIGINT,
  last_30_days  BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.event_type,
    SUM(pa.event_count)::BIGINT AS total_events,
    SUM(CASE WHEN pa.recorded_date >= CURRENT_DATE - INTERVAL '30 days'
             THEN pa.event_count ELSE 0 END)::BIGINT AS last_30_days
  FROM public.partner_analytics pa
  WHERE pa.partner_id = p_partner_id
  GROUP BY pa.event_type;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- 9. Trigger: Auto-notify admin when collab_invite is inserted
--    (sets notified_at so Edge Function can pick it up)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.flag_invite_for_notification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Mark as needing notification (Edge Function polls this)
  NEW.notified_at = NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_invite_notification ON public.collaboration_invites;
CREATE TRIGGER trg_flag_invite_notification
  BEFORE INSERT ON public.collaboration_invites
  FOR EACH ROW EXECUTE FUNCTION public.flag_invite_for_notification();

-- ─────────────────────────────────────────────────────────────────
-- 10. Harden RLS on campaign_collaborations
--     Only partners with 'ally' role can be bound;
--     only campaign owners or admins can insert/delete
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Ally insert collaborations"  ON public.campaign_collaborations;
DROP POLICY IF EXISTS "Owner delete collaborations" ON public.campaign_collaborations;
DROP POLICY IF EXISTS "Admin full access collaborations" ON public.campaign_collaborations;

CREATE POLICY "Ally insert collaborations" ON public.campaign_collaborations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ally'
    )
  );

CREATE POLICY "Owner delete collaborations" ON public.campaign_collaborations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.email = 'civiceducationkenya@gmail.com'
    )
  );

CREATE POLICY "Admin full access collaborations" ON public.campaign_collaborations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND email = 'civiceducationkenya@gmail.com'
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- 11. View: Active verified partners with aggregated analytics
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.verified_partners_with_stats AS
SELECT
  p.id,
  p.org_name,
  p.org_email,
  p.org_website,
  p.org_logo_url,
  p.org_bio,
  p.tier,
  p.verification_status,
  p.agreement_signed,
  p.access_level,
  p.created_at,
  COALESCE(SUM(pa.event_count) FILTER (WHERE pa.event_type = 'view'), 0)           AS total_views,
  COALESCE(SUM(pa.event_count) FILTER (WHERE pa.event_type = 'share'), 0)          AS total_shares,
  COALESCE(SUM(pa.event_count) FILTER (WHERE pa.event_type = 'collab_click'), 0)   AS total_collab_clicks
FROM public.partners p
LEFT JOIN public.partner_analytics pa ON pa.partner_id = p.id
WHERE p.verification_status IN ('credible', 'premium')
  AND p.revoked_at IS NULL
GROUP BY p.id;
