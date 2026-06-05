import { supabase } from '@/integrations/supabase/client';
import { BlogPost } from '@/services/blogService';

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AdminSession {
  id: string;
  user_id: string;
  email: string;
  session_token: string;
  created_at: string;
  last_active: string;
  expires_at: string;
  is_active: boolean;
}

export interface AdminDashboardStats {
  total_users: number;
  total_posts: number;
  total_resources: number;
  total_bills: number;
  active_sessions: number;
  recent_signups: number;
  pending_drafts: number;
  total_discussions: number;
  total_views: number;
  avg_daily_users: number;
  total_interactions: number;
}

export interface UserActivityStats {
  date: string;
  new_users: number;
  active_users: number;
  blog_posts: number;
  discussions: number;
  interactions: number;
}

export interface ModerationQueueItem {
  id: string;
  type: string;
  title: string;
  author: string;
  created_at: string;
  status: string;
  content_preview: string;
}

const ROOT_ADMIN_EMAIL = "civiceducationkenya@gmail.com";

class AdminService {
  private isAdminCached: boolean | null = null;
  private lastCheckTime: number = 0;
  private CACHE_TTL = 1000 * 60 * 5; // 5 minutes
  /**
   * Check if current user is admin using secure user_roles table
   * Hardened: Handles AbortError and includes retry logic for flaky connections
   */
  async isUserAdmin(userId?: string | null, userEmail?: string | null, retryCount = 0): Promise<boolean> {
    // Return cached result if valid
    const now = Date.now();
    if (this.isAdminCached !== null && (now - this.lastCheckTime) < this.CACHE_TTL) {
      return this.isAdminCached;
    }

    try {
      let uid = userId;
      let email = userEmail;

      if (!uid) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          if (authError.name === 'AbortError' && retryCount < 3) {
            console.warn(`[Admin] Auth check aborted, retrying (${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
            return this.isUserAdmin(userId, userEmail, retryCount + 1);
          }
          throw authError;
        }

        if (!user) {
          this.isAdminCached = false;
          this.lastCheckTime = now;
          return false;
        }
        uid = user.id;
        email = user.email;
      }

      // Root Bypass
      if (email === ROOT_ADMIN_EMAIL) {
        this.isAdminCached = true;
        this.lastCheckTime = now;
        return true;
      }

      // Primary check: user_roles table via RPC
      const { data: hasAdminRole, error: rpcError } = await supabase.rpc('check_user_is_admin');
      
      if (rpcError) {
        if (rpcError.name === 'AbortError' && retryCount < 3) {
          return this.isUserAdmin(userId, userEmail, retryCount + 1);
        }
      }

      if (!rpcError && hasAdminRole) return true;

      // Fallback: check user_roles table directly
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError && roleError.name === 'AbortError' && retryCount < 3) {
        return this.isUserAdmin(userId, userEmail, retryCount + 1);
      }

      if (roleData) return true;

      // Legacy fallback: profiles table is_admin column
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', uid)
        .maybeSingle();

      const isAdmin = (profile?.is_admin || false);
      this.isAdminCached = isAdmin;
      this.lastCheckTime = now;
      return isAdmin;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn('[Admin] Check aborted (likely unmount)');
        return this.isAdminCached || false;
      }
      console.error('Admin check error:', error);
      return false;
    }
  }

  /**
   * Manual cache invalidation (e.g. on logout/login)
   */
  invalidateAdminCache() {
    this.isAdminCached = null;
    this.lastCheckTime = 0;
  }

  async getAdminNotifications(): Promise<AdminNotification[]> {
    const { data } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false });
    return (data as AdminNotification[] || []);
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('is_read', false);
  }

  async getDraftPosts(): Promise<BlogPost[]> {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });
    return (data as BlogPost[] || []);
  }

  async updatePostStatus(postId: string, status: 'published' | 'draft' | 'archived', adminNotes?: string): Promise<void> {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (adminNotes) {
      updates.admin_notes = adminNotes;
    }

    if (status === 'published') {
      updates.published_at = new Date().toISOString();
    }

    await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', postId);

    await this.logAdminAction('update_post_status', 'blog_post', postId, { new_status: status, admin_notes: adminNotes });
  }

  async schedulePost(postId: string, scheduledAt: string): Promise<void> {
    await supabase
      .from('blog_posts')
      .update({
        scheduled_at: scheduledAt,
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    await this.logAdminAction('schedule_post', 'blog_post', postId, { scheduled_at: scheduledAt });
  }

  async rejectPost(postId: string, rejectionReason: string): Promise<void> {
    await supabase
      .from('blog_posts')
      .update({
        status: 'draft',
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    await this.logAdminAction('reject_post', 'blog_post', postId, { rejection_reason: rejectionReason });
  }

  async getVolunteerApplications(): Promise<any[]> {
    const { data } = await supabase
      .from('volunteer_applications')
      .select(`*, profiles:user_id (full_name, email), volunteer_opportunities (title)`)
      .order('created_at', { ascending: false });
    return (data as any[] || []);
  }

  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const { data, error } = await supabase
        .from('admin_intelligence_summary' as any)
        .select('*')
        .single();

      if (error) throw error;

      const statsData = data as any;

      const [
        totalPosts,
        totalResources,
        totalBills,
        totalSessions,
        pendingDrafts,
        totalDiscussions,
        totalViewsRes,
        blogViewsRes
      ] = await Promise.all([
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('resources').select('id', { count: 'exact', head: true }),
        supabase.from('bills').select('id', { count: 'exact', head: true }),
        supabase.from('admin_sessions').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('discussions' as any).select('id', { count: 'exact', head: true }),
        supabase.from('bills').select('views_count'),
        supabase.from('blog_posts').select('views').maybeSingle() // Just check if column exists
      ]);

      const totalViews = (totalViewsRes.data || []).reduce((acc, b) => acc + (b.views_count || 0), 0);

      return {
        total_users: statsData?.total_users || 0,
        total_posts: totalPosts.count || 0,
        total_resources: totalResources.count || 0,
        total_bills: totalBills.count || 0,
        active_sessions: totalSessions.count || 0,
        recent_signups: statsData?.total_users ? Math.ceil(statsData.total_users * 0.05) : 0,
        pending_drafts: pendingDrafts.count || 0,
        total_discussions: totalDiscussions.count || 0,
        total_views: totalViews || 0,
        total_interactions: statsData?.chat_activity_24h || 0,
        avg_daily_users: (statsData?.total_users || 0) * 0.1
      };
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      return {
        total_users: 0, total_posts: 0, total_resources: 0, total_bills: 0,
        active_sessions: 0, recent_signups: 0, pending_drafts: 0,
        total_discussions: 0, total_views: 0, avg_daily_users: 0, total_interactions: 0
      };
    }
  }

  async getUserActivityStats(): Promise<UserActivityStats[]> {
    try {
      const { data: interactions } = await supabase
        .from('chat_interactions')
        .select('created_at')
        .limit(1000);

      const dailyMap: Record<string, UserActivityStats> = {};

      (interactions as any[])?.forEach(item => {
        const d = item.created_at.split('T')[0];
        if (!dailyMap[d]) {
          dailyMap[d] = { date: d, new_users: 0, active_users: 0, blog_posts: 0, discussions: 0, interactions: 0 };
        }
        dailyMap[d].interactions++;
      });

      return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      return [];
    }
  }

  async getActiveSessions(): Promise<AdminSession[]> {
    const { data, error } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('is_active', true)
      .order('last_active', { ascending: false });

    // Throw error with proper info for caller to handle RLS issues
    if (error) {
      const enhancedError: any = new Error(error.message);
      enhancedError.code = error.code;
      enhancedError.status = 403; // RLS typically returns 403
      throw enhancedError;
    }

    return (data as AdminSession[] || []);
  }

  async updateSystemMetrics(): Promise<void> {
    const stats = await this.getDashboardStats();
    const today = new Date().toISOString().split('T')[0];

    await supabase.from('system_metrics').upsert([
      { metric_name: 'total_users', metric_value: stats.total_users, metric_date: today },
      { metric_name: 'total_posts', metric_value: stats.total_posts, metric_date: today },
      { metric_name: 'total_resources', metric_value: stats.total_resources, metric_date: today },
      { metric_name: 'active_sessions', metric_value: stats.active_sessions, metric_date: today }
    ], { onConflict: 'metric_name,metric_date' });

    await this.logAdminAction('update_metrics', 'system', undefined, stats);
  }

  async generateWeeklyReport(): Promise<any> {
    const stats = await this.getDashboardStats();
    const activity = await this.getUserActivityStats();

    const report = {
      generated_at: new Date().toISOString(),
      period: 'weekly',
      summary: stats,
      daily_activity: activity.slice(-7),
      version: '2.0'
    };

    await this.logAdminAction('generate_report', 'system', undefined, { type: 'weekly' });

    // Return report data for download
    return report;
  }

  async logAdminAction(action: string, resourceType: string, resourceId?: string, details?: any, userId?: string | null) {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      uid = user.id;
    }

    await supabase.from('admin_audit_log').insert({
      user_id: uid,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {}
    });
  }

  async getAdminAuditLogs(limit = 50): Promise<any[]> {
    const { data } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data as any[] || []);
  }

  async getModerationQueue(): Promise<ModerationQueueItem[]> {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'draft');

    return (data || []).map(p => ({
      id: p.id,
      type: 'blog_post',
      title: p.title,
      author: p.author || 'Member',
      created_at: p.created_at,
      status: p.status,
      content_preview: p.content?.substring(0, 100) || ''
    }));
  }

  async checkAdminWithSessionManagement(userId?: string | null, userEmail?: string | null): Promise<boolean> {
    let email = userEmail;
    if (!email || !userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      email = user.email;
    }

    if (email === ROOT_ADMIN_EMAIL) return true;

    const { count } = await supabase
      .from('admin_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    return (count || 0) < 3;
  }

  async cleanupAdminSession(userId?: string | null): Promise<void> {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      uid = user.id;
    }

    await supabase
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('user_id', uid);
  }

  // --- PHASE 2 MANAGEMENT FUNCTIONS ---

  /**
   * Fetch items pending media appraisal
   */
  async getQuarantineQueue(): Promise<ModerationQueueItem[]> {
    const [blogRes, resourceRes, constitutionRes] = await Promise.all([
      (supabase.from('blog_posts' as any) as any).select('*').eq('media_status', 'quarantined'),
      (supabase.from('resources' as any) as any).select('*').eq('media_status', 'quarantined'),
      (supabase.from('constitution_sections' as any) as any).select('*').eq('media_status', 'quarantined')
    ]);

    const items: ModerationQueueItem[] = [];

    (blogRes.data || []).forEach((p: any) => items.push({
      id: p.id, type: 'blog_post', title: p.title, author: p.author || 'Member',
      created_at: p.created_at, status: p.media_status, content_preview: p.content?.substring(0, 100) || ''
    }));

    (resourceRes.data || []).forEach((r: any) => items.push({
      id: r.id, type: 'resource', title: r.title, author: r.provider || 'Contributor',
      created_at: r.created_at, status: r.media_status, content_preview: r.description?.substring(0, 100) || ''
    }));

    (constitutionRes.data || []).forEach((s: any) => items.push({
      id: s.id, type: 'constitution_section', title: s.title_en, author: 'AI/Editor',
      created_at: s.created_at, status: s.media_status, content_preview: s.content_en?.substring(0, 100) || ''
    }));

    return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /**
   * Approve or reject media
   */
  async updateMediaStatus(id: string | number, type: string, status: 'approved' | 'rejected'): Promise<void> {
    let table = '';
    if (type === 'blog_post') table = 'blog_posts';
    if (type === 'resource') table = 'resources';
    if (type === 'constitution_section') table = 'constitution_sections';

    if (!table) return;

    await (supabase.from(table as any) as any)
      .update({ media_status: status })
      .eq('id', id);

    await this.logAdminAction('update_media_status', type, id.toString(), { status });
  }

  /**
   * Volunteer Opportunity Management
   */
  async getVolunteerOpportunities(): Promise<any[]> {
    const { data } = await (supabase.from('volunteer_opportunities' as any) as any)
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  }

  async updateVolunteerStatus(id: string, status: 'approved' | 'rejected' | 'pending' | 'closed'): Promise<void> {
    await (supabase.from('volunteer_opportunities' as any) as any)
      .update({ status })
      .eq('id', id);

    await this.logAdminAction('update_volunteer_status', 'volunteer_opportunity', id, { status });
  }

  /**
   * Campaign Management
   */
  async getCampaigns(): Promise<any[]> {
    const { data } = await (supabase.from('platform_campaigns' as any) as any)
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  }

  async saveCampaign(campaign: any, userId?: string | null): Promise<void> {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    const payload = { ...campaign, created_by: uid };

    if (campaign.id) {
      await (supabase.from('platform_campaigns' as any) as any).update(payload).eq('id', campaign.id);
    } else {
      await (supabase.from('platform_campaigns' as any) as any).insert(payload);
    }

    await this.logAdminAction('save_campaign', 'platform_campaign', campaign.id || 'new', campaign);
  }

  /**
   * Calendar & Civic Event Management
   */
  async getCivicEvents(): Promise<any[]> {
    const { data } = await supabase
      .from('civic_events')
      .select('*')
      .order('event_date', { ascending: false });
    return data || [];
  }

  async saveCivicEvent(event: any): Promise<void> {
    const payload = { ...event };
    delete payload.id; // Remove ID for insert if not present

    if (event.id) {
      const { error } = await supabase
        .from('civic_events')
        .update(event)
        .eq('id', event.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('civic_events')
        .insert([event]);
      if (error) throw error;
    }

    await this.logAdminAction('save_civic_event', 'civic_event', event.id || 'new', event);
  }

  async deleteCivicEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('civic_events')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await this.logAdminAction('delete_civic_event', 'civic_event', id);
  }

  // ─── ROLE MANAGEMENT ────────────────────────────────────────────────

  async getUserRole(userId?: string | null, userEmail?: string | null): Promise<'admin' | 'core_team' | null> {
    try {
      let uid = userId;
      let email = userEmail;

      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        uid = user.id;
        email = user.email;
      }

      if (email === ROOT_ADMIN_EMAIL) return 'admin';

      const { data: hasAdminRole, error: rpcError } = await supabase.rpc('check_user_is_admin');
      if (!rpcError && hasAdminRole) return 'admin';

      const { data: roleData } = await (supabase
        .from('user_roles') as any)
        .select('role')
        .eq('user_id', uid)
        .maybeSingle();

      if (roleData?.role === 'admin') return 'admin';
      if (roleData?.role === 'core_team') return 'core_team';

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', uid)
        .maybeSingle();

      if (profile?.is_admin) return 'admin';

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is core_team
   */
  async isUserCoreTeam(userId?: string | null, userEmail?: string | null): Promise<boolean> {
    const role = await this.getUserRole(userId, userEmail);
    return role === 'core_team';
  }

  // ─── VOLUNTEER STATUS MANAGEMENT ────────────────────────────────────

  /**
   * Update volunteer application status with notification + email
   */
  async updateVolunteerApplicationStatus(
    applicationId: string,
    newStatus: 'approved' | 'rejected' | 'waitlisted',
    adminMessage?: string
  ): Promise<void> {
    // Update the application status
    const { error } = await supabase
      .from('volunteer_applications')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', applicationId);

    if (error) throw error;

    // Fetch application details for notification
    const { data: app } = await supabase
      .from('volunteer_applications')
      .select('user_id, opportunity_id, volunteer_opportunities(title, organization)')
      .eq('id', applicationId)
      .single();

    if (!app) return;

    const oppData = (app as any).volunteer_opportunities;
    const opportunityTitle = oppData?.title || 'Volunteer Opportunity';
    const organization = oppData?.organization || 'CEKA';

    // Create in-app notification for applicant
    const { notificationService } = await import('@/services/notificationService');
    await notificationService.createVolunteerStatusNotification(
      applicationId,
      app.user_id,
      opportunityTitle,
      newStatus,
      adminMessage
    );

    // Get applicant email for email notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', app.user_id)
      .maybeSingle();

    if (profile?.email) {
      try {
        await supabase.functions.invoke('send-volunteer-confirmation', {
          body: {
            type: 'status_update',
            applicant_email: profile.email,
            applicant_name: profile.full_name || 'Citizen',
            opportunity_title: opportunityTitle,
            opportunity_organization: organization,
            application_id: applicationId,
            new_status: newStatus,
            admin_message: adminMessage
          }
        });
      } catch (emailErr) {
        console.error('Volunteer status email error:', emailErr);
      }
    }

    await this.logAdminAction('update_volunteer_application', 'volunteer_application', applicationId, {
      new_status: newStatus,
      admin_message: adminMessage
    });
  }

  /**
   * Retroactive: Follow up on all previous volunteer applications
   * Sends update emails to all pending applicants
   */
  async processRetroactiveVolunteerFollowUp(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      const { data: pendingApps } = await supabase
        .from('volunteer_applications')
        .select('id, user_id, opportunity_id, status, volunteer_opportunities(title, organization)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (!pendingApps || pendingApps.length === 0) return { processed: 0, failed: 0 };

      for (const app of pendingApps) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', app.user_id)
            .maybeSingle();

          if (!profile?.email) continue;

          const oppData = (app as any).volunteer_opportunities;

          // Send retroactive update email
          await supabase.functions.invoke('send-volunteer-confirmation', {
            body: {
              type: 'retroactive_update',
              applicant_email: profile.email,
              applicant_name: profile.full_name || 'Citizen',
              opportunity_title: oppData?.title || 'Volunteer Opportunity',
              opportunity_organization: oppData?.organization || 'CEKA',
              application_id: app.id
            }
          });

          // Create in-app notification
          const { notificationService } = await import('@/services/notificationService');
          await notificationService.createVolunteerApplicationNotification(
            app.id,
            app.user_id,
            profile.email,
            oppData?.title || 'Volunteer Opportunity'
          );

          processed++;

          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch {
          failed++;
        }
      }
    } catch (error) {
      console.error('Retroactive volunteer follow-up error:', error);
    }

    await this.logAdminAction('retroactive_volunteer_followup', 'system', undefined, { processed, failed });
    return { processed, failed };
  }

  /**
   * Process retroactive onboarding for existing community members
   */
  async processRetroactiveOnboarding(): Promise<{ processed: number; skipped: number }> {
    const { onboardingService } = await import('@/services/onboardingService');
    const result = await onboardingService.processRetroactiveOnboarding();
    await this.logAdminAction('retroactive_onboarding', 'system', undefined, result);
    return result;
  }

  // ─── EMAIL BROADCAST ────────────────────────────────────────────────

  /**
   * Send a community-wide email broadcast
   */
  async sendBroadcastEmail(subject: string, html: string, audience: 'all' | 'by_interested_bills' | 'by_county'): Promise<any> {
    const { data, error } = await supabase.functions.invoke('send-broadcast-email', {
      body: { subject, html, audience }
    });

    if (error) throw error;

    await this.logAdminAction('send_broadcast_email', 'system', undefined, { subject, audience });
    return data;
  }

  /**
   * Fetch history of past email broadcasts
   */
  async getEmailBroadcastHistory(): Promise<any[]> {
    // Audit logs of type 'send_broadcast_email' serve as history
    const { data, error } = await supabase
      .from('admin_audit_log' as any)
      .select('*')
      .eq('action', 'send_broadcast_email')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const adminService = new AdminService();
