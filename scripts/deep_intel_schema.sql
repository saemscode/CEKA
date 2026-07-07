-- CEKA Deep Intelligence Relay — Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- All statements are idempotent (safe to run multiple times).

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS deep_analysis_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS deep_analysis_cursor  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deep_working_memory   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deep_insights         jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deep_analysed_at      timestamptz DEFAULT NULL;

-- Index for efficient polling of bills awaiting deep analysis
CREATE INDEX IF NOT EXISTS idx_bills_deep_analysis_status
  ON public.bills (deep_analysis_status);

-- To reset a specific bill back to pending (re-run deep analysis):
-- UPDATE public.bills
--   SET deep_analysis_status = 'pending',
--       deep_analysis_cursor  = 0,
--       deep_working_memory   = '{}'::jsonb,
--       deep_insights         = NULL,
--       deep_analysed_at      = NULL
--   WHERE id = '<bill-uuid>';

-- To reset ALL bills to pending (full re-run):
-- UPDATE public.bills
--   SET deep_analysis_status = 'pending',
--       deep_analysis_cursor  = 0,
--       deep_working_memory   = '{}'::jsonb,
--       deep_insights         = NULL,
--       deep_analysed_at      = NULL;
