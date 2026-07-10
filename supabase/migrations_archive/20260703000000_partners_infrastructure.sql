-- ══════════════════════════════════════════════════════════════════
-- CEKA Partners Infrastructure SQL Migration
-- ══════════════════════════════════════════════════════════════════

-- Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_name             TEXT NOT NULL,
  org_email            TEXT NOT NULL UNIQUE,
  org_website          TEXT,
  logo_url             TEXT,
  tier                 TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  verification_status  TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'credible', 'premium', 'rejected', 'archived')),
  agreement_signed     BOOLEAN NOT NULL DEFAULT false,
  agreement_pdf_url    TEXT,
  submitted_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Index for fast user retrieval
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners (submitted_by_user_id);

-- Index for verification status querying
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners (verification_status);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_partners_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partners_update ON public.partners;
CREATE TRIGGER trg_partners_update
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.handle_partners_update();

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view verified partners" ON public.partners;
DROP POLICY IF EXISTS "Users can submit partner applications" ON public.partners;
DROP POLICY IF EXISTS "Users can view their own partner applications" ON public.partners;
DROP POLICY IF EXISTS "Admins have full access to partners" ON public.partners;

-- 1. Anyone can read verified (credible or premium) partners
CREATE POLICY "Anyone can view verified partners" ON public.partners
  FOR SELECT USING (verification_status IN ('credible', 'premium'));

-- 2. Authenticated users can insert their own application
CREATE POLICY "Users can submit partner applications" ON public.partners
  FOR INSERT WITH CHECK (auth.uid() = submitted_by_user_id);

-- 3. Users can view their own submitted applications
CREATE POLICY "Users can view their own partner applications" ON public.partners
  FOR SELECT USING (auth.uid() = submitted_by_user_id);

-- 4. Admins have full access
CREATE POLICY "Admins have full access to partners" ON public.partners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND email = 'civiceducationkenya@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND email = 'civiceducationkenya@gmail.com'
    )
  );
