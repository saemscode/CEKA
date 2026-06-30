import { createClient } from '@supabase/supabase-js';

// Ledger project credentials — isolated donation tracking instance
// These are stored in env vars; the fallback values allow the maintenance page
// to work even if env vars are not yet propagated in the build.
const LEDGER_URL = import.meta.env.VITE_LEDGER_SUPABASE_URL || "https://ftswzvqwxdwgkvfbwfpx.supabase.co";
const LEDGER_ANON_KEY = import.meta.env.VITE_LEDGER_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0c3d6dnF3eGR3Z2t2ZmJ3ZnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTQ1NTEsImV4cCI6MjA2NzkzMDU1MX0.ZRYkA2uRUEG1M6zLpMI0waaprBORCl_sYQ8l3orhdUo";

/**
 * LEDGER SERVICE — Isolated donation tracking.
 * Uses server-side SQL aggregation (RPC) to avoid full-table egress.
 * The get_successful_donations_summary() function must exist on the ledger
 * Supabase project — see supabase/migrations/20260630000001_security_hardening.sql
 * (Section 8) for the SQL to create it.
 */
class LedgerService {
  private supabase: ReturnType<typeof createClient> | null;

  constructor() {
    if (!LEDGER_ANON_KEY || !LEDGER_URL) {
      console.error("[LedgerService] Critical: credentials missing. Tracker disabled.");
      this.supabase = null;
      return;
    }
    this.supabase = createClient(LEDGER_URL, LEDGER_ANON_KEY);
  }

  async getRecentTransactions(limit = 10) {
    if (!this.supabase) return [];
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('id, amount, status, created_at, reference')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('[LedgerService] Error fetching transactions:', error);
      return [];
    }
  }

  async verifyTransaction(reference: string) {
    if (!this.supabase) return null;
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('id, amount, status, reference, created_at')
        .eq('reference', reference)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[LedgerService] Error verifying transaction:', error);
      return null;
    }
  }

  /**
   * PERFORMANCE FIX: Uses server-side SUM() aggregation via RPC instead of
   * downloading the entire transactions table and summing on the client.
   * Before: downloaded ALL transaction rows (growing payload → egress overrun)
   * After:  receives a single {total_amount, transaction_count} JSON object (~30 bytes)
   */
  async getDonationStats(): Promise<{ total: number; count: number }> {
    if (!this.supabase) return { total: 0, count: 0 };
    try {
      const { data, error } = await this.supabase
        .rpc('get_successful_donations_summary');
      if (error) throw error;
      const row = Array.isArray(data) && data.length > 0 ? data[0] : data;
      return {
        total: Number(row?.total_amount ?? 0) / 100,
        count: Number(row?.transaction_count ?? 0),
      };
    } catch (error) {
      console.error('[LedgerService] Error fetching donation stats:', error);
      return { total: 0, count: 0 };
    }
  }
}

export const ledgerService = new LedgerService();
