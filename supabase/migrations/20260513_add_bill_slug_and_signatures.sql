-- ============================================================
-- CEKA Bill Slug System & Signatures Table
-- Migration: 20260513_add_bill_slug_and_signatures.sql
-- ============================================================

-- ── Part 1: Bill Slug Column ──────────────────────────────────────────────────

-- Add slug column (nullable initially — Python script will populate)
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add unique constraint on slug (enforces no two bills have identical URLs)
ALTER TABLE public.bills
  DROP CONSTRAINT IF EXISTS bills_slug_unique;

ALTER TABLE public.bills
  ADD CONSTRAINT bills_slug_unique UNIQUE (slug);

-- B-Tree index for fast slug lookups (equivalent speed to UUID lookups)
CREATE INDEX IF NOT EXISTS idx_bills_slug ON public.bills USING btree (slug);

-- ── Part 2: Signatures Table ──────────────────────────────────────────────────
-- This table tracks citizen signatures/submissions on each bill.
-- It was being called by LegislativeMemorandum but didn't exist → 404 errors.

CREATE TABLE IF NOT EXISTS public.signatures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id       UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  name          TEXT,
  email         TEXT,
  county        TEXT,
  constituency  TEXT,
  submission_id UUID,
  notes         TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-bill count queries (the HEAD count call in the app)
CREATE INDEX IF NOT EXISTS idx_signatures_bill_id ON public.signatures USING btree (bill_id);

-- Index for email-based deduplication lookups
CREATE INDEX IF NOT EXISTS idx_signatures_email ON public.signatures USING btree (email);

-- Row Level Security: public can count, only authenticated can insert
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the count (public petition transparency)
CREATE POLICY IF NOT EXISTS "signatures_public_read"
  ON public.signatures FOR SELECT
  USING (true);

-- Allow anyone to insert (anonymous petition signing)
CREATE POLICY IF NOT EXISTS "signatures_public_insert"
  ON public.signatures FOR INSERT
  WITH CHECK (true);

-- ── Part 3: Lookup Function (slug → bill) ────────────────────────────────────
-- Used by the frontend to resolve a slug into a full bill row.
-- Falls back to UUID lookup so old UUID links continue to work.

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

-- Grant access to the anon role (used by the frontend Supabase client)
GRANT EXECUTE ON FUNCTION public.get_bill_by_slug_or_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bill_by_slug_or_id(TEXT) TO authenticated;
