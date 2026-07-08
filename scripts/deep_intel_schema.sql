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

-- ── OCR Worker Column ─────────────────────────────────────────────────────────
-- Set by sovereign_corroborator.py when a bill has a scanned PDF needing heavy OCR.
-- Cleared by ocr_worker.py once the text has been extracted and committed.
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS requires_heavy_ocr boolean NOT NULL DEFAULT false;

-- Index so ocr_worker.py can poll efficiently without a full table scan
CREATE INDEX IF NOT EXISTS idx_bills_requires_heavy_ocr
  ON public.bills (requires_heavy_ocr)
  WHERE requires_heavy_ocr = true;

-- To manually flag a bill for OCR reprocessing:
-- UPDATE public.bills SET requires_heavy_ocr = true WHERE id = '<bill-uuid>';

