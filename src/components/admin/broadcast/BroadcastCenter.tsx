import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
    Send, Sparkles, Layout, Eye, Hash, Users, MapPin, 
    Heart, ChevronRight, Info, AlertCircle, CheckCircle2, History
} from 'lucide-react';
import { MailingMeshStatus } from './MailingMeshStatus';
import { MarkdownPreview } from './MarkdownPreview';
import { supabase } from '@/integrations/supabase/client';

const VARIABLE_TAGS = [
    { label: 'First Name', tag: '{{first_name}}', icon: Users },
    { label: 'Last Name', tag: '{{last_name}}', icon: Users },
    { label: 'Full Name', tag: '{{display_name}}', icon: Sparkles },
    { label: 'County', tag: '{{county}}', icon: MapPin },
    { label: 'Interests', tag: '{{interests}}', icon: Heart }
];

export const BroadcastCenter = () => {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [targetList, setTargetList] = useState<'profiles' | 'community' | 'both'>('community');
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const { toast } = useToast();

    React.useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data } = await supabase
            .from('broadcast_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        if (data) setHistory(data);
    };

    const insertTag = (tag: string) => {
        setContent(prev => prev + ' ' + tag);
    };

    const handleSend = async () => {
        if (!subject || !content) {
            toast({
                title: "Missing Information",
                description: "Please provide both a subject and content for your broadcast.",
                variant: "destructive"
            });
            return;
        }

        setSending(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            const { data, error } = await supabase.functions.invoke('send-broadcast-email', {
                body: {
                    subject,
                    content,
                    target: targetList,
                    userId: user?.id
                }
            });

            if (error) throw error;

            toast({
                title: "Broadcast Queued",
                description: data.message,
            });
            
            setSubject('');
            setContent('');
            fetchHistory();
        } catch (error: any) {
            console.error('Broadcast failed:', error);
            toast({
                title: "Dispatch Failure",
                description: error.message || "An error occurred during queueing.",
                variant: "destructive"
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                        <Send className="h-6 w-6 text-primary" />
                        Broadcast Command Center
                    </h2>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
                        Segmented Citizen Outreach & Personalized Newsletters
                    </p>
                </div>
                <MailingMeshStatus />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Editor Column */}
                <div className="lg:col-span-7 space-y-4">
                    <Card className="glass-card border-0 shadow-ios overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-white/5 space-y-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Audience</label>
                                    <Select value={targetList} onValueChange={(v: any) => setTargetList(v)}>
                                        <SelectTrigger className="rounded-xl border-white/10 bg-background/50 h-11">
                                            <SelectValue placeholder="Select Lists" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-white/10">
                                            <SelectItem value="profiles">Segment A: Account Holders Only</SelectItem>
                                            <SelectItem value="community">Segment B: Portal Community Only</SelectItem>
                                            <SelectItem value="both">Segment C: Global Combined List</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Campaign Subject</label>
                                    <Input 
                                        placeholder="Enter subject line..." 
                                        className="rounded-xl border-white/10 bg-background/50 h-11"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4 bg-muted/20 border-b border-white/5 flex flex-wrap gap-2">
                                {VARIABLE_TAGS.map((v) => (
                                    <Button 
                                        key={v.tag}
                                        variant="outline" 
                                        size="sm" 
                                        className="rounded-lg h-8 text-[10px] font-bold border-white/10 bg-background/30 hover:bg-primary hover:text-white transition-all gap-1.5"
                                        onClick={() => insertTag(v.tag)}
                                    >
                                        <v.icon className="h-3 w-3" />
                                        {v.label}
                                    </Button>
                                ))}
                            </div>
                            <Textarea 
                                placeholder="Compose your message here using Markdown... # Headlines, --- dividers, and standard spacing are supported."
                                className="min-h-[400px] border-0 rounded-none bg-transparent resize-none p-6 font-mono text-sm focus-visible:ring-0"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between p-4 glass-card rounded-2xl border-0 shadow-ios bg-primary/5">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                            <Info className="h-4 w-4 text-primary" />
                            <span>Recipients will receive personalized emails based on their specific data.</span>
                        </div>
                        <Button 
                            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-2"
                            onClick={handleSend}
                            disabled={sending}
                        >
                            {sending ? (
                                <>
                                    <Sparkles className="h-4 w-4 animate-spin" />
                                    Dispatching...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Launch Broadcast
                                </>
                            )}
                        </Button>
                    </div>

                    {/* History Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <History className="h-4 w-4 text-primary" />
                            <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">Recent History</h3>
                        </div>
                        
                        <div className="space-y-3">
                            {history.length > 0 ? history.map((item) => (
                                <div key={item.id} className="p-4 glass-card rounded-2xl border-0 shadow-ios flex items-center justify-between group hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${item.status === 'completed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-amber-500 animate-pulse'}`} />
                                        <div>
                                            <p className="font-bold text-[10px] truncate max-w-[200px] uppercase tracking-wider">{item.subject}</p>
                                            <p className="text-[10px] opacity-40">{new Date(item.created_at).toLocaleDateString()} • {item.total_recipients} Recipient(s)</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border-none ${item.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                                            {item.status}
                                        </Badge>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    <p className="text-[10px] uppercase tracking-widest opacity-20">No history found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview Column */}
                <div className="lg:col-span-5 h-[calc(100vh-280px)] sticky top-8">
                    <MarkdownPreview content={content} subject={subject} />
                </div>
            </div>
        </div>
    );
};
