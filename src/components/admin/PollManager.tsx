import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, Trash2, PieChart, BarChart3, Save, X, CheckCircle2, AlertCircle,
    Settings2, Activity, Calendar, Hash, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CEKALoader } from '@/components/ui/ceka-loader';

interface PollOption {
    id?: string;
    option_text: string;
    order_index: number;
}

interface Poll {
    id: string;
    question: string;
    description: string;
    category: string;
    is_active: boolean;
    created_at: string;
    options: PollOption[];
    _count?: {
        votes: number;
    };
}

const PollManager = () => {
    const { toast } = useToast();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newPoll, setNewPoll] = useState({
        question: '',
        description: '',
        category: 'general',
        options: ['', '']
    });

    useEffect(() => {
        fetchPolls();
    }, []);

    const fetchPolls = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('polls' as any)
                .select(`
                    *,
                    options:poll_options(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // In a real scenario, we'd also fetch vote counts per option
            // For now, we'll fetch the base poll structure
            setPolls((data as any) || []);
        } catch (err: any) {
            console.error('Fetch polls error:', err);
            toast({
                title: 'Data Sync Failed',
                description: 'Could not fetch live polls from the database.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddOption = () => {
        setNewPoll({ ...newPoll, options: [...newPoll.options, ''] });
    };

    const handleRemoveOption = (index: number) => {
        if (newPoll.options.length <= 2) return;
        const updatedOptions = [...newPoll.options];
        updatedOptions.splice(index, 1);
        setNewPoll({ ...newPoll, options: updatedOptions });
    };

    const handleOptionChange = (index: number, value: string) => {
        const updatedOptions = [...newPoll.options];
        updatedOptions[index] = value;
        setNewPoll({ ...newPoll, options: updatedOptions });
    };

    const handleCreatePoll = async () => {
        if (!newPoll.question || newPoll.options.some(opt => !opt.trim())) {
            toast({
                title: 'Incomplete Audit',
                description: 'Please provide a question and at least two valid options.',
                variant: 'destructive',
            });
            return;
        }

        try {
            // 1. Create Poll
            const { data: poll, error: pollError } = await supabase
                .from('polls' as any)
                .insert({
                    question: newPoll.question,
                    description: newPoll.description,
                    category: newPoll.category,
                    is_active: true
                })
                .select()
                .single();

            if (pollError) throw pollError;

            // 2. Create Options
            const optionsToInsert = newPoll.options.map((text, idx) => ({
                poll_id: (poll as any).id,
                option_text: text,
                order_index: idx
            }));

            const { error: optError } = await supabase
                .from('poll_options' as any)
                .insert(optionsToInsert);

            if (optError) throw optError;

            toast({
                title: 'Poll Activated',
                description: 'The community audit is now live on the perimeter.',
            });

            setIsCreating(false);
            setNewPoll({ question: '', description: '', category: 'general', options: ['', ''] });
            fetchPolls();
        } catch (err: any) {
            console.error('Create poll error:', err);
            toast({
                title: 'Deployment Failed',
                description: err.message,
                variant: 'destructive',
            });
        }
    };

    const togglePollStatus = async (pollId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('polls' as any)
                .update({ is_active: !currentStatus })
                .eq('id', pollId);

            if (error) throw error;
            fetchPolls();
        } catch (err: any) {
            toast({ title: 'Status Update Failed', description: err.message, variant: 'destructive' });
        }
    };

    const deletePoll = async (pollId: string) => {
        if (!confirm('Are you sure you want to terminate this audit? This action is irreversible.')) return;

        try {
            const { error } = await supabase
                .from('polls' as any)
                .delete()
                .eq('id', pollId);

            if (error) throw error;
            fetchPolls();
        } catch (err: any) {
            toast({ title: 'Termination Failed', description: err.message, variant: 'destructive' });
        }
    };

    if (loading && !isCreating) {
        return (
            <div className="flex flex-col items-center justify-center p-20 py-40">
                <CEKALoader variant="scanning" size="xl" text="Syncing Public Opinion..." />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 dark:bg-black/20 p-6 rounded-[32px] backdrop-blur-xl border border-white/20 shadow-ios-low">
                <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <Radio className="h-6 w-6 text-primary animate-pulse" />
                        Community Poll Intelligence
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest mt-1">Feedback Polls</p>
                </div>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)} className="rounded-2xl h-12 px-6 font-bold gap-2 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90">
                        <Plus className="h-5 w-5" /> Initiate Audit
                    </Button>
                )}
            </div>

            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        className="overflow-hidden"
                    >
                        <Card className="border-none shadow-ios-high rounded-[40px] bg-slate-50 dark:bg-white/5 overflow-hidden">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-center">
                                    <CardTitle>Audit Configuration</CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)} className="rounded-full">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                                <CardDescription>Define the parameters for community discourse.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="question" className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">Primary Inquiry</Label>
                                    <Input
                                        id="question"
                                        placeholder="What is the core question?"
                                        className="h-14 rounded-2xl bg-white dark:bg-black/40 border-none shadow-inner"
                                        value={newPoll.question}
                                        onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">Contextual Briefing</Label>
                                    <Input
                                        id="description"
                                        placeholder="Add background information for citizens..."
                                        className="h-12 rounded-2xl bg-white dark:bg-black/40 border-none shadow-inner text-sm"
                                        value={newPoll.description}
                                        onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">Strategic Category</Label>
                                        <select
                                            className="w-full h-12 rounded-2xl bg-white dark:bg-black/40 border-none px-4 text-sm font-medium shadow-inner"
                                            value={newPoll.category}
                                            onChange={(e) => setNewPoll({ ...newPoll, category: e.target.value })}
                                        >
                                            <option value="general">General Discourse</option>
                                            <option value="governance">Governance Audit</option>
                                            <option value="rights">Civic Rights</option>
                                            <option value="finance">Economic Policy</option>
                                            <option value="voter-hub">Voter Intelligence</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/5">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex justify-between">
                                        Options
                                        <span className="text-primary">{newPoll.options.length} limit</span>
                                    </Label>
                                    <div className="space-y-3">
                                        {newPoll.options.map((option, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <Input
                                                    value={option}
                                                    placeholder={`Option ${idx + 1}`}
                                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                    className="h-12 rounded-xl bg-white dark:bg-black/20 border-none shadow-sm"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveOption(idx)}
                                                    disabled={newPoll.options.length <= 2}
                                                    className="rounded-xl h-12 w-12 text-muted-foreground hover:text-kenya-red"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="outline" onClick={handleAddOption} className="w-full rounded-2xl border-dashed border-2 bg-transparent hover:bg-white/50 h-12 font-bold gap-2">
                                        <Plus className="h-4 w-4" /> Add Permutation
                                    </Button>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-100 dark:bg-black/40 p-6 flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl font-bold">Cancel</Button>
                                <Button onClick={handleCreatePoll} className="rounded-xl px-8 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-lg">
                                    <Save className="h-4 w-4 mr-2" /> Activate Audit
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {polls.map((poll) => (
                    <Card key={poll.id} className="border-none shadow-ios-low rounded-[32px] overflow-hidden bg-white dark:bg-black/40 group hover:shadow-ios-high transition-all">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="uppercase font-black text-[8px] tracking-[0.2em] bg-primary/5 text-primary border-primary/20">
                                    {poll.category}
                                </Badge>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={() => togglePollStatus(poll.id, poll.is_active)}
                                    >
                                        <Activity className={cn("h-4 w-4", poll.is_active ? "text-kenya-green" : "text-muted-foreground")} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-kenya-red"
                                        onClick={() => deletePoll(poll.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <CardTitle className="text-xl font-bold leading-tight mt-2">{poll.question}</CardTitle>
                            <CardDescription className="text-xs line-clamp-1">{poll.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                            {poll.options.map((opt, idx) => (
                                <div key={opt.id || idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-transparent hover:border-primary/10 transition-colors flex justify-between items-center group/opt">
                                    <span className="text-sm font-medium">{opt.option_text}</span>
                                    <div className="h-2 w-24 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden relative">
                                        <div className="absolute inset-0 bg-primary/20 w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="pt-0 pb-6 flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(poll.created_at).toLocaleDateString()}</span>
                            <span className={cn(
                                "flex items-center gap-1",
                                poll.is_active ? "text-kenya-green" : "text-kenya-red"
                            )}>
                                {poll.is_active ? 'Status: Active' : 'Status: Terminated'}
                            </span>
                        </CardFooter>
                    </Card>
                ))}

                {polls.length === 0 && !isCreating && (
                    <div className="lg:col-span-2 py-20 text-center space-y-4 opacity-40">
                        <PieChart className="h-20 w-20 mx-auto text-muted-foreground" />
                        <h3 className="text-xl font-black uppercase tracking-widest">No Active Audits</h3>
                        <p className="text-sm font-medium">The floor is quiet. Initiate an inquiry to begin synchronization.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PollManager;
