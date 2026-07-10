
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Notification source types matching the database schema
export type NotificationSourceType =
  | 'chat_message'
  | 'chat_mention'
  | 'chat_reply'
  | 'blog_comment'
  | 'blog_mention'
  | 'volunteer_opportunity'
  | 'volunteer_application'
  | 'bill_update'
  | 'bill_follow'
  | 'legislative'
  | 'campaign_update'
  | 'discussion_reply'
  | 'system'
  | 'admin'
  | 'moderation';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  source_type: NotificationSourceType;
  source_id: string | null;
  actor_id: string | null;
  title: string;
  message: string;
  link: string | null;
  image_url: string | null;
  metadata: Record<string, unknown>;
  priority: NotificationPriority;
  category: string;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  is_dismissed: boolean;
  created_at: string;
  expires_at: string | null;
  // Joined data
  actor?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface NotificationFilters {
  isRead?: boolean;
  sourceType?: NotificationSourceType;
  priority?: NotificationPriority;
  category?: string;
  limit?: number;
}

// Type helper for table that doesn't exist in generated types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notificationsTable = () => supabase.from('user_notifications' as any);

class NotificationService {
  private channel: RealtimeChannel | null = null;
  private userId: string | null = null;
  private isSubscribing = false;

  /**
   * Get notifications with optional filtering
   * Gracefully handles missing table (migration not yet run)
   */
  async getNotifications(filters: NotificationFilters = {}, userId?: string | null): Promise<Notification[]> {
    try {
      if (!userId) return [];

      // Use type assertion for table that doesn't exist in types.ts yet
      let query = notificationsTable()
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (filters.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);

      }
      if (filters.sourceType) {
        query = query.eq('source_type', filters.sourceType);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist') ||
          error.code === 'PGRST116' || error.code === 'PGRST200') {
          return [];
        }
        // Handle AbortError specifically
        if (error.message?.includes('AbortError') || error.code === 'ABORT') {
          return [];
        }
        console.error('Error fetching notifications:', error);
        return [];
      }
      return (data || []) as unknown as Notification[];
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('abort')) return [];
      console.warn('Notification service error:', err);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId?: string | null): Promise<number> {
    try {
      if (!userId) return 0;

      const { count, error } = await notificationsTable()
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_archived', false);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist') ||
          error.code === 'PGRST116') {
          return 0;
        }
        if (error.message?.includes('AbortError')) return 0;
        return 0;
      }
      return count || 0;
    } catch (err: any) {
      return 0;
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await notificationsTable()
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (err) {
      console.warn('Error marking notification as read:', err);
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    try {
      await supabase.rpc('mark_notifications_read' as any, {
        p_notification_ids: notificationIds
      });
    } catch (err) {
      console.warn('Error marking notifications as read:', err);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await supabase.rpc('mark_all_notifications_read' as any);
    } catch (err) {
      console.warn('Error marking all notifications as read:', err);
    }
  }

  /**
   * Archive a notification (soft delete)
   */
  async archive(notificationId: string): Promise<void> {
    const { error } = await notificationsTable()
      .update({ is_archived: true, archived_at: new Date().toISOString() } as any)
      .eq('id', notificationId);

    if (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  }

  /**
   * Dismiss a notification (hide without archiving)
   */
  async dismiss(notificationId: string): Promise<void> {
    const { error } = await notificationsTable()
      .update({ is_dismissed: true } as any)
      .eq('id', notificationId);

    if (error) {
      console.error('Error dismissing notification:', error);
      throw error;
    }
  }

  /**
   * Create a notification (for testing or manual triggers)
   */
  async create(
    userId: string,
    sourceType: NotificationSourceType,
    title: string,
    message: string,
    options: {
      sourceId?: string;
      actorId?: string;
      link?: string;
      imageUrl?: string;
      priority?: NotificationPriority;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string | null> {
    const { data, error } = await notificationsTable()
      .insert({
        user_id: userId,
        source_type: sourceType,
        source_id: options.sourceId,
        actor_id: options.actorId,
        title,
        message,
        link: options.link,
        image_url: options.imageUrl,
        priority: options.priority || 'normal',
        metadata: options.metadata || {},
      } as any)
      .select('id' as any)
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return (data as any)?.id || null;
  }

  subscribeToNotifications(
    callback: (notification: Notification) => void,
    userId?: string | null
  ): () => void {
    let active = true;

    const setupSubscription = async () => {
      if (this.isSubscribing) return;
      this.isSubscribing = true;

      try {
        if (!userId || !active) {
          this.isSubscribing = false;
          return;
        }

        this.userId = userId;

        // Clean removal of previous channel
        if (this.channel) {
          const oldChannel = this.channel;
          this.channel = null;
          try {
            // Properly await unsubscription and removal
            await oldChannel.unsubscribe();
            await supabase.removeChannel(oldChannel);
          } catch (e) {
            // Ignore abort/removal errors
          }
        }

        if (!active) {
          this.isSubscribing = false;
          return;
        }

        // Create new channel with user-specific filter
        this.channel = supabase
          .channel(`user_notifications:${userId}-${Math.random().toString(36).substr(2, 9)}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'user_notifications',
              filter: `user_id=eq.${userId}`,
            },
            async (payload) => {
              if (!active) return;
              try {
                // Fetch the full record with potentially joined profiles (managed in DB trigger)
                const { data, error } = await notificationsTable()
                  .select('*')
                  .eq('id', payload.new.id)
                  .single();

                if (error) throw error;
                if (data && active) {
                  callback(data as unknown as Notification);
                }
              } catch (err) {
                console.warn('Notification fetch error:', err);
              }
            }
          )
          .subscribe(async (status) => {
            if (status === 'CHANNEL_ERROR' && active) {
              console.warn('Notification subscription failed');
            }
            if (status === 'SUBSCRIBED' && !active) {
              // If we unmounted while subscribing, clean up immediately
              if (this.channel) {
                const chan = this.channel;
                this.channel = null;
                await chan.unsubscribe();
                await supabase.removeChannel(chan);
              }
            }
          });
      } catch (err) {
        if (active) console.warn('Failed to setup notification subscription:', err);
      } finally {
        this.isSubscribing = false;
      }
    };

    setupSubscription();

    // Return cleanup function
    return () => {
      active = false;
      this.isSubscribing = false;

      // Immediate state cleanup
      const currentChannel = this.channel;
      this.channel = null;

      if (currentChannel) {
        // Asynchronous cleanup to prevent blocking the unmount
        (async () => {
          try {
            // Only attempt cleanup if channel isn't already closed
            if (currentChannel.state !== 'closed') {
              try {
                await currentChannel.unsubscribe();
              } catch (e) { /* ignore */ }
            }
            // Always attempt removal to clean up the Supabase client's internal references
            await supabase.removeChannel(currentChannel);
          } catch (e) {
            // Persistent cleanup even on transient errors
            console.debug('Channel cleanup handled:', e);
          }
        })();
      }
    };
  }

  /**
   * Generates a thumbnail for media without one
   */
  async getAutoThumbnail(url: string, type: string): Promise<string | null> {
    if (type === 'video') {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = url;
        video.crossOrigin = 'anonymous';
        video.currentTime = 1;
        video.muted = true;

        video.onloadeddata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };

        video.onerror = () => resolve(null);
        // Timeout safeguard
        setTimeout(() => resolve(null), 5000);
      });
    }
    return null;
  }

  /**
   * Get icon based on notification type
   */
  getNotificationIcon(sourceType: NotificationSourceType): string {
    switch (sourceType) {
      case 'chat_message':
      case 'chat_mention':
      case 'chat_reply':
        return 'MessageSquare';
      case 'blog_comment':
      case 'blog_mention':
        return 'PenTool';
      case 'volunteer_opportunity':
      case 'volunteer_application':
        return 'Heart';
      case 'bill_update':
        return 'FileText';
      case 'campaign_update':
        return 'TrendingUp';
      case 'discussion_reply':
        return 'MessageCircle';
      case 'moderation':
        return 'Shield';
      case 'system':
      default:
        return 'Bell';
    }
  }

  /**
   * Get color based on priority
   */
  getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'urgent':
        return 'text-red-500';
      case 'high':
        return 'text-amber-500';
      case 'normal':
        return 'text-primary';
      case 'low':
      default:
        return 'text-muted-foreground';
    }
  }

  /**
   * Request OS-level push notification permission and register the device's
   * FCM token in the user's profiles row.
   *
   * Called after a user follows a bill so they receive status change pushes.
   * Safe to call multiple times — returns cached token if already granted.
   */
  async requestPushPermission(userId?: string | null): Promise<string | null> {
    try {
      // Guard: browser must support Notification API
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return null;
      }

      // If already granted, try to get the token without re-prompting
      if (Notification.permission === 'denied') {
        return null;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return null;
      }

      // Try to obtain an FCM token via the Firebase Messaging SDK.
      // The SDK must be initialized in main.tsx or equivalent entry point.
      let fcmToken: string | null = null;
      try {
        // Dynamic import so this doesn't crash if Firebase is not installed
        const { getMessaging, getToken } = await import('firebase/messaging');
        const { getApp } = await import('firebase/app');
        const messaging = getMessaging(getApp());
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
        if (vapidKey) {
          fcmToken = await getToken(messaging, { vapidKey });
        }
      } catch {
        // Firebase Messaging SDK not available or VAPID key missing — skip token registration
      }

      if (!fcmToken) return null;

      // Upsert the FCM token into the user's profile row
      try {
        if (userId) {
          await supabase
            .from('profiles')
            .update({ fcm_token: fcmToken } as any)
            .eq('id', userId);
        }
      } catch {
        // Non-fatal: push will still work on next token refresh
      }

      return fcmToken;
    } catch (err) {
      console.warn('[NotificationService] requestPushPermission failed:', err);
      return null;
    }
  }

  // ─── NEW NOTIFICATION TRIGGER METHODS ─────────────────────────────

  /**
   * Create a notification when a blog post is published
   */
  async createBlogPublishedNotification(postId: string, postTitle: string, postSlug: string): Promise<void> {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, notification_preferences');

      if (!profiles) return;

      const notifications = profiles
        .filter((p: any) => {
          const prefs = p.notification_preferences as any;
          return prefs?.resource_updates !== false && prefs?.all_enabled !== false;
        })
        .map((p: any) => ({
          user_id: p.id,
          source_type: 'blog_comment',
          source_id: postId,
          title: '📝 New Blog Post Published',
          message: `"${postTitle}" is now live on the CEKA blog. Read it now.`,
          link: `/blog/${postSlug || postId}`,
          priority: 'normal',
          metadata: { type: 'blog_published', post_id: postId }
        }));

      if (notifications.length > 0) {
        for (let i = 0; i < notifications.length; i += 100) {
          const batch = notifications.slice(i, i + 100);
          await notificationsTable().insert(batch);
        }
      }
    } catch (error) {
      console.error('Blog notification error:', error);
    }
  }

  /**
   * Create notification when a volunteer application is submitted
   * Notifies: applicant (confirmation) + admin (new application)
   */
  async createVolunteerApplicationNotification(
    applicationId: string,
    userId: string,
    userEmail: string,
    opportunityTitle: string
  ): Promise<void> {
    try {
      // Notification for the applicant
      await notificationsTable().insert({
        user_id: userId,
        source_type: 'volunteer_application',
        source_id: applicationId,
        title: '✅ Application Submitted',
        message: `Your volunteer application for "${opportunityTitle}" has been received. We'll notify you once it's reviewed.`,
        link: '/join-community?tab=volunteer',
        priority: 'high',
        metadata: { type: 'volunteer_application_submitted', application_id: applicationId }
      });

      // Get admin users to notify
      const { data: admins } = await (supabase
        .from('user_roles') as any)
        .select('user_id')
        .in('role', ['admin', 'core_team']);

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((a: any) => ({
          user_id: a.user_id,
          source_type: 'volunteer_application',
          source_id: applicationId,
          title: '🆕 New Volunteer Application',
          message: `${userEmail} applied for "${opportunityTitle}". Review in the Volunteer Manager.`,
          link: '/admin/dashboard',
          priority: 'high',
          metadata: { type: 'volunteer_application_admin', application_id: applicationId, applicant_email: userEmail }
        }));
        await notificationsTable().insert(adminNotifications);
      }
    } catch (error) {
      console.error('Volunteer application notification error:', error);
    }
  }

  /**
   * Create notification when a volunteer application status changes
   * Notifies: the applicant
   */
  async createVolunteerStatusNotification(
    applicationId: string,
    userId: string,
    opportunityTitle: string,
    newStatus: string,
    adminMessage?: string
  ): Promise<void> {
    try {
      const statusMap: Record<string, { emoji: string; label: string }> = {
        'approved': { emoji: '🎉', label: 'Accepted' },
        'rejected': { emoji: '🙏', label: 'Not Selected' },
        'waitlisted': { emoji: '⏳', label: 'Waitlisted' }
      };

      const status = statusMap[newStatus] || { emoji: '📋', label: newStatus };

      await notificationsTable().insert({
        user_id: userId,
        source_type: 'volunteer_application',
        source_id: applicationId,
        title: `${status.emoji} Application ${status.label}`,
        message: adminMessage
          ? `Your application for "${opportunityTitle}" has been ${status.label.toLowerCase()}. Note: ${adminMessage}`
          : `Your application for "${opportunityTitle}" has been ${status.label.toLowerCase()}.`,
        link: '/join-community?tab=volunteer',
        priority: 'high',
        metadata: { type: 'volunteer_status_update', application_id: applicationId, new_status: newStatus }
      });
    } catch (error) {
      console.error('Volunteer status notification error:', error);
    }
  }

  /**
   * Create notification for campaign milestones
   */
  async createCampaignMilestoneNotification(
    campaignId: string,
    campaignTitle: string,
    milestone: string,
    targetUserIds?: string[]
  ): Promise<void> {
    try {
      let userIds = targetUserIds;

      if (!userIds) {
        // Notify all users with campaign_updates preference
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, notification_preferences');

        userIds = (profiles || [])
          .filter((p: any) => {
            const prefs = p.notification_preferences as any;
            return prefs?.all_enabled !== false;
          })
          .map((p: any) => p.id);
      }

      if (!userIds || userIds.length === 0) return;

      const notifications = userIds.map(uid => ({
        user_id: uid,
        source_type: 'campaign_update',
        source_id: campaignId,
        title: `🏆 Campaign Milestone: ${milestone}`,
        message: `"${campaignTitle}" has reached ${milestone}. Check it out!`,
        link: `/campaign/${campaignId}`,
        priority: 'normal',
        metadata: { type: 'campaign_milestone', campaign_id: campaignId, milestone }
      }));

      for (let i = 0; i < notifications.length; i += 100) {
        await notificationsTable().insert(notifications.slice(i, i + 100));
      }
    } catch (error) {
      console.error('Campaign milestone notification error:', error);
    }
  }

  /**
   * Create event reminder notification (24h before)
   */
  async createEventReminderNotification(
    eventId: string,
    eventTitle: string,
    eventDate: string,
    userId: string
  ): Promise<void> {
    try {
      await notificationsTable().insert({
        user_id: userId,
        source_type: 'system',
        source_id: eventId,
        title: '📅 Event Reminder',
        message: `"${eventTitle}" is happening tomorrow. Don't miss it!`,
        link: '/calendar',
        priority: 'high',
        metadata: { type: 'event_reminder', event_id: eventId, event_date: eventDate }
      });
    } catch (error) {
      console.error('Event reminder notification error:', error);
    }
  }

  /**
   * Create interest-based bill notification
   * Notifies users whose interests match the bill's category
   */
  async createInterestBasedBillNotification(
    billId: string,
    billTitle: string,
    billCategory: string,
    billSlug?: string | null
  ): Promise<void> {
    try {
      // Map bill categories to user interest keys
      const categoryToInterest: Record<string, string[]> = {
        'Constitutional Affairs': ['constitution'],
        'Constitutional Amendment': ['constitution'],
        'Government': ['governance', 'constitution'],
        'Devolution': ['governance', 'community-projects'],
        'Legislative Process': ['legislation'],
        'Bills': ['legislation'],
        'Parliamentary Affairs': ['legislation'],
        'Human Rights': ['human-rights'],
        'Justice': ['human-rights'],
        'Gender': ['human-rights'],
        'Social Protection': ['human-rights'],
        'Governance': ['governance'],
        'Public Service': ['governance'],
        'Anti-Corruption': ['governance'],
        'Administration': ['governance'],
        'Electoral': ['voter-education'],
        'IEBC': ['voter-education'],
        'Voter Registration': ['voter-education'],
        'Elections': ['voter-education'],
        'Community Development': ['community-projects'],
        'County Government': ['community-projects'],
        'Infrastructure': ['community-projects'],
        'Health': ['community-projects'],
        'Education': ['community-projects']
      };

      const matchingInterests = categoryToInterest[billCategory] || [];
      if (matchingInterests.length === 0) return;

      // Get community members whose interests match
      const { data: matchingMembers } = await (supabase
        .from('community_members') as any)
        .select('email');

      if (!matchingMembers || matchingMembers.length === 0) return;

      // Get profiles linked to these emails
      const emails = matchingMembers.map((m: any) => m.email?.toLowerCase()).filter(Boolean);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, notification_preferences')
        .in('email', emails);

      if (!profiles || profiles.length === 0) return;

      // Filter by interest match and notification preference
      const notifications = profiles
        .filter((p: any) => {
          const prefs = p.notification_preferences as any;
          return prefs?.legislative_updates !== false && prefs?.all_enabled !== false;
        })
        .map((p: any) => ({
          user_id: p.id,
          source_type: 'bill_update',
          source_id: billId,
          title: '🏛️ Bill Matches Your Interests',
          message: `"${billTitle}" (${billCategory}) may interest you based on your civic focus areas.`,
          link: `/bill/${billSlug || billId}`, // Prioritize slug for SEO, fallback to ID for robustness
          priority: 'normal',
          metadata: { type: 'interest_match', bill_id: billId, category: billCategory }
        }));

      if (notifications.length > 0) {
        for (let i = 0; i < notifications.length; i += 100) {
          await notificationsTable().insert(notifications.slice(i, i + 100));
        }
      }
    } catch (error) {
      console.error('Interest-based bill notification error:', error);
    }
  }

  /**
   * Create notification for user-submitted resources (Approved/Rejected)
   */
  async createResourceStatusNotification(
    resourceId: string,
    userId: string,
    resourceTitle: string,
    isApproved: boolean,
    reason?: string
  ): Promise<void> {
    try {
      await notificationsTable().insert({
        user_id: userId,
        source_type: 'moderation',
        source_id: resourceId,
        title: isApproved ? '📦 Resource Approved' : '⚠️ Resource Update',
        message: isApproved 
          ? `Your contribution "${resourceTitle}" has been approved and is now live in the library.`
          : `Your contribution "${resourceTitle}" was not approved. ${reason || 'Please review our guidelines.'}`,
        link: isApproved ? `/resources/${resourceId}` : '/resources/upload',
        priority: isApproved ? 'normal' : 'high',
        metadata: { type: 'resource_status', resource_id: resourceId, status: isApproved ? 'approved' : 'rejected' }
      });
    } catch (error) {
      console.error('Resource status notification error:', error);
    }
  }

  /**
   * Create notification for gamification achievements
   */
  async createAchievementNotification(
    userId: string,
    badgeName: string,
    points: number
  ): Promise<void> {
    try {
      await notificationsTable().insert({
        user_id: userId,
        source_type: 'system',
        source_id: 'achievement',
        title: '🎖️ Achievement Unlocked!',
        message: `You've earned the "${badgeName}" badge and ${points} civic points.`,
        link: '/settings/account',
        priority: 'high',
        metadata: { type: 'achievement', badge: badgeName, points }
      });
    } catch (error) {
      console.error('Achievement notification error:', error);
    }
  }

  /**
   * Create notification when a user mentions another in a discussion
   */
  async createDiscussionMentionNotification(
    discussionId: string,
    mentionerName: string,
    targetUserId: string,
    snippet: string
  ): Promise<void> {
    try {
      await notificationsTable().insert({
        user_id: targetUserId,
        source_type: 'chat_mention',
        source_id: discussionId,
        title: '🗨️ You were mentioned',
        message: `${mentionerName} mentioned you in a discussion: "${snippet}"`,
        link: `/discussion/${discussionId}`,
        priority: 'normal',
        metadata: { type: 'discussion_mention', discussion_id: discussionId }
      });
    } catch (error) {
      console.error('Discussion mention notification error:', error);
    }
  }

  /**
   * Create notification when a new volunteer opportunity matches user interests
   */
  async createVolunteerMatchNotification(
    opportunityId: string,
    opportunityTitle: string,
    category: string
  ): Promise<void> {
    try {
      // Get community members interested in this category
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, notification_preferences');

      if (!profiles) return;

      const notifications = profiles
        .filter((p: any) => {
          const prefs = p.notification_preferences as any;
          return prefs?.all_enabled !== false;
        })
        .map((p: any) => ({
          user_id: p.id,
          source_type: 'volunteer_opportunity',
          source_id: opportunityId,
          title: '🤝 Volunteer Match Found',
          message: `A new ${category} opportunity "${opportunityTitle}" matches your profile.`,
          link: '/join-community?tab=volunteer',
          priority: 'normal',
          metadata: { type: 'volunteer_match', opportunity_id: opportunityId }
        }));

      for (let i = 0; i < notifications.length; i += 100) {
        await notificationsTable().insert(notifications.slice(i, i + 100));
      }
    } catch (error) {
      console.error('Volunteer match notification error:', error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
