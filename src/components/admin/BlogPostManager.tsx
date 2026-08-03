import React, { useState, useEffect } from 'react';
import { blogService, BlogPost } from '@/services/blogService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, EyeOff, Archive, Trash2, Search, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BlogPostManager = () => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const { toast } = useToast();

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            setLoading(true);
            const data = await blogService.getAllPosts();
            setPosts(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load blog posts",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: 'published' | 'draft' | 'archived') => {
        try {
            await blogService.updatePost(id, { status: newStatus });
            toast({
                title: "Status Updated",
                description: `Post is now ${newStatus}.`
            });
            // Update local state
            setPosts(posts.map(post => post.id === id ? { ...post, status: newStatus } : post));
        } catch (error) {
            toast({
                title: "Update Failed",
                description: "Could not update post status",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;
        
        try {
            await blogService.deletePost(id);
            toast({
                title: "Post Deleted",
                description: "The blog post has been permanently removed."
            });
            setPosts(posts.filter(post => post.id !== id));
        } catch (error) {
            toast({
                title: "Delete Failed",
                description: "Could not delete post",
                variant: "destructive"
            });
        }
    };

    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (post.author && post.author.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <CEKALoader variant="scanning" size="lg" text="Loading posts..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/20 p-6 rounded-3xl border border-white/5 shadow-inner">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <FileText className="text-primary" /> Blog Post Manager
                    </h2>
                    <p className="text-xs text-muted-foreground font-bold tracking-wide">
                        Control visibility, archive outdated content, and manage all articles.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search posts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-background/50 border-white/10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-background/50 border-white/10">
                            <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="draft">Drafts</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredPosts.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl bg-muted/5">
                        <p className="text-muted-foreground font-medium">No posts found matching your criteria.</p>
                    </div>
                ) : (
                    filteredPosts.map(post => (
                        <Card key={post.id} className="overflow-hidden hover:border-primary/40 transition-colors">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg truncate" title={post.title}>
                                                {post.title}
                                            </h3>
                                            <Badge variant={post.status === 'published' ? 'default' : post.status === 'draft' ? 'secondary' : 'outline'} 
                                                className={post.status === 'published' ? 'bg-kenya-green hover:bg-kenya-green/80' : ''}>
                                                {post.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                            {post.excerpt || 'No excerpt available.'}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>By {post.author || 'Unknown'}</span>
                                            <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                                            {post.published_at && <span>Published: {new Date(post.published_at).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                        {post.status !== 'published' && (
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleUpdateStatus(post.id, 'published')}
                                                className="bg-kenya-green hover:bg-kenya-green/90 text-white gap-2 flex-1 md:flex-none"
                                            >
                                                <Eye className="w-4 h-4" /> Publish
                                            </Button>
                                        )}
                                        
                                        {post.status !== 'draft' && (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => handleUpdateStatus(post.id, 'draft')}
                                                className="gap-2 flex-1 md:flex-none"
                                            >
                                                <EyeOff className="w-4 h-4" /> Unpublish
                                            </Button>
                                        )}
                                        
                                        {post.status !== 'archived' && (
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                onClick={() => handleUpdateStatus(post.id, 'archived')}
                                                className="gap-2 flex-1 md:flex-none"
                                            >
                                                <Archive className="w-4 h-4" /> Archive
                                            </Button>
                                        )}
                                        
                                        <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            onClick={() => handleDelete(post.id)}
                                            className="gap-2 flex-1 md:flex-none"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default BlogPostManager;
