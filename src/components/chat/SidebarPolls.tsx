import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { CEKALoader } from '../ui/ceka-loader';
import { CheckCircle2, Award, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    id: string;
    option_text: string;
    votes_count: number;
}

interface Poll {
    id: string;
    question: string;
    description: string;
    options: Option[];
    total_votes: number;
    user_voted_option_id?: string;
}

const SidebarPolls = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [votingId, setVotingId] = useState<string | null>(null);

    useEffect(() => {
        fetchActivePolls();

        // Subscribe to real-time vote updates
        const channel = supabase
            .channel('public:poll_votes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => {
                fetchActivePolls();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchActivePolls = async () => {
        try {
            const { data: pollsData, error: pollsError } = await supabase
                .from('polls' as any)
                .select(`
                    id, 
                    question, 
                    description,
                    options:poll_options(id, option_text)
                `)
                .eq('is_active', true)
                .limit(1);

            if (pollsError) throw pollsError;
            if (!pollsData || (pollsData as any[]).length === 0) {
                setPolls([]);
                return;
            }

            // Get votes count and user's vote
            const pollIds = (pollsData as any[]).map(p => p.id);
            const { data: votesData } = await supabase
                .from('poll_votes' as any)
                .select('poll_id, option_id, user_id')
                .in('poll_id', pollIds);

            const processedPolls = (pollsData as any[]).map(poll => {
                const pollVotes = (votesData as any[])?.filter(v => v.poll_id === poll.id) || [];
                const userVote = pollVotes.find(v => v.user_id === user?.id);

                const optionsWithCounts = (poll.options as any[]).map(opt => ({
                    id: opt.id,
                    option_text: opt.option_text,
                    votes_count: pollVotes.filter(v => v.option_id === opt.id).length
                }));

                return {
                    id: poll.id,
                    question: poll.question,
                    description: poll.description,
                    options: optionsWithCounts,
                    total_votes: pollVotes.length,
                    user_voted_option_id: userVote?.option_id
                };
            });

            setPolls(processedPolls);
        } catch (err) {
            console.error('Poll fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (pollId: string, optionId: string) => {
        if (!user) {
            toast({
                title: 'Authentication Required',
                description: 'Sign in to participate in polls.',
                variant: 'destructive'
            });
            return;
        }

        setVotingId(pollId);
        try {
            const { error } = await supabase
                .from('poll_votes' as any)
                .upsert({
                    poll_id: pollId,
                    user_id: user.id,
                    option_id: optionId
                });

            if (error) throw error;

            toast({
                title: 'Vote Cast',
                description: 'Your voice has been counted.',
            });

            fetchActivePolls();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.message,
                variant: 'destructive'
            });
        } finally {
            setVotingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-10">
                <CEKALoader variant="ios" size="sm" text="Loading..." />
            </div>
        );
    }

    if (polls.length === 0) {
        return (
            <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/20 text-center py-8">
                <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No live polls</p>
                <p className="text-[9px] text-muted-foreground/60 mt-1">Check back later.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {polls.map(poll => (
                <div key={poll.id} className="p-5 rounded-[24px] bg-white/60 dark:bg-black/40 border border-white/20 shadow-sm space-y-4">
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-tight leading-tight">{poll.question}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium">{poll.description}</p>
                    </div>

                    <div className="space-y-3">
                        {poll.options.map(option => {
                            const percentage = poll.total_votes > 0
                                ? Math.round((option.votes_count / poll.total_votes) * 100)
                                : 0;
                            const isVoted = poll.user_voted_option_id === option.id;

                            return (
                                <button
                                    key={option.id}
                                    disabled={!!poll.user_voted_option_id || votingId === poll.id}
                                    onClick={() => handleVote(poll.id, option.id)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden group/opt
                                        ${isVoted
                                            ? 'bg-primary/5 border-primary/20'
                                            : 'bg-white dark:bg-black/20 border-slate-100 dark:border-white/5 hover:border-primary/30'}
                                        ${poll.user_voted_option_id ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
                                >
                                    {/* Progress Background */}
                                    {poll.user_voted_option_id && (
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            className="absolute inset-y-0 left-0 bg-primary/10 -z-10"
                                        />
                                    )}

                                    <div className="flex justify-between items-center relative z-10">
                                        <span className={`text-[11px] font-bold ${isVoted ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {option.option_text}
                                        </span>
                                        <AnimatePresence>
                                            {poll.user_voted_option_id && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: 5 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="text-[10px] font-black text-primary"
                                                >
                                                    {percentage}%
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {isVoted && (
                                        <CheckCircle2 className="absolute top-1 right-1 h-3 w-3 text-primary" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 border-t border-slate-100 dark:border-white/5 pt-3">
                        <span>{poll.total_votes} Votes</span>
                        {poll.user_voted_option_id && (
                            <span className="text-kenya-green flex items-center gap-1">
                                <Shield className="h-2 w-2" /> Voted
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SidebarPolls;