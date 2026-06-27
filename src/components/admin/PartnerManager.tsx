import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Users, CheckCircle2, XCircle, AlertCircle, ShieldCheck, FileText, Upload, Download,
  RefreshCw, Search, Award, Coins, Building, Clock, ArrowUpRight, Lock, ExternalLink
} from 'lucide-react';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { motion, AnimatePresence } from 'framer-motion';

interface Partner {
  id: string;
  org_name: string;
  org_email: string;
  org_website: string | null;
  verification_status: 'unverified' | 'credible' | 'premium' | 'rejected' | 'archived';
  tier: 'free' | 'silver' | 'gold' | 'platinum';
  agreement_signed: boolean;
  signed_agreement_url: string | null;
  submitted_by_user_id: string;
  created_at: string;
  updated_at: string;
}

const PartnerManager = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      console.error('Error loading partners:', error);
      toast({
        title: 'Error',
        description: 'Failed to load partners: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: Partner['verification_status']) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          verification_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Partner status updated to ${status}`
      });

      // If partner is selected, update local view
      if (selectedPartner?.id === id) {
        setSelectedPartner(prev => prev ? { ...prev, verification_status: status } : null);
      }

      // If approved as credible or premium, check if role needs to be updated to ally
      const partner = partners.find(p => p.id === id);
      if (partner && (status === 'credible' || status === 'premium')) {
        await supabase
          .from('user_roles')
          .upsert({ user_id: partner.submitted_by_user_id, role: 'ally' }, { onConflict: 'user_id,role' });
      }

      loadPartners();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleTierChange = async (id: string, tier: Partner['tier']) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          tier,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Tier Promoted',
        description: `Partner promoted to ${tier} tier`
      });

      if (selectedPartner?.id === id) {
        setSelectedPartner(prev => prev ? { ...prev, tier } : null);
      }

      loadPartners();
    } catch (error: any) {
      console.error('Error promoting tier:', error);
      toast({
        title: 'Promotion Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleAgreementToggle = async (id: string, signed: boolean) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          agreement_signed: signed,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Agreement Updated',
        description: `Agreement signed marked as ${signed}`
      });

      if (selectedPartner?.id === id) {
        setSelectedPartner(prev => prev ? { ...prev, agreement_signed: signed } : null);
      }

      loadPartners();
    } catch (error: any) {
      console.error('Error updating agreement:', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}_signed_agreement.${fileExt}`;
      const filePath = `partnerships/${fileName}`;

      // Upload file to 'resources' bucket
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update partner row
      const { error: dbError } = await supabase
        .from('partners')
        .update({
          signed_agreement_url: publicUrl,
          agreement_signed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: 'Document Uploaded',
        description: 'Signed partnership agreement has been uploaded and linked successfully.'
      });

      if (selectedPartner?.id === id) {
        setSelectedPartner(prev => prev ? { ...prev, signed_agreement_url: publicUrl, agreement_signed: true } : null);
      }

      loadPartners();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: Partner['verification_status']) => {
    const styles: Record<string, string> = {
      unverified: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      credible: 'bg-green-500/10 text-green-500 border-green-500/20',
      premium: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
      archived: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    };
    return (
      <Badge variant="outline" className={`${styles[status]} capitalize rounded-xl px-2.5 py-0.5 font-semibold text-xs`}>
        {status}
      </Badge>
    );
  };

  const getTierBadge = (tier: Partner['tier']) => {
    const styles: Record<string, string> = {
      free: 'bg-slate-500/10 text-slate-400 border-slate-500/10',
      silver: 'bg-zinc-300/10 text-zinc-300 border-zinc-300/20',
      gold: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      platinum: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    };
    return (
      <Badge variant="outline" className={`${styles[tier]} capitalize rounded-xl px-2.5 py-0.5 font-semibold text-xs`}>
        {tier} Tier
      </Badge>
    );
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch =
      partner.org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.org_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || partner.verification_status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CEKALoader variant="scanning" size="lg" text="Syncing Partner Matrix..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 container mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter">Partners & Allies</h2>
          <p className="text-sm text-muted-foreground font-medium">Verify credentials, promote sponsorship tiers, and manage legal agreements</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPartners} className="gap-2 rounded-xl h-11 border-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partners List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] rounded-xl">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="credible">Credible</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredPartners.length === 0 ? (
              <Card className="py-20 text-center rounded-[32px] border-dashed border-2">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium">No partner applications found.</p>
              </Card>
            ) : (
              filteredPartners.map(partner => (
                <div
                  key={partner.id}
                  onClick={() => setSelectedPartner(partner)}
                  className={`p-5 rounded-[24px] border border-border/40 hover:border-primary/30 bg-card/60 backdrop-blur-xl shadow-sm transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    selectedPartner?.id === partner.id ? 'ring-2 ring-primary bg-primary/5 border-transparent' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-black text-lg flex items-center gap-2 text-foreground">
                      {partner.org_name}
                      {partner.agreement_signed && (
                        <ShieldCheck className="h-4.5 w-4.5 text-green-500 fill-green-500/10" />
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium">{partner.org_email}</p>
                    {partner.org_website && (
                      <a
                        href={partner.org_website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1 font-semibold"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {partner.org_website}
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {getTierBadge(partner.tier)}
                    {getStatusBadge(partner.verification_status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedPartner ? (
              <motion.div
                key={selectedPartner.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-6"
              >
                <Card className="rounded-[32px] border-none shadow-ios-high overflow-hidden bg-card/85 backdrop-blur-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-black leading-tight">{selectedPartner.org_name}</CardTitle>
                    <CardDescription>Partner Profile & Administration</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Status Promoters */}
                    <div className="space-y-4 pt-2 border-t border-border/40">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Verification status</Label>
                        <Select
                          value={selectedPartner.verification_status}
                          onValueChange={v => handleStatusChange(selectedPartner.id, v as any)}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="unverified">Unverified (Pending Review)</SelectItem>
                            <SelectItem value="credible">Credible (Verified Provider)</SelectItem>
                            <SelectItem value="premium">Premium Sponsor</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Partnership Tier</Label>
                        <Select
                          value={selectedPartner.tier}
                          onValueChange={v => handleTierChange(selectedPartner.id, v as any)}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="free">Free Tier</SelectItem>
                            <SelectItem value="silver">Silver Tier</SelectItem>
                            <SelectItem value="gold">Gold Tier</SelectItem>
                            <SelectItem value="platinum">Platinum Tier</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Agreement Status */}
                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground block">Partnership Agreement</Label>
                      
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/20">
                        <span className="text-xs font-bold text-foreground">Signed & Countersigned</span>
                        <Button
                          variant={selectedPartner.agreement_signed ? "default" : "outline"}
                          size="sm"
                          className={`rounded-xl px-4 font-bold text-xs h-8 ${selectedPartner.agreement_signed ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          onClick={() => handleAgreementToggle(selectedPartner.id, !selectedPartner.agreement_signed)}
                        >
                          {selectedPartner.agreement_signed ? 'Signed' : 'Mark Signed'}
                        </Button>
                      </div>

                      {/* File Upload / Link */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-muted-foreground block">Agreement Document</span>
                        
                        {selectedPartner.signed_agreement_url ? (
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <span className="text-xs font-bold truncate max-w-[150px]">Signed_Contract.pdf</span>
                            </div>
                            <a
                              href={selectedPartner.signed_agreement_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              View Contract
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <div className="p-3 text-center rounded-2xl bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center gap-2">
                            <AlertCircle className="h-5 w-5 text-muted-foreground opacity-55" />
                            <span className="text-xs text-muted-foreground font-medium">No signed agreement linked yet.</span>
                          </div>
                        )}

                        <div className="relative">
                          <input
                            type="file"
                            id="agreement-upload"
                            accept="application/pdf,image/*"
                            onChange={e => handleFileUpload(e, selectedPartner.id)}
                            className="hidden"
                            disabled={uploading}
                          />
                          <Button
                            asChild
                            variant="outline"
                            className="w-full rounded-xl h-11 border-2 font-bold text-xs gap-2 cursor-pointer"
                            disabled={uploading}
                          >
                            <label htmlFor="agreement-upload">
                              {uploading ? (
                                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              Upload Signed Document
                            </label>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="pt-4 border-t border-border/40 text-[11px] text-muted-foreground space-y-1.5 font-medium">
                      <div className="flex justify-between">
                        <span>Submitted On</span>
                        <span>{new Date(selectedPartner.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Database Reference</span>
                        <span className="font-mono text-[9px]">{selectedPartner.id}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="p-8 text-center rounded-[32px] border-2 border-dashed border-border/50 bg-card/25 backdrop-blur-xl h-full flex flex-col items-center justify-center py-20">
                <ShieldCheck className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                <h4 className="font-black text-lg mb-1">Partner Administration</h4>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">Select any partner from the list to manage their verification status, tier levels, and co-signed legal agreements.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PartnerManager;
