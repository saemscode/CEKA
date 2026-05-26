import { createClient } from '@supabase/supabase-js';

// GO HAM: Hardcoded recovery credentials to bypass main site environment collisions
const LEDGER_URL = "https://ftswzvqwxdwgkvfbwfpx.supabase.co";
const LEDGER_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0c3d6dnF3eGR3Z2t2ZmJ3ZnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTQ1NTEsImV4cCI6MjA2NzkzMDU1MX0.ZRYkA2uRUEG1M6zLpMI0waaprBORCl_sYQ8l3orhdUo";

/**
 * LEDGER SERVICE (PUBLIC SCHEMA VERSION)
 */
class LedgerService {
  private supabase;

  constructor() {
    if (!LEDGER_ANON_KEY) {
      console.error("[LedgerService] Critical: ANON_KEY missing. Tracker will be disabled.");
      this.supabase = null;
      return;
    }
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

  async getDonationStats() {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'success');

      if (error) throw error;
      
      const totalAmount = (data || []).reduce((sum, tx) => sum + (Number(tx.amount) / 100), 0);
      return {
        total: totalAmount,
        count: data?.length || 0
      };
    } catch (error) {
      console.error('[LedgerService] Error fetching stats:', error);
      return { total: 0, count: 0 };
    }
  }
}

export const ledgerService = new LedgerService();
