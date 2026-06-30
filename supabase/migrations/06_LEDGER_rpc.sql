-- SECTION 8: Create donation stats aggregation RPC
-- Replaces the full table scan in ledgerService.ts
-- This runs against the LEDGER Supabase project (ftswzvqwxdwgkvfbwfpx)
-- Run this SQL on that project, not on the main CEKA project
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_successful_donations_summary()
RETURNS TABLE (total_amount bigint, transaction_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    COALESCE(SUM(amount), 0)::bigint AS total_amount,
    COUNT(*)::bigint                 AS transaction_count
  FROM transactions
  WHERE status = 'success';
$$;

-- Grant to anon so the maintenance page (unauthenticated) can call it
GRANT EXECUTE ON FUNCTION public.get_successful_donations_summary() TO anon;
GRANT EXECUTE ON FUNCTION public.get_successful_donations_summary() TO authenticated;
