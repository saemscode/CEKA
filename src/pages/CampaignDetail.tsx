import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShareIcon, Clock, CalendarIcon, Users, HandHelping,
  Heart, CheckCircle2, MessageSquare, Loader2, Rocket,
  ExternalLink, MapPin, Globe, Activity, Image as ImageIcon
} from 'lucide-react';
import { InstagramIcon, TwitterIcon, TiktokIcon, RedditIcon, ArrowLeftIcon, WhatsappIcon, Kenya2Icon, KenyaIcon, AlertIcon } from '@/components/ui/CustomIcons';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { CreateCampaignModal } from '@/components/campaigns/CreateCampaignModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// ── Content Renderer ─────────────────────────────────────────────────────────

/*
 * Detects input format (HTML, Markdown, or plain text) and converts to safe HTML.
 * - HTML strings: sanitised via DOMPurify and returned as-is.
 * - Markdown: converted to HTML via marked, then sanitised.
 * - Plain text: double-newlines → </p><p>, single-newlines → <br>.
 */
const renderContent = (raw: string): string => {
  if (!raw) return '';

  const hasHTML = /<[a-z][\s\S]*>/i.test(raw);

  let html = '';
  if (hasHTML) {
    html = raw;
  } else {
    const mdRegex = /(?:(?:^|\n)#{1,6}\s|\*\*|__|[*+\-]\s|\d+\.\s|\[.+\]\(.+\)|!\[.*\]\(.+\))/;
    if (mdRegex.test(raw)) {
      html = marked.parse(raw, { breaks: true }) as string;
    } else {
      html = raw
        .split(/\n\n+/)
        .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }
  }

  // Bypass both TS errors: TrustedHTML return type and deep instantiation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (DOMPurify as any).sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'iframe', 'video', 'audio'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
  }) as string;
};

// ── Social Button Config ─────────────────────────────────────────────────────

const getSocialButtonConfig = (url: string | null | undefined) => {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    if (hostname.includes('instagram.com')) {
      return { icon: 'Instagram', color: 'bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F58529] text-white shadow-lg hover:shadow-xl transition-all duration-300', label: 'Instagram' };
    }
    if (hostname.includes('tiktok.com')) {
      return { icon: 'TikTok', color: 'bg-black text-white shadow-lg hover:shadow-xl transition-all duration-300', label: 'TikTok' };
    }
    if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
      return { icon: 'Twitter', color: 'bg-black text-white shadow-lg hover:shadow-xl transition-all duration-300', label: 'X' };
    }
    if (hostname.includes('reddit.com')) {
      return { icon: 'Reddit', color: 'bg-[#FF4500] text-white shadow-lg hover:shadow-xl transition-all duration-300', label: 'Reddit' };
    }
    return { icon: 'Globe', color: 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white shadow-sm hover:shadow-md transition-all duration-300 border border-slate-300 dark:border-white/10', label: 'Visit Site' };
  } catch {
    return null;
  }
};

// ── UUID Validator ───────────────────────────────────────────────────────────

const isValidUUID = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

// ── Data fetchers ────────────────────────────────────────────────────────────

const fetchCampaignByIdentifier = async (identifier: string) => {
  // Try slug first
  const { data: bySlug } = await (supabase as any)
    .from('campaigns')
    .select('*')
    .eq('slug', identifier)
    .maybeSingle();

  if (bySlug) return bySlug;

  // Only try UUID if the identifier looks like a UUID
  if (isValidUUID(identifier)) {
    const { data: byId, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', identifier)
      .single();

    if (error) throw error;
    return byId;
  }

  // If not a UUID and slug not found, throw a meaningful error
  throw new Error('Campaign not found');
};

const fetchCampaignCollaborations = async (campaignId: string) => {
  const { data } = await (supabase as any)
    .from('campaign_collaborations')
    .select(`
      *,
      partner:collaborator_campaign_id (id, title, organizer, slug, image_url)
    `)
    .eq('campaign_id', campaignId)
    .eq('status', 'active');
  return data || [];
};

const fetchCampaignMedia = async (campaignId: string) => {
  const { data } = await (supabase as any)
    .from('campaign_media')
    .select(`
      display_order,
      media:media_item_id (*)
    `)
    .eq('campaign_id', campaignId)
    .order('display_order');
  return data?.map((m: any) => m.media) || [];
};

const fetchCampaignFollowStatus = async (campaignId: string, userId: string) => {
  const { data, error } = await supabase
    .from('campaign_participants')
    .select('user_id')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
};

const fetchCampaignUpdates = async (campaignId: string) => {
  const { data } = await (supabase as any)
    .from('campaign_updates')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('date', { ascending: false });
  return data || [];
};

const fetchCampaignSupporters = async (campaignId: string) => {
  const { data } = await (supabase as any)
    .from('campaign_supporters')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('date', { ascending: false })
    .limit(20);
  return data || [];
};

const fetchCampaignComments = async (campaignId: string) => {
  const { data } = await (supabase as any)
    .from('campaign_comments')
    .select(`
      id,
      content,
      created_at,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });
  return data || [];
};

const fetchSimilarCampaigns = async (currentId: string) => {
  const { data } = await supabase
    .from('campaigns')
    .select('id, title, description, image_url, current_count, organizer')
    .eq('status', 'active')
    .neq('id', currentId)
    .limit(3);
  return data || [];
};

// ── Component ────────────────────────────────────────────────────────────────

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => fetchCampaignByIdentifier(id!),
    enabled: !!id,
  });

  const { data: collaborations = [] } = useQuery({
    queryKey: ['campaign_collaborations', campaign?.id],
    queryFn: () => fetchCampaignCollaborations(campaign!.id),
    enabled: !!campaign?.id,
  });

  const { data: linkedMedia = [] } = useQuery({
    queryKey: ['campaign_media', campaign?.id],
    queryFn: () => fetchCampaignMedia(campaign!.id),
    enabled: !!campaign?.id,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ['campaign_participants', campaign?.id, user?.id],
    queryFn: () => fetchCampaignFollowStatus(campaign!.id, user!.id),
    enabled: !!campaign?.id && !!user,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ['campaign_updates', id],
    queryFn: () => fetchCampaignUpdates(id!),
    enabled: !!id,
  });

  const { data: supporters = [] } = useQuery({
    queryKey: ['campaign_supporters', id],
    queryFn: () => fetchCampaignSupporters(id!),
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['campaign_comments', campaign?.id],
    queryFn: () => fetchCampaignComments(campaign!.id),
    enabled: !!campaign?.id,
  });

  const { data: similarCampaigns = [] } = useQuery({
    queryKey: ['similar_campaigns', id],
    queryFn: () => fetchSimilarCampaigns(id!),
    enabled: !!id,
  });

  // ── Mutations (Optimistic) ───────────────────────────────────────────────

  const followMutation = useMutation({
    mutationFn: async (follow: boolean) => {
      if (follow) {
        await supabase
          .from('campaign_participants')
          .insert({ campaign_id: id, user_id: user!.id });
      } else {
        await supabase
          .from('campaign_participants')
          .delete()
          .eq('campaign_id', id)
          .eq('user_id', user!.id);
      }
    },
    onMutate: async (follow) => {
      await queryClient.cancelQueries({ queryKey: ['campaign_participants', id, user?.id] });
      const prev = queryClient.getQueryData(['campaign_participants', id, user?.id]);
      queryClient.setQueryData(['campaign_participants', id, user?.id], follow);
      return { prev };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['campaign_participants', id, user?.id], context?.prev);
      toast({ title: 'Error', description: 'Could not update follow status.', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await (supabase as any)
        .from('campaign_comments')
        .insert({ campaign_id: campaign?.id, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign_comments', campaign?.id] });
      setComment('');
      toast({ title: 'Comment posted!', description: 'Your voice has been added to the campaign.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to post comment. Please try again.', variant: 'destructive' });
    }
  });

  const handleJoinCampaign = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to join a campaign.',
        variant: 'destructive',
      });
      return;
    }
    const currentlyFollowing = !!isFollowing;
    followMutation.mutate(!currentlyFollowing);
    if (!currentlyFollowing) {
      toast({
        title: 'Campaign Joined!',
        description: "You've successfully joined this campaign. We'll send you updates.",
      });
    } else {
      toast({ title: 'Campaign Left', description: 'You have stopped following this campaign.' });
    }
  };

  const handleDonate = () => {
    window.dispatchEvent(new CustomEvent('ceka-toggle-donation'));
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to post a comment.',
        variant: 'destructive',
      });
      return;
    }
    if (comment.trim() && !commentMutation.isPending) {
      commentMutation.mutate(comment.trim());
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: campaign?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied', description: 'Campaign link copied to clipboard.' });
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Campaign link copied to clipboard.' });
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────

  const participantCount = campaign?.current_count || 0;
  const signatureCount = (campaign as any)?.signature_count ?? participantCount;
  const goalCount = campaign?.goal_count || 0;
  const raisedAmount = (campaign as any)?.raised_amount || 0;
  const targetAmount = (campaign as any)?.target_amount || 0;
  const progressValue = goalCount > 0
    ? Math.min(Math.round((participantCount / goalCount) * 100), 100)
    : 0;

  const hasFinancialGoal = targetAmount > 0;
  const hasGallery = Array.isArray((campaign as any)?.gallery) && (campaign as any).gallery.length > 0;
  const isExternal = !!(campaign as any)?.external_url;
  const currency = (campaign as any)?.currency || 'KES';

  // Trusted Organizer Meta mapping
  const organizerMeta = (campaign as any)?.organizer_meta || {};
  const organizerName = organizerMeta.name || (typeof campaign?.organizer === 'string' ? campaign.organizer : 'Community Organizer');
  const organizerLogo = organizerMeta.logo_url || '/logo-white.png';
  const isVerifiedOrg = !!organizerMeta.verified_org;

  // ── Loading / Error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <Layout>
        <div className="flex w-full h-[60vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-kenya-green" />
        </div>
      </Layout>
    );
  }

  if (isError || !campaign) {
    return (
      <Layout>
        <div className="flex flex-col w-full h-[60vh] items-center justify-center space-y-4">
          <p className="text-xl font-bold text-slate-800 dark:text-white">Campaign not found</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </Layout>
    );
  }

  // Fallback for Helmet if missing dependencies
  const renderSEO = () => {
    try {
      // Only renders if installed properly
      return (
        <Helmet>
          <title>{campaign.title} | CEKA: Civic Campaign</title>
          <meta name="description" content={campaign.description?.substring(0, 160) || "Join the civic movement on CEKA."} />
          <meta property="og:title" content={campaign.title} />
          <meta property="og:description" content={campaign.description?.substring(0, 160) || "Join the civic movement on CEKA."} />
          <meta property="og:image" content={campaign.image_url || "/og-image.jpeg"} />
          <meta property="twitter:card" content="summary_large_image" />
        </Helmet>
      );
    } catch (e) {
      return null;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout>
      {renderSEO()}
      <div className="container py-6 md:py-10 overflow-x-hidden">

        {/* Top nav row */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-sm font-bold text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white"
          >
            <ArrowLeftIcon />
            Back to Explore
          </Button>
          <Button
            className="bg-kenya-green hover:bg-kenya-green/90 text-white rounded-full font-bold px-6 shadow-lg shadow-kenya-green/20"
            onClick={() => setIsCreatorModalOpen(true)}
          >
            <Rocket className="w-4 h-4 mr-2" /> Start a Campaign
          </Button>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden mb-6 shadow-xl"
        >
          <img
            src={campaign.image_url || '/logo-white.png'}
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
          {/* Top bevel */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
            <div className="max-w-2xl">
              <Badge className="mb-3 bg-white/15 backdrop-blur-md border-white/20 text-white font-bold text-xs uppercase tracking-wider">
                {(campaign as any).type || 'Civic Action'}
              </Badge>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
                {campaign.title}
              </h1>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 border-2 border-white/40 shadow-lg">
                  <AvatarImage src={organizerLogo} alt={organizerName} />
                  <AvatarFallback className="text-[10px] bg-white/20 text-white font-bold">
                    {organizerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white/90 font-semibold text-sm flex items-center gap-1">
                  {organizerName}
                  {(isVerifiedOrg || (campaign as any)?.organizer?.verified) && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                  )}
                </p>
                {isExternal && (
                  <Badge className="ml-1 bg-amber-500/20 border-amber-400/30 text-amber-300 text-[9px] font-bold uppercase tracking-wider">
                    {organizerMeta.origin_source || 'External Organization'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Main content ── */}
          <div className="lg:col-span-2 min-w-0">
            <Tabs defaultValue="about" className="w-full min-w-0">
              <TabsList className="mb-6 bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl w-full overflow-x-auto flex flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <TabsTrigger value="about" className="rounded-lg shrink-0">About</TabsTrigger>
                <TabsTrigger value="updates" className="rounded-lg shrink-0">
                  Updates {updates.length > 0 && `(${updates.length})`}
                </TabsTrigger>
                {hasFinancialGoal && (
                  <TabsTrigger value="supporters" className="rounded-lg shrink-0">
                    Supporters {supporters.length > 0 && `(${supporters.length})`}
                  </TabsTrigger>
                )}
                <TabsTrigger value="comments" className="rounded-lg shrink-0">Comments {comments.length > 0 && `(${comments.length})`}</TabsTrigger>
              </TabsList>

              {/* About */}
              <TabsContent value="about" className="relative text-wrap animate-in fade-in slide-in-from-bottom-4 w-full min-w-0">
                <div className="prose dark:prose-invert max-w-none w-full min-w-0 text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderContent(
                        (campaign as any).detailed_description ||
                        (campaign as any).content ||
                        campaign.description ||
                        ''
                      ),
                    }}
                  />
                </div>

                {/* External link CTA */}
                {isExternal && (
                  <a
                    href={(campaign as any).external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:border-emerald-500/40 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">View Original Campaign</p>
                      <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Hosted safely on {organizerName}'s external site</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </a>
                )}

                {/* Collaboration Partners */}
                {collaborations.length > 0 && (
                  <div className="mt-8 p-4 rounded-2xl bg-kenya-green/5 border border-kenya-green/20">
                    <h3 className="text-sm font-bold text-kenya-green mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Collaboration Partners
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {collaborations.map((collab: any) => (
                        <Link
                          key={collab.id}
                          to={`/campaign/${collab.partner.slug || collab.partner.id}`}
                          className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 hover:border-kenya-green transition"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={collab.partner.image_url} />
                            <AvatarFallback>{collab.partner.title.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-bold">{collab.partner.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gallery */}
                {(hasGallery || linkedMedia.length > 0) && (
                  <div className="mt-10">
                    <h3 className="text-base font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-kenya-green" /> Campaign Gallery
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Manual Gallery Images */}
                      {hasGallery && (campaign as any).gallery.map((image: string, index: number) => (
                        <motion.div
                          key={`manual-${index}`}
                          whileHover={{ scale: 1.02 }}
                          className="aspect-video rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5"
                        >
                          <img src={image} alt="" className="w-full h-full object-cover" />
                        </motion.div>
                      ))}
                      {/* Linked Media Items */}
                      {linkedMedia.map((media: any) => (
                        <motion.div
                          key={`linked-${media.id}`}
                          whileHover={{ scale: 1.02 }}
                          className="aspect-video rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10 group relative"
                        >
                          <img src={media.url || media.file_path} alt={media.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <p className="text-[10px] text-white font-bold truncate">{media.title}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Updates */}
              <TabsContent value="updates" className="animate-in fade-in">
                <div className="space-y-4">
                  {updates.length === 0 ? (
                    <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                      <AlertIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-white/15 mb-3" />
                      <p className="text-sm font-medium text-slate-500 dark:text-white/40">No updates posted yet.</p>
                    </div>
                  ) : (
                    updates.map((update: any) => (
                      <Card key={update.id} className="border-slate-200 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden">
                        <div className="h-0.5 bg-gradient-to-r from-kenya-green to-emerald-400" />
                        <CardContent className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-base text-slate-800 dark:text-white">{update.title}</h3>
                            <span className="text-xs font-semibold text-slate-400 dark:text-white/30 whitespace-nowrap ml-3">
                              {new Date(update.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{update.content}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Supporters — only renders if financial goal exists */}
              {hasFinancialGoal && (
                <TabsContent value="supporters" className="animate-in fade-in">
                  <div className="space-y-3">
                    {supporters.length === 0 ? (
                      <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                        <Heart className="w-8 h-8 mx-auto text-slate-300 dark:text-white/15 mb-3" />
                        <p className="text-sm font-medium text-slate-500 dark:text-white/40">Be the first to support this campaign!</p>
                      </div>
                    ) : (
                      supporters.map((supporter: any, index: number) => (
                        <Card key={index} className="border-slate-200 dark:border-white/10 shadow-sm rounded-2xl">
                          <CardContent className="p-4 flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                  {supporter.name?.charAt(0) || 'A'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm text-slate-800 dark:text-white">{supporter.name}</p>
                                <p className="text-[11px] font-semibold text-slate-400 dark:text-white/30 mt-0.5 uppercase tracking-wider">
                                  {new Date(supporter.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                                </p>
                                {supporter.comment && (
                                  <p className="text-sm mt-2 italic text-slate-500 dark:text-slate-400">"{supporter.comment}"</p>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="ml-2 shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold"
                            >
                              {supporter.currency || currency} {Number(supporter.amount).toLocaleString()}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Comments */}
              <TabsContent value="comments" className="animate-in fade-in">
                <form onSubmit={handleSubmitComment}>
                  <div className="flex items-start gap-4 mb-8">
                    <Avatar className="w-9 h-9 border border-slate-200 dark:border-white/10 shrink-0">
                      <AvatarFallback className="bg-slate-100 dark:bg-white/5 text-xs font-bold">
                        {user?.user_metadata?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input
                        id="campaign-comment"
                        name="comment"
                        placeholder={user ? 'Add your voice to this campaign...' : 'Sign in to leave a comment...'}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={!user || commentMutation.isPending}
                        className="mb-3 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-xl"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-lg font-bold"
                        disabled={!user || commentMutation.isPending}
                      >
                        {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                  </div>
                </form>
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/30 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                      <MessageSquare className="h-7 w-7 mb-3 opacity-40" />
                      <span className="text-sm font-medium">No comments yet. Join the conversation.</span>
                    </div>
                  ) : (
                    comments.map((c: any) => (
                      <div key={c.id} className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.025] border border-slate-100 dark:border-white/5">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={c.profiles?.avatar_url} />
                          <AvatarFallback className="bg-kenya-green/10 text-kenya-green font-bold text-xs">
                            {c.profiles?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">{c.profiles?.full_name || 'Anonymous'}</span>
                            <span className="text-xs text-slate-400 dark:text-white/30 whitespace-nowrap">
                              {new Date(c.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">

            {/* Campaign progress card */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="border-slate-200 dark:border-white/10 shadow-xl overflow-hidden rounded-2xl relative">
                {/* Visual Trust Indicator (Top right watermark) */}
                <div className="absolute top-0 right-0 p-3 opacity-5">
                  <KenyaIcon className="w-32 h-32 stroke-[1px] mix-blend-overlay" />
                </div>

                <div className="h-1 w-full bg-gradient-to-r from-kenya-green to-emerald-400" />
                <CardContent className="p-6 relative z-10">

                  {/* Signature progress — always shown */}
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-2.5">
                      <span className="text-[10px] uppercase font-bold tracking-[0.16em] text-slate-400 dark:text-white/30">
                        Signatures
                      </span>
                      <span className="font-black text-2xl text-slate-800 dark:text-white tabular-nums">
                        {signatureCount.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      value={progressValue}
                      className="h-2 bg-slate-100 dark:bg-white/5"
                    />
                    <div className="flex justify-between mt-2.5">
                      <span className="text-xs font-bold text-kenya-green">
                        {progressValue}% of {goalCount.toLocaleString()} goal
                      </span>
                      <span className="text-xs font-semibold text-slate-400 dark:text-white/30">
                        {participantCount} joined
                      </span>
                    </div>
                  </div>

                  {/* Financial progress — only renders if target_amount > 0 */}
                  {hasFinancialGoal && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/6 group hover:border-emerald-500/20 transition-colors cursor-default">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-[0.16em] text-slate-400 dark:text-white/30">
                          Raised
                        </span>
                        <span className="font-black text-lg text-slate-800 dark:text-white tabular-nums group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {currency} {Number(raisedAmount).toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={targetAmount > 0 ? Math.min(Math.round((raisedAmount / targetAmount) * 100), 100) : 0}
                        className="h-1.5 bg-slate-200 dark:bg-white/10 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20"
                      />
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-white/40">
                          {targetAmount > 0 ? Math.round((raisedAmount / targetAmount) * 100) : 0}% of {currency} {Number(targetAmount).toLocaleString()}
                        </span>
                        {/* Secure Trust Badge */}
                        <div className="flex items-center text-[9px] font-bold uppercase tracking-wider text-emerald-600/70 border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Verified
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="space-y-3 mb-5">
                    {/* External campaigns redirect instead of follow */}
                    {isExternal ? (
                      <a
                        href={(campaign as any).external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-12 flex items-center justify-center gap-2 font-bold rounded-xl bg-kenya-green hover:bg-[#0ead36] text-white shadow-lg shadow-kenya-green/20 transition-all active:scale-95"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Take Action
                      </a>
                    ) : (
                      <Button
                        className={`w-full font-bold rounded-xl h-12 shadow-lg transition-all active:scale-95 ${isFollowing
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white shadow-none'
                          : 'bg-kenya-green hover:bg-[#0ead36] text-white shadow-kenya-green/20'
                          }`}
                        onClick={handleJoinCampaign}
                        disabled={followMutation.isPending}
                      >
                        {followMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <HandHelping className="mr-2 h-4 w-4" />
                        )}
                        {isFollowing ? 'Following Campaign' : 'Follow Campaign'}
                      </Button>
                    )}

                    {/* Support/donate — only renders if financial goal exists */}
                    {hasFinancialGoal && (
                      <Button
                        variant="outline"
                        className="w-full text-slate-700 dark:text-white font-bold h-12 rounded-xl group hover:border-kenya-red/50 hover:bg-kenya-red/5 dark:hover:bg-kenya-red/10 border-slate-200 dark:border-white/10"
                        onClick={handleDonate}
                      >
                        <Heart className="mr-2 h-4 w-4 group-hover:text-kenya-red transition-colors" />
                        Support Safely
                      </Button>
                    )}

                    {/* Share / Dynamic Social Button Split */}
                    <div className="flex gap-2">
                      {(() => {
                        const socialData = (campaign as any)?.social_share_url;
                        // If socialData is null, undefined, or an empty object, fallback to WhatsApp
                        if (!socialData || typeof socialData !== 'object' || Object.keys(socialData).length === 0) {
                          return (
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`Join me in supporting this campaign through CEKA. All proceeds go directly to the cause:\n\n${campaign.title}\n\n${window.location.href}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center h-11 rounded-xl px-3 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-bold transition-colors"
                            >
                              <WhatsappIcon className="w-4 h-4" />
                              <span className="text-sm ml-2">WhatsApp</span>
                            </a>
                          );
                        }

                        // Map social keys to icon components and colors
                        const socialMap: Record<string, { icon: React.ElementType; color: string }> = {
                          instagram: { icon: InstagramIcon, color: 'bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F58529] text-white shadow-lg hover:shadow-xl transition-all duration-300' },
                          tiktok: { icon: TiktokIcon, color: 'bg-black text-white shadow-lg hover:shadow-xl transition-all duration-300' },
                          twitter: { icon: TwitterIcon, color: 'bg-black text-white shadow-lg hover:shadow-xl transition-all duration-300' },
                          x: { icon: TwitterIcon, color: 'bg-black text-white shadow-lg hover:shadow-xl transition-all duration-300' },
                          reddit: { icon: RedditIcon, color: 'bg-[#FF4500] text-white shadow-lg hover:shadow-xl transition-all duration-300' },
                        };

                        // Filter to only known platforms with valid URLs
                        const entries = Object.entries(socialData).filter(([key, value]) =>
                          socialMap[key.toLowerCase()] && typeof value === 'string' && value.startsWith('http')
                        );

                        if (entries.length === 0) {
                          // Fallback to WhatsApp if no valid social links
                          return (
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`Join me in supporting this campaign through CEKA. All proceeds go directly to the cause:\n\n${campaign.title}\n\n${window.location.href}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center h-11 rounded-xl px-3 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-bold transition-colors"
                            >
                              <WhatsappIcon className="w-4 h-4" />
                              <span className="text-sm ml-2">WhatsApp</span>
                            </a>
                          );
                        }

                        // Render a row of small social buttons
                        return (
                          <div className="flex flex-1 gap-2">
                            {entries.map(([key, url]) => {
                              const normalizedKey = key.toLowerCase();
                              const { icon: Icon, color } = socialMap[normalizedKey];
                              return (
                                <a
                                  key={key}
                                  href={url as string}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex-1 flex items-center justify-center h-11 rounded-xl px-3 font-bold transition-colors ${color} active:scale-95`}
                                >
                                  <Icon className="w-4 h-4" />
                                  <span className="text-xs ml-1 capitalize">{normalizedKey === 'x' ? 'X' : normalizedKey}</span>
                                </a>
                              );
                            })}
                          </div>
                        );
                      })()}
                      <Button
                        variant="ghost"
                        className="flex-[2] h-11 rounded-xl px-4 text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white font-semibold border border-slate-200 dark:border-white/10"
                        onClick={handleShare}
                      >
                        <ShareIcon className="mr-2 h-4 w-4" />
                        Share Link
                      </Button>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="space-y-2.5 border-t border-slate-100 dark:border-white/6 pt-5">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-3.5 w-3.5 text-slate-400 dark:text-white/25 shrink-0" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Started:{' '}
                        {(campaign as any).start_date
                          ? new Date((campaign as any).start_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Active Now'}
                      </span>
                    </div>
                    {(campaign as any).end_date && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-white/25 shrink-0" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          Ends:{' '}
                          {new Date((campaign as any).end_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {(campaign as any).location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-white/25 shrink-0" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {(campaign as any).location}
                        </span>
                      </div>
                    )}

                    {/* Social Pulse Ticker (Recent Activity) */}
                    {supporters.length > 0 && (
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-dashed border-slate-100 dark:border-white/5">
                        <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse shrink-0" />
                        <span className="text-[11px] font-medium text-slate-500 dark:text-white/40 truncate">
                          <span className="font-bold text-slate-700 dark:text-white/70">{(supporters[0] as any).name}</span> supported recently.
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Similar campaigns — live from Supabase */}
            {similarCampaigns.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 dark:bg-white/[0.02] px-5 py-4 border-b border-slate-100 dark:border-white/6">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-white/35">
                      Similar Campaigns
                    </h3>
                  </div>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                      {similarCampaigns.map((sc: any) => (
                        <Link
                          key={sc.id}
                          to={`/campaign/${sc.id}`}
                          className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors group"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-white/8 border border-slate-100 dark:border-white/5">
                            {sc.image_url ? (
                              <img
                                src={sc.image_url}
                                alt={sc.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Rocket className="w-4 h-4 text-slate-400 dark:text-white/20" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-slate-800 dark:text-white truncate group-hover:text-kenya-green transition-colors leading-tight">
                              {sc.title}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 dark:text-white/30 mt-0.5">
                              {sc.current_count || 0} participants
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <CreateCampaignModal
        isOpen={isCreatorModalOpen}
        onClose={() => setIsCreatorModalOpen(false)}
        onSuccess={() => {
          toast({ title: 'Campaign created!' });
        }}
      />
    </Layout>
  );
};

export default CampaignDetail;