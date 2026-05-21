-- ============================================================
-- CEKA Enriched Bill Descriptions Migration
-- 20260701_enriched_bill_descriptions.sql
-- ============================================================
-- Adds high-fidelity human-toned description column and
-- refresh-cycle tracking for the 3-hour enrichment daemon.

-- 1. Add enriched_description column for full human-tone analysis
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS enriched_description TEXT;

-- 2. Add last_enriched_at timestamp for 3-hour refresh cycle tracking
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ DEFAULT '-infinity';

-- 3. Index for the enrichment daemon to efficiently fetch stale bills
CREATE INDEX IF NOT EXISTS idx_bills_last_enriched_at
  ON public.bills (last_enriched_at);
