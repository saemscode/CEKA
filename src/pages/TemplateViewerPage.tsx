import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { LegislativeMemorandum } from '@/components/bills/LegislativeMemorandum';
import { motion } from 'framer-motion';
import { 
  Zap, ArrowLeft, ShieldCheck, Share2, 
  MessageSquare, ExternalLink, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const TemplateViewerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      // Try by slug first, then by ID
      // @ts-ignore - Table added via custom SQL
      let { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('slug', id)
        .maybeSingle();

      if (!data && !error) {
        // @ts-ignore - Table added via custom SQL
        const { data: idData, error: idError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        data = idData;
        error = idError;
      }

      if (error) throw error;
      if (!data) {
        toast({
          title: "Template Not Found",
          description: "The requested memorandum template does not exist or choice is private.",
          variant: "destructive"
        });
        navigate('/legislative-tracker');
        return;
      }

      setTemplate(data);
      
      // Increment views
      // @ts-ignore - RPC added via custom SQL
      await supabase.rpc('increment_template_views', { template_id: (data as any).id });
      
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: "Synchronization Error",
        description: "Could not retrieve template from Sovereign Database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <Zap className="h-12 w-12 text-gold animate-bounce" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decrypting Template...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Action Bar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between"
          >
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="rounded-xl flex items-center gap-2 text-slate-500 hover:text-midnight dark:hover:text-white"
            >
              <ArrowLeft size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Return to Tracker</span>
            </Button>

            <div className="flex items-center gap-4">
               <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-kenya-green/5 border border-kenya-green/10">
                  <ShieldCheck size={14} className="text-kenya-green" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-kenya-green">Sovereign Protected Template</span>
               </div>
               <Button 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link Copied", description: "Template URL is ready to share." });
                }}
                className="h-10 px-5 rounded-xl border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-white/5"
               >
                 <Share2 size={14} className="mr-2" />
                 <span className="text-[9px] font-black uppercase tracking-widest">Amplify Template</span>
               </Button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             {/* Left Column: Template Context */}
             <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-5 space-y-6"
             >
                <div className="space-y-4">
                   <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight uppercase">
                      {template.title}
                   </h1>
                   <div className="flex flex-wrap gap-2">
                      <Badge className="bg-midnight dark:bg-white/10 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 border-none">
                         Created {new Date(template.created_at).toLocaleDateString()}
                      </Badge>
                      <Badge className="bg-kenya-green text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 border-none">
                         {template.uses_count} Uses
                      </Badge>
                   </div>
                </div>

                <div className="p-6 rounded-[32px] bg-white dark:bg-white/5 shadow-ios-soft space-y-4 border border-black/5 dark:border-white/5">
                   <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <Info size={16} className="text-kenya-green" />
                      About this Memorandum
                   </h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium capitalize">
                      This template was created by a member of the Sovereign community. It has been used {template.uses_count} times to petition government representatives. Using this template helps maintain a unified citizen voice.
                   </p>
                   <div className="pt-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Entities:</p>
                      <div className="flex flex-wrap gap-2">
                         <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-[9px] font-bold uppercase tracking-tighter">Clerk of NA</div>
                         <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-[9px] font-bold uppercase tracking-tighter">Finance Committee</div>
                      </div>
                   </div>
                </div>

                <div className="p-6 rounded-[32px] bg-midnight text-white shadow-xl shadow-midnight/20 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Zap size={80} />
                   </div>
                   <div className="relative z-10 space-y-2">
                      <h4 className="text-sm font-black uppercase tracking-widest">Why use templates?</h4>
                      <p className="text-xs text-white/70 leading-relaxed font-medium">
                         Standardized legal language ensures your objection is recognized formally by the National Assembly. This template has been optimized for clarity and legal impact.
                      </p>
                   </div>
                </div>
             </motion.div>

             {/* Right Column: Active Memorandum Form */}
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="lg:col-span-7"
             >
                <LegislativeMemorandum 
                  billId={template.metadata?.billId || template.id}
                  billTitle={template.title}
                  billSummary={template.body}
                />
             </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TemplateViewerPage;
