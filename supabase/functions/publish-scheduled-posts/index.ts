import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();
    let publishedCount = 0;
    let bridgedCount = 0;

    // ─── Phase 1: Publish Due Scheduled Posts ──────────────────────────
    const { data: duePosts, error: dueError } = await supabase
      .from("blog_posts")
      .select("id, title, slug, author, scheduled_at")
      .eq("status", "draft")
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now);

    if (dueError) {
      console.error("Error fetching due posts:", dueError);
    }

    if (duePosts && duePosts.length > 0) {
      for (const post of duePosts) {
        const { error: publishError } = await supabase
          .from("blog_posts")
          .update({
            status: "published",
            published_at: now,
            updated_at: now,
          })
          .eq("id", post.id);

        if (!publishError) {
          publishedCount++;

          // Create in-app notifications for users with resource_updates preference on
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, notification_preferences");

          if (profiles) {
            const notifications = profiles
              .filter((p: any) => {
                const prefs = p.notification_preferences as Record<string, boolean> | null;
                return prefs?.resource_updates !== false && prefs?.all_enabled !== false;
              })
              .map((p: any) => ({
                user_id: p.id,
                source_type: "blog_comment",
                source_id: post.id,
                title: "📝 New Blog Post Published",
                message: `"${post.title}" is now live on the CEKA blog. Read it now.`,
                link: `/blog/${post.slug || post.id}`,
                priority: "normal",
                metadata: { type: "blog_published", post_id: post.id },
              }));

            if (notifications.length > 0) {
              // Batch insert in chunks of 100
              for (let i = 0; i < notifications.length; i += 100) {
                const batch = notifications.slice(i, i + 100);
                await supabase.from("user_notifications").insert(batch);
              }
            }
          }
        }
      }
    }

    // ─── Phase 2: Bridge Generated Articles ───────────────────────────
    const { data: pendingArticles, error: articleError } = await supabase
      .from("generated_articles")
      .select("*")
      .eq("status", "submitted")
      .limit(10);

    if (articleError) {
      console.error("Error fetching generated articles:", articleError);
    }

    if (pendingArticles && pendingArticles.length > 0) {
      for (const article of pendingArticles) {
        // Insert as draft blog post
        const { data: newPost, error: insertError } = await supabase
          .from("blog_posts")
          .insert({
            title: article.title,
            slug: article.slug,
            content: article.content || article.html_content,
            excerpt: article.excerpt,
            status: "draft",
            author: "CEKA AI",
            meta_description: article.meta_description,
            tags: article.seo_keywords || [],
            created_at: now,
            updated_at: now,
          })
          .select("id")
          .single();

        if (!insertError && newPost) {
          bridgedCount++;

          // Mark as bridged
          await supabase
            .from("generated_articles")
            .update({
              status: "bridged",
              blog_post_id: newPost.id,
              updated_at: now,
            })
            .eq("id", article.id);
        }
      }
    }

    // ─── Log the operation ────────────────────────────────────────────
    await supabase.from("admin_audit_log").insert({
      action: "scheduled_publish",
      resource_type: "blog_post",
      details: {
        published: publishedCount,
        bridged: bridgedCount,
        run_at: now,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        published: publishedCount,
        bridged: bridgedCount,
        run_at: now,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("publish-scheduled-posts error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
