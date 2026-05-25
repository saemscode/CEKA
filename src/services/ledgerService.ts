import { createClient } from '@supabase/supabase-js';

const LEDGER_URL = import.meta.env.VITE_PROJECT_URL || "https://ftswzvqwxdwgkvfbwfpx.supabase.co";
const LEDGER_ANON_KEY = import.meta.env.VITE_ANON_KEY || "";

/**
 * LEDGER SERVICE (PUBLIC SCHEMA VERSION)
 */
class LedgerService {
  private supabase;

  constructor() {
    this.supabase = createClient(LEDGER_URL, LEDGER_ANON_KEY);
  }

  async getRecentTransactions(limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[LedgerService] Error fetching transactions:', error);
      return [];
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('reference', reference)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[LedgerService] Error verifying transaction:', error);
      return null;
    }
  }
}

export const ledgerService = new LedgerService();
