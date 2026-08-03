
import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Helmet } from 'react-helmet-async';
import { useBlog } from '@/hooks/useBlog';
import { BlogList } from '@/components/blog/BlogList';
import { BlogSidebar } from '@/components/blog/BlogSidebar';
import { BlogEditor } from '@/components/blog/BlogEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Search, Settings } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { BlogPost, blogService } from '@/services/blogService';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { CEKALoader } from '@/components/ui/ceka-loader';

const Blog = () => {
  const { posts, loading, createPost, updatePost } = useBlog();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter posts based on search and status
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesStatus = filterStatus === 'all' || post.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Separate posts by status - we only show published posts in the public blog
  const publishedPosts = filteredPosts.filter(post => post.status === 'published');
  const allPosts = publishedPosts; // Drafts are now only handled in Admin Dashboard

  const handleCreateNew = () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to create a post",
        variant: "destructive"
      });
      return;
    }
    setIsCreating(true);
  };

  const handleSavePost = async (post: BlogPost) => {
    try {
      if (editingPost) {
        await updatePost(editingPost.id, post);
        setEditingPost(null);
        toast({
          title: "Success",
          description: "Post updated successfully"
        });
      } else {
        await createPost(post);
        setIsCreating(false);
        toast({
          title: "Success",
          description: "Post submitted for review successfully! You'll be notified once it's approved."
        });
      }

      setTimeout(() => {
        navigate('/blog');
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save post. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setEditingPost(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-24 flex flex-col items-center justify-center min-h-[60vh]">
          <CEKALoader variant="scanning" size="lg" text="Scanning Blog Feed..." />
        </div>
      </Layout>
    );
  }

  if (isCreating || editingPost) {
    return (
      <Layout>
        <div className="container py-8">
          <BlogEditor
            post={editingPost || undefined}
            onSave={handleSavePost}
            onCancel={handleCancelEdit}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>Blog | Civic Insights &amp; Governance Updates | CEKA</title>
        <meta name="description" content="Read the latest civic education insights, governance updates, and democratic participation guides from Civic Education Kenya. Written by citizens, for citizens." />
        <link rel="canonical" href="https://www.civiceducationkenya.com/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.civiceducationkenya.com/blog" />
        <meta property="og:title" content="Blog | Civic Insights &amp; Governance Updates | CEKA" />
        <meta property="og:description" content="Read the latest civic education insights, governance updates, and democratic participation guides from Civic Education Kenya." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="max-w-full">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 break-words">CEKA Blog</h1>
            <p className="text-sm md:text-base text-muted-foreground break-words">
              Insights, updates, and discussions on civic education and governance in Kenya
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-2 md:mt-0 w-full md:w-auto">
            <Button onClick={handleCreateNew} className="flex-1 md:flex-none">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Post
            </Button>

            {isAdmin && (
              <Button variant="outline" asChild className="flex-1 md:flex-none">
                <Link to="/admin/dashboard">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Two-column layout: Main + Sidebar */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* ── Main Content Column ── */}
          <div className="lg:col-span-3 min-w-0 overflow-hidden">
            <Tabs defaultValue="all" className="space-y-6">
              {/* Search + filter bar */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="overflow-x-auto w-full pb-2 no-scrollbar">
                  <TabsList className="min-w-max md:min-w-0 flex">
                    <TabsTrigger value="all">All ({publishedPosts.length})</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <div className="relative flex-1 min-w-[200px] md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="blog-search"
                      name="q"
                      placeholder="Search posts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-full"
                    />
                  </div>

                  {isAdmin && (
                    <Select name="status" value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger id="post-status" className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Tab Content */}
              <TabsContent value="all" className="space-y-4">
                {publishedPosts.length > 0 ? (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold border-b pb-2">
                      Published Posts ({publishedPosts.length})
                    </h2>
                    <BlogList posts={publishedPosts} />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium mb-2">No posts found</h3>
                    <p className="text-muted-foreground">Check back later for new content or create the first post!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Sidebar Column (truly outside main content) ── */}
          <div className="lg:col-span-1 w-full overflow-hidden">
            <BlogSidebar />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Blog;
