import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { LegislativeMemorandum } from '@/components/bills/LegislativeMemorandum';
import { motion } from 'framer-motion';
import {
  BankIcon, ShareIcon, CommentsIcon, GlobeIcon, SearchIcon, 
  UsersIcon, ChartIcon, ThumbIcon, KenyaIcon, KeyIcon, 
  LocationIcon, CommandIcon, WidgetIcon, ScanIcon, PathIcon, 
  BuildingsIcon, StarIcon, CloseIcon, ArrowLeftIcon, StarIcon as ZapIcon,
  CommentsIcon as MessageSquareIcon, GlobeIcon as GlobeIcon2, ScanIcon as FingerprintIcon,
  BankIcon as ScaleIcon, PathIcon as DownloadCloudIcon, 
  CommandIcon as ZapIcon2, StarIcon as StarIcon2
} from "@/components/ui/CustomIcons";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { SignatureCounter } from '@/components/bills/SignatureCounter';

const TemplateViewerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [billData, setBillData] = useState<any>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [signatureCount, setSignatureCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      let { data, error } = await supabase.from('templates').select('*').eq('slug', id).maybeSingle();

      if (!data && !error) {
        const { data: idData, error: idError } = await supabase.from('templates').select('*').eq('id', id).maybeSingle();
        data = idData;
        error = idError;
      }

      if (error) throw error;
      if (!data) {
        toast({ title: "Template Not Found", variant: "destructive" });
        navigate('/legislative-tracker');
        return;
      }

      setTemplate(data);
      const billId = (data.metadata as any)?.billId || data.id;
      const { data: bill } = await supabase.from('bills').select('*, participation_deadline, signature_goal').eq('id', billId).single();
      if (bill) setBillData(bill);

      const { count } = await supabase.from('signatures').select('*', { count: 'exact', head: true }).eq('bill_id', billId);
      setSignatureCount(count || 0);

      const { data: recentSigners } = await supabase.from('signatures').select('full_name, created_at, county').eq('bill_id', billId).order('created_at', { ascending: false }).limit(5);
      if (recentSigners) setSignatures(recentSigners);

      await supabase.rpc('increment_template_views', { template_id: data.id });

    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeadlineText = () => {
    if (!billData?.participation_deadline) return "Open for Submission";
    const deadline = new Date(billData.participation_deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return "Closed";
    if (days === 0) return "Closes Today";
    return `${days} Days Left`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
          <div className="flex flex-col items-center gap-4">
            <ScanIcon className="h-12 w-12 text-kenya-green" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Template...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 dark:bg-black pt-24 pb-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Top Navigation */}
          <div className="flex items-center justify-between group">
             <Button
                variant="ghost"
                onClick={() => navigate('/legislative-tracker')}
                className="rounded-2xl h-12 px-6 flex items-center gap-3 text-slate-400 hover:text-kenya-green transition-all hover:bg-kenya-green/5"
              >
                <div className="bg-white dark:bg-white/5 p-2 rounded-xl shadow-ios-soft group-hover:-translate-x-1 transition-transform">
                  <ArrowLeftIcon size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Tracker</span>
              </Button>

              <div className="flex items-center gap-4">
                <div className="h-10 px-5 rounded-2xl bg-kenya-green/5 border border-kenya-green/10 flex items-center gap-3">
                  <KeyIcon size={14} className="text-kenya-green" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-kenya-green">Verified Template</span>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: "Link Copied", description: "Link ready to share." });
                  }}
                  className="rounded-2xl h-12 px-6 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <ShareIcon size={14} className="mr-2" />
                  Share Template
                </Button>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Campaign Details */}
            <div className="lg:col-span-5 space-y-10">
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Public Campaign</p>
                <h1 className="text-4xl md:text-6xl font-[1000] tracking-tighter leading-[0.8] text-slate-900 dark:text-white uppercase">
                  {template.title}
                </h1>
                <div className="flex flex-wrap gap-2 pt-2">
                   <div className="px-3 py-1 rounded-full bg-slate-900 dark:bg-white/10 text-white text-[8px] font-black uppercase tracking-widest">
                      ID: {template.slug || template.id.slice(0, 8)}
                   </div>
                   <div className="px-3 py-1 rounded-full bg-kenya-green text-white text-[8px] font-black uppercase tracking-widest">
                      {template.uses_count} Shares
                   </div>
                   {billData?.status && (
                     <div className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 text-[8px] font-black uppercase tracking-widest">
                        {billData.status}
                     </div>
                   )}
                </div>
              </div>

              {/* Momentum Module */}
              <div className="relative p-[1px] rounded-[40px] bg-gradient-to-br from-white/20 to-transparent shadow-ios-high overflow-hidden">
                <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StarIcon size={20} className="h-5 w-5 text-kenya-green" />
                      <p className="text-xs font-black uppercase tracking-[0.2em]">Campaign Progress</p>
                    </div>
                    <div className="text-right">
                       <p className="text-4xl font-[1000] tracking-tighter leading-none">{signatureCount.toLocaleString()}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Signatures</p>
                    </div>
                  </div>

                  <SignatureCounter current={signatureCount} goal={billData?.signature_goal || 1000} variant="compact" className="bg-transparent backdrop-blur-none border-none p-0 shadow-none" />

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Deadline</p>
                        <p className="text-xs font-black">{getDeadlineText()}</p>
                     </div>
                     <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-1 text-right">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-right">Status</p>
                        <p className="text-xs font-black text-kenya-green">Active</p>
                     </div>
                  </div>
                </div>
              </div>

              {/* Live Signal Feed */}
              {signatures.length > 0 && (
                 <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <WidgetIcon size={16} className="text-slate-400" />
                     <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Recent Signatures</h3>
                  </div>
                  <div className="space-y-4">
                    {signatures.map((sig, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/5 group hover:bg-white dark:hover:bg-white/10 transition-all duration-500"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-8 w-8 rounded-full bg-kenya-green/10 flex items-center justify-center text-kenya-green group-hover:scale-110 transition-transform">
                            <StarIcon size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-black tracking-tight">{sig.full_name}</p>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{sig.county || 'Kenya'}</p>
                          </div>
                        </div>
                        <p className="text-[8px] font-black text-slate-300 uppercase">{new Date(sig.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Card */}
              <div className="p-10 rounded-[40px] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                    <BankIcon size={160} />
                 </div>
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                       <KeyIcon size={16} className="text-kenya-green" />
                       <h3 className="text-xs font-black uppercase tracking-[0.2em]">How it works</h3>
                    </div>
                    <p className="text-sm font-medium leading-relaxed opacity-80">
                      "This template uses standardized legal language to ensure your response is officially recognized by Parliament."
                    </p>
                    <div className="flex items-center gap-4 pt-4">
                       <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                          <PathIcon size={20} className="text-white" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Formal Format</p>
                          <p className="text-[8px] opacity-40">Ready for submission</p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Right Column: Submission Form */}
            <div className="lg:col-span-7">
               <LegislativeMemorandum
                 billId={template.metadata?.billId || template.id}
                 billTitle={template.title}
                 billSummary={template.body}
                 deadline={billData?.participation_deadline}
                 constitutionalSection={billData?.constitutional_section}
                 signatureGoal={billData?.signature_goal || 1000}
                 billNo={billData?.bill_no}
                 billHouse={billData?.house}
                 billSessionYear={billData?.session_year}
                 billCategory={billData?.category}
                 billSponsor={billData?.sponsor}
                 billStatus={billData?.status}
                 billNeuralSummary={billData?.neural_summary}
                 billTabloidSummary={billData?.tabloid_summary}
                 billAiConcerns={billData?.ai_concerns}
                 billCurrentStage={billData?.status}
               />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TemplateViewerPage;
