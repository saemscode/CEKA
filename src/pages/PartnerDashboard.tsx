import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Users, Eye, Share2, Handshake, Building2, Check, X,
  Upload, Loader2, ShieldCheck, Bell, TrendingUp, FileText, RefreshCw, AlertCircle
} from 'lucide-react';
import { CEKALoader } from '@/components/ui/ceka-loader';

interface Partner {
  id: string;
  org_name: string;
  org_email: string;
  org_website: string | null;
  org_logo_url: string | null;
  org_bio: string | null;
  tier: string;
  verification_status: string;
  agreement_signed: boolean;
  access_level: string;
  tos_version: string | null;
  created_at: string;
}

interface AnalyticsSummary {
  event_type: string;
  total_events: number;
  last_30_days: number;
}

interface CollabInvite {
  id: string;
  status: string;
  invited_at: string;
  from_campaign: { id: string; title: string; organizer: string; slug: string; image_url: string | null };
}

interface CollabProposal {
  id: string;
  proposal_text: string;
  status: string;
  created_at: string;
  media_item?: { id: string; title: string };
  campaign?: { id: string; title: string };
}

const CURRENT_TOS_VERSION = '2026-07-08-v1';

const PartnerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary[]>([]);
  const [invites, setInvites] = useState<CollabInvite[]>([]);
  const [proposals, setProposals] = useState<CollabProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Profile edit state
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // TOS re-consent state
  const [tosBlocked, setTosBlocked] = useState(false);
  const [agreeingTos, setAgreeingTos] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load partner record
      const { data: p, error: pErr } = await (supabase.from('partners' as any) as any)
        .select('*')
        .eq('submitted_by_user_id', user.id)
        .maybeSingle();

      if (pErr) throw pErr;
      if (!p) { navigate('/'); return; }

      setPartner(p);
      setEditBio(p.org_bio || '');
      setEditWebsite(p.org_website || '');

      // Check TOS version block
      if (p.tos_version !== CURRENT_TOS_VERSION) {
        setTosBlocked(true);
      }

      // Load analytics
      const { data: analyticsData } = await supabase.rpc('get_partner_dashboard' as any, {
        p_partner_id: p.id,
      });
      setAnalytics(analyticsData || []);

      // Load pending invites addressed to this partner
      const { data: inviteData } = await (supabase.from('collaboration_invites' as any) as any)
        .select(`*, from_campaign:from_campaign_id (id, title, organizer, slug, image_url)`)
        .eq('partner_id', p.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });
      setInvites(inviteData || []);

      // Load proposals made by this user
      const { data: propData } = await (supabase.from('collaboration_proposals' as any) as any)
        .select(`*, media_item:media_item_id (id, title), campaign:campaign_id (id, title)`)
        .eq('partner_id', p.id)
        .order('created_at', { ascending: false });
      setProposals(propData || []);

    } catch (err: any) {
      toast({ title: 'Error loading dashboard', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAction = async (invite: CollabInvite, accept: boolean) => {
    setActionLoading(invite.id);
    try {
      const { error: inviteError } = await (supabase.from('collaboration_invites' as any) as any)
        .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
        .eq('id', invite.id);
      if (inviteError) throw inviteError;

      if (accept && partner) {
        const { error: collabError } = await (supabase.from('campaign_collaborations' as any) as any)
          .insert({
            campaign_id: invite.from_campaign.id,
            collaborator_campaign_id: invite.from_campaign.id,
            partner_id: partner.id,
            status: 'active',
            accepted_at: new Date().toISOString(),
          });
        if (collabError) throw collabError;
      }

      toast({ title: accept ? 'Collaboration accepted!' : 'Invite declined', description: accept ? `You are now a partner on "${invite.from_campaign.title}"` : undefined });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!partner || !e.target.files?.[0]) return;
    setUploadingLogo(true);
    try {
      const file = e.target.files[0];
      const path = `partner-logos/${partner.id}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('resources').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(path);
      await (supabase.from('partners' as any) as any)
        .update({ org_logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', partner.id);
      toast({ title: 'Logo updated!' });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!partner) return;
    setSavingProfile(true);
    try {
      const { error } = await (supabase.from('partners' as any) as any)
        .update({ org_bio: editBio, org_website: editWebsite, updated_at: new Date().toISOString() })
        .eq('id', partner.id);
      if (error) throw error;
      toast({ title: 'Profile saved!' });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAcceptTos = async () => {
    if (!partner || !user) return;
    setAgreeingTos(true);
    try {
      await (supabase.from('partner_agreements_log' as any) as any).insert({
        partner_id: partner.id,
        user_id: user.id,
        tos_version: CURRENT_TOS_VERSION,
        document_hash: 'sha256-placeholder-2026-07-08-v1',
      });
      await (supabase.from('partners' as any) as any)
        .update({ tos_version: CURRENT_TOS_VERSION, updated_at: new Date().toISOString() })
        .eq('id', partner.id);
      setTosBlocked(false);
      toast({ title: 'Agreement accepted', description: 'Your co-signing is logged and timestamped.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAgreeingTos(false);
    }
  };

  const statVal = (type: string) =>
    analytics.find(a => a.event_type === type)?.total_events ?? 0;
  const statLast30 = (type: string) =>
    analytics.find(a => a.event_type === type)?.last_30_days ?? 0;

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-[60vh]">
        <CEKALoader variant="scanning" size="lg" text="Loading Partner Dashboard..." />
      </div>
    </Layout>
  );

  if (!partner) return null;

  const isVerified = ['credible', 'premium'].includes(partner.verification_status);

  return (
    <Layout>
      <div className="container py-10 max-w-5xl mx-auto space-y-8">

        {/* TOS Block Gate */}
        <AnimatePresence>
          {tosBlocked && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-amber-400/40 bg-amber-50 dark:bg-amber-900/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-black text-amber-900 dark:text-amber-300">Partnership Agreement Updated</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">You must co-sign the new CEKA Partnership Agreement (v{CURRENT_TOS_VERSION}) to continue collaborating.</p>
                </div>
              </div>
              <Button
                onClick={handleAcceptTos}
                disabled={agreeingTos}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shrink-0"
              >
                {agreeingTos ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Co-Sign Agreement'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted border border-border flex items-center justify-center">
              {partner.org_logo_url
                ? <img src={partner.org_logo_url} className="w-full h-full object-contain" alt={partner.org_name} />
                : <Building2 className="w-7 h-7 text-muted-foreground" />
              }
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                {partner.org_name}
                {isVerified && <ShieldCheck className="w-5 h-5 text-green-500 fill-green-500/10" />}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="capitalize rounded-xl text-xs font-bold">{partner.tier} Tier</Badge>
                <Badge variant="outline" className={`capitalize rounded-xl text-xs font-bold ${isVerified ? 'text-green-600 border-green-300' : 'text-yellow-600 border-yellow-300'}`}>
                  {partner.verification_status}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-2 rounded-xl">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Eye, label: 'Total Views', type: 'view', color: 'text-blue-500' },
            { icon: Share2, label: 'Shares', type: 'share', color: 'text-purple-500' },
            { icon: Handshake, label: 'Collab Clicks', type: 'collab_click', color: 'text-kenya-green' },
            { icon: TrendingUp, label: 'Completions', type: 'slide_complete', color: 'text-orange-500' },
          ].map(({ icon: Icon, label, type, color }) => (
            <motion.div key={type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-xl">
                <CardContent className="p-5">
                  <Icon className={`w-5 h-5 ${color} mb-3`} />
                  <p className="text-2xl font-black tabular-nums">{statVal(type).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-semibold">
                    +{statLast30(type)} last 30d
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="invites">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-full flex">
            <TabsTrigger value="invites" className="flex-1 rounded-lg text-xs font-bold">
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Invites {invites.length > 0 && `(${invites.length})`}
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex-1 rounded-lg text-xs font-bold">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              My Proposals
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex-1 rounded-lg text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Invites Tab */}
          <TabsContent value="invites" className="mt-6 space-y-4">
            {invites.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border-2 border-dashed border-border/50">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No pending collaboration invites.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">When CEKA sends you an invite, it will appear here.</p>
              </div>
            ) : invites.map((invite) => (
              <motion.div key={invite.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden">
                  <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-muted border border-border shrink-0">
                        {invite.from_campaign.image_url
                          ? <img src={invite.from_campaign.image_url} className="w-full h-full object-cover" alt="" />
                          : <div className="w-full h-full flex items-center justify-center bg-kenya-green/10 text-kenya-green"><Handshake className="w-5 h-5" /></div>
                        }
                      </div>
                      <div>
                        <p className="font-black text-foreground">{invite.from_campaign.title}</p>
                        <p className="text-xs text-muted-foreground font-medium">By {invite.from_campaign.organizer}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                          {new Date(invite.invited_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
                        disabled={actionLoading === invite.id}
                        onClick={() => handleInviteAction(invite, false)}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl bg-kenya-green hover:bg-kenya-green/90 text-white shadow-lg shadow-kenya-green/20 font-bold"
                        disabled={actionLoading === invite.id}
                        onClick={() => handleInviteAction(invite, true)}
                      >
                        {actionLoading === invite.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <><Check className="w-3.5 h-3.5 mr-1" /> Accept</>
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="mt-6 space-y-4">
            {proposals.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border-2 border-dashed border-border/50">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No proposals submitted yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Use the "Propose Collab" button on any Piece to submit a proposal.</p>
              </div>
            ) : proposals.map((p) => (
              <Card key={p.id} className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">
                        {p.media_item?.title || p.campaign?.title || 'General Proposal'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.proposal_text}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-2">
                        {new Date(p.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge variant="outline" className={`capitalize rounded-xl text-xs font-bold shrink-0 ${
                      p.status === 'converted' ? 'text-green-600 border-green-300' :
                      p.status === 'rejected' ? 'text-red-500 border-red-300' :
                      'text-yellow-600 border-yellow-300'
                    }`}>
                      {p.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-black">Organisation Branding</CardTitle>
                <p className="text-sm text-muted-foreground">This information appears publicly on all campaigns and Pieces you collaborate on.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Organisation Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                      {partner.org_logo_url
                        ? <img src={partner.org_logo_url} className="w-full h-full object-contain" alt="" />
                        : <Building2 className="w-8 h-8 text-muted-foreground" />
                      }
                    </div>
                    <div>
                      <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                      <Button asChild variant="outline" className="rounded-xl border-2 font-bold text-xs gap-2 cursor-pointer" disabled={uploadingLogo}>
                        <label htmlFor="logo-upload">
                          {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Upload Logo
                        </label>
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-1">PNG or SVG recommended. Max 2MB.</p>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="org-bio" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Organisation Bio</Label>
                  <Textarea
                    id="org-bio"
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    placeholder="Brief description of your organisation's mission and civic focus..."
                    className="rounded-xl resize-none min-h-[100px]"
                    maxLength={500}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{editBio.length}/500</p>
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="org-website" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Website</Label>
                  <Input
                    id="org-website"
                    value={editWebsite}
                    onChange={e => setEditWebsite(e.target.value)}
                    placeholder="https://yourorg.co.ke"
                    className="rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-kenya-green hover:bg-kenya-green/90 text-white font-bold rounded-xl"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default PartnerDashboard;
