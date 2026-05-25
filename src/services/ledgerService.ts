import { createClient } from '@supabase/supabase-js';

// The Transactional Ledger Database (Isolated)
const LEDGER_URL = import.meta.env.VITE_SUPABASE_URL_NEW || "https://ftswzvqwxdwgkvfbwfpx.supabase.co";
const LEDGER_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY_NEW || "";

/**
 * LEDGER SERVICE (PHASE 3)
 * Provides access to the isolated transactional ledger.
 */
class LedgerService {
  private supabase;

  constructor() {
    this.supabase = createClient(LEDGER_URL, LEDGER_ANON_KEY);
  }

  /**
   * Fetch a summary of all financial transactions
   */
  async getFinancialSummary() {
    try {
      const { data, error } = await this.supabase
        .from('financial_summary')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[LedgerService] Error fetching summary:', error);
      return null;
    }
  }

  /**
   * Fetch recent successful transactions
   */
  async getRecentTransactions(limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(limit)
        .schema('ledger');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[LedgerService] Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Verify a transaction status directly from the ledger
   */
  async verifyTransaction(reference: string) {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('reference', reference)
        .maybeSingle()
        .schema('ledger');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[LedgerService] Error verifying transaction:', error);
      return null;
    }
  }
}

export const ledgerService = new LedgerService();
