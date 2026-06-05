import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, Users, Hash, Shield, Search, MoreVertical, Paperclip, ChevronLeft, Radio } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatReactions } from './ChatReactions';
import { ChatReplies } from './ChatReplies';
import JoinRoomGuide from './JoinRoomGuide';
import SidebarPolls from './SidebarPolls';
import { InteractionLogger } from './InteractionLogger';
import { MentionSuggestions } from './MentionSuggestions';
import { PromptInputBox } from './PromptInputBox';
import { cn } from '@/lib/utils';
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
    EmptyContent
} from '@/components/ui/empty';
import { CEKALoader } from '@/components/ui/ceka-loader';

// Types
interface ChatMessage {
    id: string;
    user_id: string;
    room_id: string;
    content: string;
    created_at: string;
    profile?: {
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
    };
}

interface Room {
    id: string;
    name: string;
    type: 'public' | 'private' | 'direct';
    last_activity?: string;
}

const PAGE_SIZE = 30;

const CommunityChat = () => {
    const { session, user } = useAuth();
    const { toast } = useToast();
    const [params] = useSearchParams();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [activeRoom, setActiveRoom] = useState<string>(params.get('room') || 'voter-hub');
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMoreOlder, setHasMoreOlder] = useState(true);
    const [sending, setSending] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionTrigger, setMentionTrigger] = useState<'@' | '/' | null>(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(params.get('m'));
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedPeer, setSelectedPeer] = useState<any>(null);
    const [fetchError, setFetchError] = useState(false);
    const [activeAudits, setActiveAudits] = useState<any[]>([]);
    const [showGuide, setShowGuide] = useState(false);
    const [hasSeenGuide, setHasSeenGuide] = useState<Record<string, boolean>>({});

    const scrollRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const isInitialLoad = useRef(true);

    // Fetch dynamic rooms from sovereign table
    const fetchRooms = useCallback(async () => {
        const { data, error } = await supabase
            .from('public_rooms')
            .select('*')
            .eq('is_active', true);

        if (!error && data) {
            setRooms(data.map((r: any) => ({
                id: r.id,
                name: r.name,
                type: 'public'
            })));
        }
    }, []);

    // Fetch live audit actions
    const fetchAudits = useCallback(async () => {
        const { data, error } = await supabase
            .from('peoples_audits' as any)
            .select(`
                id,
                bill_id,
                bills(title),
                votes_for,
                votes_against
            `)
            .limit(2);

        if (!error && data) {
            setActiveAudits(data);
        }
    }, []);

    const closeGuide = () => {
        setShowGuide(false);
        setHasSeenGuide(prev => ({ ...prev, [activeRoom]: true }));
    };

    // Fetch initial messages with keyset pagination
    const fetchMessages = useCallback(async (roomId: string, cursor?: string) => {
        if (cursor) setLoadingOlder(true);
        else setLoading(true);
        setFetchError(false);

        try {
            // Simple query without FK join to avoid PGRST200 errors
            let query = supabase
                .from('chat_messages')
                .select('*')
                .eq('room_id', roomId)
                .is('parent_id', null)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);

            if (cursor) {
                query = query.lt('created_at', cursor);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Chat fetch error:', error);
                setFetchError(true);
                throw error;
            }

            if (data) {
                // Fetch profile data separately for each unique user_id
                const userIds = [...new Set(data.map(m => m.user_id))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, username')
                    .in('id', userIds);

                const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

                const messagesWithProfiles = data.map(m => ({
                    ...m,
                    profile: profileMap.get(m.user_id) || null
                }));

                const sorted = messagesWithProfiles.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                setMessages(prev => cursor ? [...sorted, ...prev] : sorted);
                setHasMoreOlder(data.length === PAGE_SIZE);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setFetchError(true);
            setHasMoreOlder(false); // Kill scroll to prevent spam
        } finally {
            setLoading(false);
            setLoadingOlder(false);
        }
    }, []);


    const handleJoinRoom = async (roomId: string) => {
        if (!user) return;
        setActiveRoom(roomId);
        // Register room join status
        await supabase.from('user_rooms' as any).upsert({
            user_id: user.id,
            room_id: roomId,
            last_read_at: new Date().toISOString()
        }, { onConflict: 'user_id,room_id' });

        toast({ title: `Joined ${rooms.find(r => r.id === roomId)?.name}`, description: 'Your session is now synchronized.' });
    };

    // Handle Room Switching & Initial Load
    useEffect(() => {
        fetchRooms();
        fetchAudits();
    }, [fetchRooms, fetchAudits]);

    useEffect(() => {
        if (!session || !user) return;

        let targetRoom = 'voter-hub';

        // Virtual DM handling: if a peer is selected, generate deterministic ID
        if (isPrivate && selectedPeer) {
            const ids = [user.id, selectedPeer.id].sort();
            targetRoom = `vault:${ids[0]}:${ids[1]}`;
            setActiveRoom(targetRoom);
        } else {
            targetRoom = params.get('room') || 'voter-hub';
            if (activeRoom !== targetRoom) {
                setActiveRoom(targetRoom);
                // Only show guide if the user hasn't seen it for this room in this session
                if (!hasSeenGuide[targetRoom]) {
                    setShowGuide(true);
                }
            }
        }

        fetchMessages(targetRoom);
        isInitialLoad.current = true;
    }, [activeRoom, session, user, fetchMessages, isPrivate, selectedPeer, params]);

    // Ensure selected room exists in metadata
    useEffect(() => {
        if (isPrivate && selectedPeer && !rooms.find(r => r.id === activeRoom)) {
            const virtualRoom: Room = {
                id: activeRoom,
                name: `Secure: ${selectedPeer.full_name || 'Member'}`,
                type: 'direct'
            };
            setRooms(prev => [...prev.filter(r => r.type !== 'direct'), virtualRoom]);
        }
    }, [activeRoom, isPrivate, selectedPeer, rooms]);

    // Handle incoming source bridge or blog synchronization
    useEffect(() => {
        const source = params.get('source');
        const title = params.get('title');
        const content = params.get('content'); // New: Sync content from blog reply

        if (source && title && !isInitialLoad.current) {
            const initialText = content
                ? `[Discourse Sync] "${decodeURIComponent(content)}" - Ref: ${decodeURIComponent(title)}`
                : `[Ref: ${decodeURIComponent(title)}] I have thoughts on this development... `;

            setNewMessage(initialText);
            toast({ title: 'Assembly Synced', description: 'Continuing the discourse from the field.' });
        }
    }, [params, toast]);

    // Subscribe to Realtime messages for current room
    useEffect(() => {
        if (!session) return;

        const channel = supabase
            .channel(`chat:${activeRoom}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${activeRoom}`
            }, async (payload) => {
                if (payload.new.parent_id) return; // Ignore replies in main feed

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, username')
                    .eq('id', payload.new.user_id)
                    .single();

                const msgWithProfile = { ...payload.new, profile } as any;
                setMessages(prev => {
                    if (prev.find(m => m.id === msgWithProfile.id)) return prev;
                    return [...prev, msgWithProfile];
                });
            })
            .subscribe();

        return () => {
            setTimeout(() => {
                try {
                    supabase.removeChannel(channel).catch(() => { });
                } catch (e) { }
            }, 200);
        };
    }, [activeRoom, session]);

    // Presence tracking for online members
    useEffect(() => {
        if (!session || !user) return;
        const presenceChannel = supabase.channel('community_presence');

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const users: any[] = [];
                Object.values(state).forEach((presences: any) => {
                    presences.forEach((p: any) => {
                        if (!users.find(u => u.id === p.id)) users.push(p);
                    });
                });
                setOnlineUsers(users);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
                    await presenceChannel.track({
                        id: user.id,
                        full_name: profile?.full_name || 'Anonymous Citizen',
                        avatar_url: profile?.avatar_url,
                        online_at: new Date().toISOString()
                    });
                }
            });

        return () => {
            setTimeout(() => {
                try {
                    supabase.removeChannel(presenceChannel).catch(() => { });
                } catch (e) { }
            }, 200);
        };
    }, [session, user]);

    // Infinite Scroll Handler (Intersection Observer)
    useEffect(() => {
        if (!topSentinelRef.current || loadingOlder || !hasMoreOlder || fetchError) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !loadingOlder && !fetchError) {
                const oldestMsg = messages[0];
                if (oldestMsg) fetchMessages(activeRoom, oldestMsg.created_at);
            }
        }, { threshold: 0.1 });

        observer.observe(topSentinelRef.current);
        return () => observer.disconnect();
    }, [messages, loadingOlder, hasMoreOlder, activeRoom, fetchMessages]);

    // Auto-scroll logic (Instagram-style)
    useEffect(() => {
        if (!scrollRef.current) return;
        const { scrollHeight, clientHeight, scrollTop } = scrollRef.current;

        // Auto-scroll to bottom on initial load or if user is already near bottom
        if (isInitialLoad.current || scrollHeight - clientHeight - scrollTop < 300) {
            scrollRef.current.scrollTop = scrollHeight;
            isInitialLoad.current = false;
        }
    }, [messages]);

    // Handle Input with Mentions
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewMessage(val);

        const lastChar = val.slice(-1);
        const words = val.split(' ');
        const lastWord = words[words.length - 1];

        if (lastWord.startsWith('@')) {
            setMentionTrigger('@');
            setMentionQuery(lastWord.slice(1));
        } else if (lastWord.startsWith('/')) {
            setMentionTrigger('/');
            setMentionQuery(lastWord.slice(1));
        } else {
            setMentionTrigger(null);
        }
    };

    const insertMention = (item: any) => {
        const words = newMessage.split(' ');
        words[words.length - 1] = mentionTrigger + (item.username || item.name) + ' ';
        setNewMessage(words.join(' '));
        setMentionTrigger(null);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || sending) return;

        setSending(true);
        const content = newMessage.trim();
        setNewMessage(''); // Optimistically clear

        const { error } = await supabase.from('chat_messages').insert({
            user_id: user.id,
            room_id: activeRoom,
            content
        });

        if (error) {
            setNewMessage(content);
            toast({ title: 'Send Failed', description: 'Message cached locally. Please retry.', variant: 'destructive' });
        }
        setSending(false);
    };

    const formatMessageDate = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return `Yesterday, ${format(date, 'HH:mm')}`;
        return format(date, 'MMM d, HH:mm');
    };

    if (!session) return (
        <Card className="h-[700px] flex flex-col items-center justify-center border-none shadow-2xl rounded-[40px] bg-white/50 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-primary/10 p-6 rounded-[32px] mb-8 shadow-inner"><MessageCircle className="h-16 w-16 text-primary" /></div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">Active Citizenship Starts Here</h3>
            <p className="text-muted-foreground text-center mb-8 max-w-sm px-4">Sign in to join the conversation and contribute to Kenya's civic journey.</p>
            <Button asChild size="lg" className="rounded-2xl px-12 h-14 text-lg font-bold shadow-xl">
                <Link to="/auth">Authenticate with CEKA</Link>
            </Button>
        </Card>
    );

    const handleCloseGuide = () => {
        setShowGuide(false);
        if (activeRoom) {
            setHasSeenGuide(prev => ({ ...prev, [activeRoom]: true }));
        }
    };

    const handleSendMessage = async (content: string, files?: File[]) => {
        if (!content.trim() && (!files || files.length === 0)) return;
        setSending(true);
        try {
            const { error } = await supabase.from('chat_messages').insert({
                content: content.trim(),
                room_id: activeRoom,
                user_id: user?.id,
            });
            if (error) throw error;
        } catch (error: any) {
            toast({ title: "Dispatch Failure", description: error.message, variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid lg:grid-cols-12 gap-6 h-[800px] font-sans">

            {/* Sidebar (Rooms) */}
            <Card className="lg:col-span-3 flex flex-col border-none shadow-ios-low rounded-[32px] overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-xl">
                <CardHeader className="pb-4 pt-6">
                    <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                        Rooms
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Search className="h-4 w-4" /></Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-2 space-y-1">
                    {/* Public Rooms */}
                    {!isPrivate ? (
                        rooms.map(room => (
                            <button
                                key={room.id}
                                onClick={() => { setActiveRoom(room.id); setSelectedPeer(null); setIsPrivate(false); }}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3.5 rounded-[20px] transition-all duration-300",
                                    activeRoom === room.id && !isPrivate
                                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                        : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
                                )}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-2xl flex items-center justify-center transition-colors",
                                    activeRoom === room.id && !isPrivate ? "bg-white/20" : "bg-slate-100 dark:bg-white/5"
                                )}>
                                    <Hash className="h-5 w-5" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-bold truncate">{room.name}</p>
                                    <p className={cn("text-[10px]", activeRoom === room.id && !isPrivate ? "text-white/60" : "text-muted-foreground")}>Public Assembly</p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center space-y-4">
                            <Shield className="h-10 w-10 text-primary mx-auto opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Secure Active Storage</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsPrivate(false)}
                                className="rounded-xl w-full text-[10px] font-bold"
                            >
                                Exit to Community Chat
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Chat Area */}
            <Card className="lg:col-span-6 flex flex-col border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[40px] overflow-hidden bg-white dark:bg-[#1C1C1E] relative">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-black/40 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-2.5 rounded-[18px]",
                            isPrivate ? "bg-amber-500/10" : "bg-primary/10"
                        )}>
                            {isPrivate ? <Shield className="h-5 w-5 text-amber-500" /> : <MessageCircle className="h-5 w-5 text-primary" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">
                                {isPrivate ? `Direct: ${selectedPeer?.full_name || 'Citizen'}` : (rooms.find(r => r.id === activeRoom)?.name || 'Assembly')}
                            </h2>
                            <p className={cn(
                                "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                                isPrivate ? "text-amber-500" : "text-green-500"
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isPrivate ? "bg-amber-500" : "bg-green-500")} />
                                {isPrivate ? 'E2E Cloud Encrypted' : `${onlineUsers.length} active now`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl"><Users className="h-4.5 w-4.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl"><MoreVertical className="h-4.5 w-4.5" /></Button>
                    </div>
                </div>

                {/* Messages */}
                <CardContent className="flex-1 p-0 overflow-hidden relative">
                    <ScrollArea className="h-full px-6" ref={scrollRef}>
                        <div ref={topSentinelRef} className="h-1 w-full" />

                        {loadingOlder && (
                            <div className="flex justify-center py-4"><CEKALoader variant="ios" size="sm" /></div>
                        )}

                        {messages.length === 0 && !loading && (
                            <Empty className="border-none mt-20">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon" className="bg-primary/10">
                                        <Hash className="h-8 w-8 text-primary" />
                                    </EmptyMedia>
                                    <EmptyTitle>The Floor is Yours</EmptyTitle>
                                    <EmptyDescription>
                                        Initiate the discourse in {rooms.find(r => r.id === activeRoom)?.name}.
                                        Your voice is the heartbeat of the assembly.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <Button onClick={() => (document.querySelector('input') as any)?.focus()} variant="outline" className="rounded-2xl">
                                        Open Floor
                                    </Button>
                                </EmptyContent>
                            </Empty>
                        )}

                        <div className="space-y-8 py-8">
                            {messages.map((message, idx) => {
                                const isOwn = message.user_id === user?.id;
                                const showAvatar = idx === 0 || messages[idx - 1].user_id !== message.user_id;
                                const isHighlighted = highlightedMessageId === message.id;

                                return (
                                    <motion.div
                                        key={message.id}
                                        initial={isInitialLoad.current ? false : { opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                                        id={`message-${message.id}`}
                                        className={cn(
                                            "group flex gap-3 transition-all duration-500 mb-6",
                                            isOwn ? "flex-row-reverse" : "flex-row",
                                            isHighlighted && "bg-primary/5 -mx-6 px-6 py-4 border-y border-primary/10 shadow-inner"
                                        )}
                                    >
                                        {/* Avatar Column */}
                                        <div className="w-10 shrink-0 mt-1">
                                            {showAvatar ? (
                                                <div className="relative group">
                                                    <Avatar className="h-10 w-10 rounded-[16px] shadow-ios-soft border-2 border-white dark:border-white/10 ring-1 ring-black/5 transition-transform group-hover:scale-110 duration-300">
                                                        <AvatarImage src={message.profile?.avatar_url || ''} />
                                                        <AvatarFallback className="bg-slate-100 dark:bg-white/5 font-black text-[10px] text-primary">
                                                            {message.profile?.full_name?.charAt(0) || 'C'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-[#1C1C1E] rounded-full" />
                                                </div>
                                            ) : (
                                                <div className="w-10" />
                                            )}
                                        </div>

                                        {/* Content Column */}
                                        <div className={cn("flex-1 flex flex-col space-y-1", isOwn ? "items-end" : "items-start")}>
                                            {showAvatar && (
                                                <div className={cn(
                                                    "flex items-center gap-2 mb-1 px-1",
                                                    isOwn ? "flex-row-reverse" : "flex-row"
                                                )}>
                                                    <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest opacity-80">
                                                        {message.profile?.full_name || 'Anonymous Citizen'}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground/50 font-black uppercase tracking-tighter">
                                                        {formatMessageDate(message.created_at)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={cn(
                                                "relative px-4.5 py-3 rounded-[22px] max-w-[85%] text-sm leading-relaxed shadow-ios-soft transition-all duration-300 group-hover:shadow-ios-low",
                                                isOwn
                                                    ? "bg-primary text-white rounded-tr-[4px] font-medium selection:bg-white/20 selection:text-white"
                                                    : "bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 rounded-tl-[4px] border border-white/50 dark:border-white/5"
                                            )}>
                                                <p className="whitespace-pre-wrap break-words font-medium tracking-tight">{message.content}</p>

                                                {/* Interaction Logging Component (Silent) */}
                                                <InteractionLogger targetId={message.id} targetType="message" metadata={{ room_id: activeRoom }} />
                                            </div>

                                            {/* Social Layer - Perfectly aligned with bubble edge */}
                                            <div className={cn("flex flex-col gap-1 w-full max-w-[85%] mt-1", isOwn ? "items-end" : "items-start")}>
                                                <ChatReactions messageId={message.id} />
                                                <ChatReplies messageId={message.id} room_id={activeRoom} />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>

                {/* Input Area */}
                <CardFooter className="p-6 pt-2 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl relative">
                    <AnimatePresence>
                        {mentionTrigger && (
                            <MentionSuggestions
                                query={mentionQuery}
                                trigger={mentionTrigger}
                                onSelect={insertMention}
                                onClose={() => setMentionTrigger(null)}
                            />
                        )}
                    </AnimatePresence>

                    <div className="w-full">
                        <PromptInputBox
                            onSend={handleSendMessage}
                            isLoading={sending}
                            placeholder={`Message ${rooms.find(r => r.id === activeRoom)?.name || 'the Assembly'}...`}
                            disabled={!user}
                        />
                        <p className="mt-3 text-[10px] text-center text-muted-foreground/50 font-medium uppercase tracking-[0.15em]">
                            Authorized conversation • End-to-end synchronized
                        </p>
                    </div>
                </CardFooter>
            </Card>

            {/* Right Sidebar: Audits & Online */}
            <div className="hidden lg:flex lg:col-span-3 flex-col gap-6 h-full overflow-hidden">
                {/* The Peoples Auditor - Active Audits */}
                <Card className="flex flex-col flex-1 border-none shadow-ios-low rounded-[32px] overflow-hidden bg-primary/5 dark:bg-primary/10 backdrop-blur-xl border-l-4 border-primary/20 max-h-[400px]">
                    <CardHeader className="pb-4 pt-6">
                        <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Radio className="h-4 w-4 animate-pulse" />
                            Active Audits
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {activeAudits.length > 0 ? (
                            activeAudits.map(audit => (
                                <div key={audit.id} className="p-4 rounded-2xl bg-white/60 dark:bg-black/40 shadow-sm space-y-3 transition-transform hover:scale-[1.02] cursor-pointer">
                                    <p className="text-xs font-bold leading-tight">{audit.bills?.title}</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                            <span>Sovereign Will</span>
                                            <span>{Math.round((audit.votes_against / ((audit.votes_for + audit.votes_against) || 1)) * 100)}% Rejection</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden flex">
                                            <div
                                                className="bg-kenya-red h-full"
                                                style={{ width: `${(audit.votes_against / ((audit.votes_for + audit.votes_against) || 1)) * 100}%` }}
                                            />
                                            <div
                                                className="bg-kenya-green h-full"
                                                style={{ width: `${(audit.votes_for / ((audit.votes_for + audit.votes_against) || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="flex-1 rounded-xl text-[9px] font-bold h-7 border-slate-200">
                                                Audit Deep Dive
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/20 text-center py-8">
                                <p className="text-[10px] font-bold text-muted-foreground">Monitoring legislative perimeter...</p>
                            </div>
                        )}
                        <Button variant="ghost" asChild className="w-full rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10">
                            <Link to="/audit">View All Audits</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Polls Tab */}
                <Card className="flex flex-col flex-1 border-none shadow-ios-low rounded-[32px] overflow-hidden bg-white/60 dark:bg-black/20 backdrop-blur-xl relative">
                    <CardHeader className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Radio className="h-4 w-4" />
                            Polls
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto">
                        <SidebarPolls />
                    </CardContent>
                </Card>

                {/* Online Users Sidebar */}
                <Card className="flex flex-col flex-1 border-none shadow-ios-low rounded-[32px] overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-xl">
                    <CardHeader className="pb-4 pt-6">
                        <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            Online <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-green-500/10 text-green-500 border-green-500/20">{onlineUsers.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-2 space-y-1">
                        {onlineUsers.length === 0 ? (
                            <div className="flex-1 flex flex-col min-w-0 max-h-screen relative">
                                <div className="flex flex-col items-center justify-center h-40">
                                    <CEKALoader variant="scanning" size="md" text="Synchronizing Intelligence..." />
                                </div>
                            </div>
                        ) : (
                            onlineUsers.filter(u => u.id !== user?.id).map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => { setSelectedPeer(u); setIsPrivate(true); }}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-[20px] hover:bg-white/40 dark:hover:bg-white/5 transition-all group",
                                        selectedPeer?.id === u.id && isPrivate && "bg-white/60 dark:bg-white/10 ring-1 ring-primary/20"
                                    )}
                                >
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 rounded-[14px] shadow-sm border-2 border-white dark:border-black/40 ring-1 ring-slate-200/50">
                                            <AvatarImage src={u.avatar_url || undefined} />
                                            <AvatarFallback className="text-[10px] bg-slate-100 font-bold">{u.full_name?.charAt(0) || 'C'}</AvatarFallback>
                                        </Avatar>
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-black ring-1 ring-black/10" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{u.full_name || 'Anonymous'}</p>
                                        <p className="text-[10px] text-muted-foreground/60 font-medium">Citizen Online</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </CardContent>
                    <div className="p-6 border-t border-slate-100 dark:border-white/5">
                        <Button variant="outline" className="w-full rounded-2xl h-11 text-xs font-bold uppercase tracking-widest gap-2">
                            <Shield className="h-3.5 w-3.5" /> Direct Messages
                        </Button>
                    </div>
                </Card>
            </div>
            <JoinRoomGuide
                isOpen={showGuide}
                onClose={handleCloseGuide}
                roomName={rooms.find(r => r.id === activeRoom)?.name || 'Assembly'}
            />
        </div>
    );
};

export default CommunityChat;
