-- ══════════════════════════════════════════════════════════════════
-- CEKA Donation Infrastructure SQL Migration
-- Run this in the Supabase SQL Editor for your project
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. campaign_comments table ──────────────────────────────────
-- Stores auth-locked comments on campaigns with a foreign key to
-- the profiles table so we can resolve full_name / avatar_url.
CREATE TABLE IF NOT EXISTS public.campaign_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-campaign retrieval
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign_id
  ON public.campaign_comments (campaign_id, created_at DESC);

-- RLS: only authenticated users can insert their own comment
ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read campaign comments"
  ON public.campaign_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can post comments"
  ON public.campaign_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.campaign_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 2. signature_count column on campaigns ───────────────────────
-- Tracks formal petition signatures, separate from participant count.
-- Defaults to current_count so existing data shows unchanged.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns'
      AND column_name = 'signature_count'
  ) THEN
    ALTER TABLE public.campaigns
      ADD COLUMN signature_count INTEGER NOT NULL DEFAULT 0;

    -- Seed from current_count so no existing campaign reads 0
    UPDATE public.campaigns
    SET signature_count = COALESCE(current_count, 0);
  END IF;
END $$;

-- ─── 3. donation_payments table (BTCPay webhook tracking) ─────────
-- Populated by the btcpay-confirmations Supabase Edge Function.
CREATE TABLE IF NOT EXISTS public.donation_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  btcpay_invoice_id TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'new',   -- new | processing | settled | expired | invalid
  payment_method  TEXT,                           -- BTC, LN, Liquid-BTC, etc.
  amount_crypto   NUMERIC(20, 8),
  currency        TEXT,
  campaign_id     UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES public.profiles(id)  ON DELETE SET NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_donation_payment_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_payment_update ON public.donation_payments;
CREATE TRIGGER trg_donation_payment_update
  BEFORE UPDATE ON public.donation_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_donation_payment_update();

-- RLS — only Edge Function (service-role) can write; admins can read
ALTER TABLE public.donation_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage donation_payments"
  ON public.donation_payments
  USING (true)
  WITH CHECK (true);

-- ─── 4. profiles — extra columns for Civic Monitor & Developer Settings ───────
-- alert_keywords: comma-separated. api_key: user-managed API token.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'alert_keywords'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN alert_keywords TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'api_key'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN api_key TEXT DEFAULT NULL;
  END IF;
END $$;

-- fiat_payments table — tracks Paystack / M-Pesa / Ko-fi / PayPal donations (no webhook)
CREATE TABLE IF NOT EXISTS public.fiat_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_ref    TEXT UNIQUE,
  provider        TEXT NOT NULL DEFAULT 'paystack',  -- paystack | mpesa | kofi | paypal
  status          TEXT NOT NULL DEFAULT 'initiated', -- initiated | success | failed
  amount_kes      NUMERIC(14, 2),
  campaign_id     UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiat_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own fiat payments"
  ON public.fiat_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage fiat_payments"
  ON public.fiat_payments
  USING (true)
  WITH CHECK (true);
