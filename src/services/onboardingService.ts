import { supabase } from '@/integrations/supabase/client';
import { GamificationService } from '@/services/gamificationService';

export interface OnboardingContext {
  userId: string;
  firstName: string;
  interests: string[];
  isRetroactive: boolean; // true if user already joined before this feature existed
}

class OnboardingService {
  /**
   * Trigger the full onboarding flow for a new or existing community member
   */
  async triggerOnboarding(context: OnboardingContext): Promise<void> {
    const { userId, firstName, interests, isRetroactive } = context;

    try {
      // 1. Create Day 1 welcome notification immediately
      await this.createOnboardingNotification(userId, 1, firstName, isRetroactive);

      // 2. Schedule Day 3 and Day 7 notifications
      await this.scheduleOnboardingNotification(userId, 3, firstName, isRetroactive);
      await this.scheduleOnboardingNotification(userId, 7, firstName, isRetroactive);

      // 3. Auto-follow bills based on interests
      if (interests.length > 0) {
        await this.autoFollowBillsByInterest(userId, interests);
      }

      // 4. Award gamification points
      await this.awardJoinBadge(userId, isRetroactive);

      // 5. Mark onboarding as triggered in profile
      await this.markOnboardingTriggered(userId);

    } catch (error) {
      console.error('Onboarding trigger error:', error);
    }
  }

  /**
   * Create an immediate onboarding notification
   */
  private async createOnboardingNotification(
    userId: string,
    day: number,
    firstName: string,
    isRetroactive: boolean
  ): Promise<void> {
    const content = this.getOnboardingContent(day, firstName, isRetroactive);

    await (supabase
      .from('user_notifications') as any)
      .insert({
        user_id: userId,
        source_type: 'system',
        source_id: `onboarding_day_${day}`,
        title: content.title,
        message: content.message,
        link: content.link,
        priority: day === 1 ? 'high' : 'normal',
        metadata: {
          onboarding_day: day,
          is_retroactive: isRetroactive,
          type: 'onboarding'
        }
      });
  }

  /**
   * Schedule a future onboarding notification
   * Uses a lightweight approach: insert with a future created_at offset marker in metadata
   * The notification will be created by a scheduled check
   */
  private async scheduleOnboardingNotification(
    userId: string,
    day: number,
    firstName: string,
    isRetroactive: boolean
  ): Promise<void> {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + (day - 1));

    const content = this.getOnboardingContent(day, firstName, isRetroactive);

    await (supabase
      .from('user_notifications') as any)
      .insert({
        user_id: userId,
        source_type: 'system',
        source_id: `onboarding_day_${day}_scheduled`,
        title: content.title,
        message: content.message,
        link: content.link,
        priority: 'normal',
        is_read: false,
        metadata: {
          onboarding_day: day,
          is_retroactive: isRetroactive,
          type: 'onboarding',
          scheduled_delivery: scheduledFor.toISOString()
        }
      });
  }

  /**
   * Get onboarding notification content for each day
   */
  private getOnboardingContent(day: number, firstName: string, isRetroactive: boolean): {
    title: string;
    message: string;
    link: string;
  } {
    if (isRetroactive) {
      switch (day) {
        case 1:
          return {
            title: '🎉 Thank You for Being a Day One, ' + firstName + '!',
            message: 'We\'re glad to have you as one of CEKA\'s earliest members. As a Day One supporter, you\'re getting exclusive perks — explore our latest civic tools and stay ahead of the curve. Your early commitment to civic education makes a difference.',
            link: '/tools'
          };
        case 3:
          return {
            title: '📋 Your Legislative Dashboard Awaits',
            message: 'Did you know you can track bills that affect your community? We\'ve auto-followed some bills based on your interests. Head to the Legislative Tracker to see what\'s happening in Parliament right now.',
            link: '/legislative-tracker'
          };
        case 7:
          return {
            title: '💬 Join the Conversation',
            message: 'The CEKA Community is buzzing with fellow citizens discussing governance, legislation, and civic action. Jump into the community chat and make your voice heard.',
            link: '/community'
          };
        default:
          return {
            title: 'CEKA Update',
            message: 'Check out what\'s new on the CEKA platform.',
            link: '/'
          };
      }
    }

    switch (day) {
      case 1:
        return {
          title: '🇰🇪 Welcome to CEKA, ' + firstName + '!',
          message: 'You\'re now part of Kenya\'s growing network of informed citizens. Start by exploring our civic tools — from the Constitution reader to the Legislative Tracker. Your journey towards active citizenship begins here.',
          link: '/tools'
        };
      case 3:
        return {
          title: '📋 Explore Legislative Tracking',
          message: 'Did you know you can follow bills through Parliament? We\'ve auto-followed some bills related to your interests. Check the Legislative Tracker to see how bills are progressing and share your views.',
          link: '/legislative-tracker'
        };
      case 7:
        return {
          title: '💬 Your Community Awaits',
          message: 'Connect with fellow citizens in the CEKA Community. Join discussions, share insights, and participate in campaigns that drive civic change. Your voice matters.',
          link: '/community'
        };
      default:
        return {
          title: 'CEKA Update',
          message: 'Check out what\'s new on the CEKA platform.',
          link: '/'
        };
    }
  }

  /**
   * Auto-follow trending bills based on user interests
   */
  async autoFollowBillsByInterest(userId: string, interests: string[]): Promise<void> {
    try {
      // Map user interest keys to bill categories
      const categoryMap: Record<string, string[]> = {
        'constitution': ['Constitutional Affairs', 'Constitutional Amendment', 'Government', 'Devolution'],
        'legislation': ['Legislative Process', 'Bills', 'Parliamentary Affairs'],
        'human-rights': ['Human Rights', 'Justice', 'Gender', 'Social Protection'],
        'governance': ['Governance', 'Public Service', 'Anti-Corruption', 'Administration'],
        'voter-education': ['Electoral', 'IEBC', 'Voter Registration', 'Elections'],
        'community-projects': ['Community Development', 'County Government', 'Infrastructure', 'Health', 'Education']
      };

      // Collect all matching categories
      const matchingCategories: string[] = [];
      interests.forEach(interest => {
        const cats = categoryMap[interest];
        if (cats) {
          matchingCategories.push(...cats);
        }
      });

      if (matchingCategories.length === 0) return;

      // Fetch trending bills matching categories (top 3 by views)
      const { data: matchingBills } = await supabase
        .from('bills')
        .select('id')
        .in('category', matchingCategories)
        .order('views_count', { ascending: false })
        .limit(3);

      if (!matchingBills || matchingBills.length === 0) {
        // Fallback: follow the 3 most recent bills regardless of category
        const { data: recentBills } = await supabase
          .from('bills')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentBills) {
          for (const bill of recentBills) {
            await this.safeFollowBill(userId, bill.id);
          }
        }
        return;
      }

      for (const bill of matchingBills) {
        await this.safeFollowBill(userId, bill.id);
      }
    } catch (error) {
      console.error('Auto-follow bills error:', error);
    }
  }

  /**
   * Safely follow a bill (ignore duplicates)
   */
  private async safeFollowBill(userId: string, billId: string): Promise<void> {
    try {
      // Check if already following
      const { data: existing } = await (supabase
        .from('bill_follows') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('bill_id', billId)
        .maybeSingle();

      if (existing) return;

      await (supabase
        .from('bill_follows') as any)
        .insert({
          user_id: userId,
          bill_id: billId
        });
    } catch {
      // Silently ignore duplicate key errors
    }
  }

  /**
   * Award gamification points for joining
   */
  private async awardJoinBadge(userId: string, isRetroactive: boolean): Promise<void> {
    try {
      const metadata = isRetroactive
        ? { badge: 'day_one_citizen', retroactive: true }
        : { badge: 'citizen_enrolled' };

      await GamificationService.awardPoints(userId, 'volunteer_signup', metadata);
    } catch (error) {
      console.error('Award join badge error:', error);
    }
  }

  /**
   * Mark onboarding as triggered in profile metadata
   */
  private async markOnboardingTriggered(userId: string): Promise<void> {
    try {
      await (supabase
        .from('profiles') as any)
        .update({
          onboarding_triggered: true,
          onboarding_triggered_at: new Date().toISOString()
        })
        .eq('id', userId);
    } catch {
      // Column may not exist — silent fail
    }
  }

  /**
   * Check if a user has already received onboarding
   */
  async hasReceivedOnboarding(userId: string): Promise<boolean> {
    try {
      const { data } = await (supabase
        .from('user_notifications') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('source_id', 'onboarding_day_1')
        .maybeSingle();

      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Retroactive onboarding: Process all existing community members who haven't received onboarding
   * Called from admin dashboard
   */
  async processRetroactiveOnboarding(): Promise<{ processed: number; skipped: number }> {
    let processed = 0;
    let skipped = 0;

    try {
      // Get all community members
      const { data: members } = await (supabase
        .from('community_members') as any)
        .select('id, first_name, email, areas_of_interest')
        .order('created_at', { ascending: true });

      if (!members || members.length === 0) return { processed: 0, skipped: 0 };

      for (const member of members) {
        // Check if they have a linked auth profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', member.email)
          .maybeSingle();

        if (!profile) {
          skipped++;
          continue;
        }

        // Check if they already received onboarding
        const hasOnboarding = await this.hasReceivedOnboarding(profile.id);
        if (hasOnboarding) {
          skipped++;
          continue;
        }

        // Trigger retroactive onboarding
        await this.triggerOnboarding({
          userId: profile.id,
          firstName: member.first_name || 'Citizen',
          interests: member.areas_of_interest || [],
          isRetroactive: true
        });

        processed++;

        // Rate limit: 50ms between users to avoid overwhelming the DB
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error('Retroactive onboarding error:', error);
    }

    return { processed, skipped };
  }
}

export const onboardingService = new OnboardingService();
