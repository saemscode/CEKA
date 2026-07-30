
import { supabase } from '@/integrations/supabase/client';

export interface BillFollow {
  id: string;
  user_id: string;
  bill_id: string;
  vault_url?: string | null;
  vault_refreshed_at?: string | null;
  created_at: string;
}

export class BillFollowingService {
  private userFollowsCache: Map<string, Set<string>> = new Map();
  private userFollowsPromise: Map<string, Promise<void>> = new Map();

  async preloadUserFollows(userId: string): Promise<void> {
    if (this.userFollowsCache.has(userId)) return;
    if (this.userFollowsPromise.has(userId)) {
      await this.userFollowsPromise.get(userId);
      return;
    }

    const promise = (async () => {
      const { data, error } = await (supabase
        .from('bill_follows') as any)
        .select('bill_id')
        .eq('user_id', userId);
      
      if (!error && data) {
        this.userFollowsCache.set(userId, new Set(data.map((d: any) => d.bill_id)));
      } else {
        this.userFollowsCache.set(userId, new Set());
      }
    })();
    
    this.userFollowsPromise.set(userId, promise);
    await promise;
  }

  async followBill(billId: string, userId: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new Error('Aborted');
    if (!userId) throw new Error('User not authenticated');

    const { error } = await (supabase
      .from('bill_follows') as any)
      .insert({
        user_id: userId,
        bill_id: billId
      });

    if (error) throw error;
    
    // Update local cache
    if (this.userFollowsCache.has(userId)) {
      this.userFollowsCache.get(userId)?.add(billId);
    }
  }

  async unfollowBill(billId: string, userId: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new Error('Aborted');
    if (!userId) throw new Error('User not authenticated');

    const { error } = await (supabase
      .from('bill_follows') as any)
      .delete()
      .eq('user_id', userId)
      .eq('bill_id', billId);

    if (error) throw error;

    // Update local cache
    if (this.userFollowsCache.has(userId)) {
      this.userFollowsCache.get(userId)?.delete(billId);
    }
  }

  async isFollowingBill(billId: string, userId: string, signal?: AbortSignal): Promise<boolean> {
    if (signal?.aborted) return false;
    if (!userId) return false;

    await this.preloadUserFollows(userId);
    return this.userFollowsCache.get(userId)?.has(billId) || false;
  }

  async getFollowedBills(userId: string, signal?: AbortSignal): Promise<any[]> {
    if (signal?.aborted) return [];
    if (!userId) return [];

    const { data, error } = await (supabase
      .from('bill_follows') as any)
      .select(`
        bill_id,
        bills (
          id,
          title,
          summary,
          status,
          category,
          date,
          created_at,
          updated_at,
          b2_url,
          corroboration_score
        ),
        vault_url,
        vault_refreshed_at
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map((follow: any) => follow.bills) || [];
  }

  async getFollowCount(billId: string, signal?: AbortSignal): Promise<number> {
    const { count, error } = await (supabase
      .from('bill_follows') as any)
      .select('*', { count: 'exact', head: true })
      .eq('bill_id', billId);

    if (error) throw error;
    return count || 0;
  }
}

export const billFollowingService = new BillFollowingService();
