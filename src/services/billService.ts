
import { supabase } from '@/integrations/supabase/client';

export interface Bill {
  id: string;
  slug?: string | null;
  title: string;
  summary: string;
  status: string;
  category: string;
  sponsor: string;
  date: string;
  stages?: any;
  description?: string;
  constitutional_section?: string;
  url?: string;
  created_at: string;
  updated_at?: string;
  neural_summary?: string | null;
  text_content?: string | null;
  pdf_url?: string | null;
  b2_url?: string | null;
  corroboration_score?: number;
  analysis_status?: 'pending' | 'processing' | 'completed' | 'failed';
  sources?: any[]
  views_count?: number;
  follow_count?: number;
  // Bill Pipeline Enhancement fields
  ai_concerns?: string[] | null;
  tabloid_summary?: string | null;
  participation_deadline?: string | null;
  signature_goal?: number | null;
  // Legislative metadata
  bill_no?: string | null;
  house?: string | null;
  session_year?: number | null;
}

/** Returns the canonical URL-safe identifier for sharing — slug if populated, UUID otherwise. */export function getBillIdentifier(bill: { id: string; slug?: string | null }): string {
  return bill.slug || bill.id;
}

/** Safely normalizes JSON string fields (ai_concerns, stages) into native arrays. */
export function normalizeBill(data: any): Bill | null {
  if (!data) return null;
  const copy = { ...data };
  if (typeof copy.ai_concerns === 'string') {
    try {
      const parsed = JSON.parse(copy.ai_concerns);
      copy.ai_concerns = Array.isArray(parsed) ? parsed : (copy.ai_concerns ? [copy.ai_concerns] : []);
    } catch {
      copy.ai_concerns = copy.ai_concerns ? [copy.ai_concerns] : [];
    }
  }
  if (typeof copy.stages === 'string') {
    try {
      const parsed = JSON.parse(copy.stages);
      copy.stages = Array.isArray(parsed) ? parsed : [];
    } catch {
      copy.stages = [];
    }
  }
  return copy as Bill;
}

class BillService {
  async getFeaturedBills(limit: number = 3): Promise<Bill[]> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(b => normalizeBill(b)!) as Bill[];
    } catch (error) {
      console.error('Error fetching featured bills:', error);
      return [];
    }
  }

  async getBillById(id: string): Promise<Bill | null> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return normalizeBill(data);
    } catch (error) {
      console.error('Error fetching bill by id:', error);
      return null;
    }
  }

  /**
   * Resolves a bill by its slug OR UUID.
   * Strategy:
   *  1. Try the Supabase RPC (fastest, handles both slug + uuid in one query)
   *  2. On RPC failure (e.g. revoked from anon, not deployed): query by slug column directly
   *  3. Last resort: query by id (UUID). This path only works when identifier IS a valid UUID.
   * Old UUID-based links remain permanently valid because step 3 handles them.
   */
  async getBillBySlugOrId(identifier: string): Promise<Bill | null> {
    // ── Attempt 1: RPC (slug-or-id in one round-trip) ────────────────────────
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_bill_by_slug_or_id', { identifier })
        .single();

      if (!error && data) return normalizeBill(data);
    } catch (_) {
      // RPC unavailable or revoked — fall through to manual lookups
    }

    // ── Attempt 2: Direct slug column query ───────────────────────────────────
    try {
      const { data: bySlug } = await supabase
        .from('bills')
        .select('*')
        .eq('slug', identifier)
        .maybeSingle();

      if (bySlug) return normalizeBill(bySlug);
    } catch (_) {
      // slug column may not exist yet — continue
    }

    // ── Attempt 3: UUID lookup (only valid if identifier is a UUID) ───────────
    // Guard: skip this if identifier is clearly not a UUID (contains no dashes or is too short)
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    if (looksLikeUuid) {
      try {
        const { data: byId } = await supabase
          .from('bills')
          .select('*')
          .eq('id', identifier)
          .maybeSingle();

        if (byId) return normalizeBill(byId);
      } catch (_) {
        // ID lookup also failed
      }
    }

    console.warn('[billService] getBillBySlugOrId: bill not found for identifier:', identifier);
    return null;
  }

  async getAllBills(): Promise<Bill[]> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(b => normalizeBill(b)!) as Bill[];
    } catch (error) {
      console.error('Error fetching all bills:', error);
      return [];
    }
  }

  async searchBills(query: string): Promise<Bill[]> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .or(`title.ilike.%${query}%,summary.ilike.%${query}%,sponsor.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Bill[];
    } catch (error) {
      console.error('Error searching bills:', error);
      return [];
    }
  }

  async getBillStats(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('status, category');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        byStatus: {} as Record<string, number>,
        byCategory: {} as Record<string, number>
      };

      data?.forEach(bill => {
        const status = bill.status || 'Unknown';
        const category = bill.category || 'Uncategorized';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching bill stats:', error);
      return { total: 0, byStatus: {}, byCategory: {} };
    }
  }

  async getBillNewsMentions(billId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('bill_news_mentions' as any)
        .select('*')
        .eq('bill_id', billId)
        .order('scraped_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching bill news mentions:', error);
      return [];
    }
  }

  async submitBillResponse(billId: string, responseText: string, userId: string): Promise<boolean> {
    try {
      if (!userId) return false;
      const { error } = await supabase
        .from('bill_responses' as any)
        .insert({ bill_id: billId, user_id: userId, response: responseText });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error submitting bill response:', error);
      return false;
    }
  }

  async getUserBillResponse(billId: string, userId: string): Promise<string | null> {
    try {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('bill_responses' as any)
        .select('response')
        .eq('bill_id', billId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data as any)?.response ?? null;
    } catch {
      return null;
    }
  }

  async getSignatureCount(billId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('signatures' as any)
        .select('*', { count: 'exact', head: true })
        .eq('bill_id', billId);
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching signature count:', error);
      return 0;
    }
  }
}

export const billService = new BillService();
