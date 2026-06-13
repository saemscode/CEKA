import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, ShieldCheck, Mail, Zap } from 'lucide-react';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { translate, cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthModalStore } from '@/stores/useAuthModalStore';

interface VolunteerApplyModalProps {
    opportunity: any;
    isOpen: boolean;
    onClose: () => void;
}

export const VolunteerApplyModal = ({ opportunity, isOpen, onClose }: VolunteerApplyModalProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [motivation, setMotivation] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isCertified, setIsCertified] = useState(false);
    const { language } = useLanguage();

    const openModal = useAuthModalStore((state) => state.openModal);

    // Background Synergy Calculation (Privacy-Safe)
    const matchResults = React.useMemo(() => {
        if (!user || !opportunity) return { score: 0, level: 'Standard Alignment' };
        
        let matches = 0;
        const totalChecks = 3;
        
        // Context Check 1: Geo-Spatial Alignment
        const userCounty = user.user_metadata?.county || '';
        const oppLocation = opportunity.location || '';
        if (userCounty.toLowerCase().includes(oppLocation.toLowerCase()) || 
            oppLocation.toLowerCase().includes(userCounty.toLowerCase())) {
            matches++;
        }
        
        // Context Check 2: Interest Matrix Overlap
        const userInterests = Array.isArray(user.user_metadata?.interests) ? user.user_metadata.interests : [];
        const oppSkills = Array.isArray(opportunity.skills_required) ? opportunity.skills_required : [];
        const hasSkillOverlap = userInterests.some((interest: string) => 
            oppSkills.some((skill: string) => skill.toLowerCase().includes(interest.toLowerCase()))
        );
        if (hasSkillOverlap) matches++;
        
        // Context Check 3: Merit History / Profile Depth
        if (user.user_metadata?.areas_of_interest?.length > 0 || user.user_metadata?.bio) {
            matches++;
        }

        const score = (matches / totalChecks) * 100;
        let level = 'Standard Alignment';
        if (score >= 90) level = 'Maximum Synergy';
        else if (score >= 60) level = 'High Compatibility';
        else if (score >= 30) level = 'Moderate Match';
        
        return { score, level };
    }, [user, opportunity]);

    const handleSubmit = async () => {
        if (!user) {
            onClose(); // Optional: Close the inner volunteer modal so they aren't stacked
            openModal({
                heroIconSrc: "/context/icons 6/followed.svg",
                title: "One More Step...",
                description: "Complete your Volunteer Application by joining CEKA today to get exclusive volunteer updates & opportunities just for you",
                features: [
                    { iconSrc: "/context/icons 6/person.svg", text: "Access more opportunities in Volunteer Pool" },
                    { iconSrc: "/context/icons 6/newsletter.svg", text: "Get Monthly newsletter access" },
                    { iconSrc: "/context/icons 6/points.svg", text: "Track Your Civic Impact Points" }
                ]
            });
            return;
        }

        setSubmitting(true);

        try {

            const { error } = await supabase.from('volunteer_applications').insert({
                user_id: user.id,
                opportunity_id: opportunity.id,
                message: motivation,
                status: 'pending',
                metadata: {
                    synergy_score: matchResults.score,
                    synergy_level: matchResults.level,
                    is_certified: isCertified
                }
            });

            if (error) throw error;

            // Log Interaction
            await supabase.from('chat_interactions' as any).insert({
                user_id: user.id,
                target_id: opportunity.id,
                target_type: 'volunteer_opp',
                action_type: 'apply'
            });

            // Get the inserted application ID for notification tracking
            const { data: appData } = await supabase.from('volunteer_applications')
                .select('id')
                .eq('user_id', user.id)
                .eq('opportunity_id', opportunity.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const applicationId = appData?.id || 'unknown';

            // Create in-app notifications (applicant + admin)
            const { notificationService } = await import('@/services/notificationService');
            await notificationService.createVolunteerApplicationNotification(
                applicationId,
                user.id,
                user.email || '',
                opportunity.title
            );

            // Send confirmation email via edge function
            try {
                await supabase.functions.invoke('send-volunteer-confirmation', {
                    body: {
                        type: 'application_received',
                        applicant_email: user.email || '',
                        applicant_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Citizen',
                        opportunity_title: opportunity.title,
                        opportunity_organization: opportunity.organization,
                        application_id: applicationId
                    }
                });
            } catch (emailErr) {
                console.error('Volunteer confirmation email error:', emailErr);
            }

            setProgress(100);
            setSuccess(true);
            toast({ title: "Application Transmitted", description: "The CEKA team has received your request." });

            // Auto-close after 3s
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setMotivation('');
                setProgress(0);
            }, 3000);

        } catch (err: any) {
            toast({ title: "Transmission Failed", description: err.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[95vh] sm:max-h-[90vh] rounded-[32px] sm:rounded-[40px] border-none shadow-ios-high flex flex-col bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl p-0 overflow-hidden">
                <div className="overflow-y-auto flex-1 px-6 sm:px-10 py-8 sm:py-10 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {!success ? (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6 sm:space-y-8"
                            >
                            <DialogHeader>
                                <div className="h-16 w-16 bg-primary/10 rounded-[22px] flex items-center justify-center mb-6">
                                    <ShieldCheck className="h-8 w-8 text-primary" />
                                </div>
                                <DialogTitle className="text-3xl font-black tracking-tight">{opportunity.title}</DialogTitle>
                                <DialogDescription className="text-base font-medium text-muted-foreground pt-2">
                                    Apply to join <span className="text-primary font-bold">{opportunity.organization}</span> and contribute to Kenyan civic growth.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-[32px] border border-slate-100 dark:border-white/5 space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-0.5">Role Expectations</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Time Commitment</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{opportunity.commitment || 'Flexible'}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Key Skills Involved</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {opportunity.skills_required && opportunity.skills_required.length > 0 ? (
                                                    opportunity.skills_required.map((skill: string) => (
                                                        <span key={skill} className="px-2.5 py-1 bg-white dark:bg-white/5 rounded-xl text-[10px] font-bold border border-slate-100 dark:border-white/5 shadow-sm text-slate-600 dark:text-slate-400">
                                                            {skill}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-slate-50 dark:bg-white/5 rounded-xl text-[10px] font-bold border border-dashed border-slate-200 dark:border-white/10 text-muted-foreground/40 italic">
                                                        General Civic Engagement
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => setIsCertified(!isCertified)}
                                        className={cn(
                                        "flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border",
                                        isCertified 
                                            ? "bg-primary/5 border-primary/20" 
                                            : "bg-white dark:bg-black/20 border-slate-100 dark:border-white/5 hover:border-primary/10"
                                    )}>
                                        <div className={cn(
                                            "h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                                            isCertified ? "bg-primary border-primary" : "border-slate-300 dark:border-white/10"
                                        )}>
                                            {isCertified && <CheckCircle2 className="h-3 w-3 text-white" />}
                                        </div>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                            I've reviewed the requirements and am ready to contribute.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="motivation" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Tell us why you're interested</Label>
                                        <Textarea
                                            id="motivation"
                                            name="motivation"
                                            placeholder="Introduce yourself and share why you'd like to join this specific initiative..."
                                            className="min-h-[120px] rounded-[28px] bg-slate-100/50 dark:bg-black/20 border-none shadow-inner p-5 text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                                            value={motivation}
                                            onChange={(e) => setMotivation(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="flex-col gap-4 pt-4">

                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || !motivation.trim() || !isCertified}
                                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {submitting ? <CEKALoader variant="ios" size="sm" /> : 'Submit Your Application'}
                                </Button>
                            </DialogFooter>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-12 flex flex-col items-center text-center"
                        >
                            <div className="h-24 w-24 bg-kenya-green/10 rounded-[32px] flex items-center justify-center mb-8">
                                <CheckCircle2 className="h-12 w-12 text-kenya-green" />
                            </div>
                            <h3 className="text-3xl font-black mb-3">Submission Success</h3>
                            <p className="text-muted-foreground max-w-xs font-medium mb-10">Your application has been submitted successfully. A CEKA correspondent will review and email you within the week.</p>

                            <div className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 rounded-2xl">
                                <Mail className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Notification Pending</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
};
