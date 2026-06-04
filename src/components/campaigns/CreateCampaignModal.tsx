import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, MapPin, Upload, Rocket, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Advocacy');
  const [goal, setGoal] = useState('');
  const [content, setContent] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [location, setLocation] = useState('');
  const [isBoosted, setIsBoosted] = useState(false);

  const handleSubmit = async (paystackRef?: string) => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to start a campaign', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase.from('campaign_proposals') as any).insert({
        user_id: user.id,
        title,
        type,
        goal,
        content,
        target_amount: targetAmount ? parseInt(targetAmount) : null,
        location,
        status: 'PENDING_REVIEW',
        is_boosted: !!paystackRef || isBoosted,
        paystack_reference: paystackRef || null
      });

      if (error) throw error;

      toast({
        title: "Campaign Proposed Successfully!",
        description: "Your campaign has been sent to moderation for review.",
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Submission Failed", description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaystackCheckout = () => {
    const publicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (!publicKey) {
      toast({ title: "Payment Config Error", description: "Paystack public key is not set.", variant: 'destructive' });
      return;
    }

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: user?.email || 'support@civiceducationkenya.com',
      amount: 500 * 100, // KES 500
      currency: 'KES',
      ref: 'BOOST-' + Math.floor((Math.random() * 1000000000) + 1),
      metadata: {
        custom_fields: [
          {
            display_name: "Service",
            variable_name: "service",
            value: `Campaign Verification Boost`
          }
        ]
      },
      callback: function (response: any) {
        setIsBoosted(true);
        toast({ title: "Payment Successful", description: "Campaign boosted successfully! Submitting..." });
        handleSubmit(response.reference);
      },
      onClose: function () {
        toast({ title: "Payment Cancelled", description: "You can still submit without boosting." });
        setIsSubmitting(false);
      }
    });
    
    setIsSubmitting(true);
    handler.openIframe();
  };

  const nextStep = () => {
    if (step === 1 && (!title || !type || !goal)) {
      toast({ title: 'Missing Fields', description: 'Please fill in all basic details.', variant: 'destructive' });
      return;
    }
    if (step === 2 && (!targetAmount || !location || !content)) {
      toast({ title: 'Missing Fields', description: 'Please complete the campaign requirements.', variant: 'destructive' });
      return;
    }
    setStep(s => s + 1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#1C1C1E] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <Rocket className="text-kenya-green w-5 h-5" />
              Start a Campaign
            </h2>
            <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-white/10 rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition">
              <X className="w-4 h-4 dark:text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Campaign Title</label>
                  <input value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-kenya-green outline-none" placeholder="e.g. Save Our Rivers" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category Type</label>
                  <select value={type} onChange={e=>setType(e.target.value)} className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-kenya-green outline-none appearance-none">
                    <option>Advocacy</option>
                    <option>Environment</option>
                    <option>Civic Assembly</option>
                    <option>Digital Rights</option>
                    <option>Relief Drive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">One-Sentence Goal</label>
                  <input value={goal} onChange={e=>setGoal(e.target.value)} type="text" className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-kenya-green outline-none" placeholder="e.g. Raise funds to plant 10k trees" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Full Description</label>
                  <textarea value={content} onChange={e=>setContent(e.target.value)} rows={4} className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-kenya-green outline-none resize-none" placeholder="Explain the mission, impact, and plan..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1"><DollarSign className="w-3 h-3"/> Target (KES)</label>
                    <input value={targetAmount} onChange={e=>setTargetAmount(e.target.value)} type="number" className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none" placeholder="50000" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</label>
                    <input value={location} onChange={e=>setLocation(e.target.value)} type="text" className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none" placeholder="Nairobi, Kenya" />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Boost & Verify via Paystack</h3>
                    <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">
                      Skip standard manual moderation queues. Pay KES 500 verification fee to instantly priority-label your campaign. Verified campaigns get 3x more visibility on CEKA.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                   <button 
                      onClick={() => handleSubmit()}
                      disabled={isSubmitting}
                      className="py-4 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5 transition text-sm"
                    >
                      Submit Normal
                   </button>
                   <button 
                      onClick={handlePaystackCheckout}
                      disabled={isSubmitting}
                      className="py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition text-sm flex items-center justify-center gap-2"
                    >
                      Pay & Boost ⚡
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          {step < 3 && (
            <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex justify-between">
              <button 
                onClick={() => step > 1 ? setStep(s=>s-1) : onClose()} 
                className="px-6 py-2.5 rounded-full font-bold text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/10 text-sm"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <button 
                onClick={nextStep} 
                className="px-6 py-2.5 bg-kenya-green text-white rounded-full font-bold shadow-lg shadow-kenya-green/20 hover:scale-105 transition text-sm"
              >
                Continue
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
