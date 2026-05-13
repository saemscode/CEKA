-- ============================================================
-- CEKA Bill Slug System & Signatures Table (COMPLETE FIX)
-- Migration: 20260513_add_bill_slug_and_signatures.sql
-- ============================================================

-- ── Part 1: Bill Slug Column ──────────────────────────────────────────────────
-- Add slug column (nullable initially — Python script will populate)
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add unique constraint on slug
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_slug_unique;
ALTER TABLE public.bills ADD CONSTRAINT bills_slug_unique UNIQUE (slug);

-- B-Tree index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_bills_slug ON public.bills USING btree (slug);

-- ── Part 2: Action System Foundations ──────────────────────────────────────────
-- Global tracker for platform momentum
DROP TABLE IF EXISTS public.action_counts CASCADE;

CREATE TABLE public.action_counts (
    id TEXT PRIMARY KEY,
    signatures_total INTEGER DEFAULT 0,
    whatsapp_shares INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed global counter
INSERT INTO public.action_counts (id, signatures_total)
VALUES ('global', 0)
ON CONFLICT (id) DO NOTHING;

-- ── Part 3: Signatures Table ──────────────────────────────────────────────────
-- Verified citizen submissions
DROP TABLE IF EXISTS public.signatures CASCADE; -- Schema reset to align with frontend

CREATE TABLE public.signatures (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id       UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    template_id   UUID, -- Optional reference
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL,
    county        TEXT,
    constituency  TEXT,
    comments      TEXT,
    is_verified   BOOLEAN NOT NULL DEFAULT false,
    otp_code      TEXT, 
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Anti-fraud: prevent same email signing same bill twice
    UNIQUE(bill_id, email)
);

-- Indexes
CREATE INDEX idx_signatures_bill_id ON public.signatures(bill_id);
CREATE INDEX idx_signatures_email ON public.signatures(email);

-- RLS
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signatures_public_read" ON public.signatures FOR SELECT USING (true);
CREATE POLICY "signatures_public_insert" ON public.signatures FOR INSERT WITH CHECK (true);

-- ── Part 4: RPC FUNCTIONS ─────────────────────────────────────────────────────

-- 1. Lookup Bill by Slug or ID
CREATE OR REPLACE FUNCTION public.get_bill_by_slug_or_id(identifier TEXT)
RETURNS SETOF public.bills
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM public.bills
  WHERE slug = identifier
     OR id::text = identifier
  LIMIT 1;
$$;

-- 2. Submit Signature (THE MAIN FIX)
CREATE OR REPLACE FUNCTION public.submit_signature(
  bill_id_param UUID,
  template_id_param UUID,
  name_param TEXT,
  email_param TEXT,
  constituency_param TEXT,
  county_param TEXT,
  comments_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_sig_id UUID;
BEGIN
  -- Insert signature
  INSERT INTO public.signatures (
    bill_id, template_id, full_name, email, constituency, county, comments
  ) VALUES (
    bill_id_param, template_id_param, name_param, email_param, constituency_param, county_param, comments_param
  )
  RETURNING id INTO new_sig_id;

  -- Update global counter
  UPDATE public.action_counts 
  SET signatures_total = signatures_total + 1
  WHERE id = 'global';

  RETURN jsonb_build_object('success', true, 'id', new_sig_id);
EXCEPTION 
  WHEN unique_violation THEN
    -- PostgREST understands standard Postgres error codes
    RAISE EXCEPTION 'You have already signed this memorandum.' USING ERRCODE = '23505';
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. WhatsApp Tracking
CREATE OR REPLACE FUNCTION public.increment_whatsapp_share()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.action_counts 
  SET whatsapp_shares = whatsapp_shares + 1
  WHERE id = 'global';
END;
$$;

-- 4. Placeholder Verification
CREATE OR REPLACE FUNCTION public.verify_signature_otp(
  signature_id_param UUID,
  otp_code_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.signatures
  SET is_verified = true
  WHERE id = signature_id_param;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_bill_by_slug_or_id(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_signature(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_whatsapp_share() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_signature_otp(UUID, TEXT) TO anon, authenticated;
GRANT ALL ON public.signatures TO anon, authenticated;
GRANT ALL ON public.action_counts TO anon, authenticated;
