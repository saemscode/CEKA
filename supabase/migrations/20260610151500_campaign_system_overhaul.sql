-- =====================================================
-- 1. Add user_id to campaigns (required for ownership)
-- =====================================================
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);

-- =====================================================
-- 2. Add slug column to campaigns (unique, indexed)
-- =====================================================
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS slug text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);

-- Slug generation function (handles duplicates)
CREATE OR REPLACE FUNCTION generate_campaign_slug(title text, current_id uuid DEFAULT NULL)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 1;
BEGIN
  base_slug := regexp_replace(lower(trim(title)), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF length(base_slug) = 0 THEN
    base_slug := 'campaign';
  END IF;
  final_slug := base_slug;
  LOOP
    IF current_id IS NULL THEN
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.campaigns WHERE slug = final_slug);
    ELSE
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.campaigns WHERE slug = final_slug AND id != current_id);
    END IF;
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set slug
CREATE OR REPLACE FUNCTION set_campaign_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title) THEN
    NEW.slug := generate_campaign_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_campaign_slug ON public.campaigns;
CREATE TRIGGER trigger_set_campaign_slug
  BEFORE INSERT OR UPDATE OF title ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION set_campaign_slug();

-- Backfill slugs for existing campaigns
UPDATE public.campaigns SET slug = generate_campaign_slug(title, id) WHERE slug IS NULL;

-- =====================================================
-- 3. Collaboration tables
-- =====================================================
CREATE TABLE IF NOT EXISTS public.campaign_collaborations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    collaborator_campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'removed')),
    shared_title text,
    shared_description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    UNIQUE(campaign_id, collaborator_campaign_id)
);

CREATE TABLE IF NOT EXISTS public.collaboration_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    to_campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    invited_at timestamptz NOT NULL DEFAULT now(),
    responded_at timestamptz,
    UNIQUE(from_campaign_id, to_campaign_id)
);

-- =====================================================
-- 4. Media linking (with existing media_items from Pieces page)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.campaign_media (
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    media_item_id uuid NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    display_order int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (campaign_id, media_item_id)
);

-- =====================================================
-- 5. Add invited_campaign_id to campaign_proposals (for collab during approval)
-- =====================================================
ALTER TABLE public.campaign_proposals ADD COLUMN IF NOT EXISTS invited_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_proposals_invited ON public.campaign_proposals(invited_campaign_id);

-- =====================================================
-- 6. Trigger: when admin approves a proposal, create campaign + invite
-- =====================================================
CREATE OR REPLACE FUNCTION create_campaign_from_approved_proposal()
RETURNS TRIGGER AS $$
DECLARE
  new_campaign_id uuid;
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS DISTINCT FROM 'APPROVED') THEN
    -- Insert into campaigns
    INSERT INTO public.campaigns (
      title, description, organizer, user_id, type, content,
      target_amount, raised_amount, location, status, is_boosted,
      created_at, updated_at
    ) VALUES (
      NEW.title, NEW.goal, (SELECT email FROM auth.users WHERE id = NEW.user_id), NEW.user_id, NEW.type,
      NEW.content, NEW.target_amount, 0, NEW.location, 'active', NEW.is_boosted,
      now(), now()
    ) RETURNING id INTO new_campaign_id;

    -- If there's an invited campaign, create an invite
    IF NEW.invited_campaign_id IS NOT NULL THEN
      INSERT INTO public.collaboration_invites (from_campaign_id, to_campaign_id, status)
      VALUES (new_campaign_id, NEW.invited_campaign_id, 'pending');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_approve_proposal ON public.campaign_proposals;
CREATE TRIGGER trigger_approve_proposal
  AFTER UPDATE ON public.campaign_proposals
  FOR EACH ROW
  EXECUTE FUNCTION create_campaign_from_approved_proposal();

-- =====================================================
-- 7. RLS Policies
-- =====================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert their own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public view collaborations" ON public.campaign_collaborations FOR SELECT USING (true);
CREATE POLICY "Public view invites" ON public.collaboration_invites FOR SELECT USING (true);
