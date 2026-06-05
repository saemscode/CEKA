import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ShareIcon, MessageSquare, Heart, Bookmark, ThumbsUp, Flag, ThumbsDown, Radio, Shield, AudioWaveform as Audio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PromptInputBox } from '@/components/chat/PromptInputBox';

// Mock discussion data - in a real app this would come from an API
const discussionDetails = {
  id: '1',
  title: "How can we improve voter education in rural areas?",
  author: {
    name: "Jane Mwangi",
    avatar: "JM",
    verified: true
  },
  content: "I believe we need to focus on reaching citizens in rural areas who have limited access to information. There are many challenges including poor internet connectivity and transport infrastructure. What strategies have worked in your communities?\n\nSome ideas I've been considering:\n\n- Mobile education units that can travel to remote villages\n- Partnerships with local radio stations for educational broadcasts\n- Training community leaders to serve as voter education ambassadors\n\nI'd love to hear what has worked in different parts of the country and what challenges others have faced in this area.",
  date: "2025-04-01",
  category: "Civic Education",
  tags: ["Voter Education", "Rural", "Accessibility"],
  comments: 15,
  likes: 32,
  views: 142,
  saved: false,
  liked: false,
  image: null,
  replies: [
    {
      id: 1,
      author: {
        name: "David Omondi",
        avatar: "DO",
        verified: false
      },
      content: "In Nyanza region, we've had success with community radio programs that are broadcast in local languages. We work with local elders to develop content that resonates with specific communities.",
      date: "2025-04-02",
      likes: 12,
      isReply: false
    },
    {
      id: 2,
      author: {
        name: "Sarah Njoroge",
        avatar: "SN",
        verified: true
      },
      content: "Mobile education units have worked well in parts of Rift Valley. The key is developing visual materials that overcome literacy barriers.",
      date: "2025-04-03",
      likes: 8,
      isReply: false
    },
    {
      id: 3,
      author: {
        name: "Michael Kamau",
        avatar: "MK",
        verified: false
      },
      content: "I've seen peer-to-peer education work effectively. Training young people from rural areas who then return to their communities as educators creates trusted messengers.",
      date: "2025-04-03",
      likes: 15,
      isReply: true,
      parentId: 2
    }
  ]
};

const DiscussionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [discussion, setDiscussion] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetchDiscussion();
    fetchComments();
  }, [id]);

  const fetchDiscussion = async () => {
    const { data, error } = await supabase
      .from('discussions')
      .select(`
                *,
                profiles:user_id (
                    full_name,
                    avatar_url
                )
            `)
      .eq('id', id)
      .single();

    if (!error && data) {
      setDiscussion(data);
      setLikeCount(data.likes || 0);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
                *,
                profiles:user_id (
                    full_name,
                    avatar_url
                )
            `)
      .eq('room_id', `discussion_${id}`) // Assuming room nomenclature
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
  };

  const handleLike = async () => {
    if (!discussion || !user) return;
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;

    setLiked(newLiked);
    setLikeCount(newCount);

    await supabase.from('discussions').update({ likes: newCount }).eq('id', id);
  };

  const handleSave = () => {
    setSaved(!saved);
    toast({
      title: saved ? "Removed from bookmarks" : "Added to bookmarks",
      description: saved ? "This discussion has been removed from your saved items." : "This discussion has been saved to your bookmarks.",
    });
  };

  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for helping keep our community safe. We'll review this content shortly.",
    });
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;

    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      room_id: `discussion_${id}`,
      content: comment.trim()
    });

    if (!error) {
      toast({
        title: "Comment posted!",
        description: "Your comment has been added to the discussion.",
      });
      setComment("");
      fetchComments();
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#020617]"><CEKALoader variant="ios" size="lg" /></div>;
  if (!discussion) return <div className="flex h-screen items-center justify-center text-muted-foreground bg-[#f8fafc] dark:bg-[#020617]">Discussion not found.</div>;

  return (
    <Layout>
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] bg-pattern-grid transition-colors duration-700">
        <div className="container max-w-4xl py-12 px-4 font-sans animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Button
            variant="ghost"
            className="mb-8 rounded-2xl hover:bg-white/80 dark:hover:bg-white/5 transition-all text-muted-foreground group backdrop-blur-md shadow-sm border border-white/20"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Assembly
          </Button>

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
          >
            <Card className="border-none shadow-ios-high rounded-[48px] overflow-hidden bg-white/70 dark:bg-black/40 backdrop-blur-3xl mb-12 ring-1 ring-white/20 dark:ring-white/5">
              <CardHeader className="p-8 md:p-12 pb-6">
                <div className="flex flex-wrap items-center gap-3 mb-8">
                  <Badge variant="secondary" className="px-5 py-2 rounded-full bg-primary/10 text-primary border-none text-[10px] font-black tracking-[0.2em] uppercase">
                    {discussion.category}
                  </Badge>
                  {discussion.is_pinned && (
                    <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 text-primary text-[9px] font-black uppercase tracking-[0.15em] bg-primary/5">
                      Priority
                    </Badge>
                  )}
                </div>

                <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-8 leading-[1.05] text-slate-900 dark:text-white drop-shadow-sm">
                  {discussion.title}
                </h1>

                <div className="flex items-center justify-between py-8 border-y border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 rounded-[22px] border-2 border-white dark:border-white/10 shadow-xl">
                        <AvatarImage src={discussion.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/5 text-primary text-xl font-black italic">
                          {discussion.profiles?.full_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 border-4 border-white dark:border-slate-900 rounded-full shadow-lg" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-slate-100 text-xl leading-tight tracking-tight">
                        {discussion.profiles?.full_name || 'Anonymous Citizen'}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                        <span className="text-primary flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Identity Verified
                        </span>
                        <span>•</span>
                        <span>{new Date(discussion.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 bg-white/50 dark:bg-white/5 shadow-ios-soft hover:shadow-ios-high hover:scale-110 transition-all duration-300" onClick={handleSave}>
                      <Bookmark className={cn("h-5 w-5 transition-colors duration-500", saved ? "fill-primary text-primary scale-125" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 bg-white/50 dark:bg-white/5 shadow-ios-soft hover:shadow-ios-high hover:scale-110 transition-all duration-300">
                      <ShareIcon className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 md:p-12 pt-4">
                <div className="prose prose-xl prose-slate dark:prose-invert max-w-none mb-16 leading-relaxed text-slate-700 dark:text-slate-300 font-medium tracking-tight whitespace-pre-wrap">
                  {discussion.content}
                </div>

                {discussion.image && (
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="mb-16 rounded-[32px] overflow-hidden shadow-ios-high border-4 border-white/50 dark:border-white/5"
                  >
                    <img src={discussion.image} alt={discussion.title} className="w-full h-auto object-cover max-h-[600px]" />
                  </motion.div>
                )}

                <div className="flex flex-wrap items-center gap-8 pt-10 border-t border-slate-200/50 dark:border-white/5">
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-16 px-10 rounded-[24px] gap-4 transition-all duration-500 font-black text-lg shadow-ios-soft",
                      liked ? "bg-primary text-white shadow-xl scale-105" : "bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    )}
                    onClick={handleLike}
                  >
                    <Heart className={cn("h-6 w-6 transition-transform duration-500", liked && "fill-white animate-bounce")} />
                    <span>{likeCount} Citizen Endorsements</span>
                  </Button>

                  <div className="flex items-center gap-8 ml-auto">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{comments.length}</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">Dialogs</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <Radio className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{discussion.views || 42}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">Active Insight</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Comment Thread */}
          <div className="space-y-12">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">Citizen Discourse</h3>
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-slate-200 dark:border-white/10 font-black text-[10px] tracking-widest text-muted-foreground italic">
                Direct Democracy in Action
              </Badge>
            </div>

            <div className="relative group p-1 rounded-[36px] bg-gradient-to-br from-primary/20 to-transparent">
              <div className="bg-white/60 dark:bg-black/30 backdrop-blur-3xl rounded-[32px] overflow-hidden border border-white/30 dark:border-white/5 shadow-ios-low">
                <PromptInputBox
                  onSend={(content) => { setComment(content); handleSubmitComment(new Event('submit') as any); }}
                  placeholder="Contribute your intelligence to this assembly..."
                  isLoading={false}
                />
              </div>
            </div>

            <div className="space-y-6 relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200/50 via-slate-200 to-transparent dark:from-white/10 dark:via-white/10" />
              <AnimatePresence mode="popLayout">
                {comments.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="relative pl-14"
                  >
                    <div className="absolute left-0 top-6 h-4 w-4 rounded-full bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-white/20 z-10" />
                    <Card className="border-none shadow-ios-low rounded-[32px] overflow-hidden bg-white/70 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 hover:scale-[1.01] hover:shadow-ios-high transition-all duration-500 group">
                      <CardContent className="p-8">
                        <div className="flex items-start gap-5">
                          <Avatar className="h-12 w-12 rounded-[18px] shadow-lg border-2 border-white dark:border-white/5">
                            <AvatarImage src={item.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-slate-50 dark:bg-white/5 font-black text-[10px] tracking-tight uppercase">
                              {item.profiles?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-black text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-none group-hover:text-primary transition-colors italic">
                                {item.profiles?.full_name || 'Anonymous Citizen'}
                              </p>
                              <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-1">
                                {format(new Date(item.created_at), 'HH:mm • MMM d')}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-bold tracking-tight text-base italic">
                              {item.content}
                            </p>
                            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-100 dark:border-white/5 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
                              <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-all">
                                <ThumbsUp className="h-3 w-3" /> Endorse Response
                              </button>
                              <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-all">
                                <MessageSquare className="h-3 w-3" /> Expand Dialog
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DiscussionDetail;
