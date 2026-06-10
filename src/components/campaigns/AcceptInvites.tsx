import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const AcceptInvites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invites, isLoading } = useQuery({
    queryKey: ['collaboration_invites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get campaigns where user_id matches current user
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', user.id);
      
      if (campaignsError || !userCampaigns?.length) return [];
      
      const campaignIds = userCampaigns.map(c => c.id);
      const { data, error } = await supabase
        .from('collaboration_invites')
        .select(`
          *,
          from_campaign:from_campaign_id (id, title, organizer, slug, image_url)
        `)
        .in('to_campaign_id', campaignIds)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const acceptMutation = useMutation({
    mutationFn: async (invite: any) => {
      // 1. Update invite status
      const { error: inviteError } = await supabase
        .from('collaboration_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invite.id);
      
      if (inviteError) throw inviteError;

      // 2. Create actual collaboration record
      const { error: collabError } = await supabase
        .from('campaign_collaborations')
        .insert({
          campaign_id: invite.from_campaign_id,
          collaborator_campaign_id: invite.to_campaign_id,
          status: 'active',
          accepted_at: new Date().toISOString(),
        });
      
      if (collabError) throw collabError;
    },
    onSuccess: () => {
      toast({ title: 'Collaboration accepted', description: 'You are now collaborating!' });
      queryClient.invalidateQueries({ queryKey: ['collaboration_invites'] });
      queryClient.invalidateQueries({ queryKey: ['campaign_collaborations'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Could not accept invite', variant: 'destructive' });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (invite: any) => {
      const { error } = await supabase
        .from('collaboration_invites')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', invite.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Invite declined' });
      queryClient.invalidateQueries({ queryKey: ['collaboration_invites'] });
    },
  });

  if (isLoading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="animate-spin text-kenya-green" />
    </div>
  );
  
  if (!invites?.length) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-kenya-green" />
        <h3 className="text-lg font-bold">Partnership Requests</h3>
      </div>
      
      {invites.map((invite: any) => (
        <Card key={invite.id} className="overflow-hidden border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
                {invite.from_campaign.image_url ? (
                  <img src={invite.from_campaign.image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-kenya-green/10 text-kenya-green">
                    <Users className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white truncate">{invite.from_campaign.title}</p>
                <p className="text-xs text-slate-500 font-medium tracking-tight">Proposed by {invite.from_campaign.organizer}</p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl font-bold h-10"
                onClick={() => declineMutation.mutate(invite)}
                disabled={declineMutation.isPending || acceptMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" /> Decline
              </Button>
              <Button
                className="flex-1 sm:flex-none bg-kenya-green hover:bg-kenya-green/90 text-white shadow-lg shadow-kenya-green/20 rounded-xl font-bold h-10"
                onClick={() => acceptMutation.mutate(invite)}
                disabled={acceptMutation.isPending || declineMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> Connect</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
