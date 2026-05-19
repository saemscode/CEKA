import { supabase } from '@/integrations/supabase/client';

export interface ScheduledPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduled_at: string;
  created_at: string;
  author: string;
}

export interface GeneratedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  html_content: string;
  seo_keywords: string[];
  meta_description: string;
  word_count: number;
  ai_model_used: string;
  status: string;
  submitted_for_review_at: string;
  created_at: string;
}

class BlogSchedulerService {
  /**
   * Get all posts that are scheduled for future publication
   */
  async getScheduledPosts(): Promise<ScheduledPost[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, status, scheduled_at, created_at, author')
      .eq('status', 'draft')
      .not('scheduled_at', 'is', null)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled posts:', error);
      return [];
    }

    return (data as ScheduledPost[]) || [];
  }

  /**
   * Get posts that are due for publication (scheduled_at <= now, still draft)
   */
  async getDueForPublication(): Promise<ScheduledPost[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, status, scheduled_at, created_at, author')
      .eq('status', 'draft')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching due posts:', error);
      return [];
    }

    return (data as ScheduledPost[]) || [];
  }

  /**
   * Publish all posts that are due (scheduled_at <= now)
   * Returns number of posts published
   */
  async publishDuePosts(): Promise<number> {
    const duePosts = await this.getDueForPublication();
    let published = 0;

    for (const post of duePosts) {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (!error) {
        published++;

        // Create notification for all users that opted into blog updates
        await this.notifyBlogSubscribers(post.id, post.title);
      }
    }

    return published;
  }

  /**
   * Get AI-generated articles awaiting admin review
   */
  async getGeneratedArticles(): Promise<GeneratedArticle[]> {
    try {
      const { data, error } = await (supabase
        .from('generated_articles') as any)
        .select('*')
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching generated articles:', error);
        return [];
      }

      return (data as GeneratedArticle[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Approve a generated article and bridge it to blog_posts as a draft
   */
  async approveGeneratedArticle(articleId: string, adminNotes?: string): Promise<string | null> {
    try {
      // Fetch the generated article
      const { data: article, error: fetchError } = await (supabase
        .from('generated_articles') as any)
        .select('*')
        .eq('id', articleId)
        .single();

      if (fetchError || !article) {
        console.error('Error fetching generated article:', fetchError);
        return null;
      }

      // Insert into blog_posts as a draft
      const { data: blogPost, error: insertError } = await supabase
        .from('blog_posts')
        .insert({
          title: article.title,
          slug: article.slug,
          content: article.content,
          excerpt: article.excerpt,
          status: 'draft',
          author: 'CEKA AI',
          meta_description: article.meta_description,
          tags: article.seo_keywords || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating blog post from article:', insertError);
        return null;
      }

      // Update generated_articles status to approved
      await (supabase
        .from('generated_articles') as any)
        .update({
          status: 'approved',
          admin_notes: adminNotes || null,
          approved_at: new Date().toISOString(),
          blog_post_id: blogPost?.id
        })
        .eq('id', articleId);

      return blogPost?.id || null;
    } catch (error) {
      console.error('Approve generated article error:', error);
      return null;
    }
  }

  /**
   * Reject a generated article
   */
  async rejectGeneratedArticle(articleId: string, reason: string): Promise<void> {
    try {
      await (supabase
        .from('generated_articles') as any)
        .update({
          status: 'rejected',
          admin_notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);
    } catch (error) {
      console.error('Reject generated article error:', error);
    }
  }

  /**
   * Notify all users who have opted into blog/resource notifications
   */
  private async notifyBlogSubscribers(postId: string, postTitle: string): Promise<void> {
    try {
      // Get all profiles with resource_updates enabled
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
          link: `/blog/${postId}`,
          priority: 'normal',
          metadata: { type: 'blog_published', post_id: postId }
        }));

      if (notifications.length > 0) {
        // Batch insert in chunks of 100
        for (let i = 0; i < notifications.length; i += 100) {
          const batch = notifications.slice(i, i + 100);
          await (supabase.from('user_notifications') as any).insert(batch);
        }
      }
    } catch (error) {
      console.error('Blog subscriber notification error:', error);
    }
  }

  /**
   * Trigger the scheduler check (invoke the edge function)
   */
  async triggerSchedulerCheck(): Promise<{ published: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('publish-scheduled-posts');
      if (error) throw error;
      return data || { published: 0 };
    } catch (error) {
      console.error('Scheduler trigger error:', error);
      // Fallback: run locally
      const published = await this.publishDuePosts();
      return { published };
    }
  }
}

export const blogSchedulerService = new BlogSchedulerService();
