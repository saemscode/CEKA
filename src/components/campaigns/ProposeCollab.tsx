import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Handshake, X, Send, Loader2, CheckCircle2 } from 'lucide-react';

interface ProposeCollabProps {
  mediaItemId?: string;
  campaignId?: string;
  contentTitle: string;
  partnerId: string;
  partnerUserId: string;
}

const ProposeCollab: React.FC<ProposeCollabProps> = ({
  mediaItemId,
  campaignId,
  contentTitle,
  partnerId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setLoading(true);
    try {
      const { error } = await (supabase.from('collaboration_proposals' as any) as any).insert({
        partner_id: partnerId,
        media_item_id: mediaItemId || null,
        campaign_id: campaignId || null,
        proposed_by: user.id,
        proposal_text: text.trim(),
        status: 'pending',
      });
      if (error) throw error;
      setSubmitted(true);
      setText('');
      setTimeout(() => { setOpen(false); setSubmitted(false); }, 2500);
      toast({ title: 'Proposal submitted!', description: 'CEKA Admins will review and create a formal invite if approved.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col items-end">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-kenya-green/20 bg-kenya-green/5 hover:bg-kenya-green/10 text-kenya-green text-[10px] font-black uppercase tracking-widest transition-all group"
      >
        <Handshake size={13} className="transition-transform group-hover:scale-110" />
        Propose Collab
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="w-full mt-3 rounded-2xl border border-kenya-green/20 bg-white/80 dark:bg-black/60 backdrop-blur-xl shadow-xl p-5 space-y-4"
          >
            {submitted ? (
              <div className="flex flex-col items-center py-4 text-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-kenya-green" />
                <p className="font-bold text-sm">Proposal Submitted!</p>
                <p className="text-xs text-muted-foreground">We'll reach out if approved.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-kenya-green">
                    Propose Collaboration
                  </p>
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                  On: <span className="font-bold text-foreground">"{contentTitle}"</span>
                </p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Describe how your organisation would like to collaborate on this piece — co-authoring, sponsoring, amplifying..."
                    className="rounded-xl resize-none text-sm min-h-[90px]"
                    maxLength={600}
                    required
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/50">{text.length}/600</span>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={loading || !text.trim()}
                      className="bg-kenya-green hover:bg-kenya-green/90 text-white font-bold rounded-xl gap-2"
                    >
                      {loading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <><Send size={12} /> Submit Proposal</>
                      }
                    </Button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProposeCollab;
