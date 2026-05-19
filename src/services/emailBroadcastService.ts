import { supabase } from '@/integrations/supabase/client';

export type AudienceFilter = 'all' | 'by_county' | 'by_interest' | 'by_role';

export interface BroadcastRequest {
  subject: string;
  html_content: string;
  audience_filter: AudienceFilter;
  filter_value?: string; // county name, interest key, or role
}

export interface BroadcastResult {
  broadcast_id: string;
  total_recipients: number;
  sent: number;
  failed: number;
  status: string;
}

export interface BroadcastHistory {
  id: string;
  subject: string;
  audience_filter: string;
  filter_value: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: string;
  sent_by: string;
  created_at: string;
}

class EmailBroadcastService {
  /**
   * Send a broadcast email to the community via edge function
   */
  async sendBroadcast(request: BroadcastRequest): Promise<BroadcastResult> {
    const { data, error } = await supabase.functions.invoke('send-broadcast-email', {
      body: request
    });

    if (error) {
      console.error('Broadcast send error:', error);
      throw new Error(error.message || 'Failed to send broadcast');
    }

    return data as BroadcastResult;
  }

  /**
   * Get subscriber count for a given audience filter
   */
  async getSubscriberCount(filter: AudienceFilter, filterValue?: string): Promise<number> {
    try {
      let query = (supabase
        .from('community_members') as any)
        .select('id', { count: 'exact', head: true })
        .neq('status', 'rejected');

      if (filter === 'by_county' && filterValue) {
        query = query.eq('county', filterValue);
      } else if (filter === 'by_interest' && filterValue) {
        query = query.contains('areas_of_interest', [filterValue]);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Subscriber count error:', error);
      return 0;
    }
  }

  /**
   * Get distinct counties from community members
   */
  async getAvailableCounties(): Promise<string[]> {
    try {
      const { data } = await (supabase
        .from('community_members') as any)
        .select('county')
        .not('county', 'is', null)
        .neq('county', '');

      if (!data) return [];

      const counties = [...new Set(data.map((d: any) => d.county as string))].filter(Boolean).sort();
      return counties;
    } catch {
      return [];
    }
  }

  /**
   * Get broadcast history from admin_audit_log
   */
  async getBroadcastHistory(limit: number = 20): Promise<BroadcastHistory[]> {
    try {
      const { data, error } = await (supabase
        .from('admin_audit_log') as any)
        .select('*')
        .eq('action', 'send_broadcast')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((log: any) => ({
        id: log.id,
        subject: log.details?.subject || 'Unknown',
        audience_filter: log.details?.audience_filter || 'all',
        filter_value: log.details?.filter_value || null,
        total_recipients: log.details?.total_recipients || 0,
        sent_count: log.details?.sent || 0,
        failed_count: log.details?.failed || 0,
        status: log.details?.status || 'unknown',
        sent_by: log.user_id,
        created_at: log.created_at
      }));
    } catch (error) {
      console.error('Broadcast history error:', error);
      return [];
    }
  }

  /**
   * Available interest categories for filtering
   */
  getInterestCategories(): { value: string; label: string }[] {
    return [
      { value: 'constitution', label: 'Constitution' },
      { value: 'legislation', label: 'Legislation' },
      { value: 'human-rights', label: 'Human Rights' },
      { value: 'governance', label: 'Governance' },
      { value: 'voter-education', label: 'Voter Education' },
      { value: 'community-projects', label: 'Community Projects' }
    ];
  }
}

export const emailBroadcastService = new EmailBroadcastService();
