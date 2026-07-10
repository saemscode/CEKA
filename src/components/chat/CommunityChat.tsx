import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Send, MessageCircle, Users, Hash, Shield, Search, MoreVertical,
    Paperclip, ChevronLeft, Radio, Plus
} from 'lucide-react';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

// ─── Component ────────────────────────────────────────────────────────────────

const CommunityChat = () => {
    const { session, user } = useAuth();
    const { toast } = useToast();
    const [params, setSearchParams] = useSearchParams();

    // ── Core state ──────────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [activeRoom, setActiveRoom] = useState<string>('');
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMoreOlder, setHasMoreOlder] = useState(true);
    const [sending, setSending] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    // ── Presence & online ───────────────────────────────────────────────────────
    // Room-level presence: track only who's in the active room
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    // ── Mentions ────────────────────────────────────────────────────────────────
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionTrigger, setMentionTrigger] = useState<'@' | '/' | null>(null);

    // ── Private chat ────────────────────────────────────────────────────────────
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedPeer, setSelectedPeer] = useState<any>(null);

    // ── Guide / onboarding ──────────────────────────────────────────────────────
    const [showGuide, setShowGuide] = useState(false);
    const [hasSeenGuide, setHasSeenGuide] = useState<Record<string, boolean>>({});

    // ── Sidebar data ────────────────────────────────────────────────────────────
    const [activeAudits, setActiveAudits] = useState<any[]>([]);

    // ── Unread counts keyed by roomId ───────────────────────────────────────────
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    // Track the timestamp when the user last read each room
    const lastReadRef = useRef<Record<string, string>>({});

    // ── Moderation: whether the current user is muted/banned in active room ─────
    const [isMuted, setIsMuted] = useState(false);
    const [isBanned, setIsBanned] = useState(false);

    // ── Create room dialog ──────────────────────────────────────────────────────
    const [createRoomOpen, setCreateRoomOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [newlyCreatedRoomId, setNewlyCreatedRoomId] = useState<string | null>(null);

    // ── Misc ────────────────────────────────────────────────────────────────────
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(params.get('m'));

    const scrollRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const isInitialLoad = useRef(true);

    // ─── Fetch helpers ───────────────────────────────────────────────────────────

    const fetchRooms = useCallback(async () => {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setRooms(data.map((r: any) => ({
                id: r.id,
                name: r.name,
                type: r.room_type || 'public',
            })));
        }
    }, []);

    const fetchAudits = useCallback(async () => {
        const { data, error } = await supabase
            .from('peoples_audits' as any)
            .select(`id, bill_id, bills(title), votes_for, votes_against`)
            .limit(2);

        if (!error && data) setActiveAudits(data);
    }, []);

    /** Check whether the current user is muted or banned in the given room */
    const fetchModerationStatus = useCallback(async (roomId: string) => {
        if (!user) return;
        try {
            const { data } = await (supabase.from('chat_room_members' as any) as any)
                .select('is_muted, is_banned')
                .eq('user_id', user.id)
                .eq('room_id', roomId)
                .maybeSingle();

            if (data) {
                setIsMuted(!!data.is_muted);
                setIsBanned(!!data.is_banned);
            } else {
                setIsMuted(false);
                setIsBanned(false);
            }
        } catch {
            setIsMuted(false);
            setIsBanned(false);
        }
    }, [user]);

    const fetchMessages = useCallback(async (roomId: string, cursor?: string) => {
        if (cursor) setLoadingOlder(true);
        else setLoading(true);
        setFetchError(false);

        try {
            let query = supabase
                .from('chat_messages')
                .select('*')
                .eq('room_id', roomId)
                .is('parent_id', null)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);

            if (cursor) query = query.lt('created_at', cursor);

            const { data, error } = await query;
            if (error) { setFetchError(true); throw error; }

            if (data) {
                const userIds = [...new Set(data.map(m => m.user_id))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, username')
                    .in('id', userIds);

                const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
                const withProfiles: ChatMessage[] = data.map(m => ({
                    ...m,
                    profile: profileMap.get(m.user_id) || null,
                }));
                const sorted = withProfiles.sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                setMessages(prev => cursor ? [...sorted, ...prev] : sorted);
                setHasMoreOlder(data.length === PAGE_SIZE);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setFetchError(true);
            setHasMoreOlder(false);
        } finally {
            setLoading(false);
            setLoadingOlder(false);
        }
    }, []);

    // ─── Room join (used by both sidebar buttons and JoinRoomGuide) ──────────────

    const handleJoinRoom = useCallback(async (roomId: string) => {
        if (!user) return;
        setActiveRoom(roomId);
        setSelectedPeer(null);
        setIsPrivate(false);

        // Clear unread count for this room
        setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
        lastReadRef.current[roomId] = new Date().toISOString();

        try {
            await (supabase.from('chat_room_members' as any) as any).upsert(
                { user_id: user.id, room_id: roomId, last_read_at: new Date().toISOString() },
                { onConflict: 'user_id,room_id' }
            );
        } catch (err) {
            console.error('Failed to upsert chat_room_members:', err);
        }

        toast({
            title: `Joined ${rooms.find(r => r.id === roomId)?.name || 'room'}`,
            description: 'Your session is now synchronised.',
        });
    }, [user, rooms, toast]);

    // ─── Effects ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchRooms();
        fetchAudits();
    }, [fetchRooms, fetchAudits]);

    useEffect(() => {
        if (rooms.length > 0 && !activeRoom) {
            const preferred = params.get('room') || 'general';
            const exists = rooms.find(r => r.id === preferred);
            setActiveRoom(exists ? exists.id : rooms[0].id);
        }
    }, [rooms, activeRoom, params]);

    useEffect(() => {
        if (activeRoom && session) {
            fetchMessages(activeRoom);
            fetchModerationStatus(activeRoom);
            isInitialLoad.current = true;
            // Only open the guide once rooms are confirmed loaded — avoids the
            // race where the guide renders before fetchRooms() resolves.
            if (!hasSeenGuide[activeRoom] && rooms.length > 0) setShowGuide(true);
        }
    }, [activeRoom, session, rooms.length, fetchMessages, fetchModerationStatus, hasSeenGuide]);

    // Catch-up: if rooms loaded AFTER activeRoom was already set (common on first paint),
    // open the guide now that we have the room list to display.
    useEffect(() => {
        if (rooms.length > 0 && activeRoom && session && !hasSeenGuide[activeRoom]) {
            setShowGuide(true);
        }
    }, [rooms.length]); // intentionally narrow — only re-runs when rooms first populate

    // Private room creation
    useEffect(() => {
        if (!isPrivate || !selectedPeer || !user) return;
        const ids = [user.id, selectedPeer.id].sort();
        const roomId = `vault:${ids[0]}:${ids[1]}`;
        setActiveRoom(roomId);

        if (!rooms.find(r => r.id === roomId)) {
            setRooms(prev => [
                ...prev.filter(r => r.type !== 'direct'),
                { id: roomId, name: `Private: ${selectedPeer.full_name || 'Member'}`, type: 'direct' },
            ]);
        }

        void (async () => {
            try {
                await (supabase.from('chat_room_members' as any) as any).upsert([
                    { user_id: user.id, room_id: roomId, joined_at: new Date().toISOString() },
                    { user_id: selectedPeer.id, room_id: roomId, joined_at: new Date().toISOString() },
                ], { onConflict: 'user_id,room_id' });
            } catch (e) {
                console.error('Private room membership upsert failed:', e);
            }
        })();
    }, [isPrivate, selectedPeer, user, rooms]);

    // Source bridge sync
    useEffect(() => {
        const source = params.get('source');
        const title = params.get('title');
        const content = params.get('content');
        if (source && title && !isInitialLoad.current) {
            const initialText = content
                ? `[Shared] "${decodeURIComponent(content)}" - Ref: ${decodeURIComponent(title)}`
                : `[Ref: ${decodeURIComponent(title)}] I have thoughts on this... `;
            setNewMessage(initialText);
            toast({ title: 'Synced', description: 'Continuing the discussion from the post.' });
        }
    }, [params, toast]);

    // Realtime subscription — new messages in active room
    useEffect(() => {
        if (!session || !activeRoom) return;

        const channel = supabase
            .channel(`chat:${activeRoom}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${activeRoom}`,
            }, async (payload) => {
                if (payload.new.parent_id) return;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, username')
                    .eq('id', payload.new.user_id)
                    .single();

                const msgWithProfile: ChatMessage = {
                    ...(payload.new as unknown as ChatMessage),
                    profile,
                };

                setMessages(prev => {
                    if (prev.find(m => m.id === msgWithProfile.id)) return prev;
                    return [...prev, msgWithProfile];
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel).catch(() => { }); };
    }, [activeRoom, session]);

    // Realtime subscription — unread counts for non-active rooms
    useEffect(() => {
        if (!session || rooms.length === 0) return;

        const inactiveRoomIds = rooms
            .filter(r => r.id !== activeRoom && r.type !== 'direct')
            .map(r => r.id);

        if (inactiveRoomIds.length === 0) return;

        const channel = supabase
            .channel('chat:unread-tracker')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
            }, (payload) => {
                const { room_id, user_id, parent_id } = payload.new as any;
                if (parent_id) return; // skip replies
                if (user_id === user?.id) return; // skip own messages
                if (room_id === activeRoom) return; // already viewing

                if (inactiveRoomIds.includes(room_id)) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [room_id]: (prev[room_id] || 0) + 1,
                    }));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel).catch(() => { }); };
    }, [session, rooms, activeRoom, user]);

    // Room-level presence — only track who is in the ACTIVE room
    useEffect(() => {
        if (!session || !user || !activeRoom) return;

        const channelName = `room-presence:${activeRoom}`;
        const presenceChannel = supabase.channel(channelName);

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
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .maybeSingle();

                    await presenceChannel.track({
                        id: user.id,
                        full_name: profile?.full_name || 'Anonymous',
                        avatar_url: profile?.avatar_url,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => { supabase.removeChannel(presenceChannel).catch(() => { }); };
    }, [session, user, activeRoom]); // re-subscribe when room changes

    // Infinite scroll observer
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
    }, [messages, loadingOlder, hasMoreOlder, activeRoom, fetchMessages, fetchError]);

    // Auto-scroll
    useEffect(() => {
        if (!scrollRef.current) return;
        const { scrollHeight, clientHeight, scrollTop } = scrollRef.current;
        if (isInitialLoad.current || scrollHeight - clientHeight - scrollTop < 300) {
            scrollRef.current.scrollTop = scrollHeight;
            isInitialLoad.current = false;
        }
    }, [messages]);

    // ─── Input / send ─────────────────────────────────────────────────────────

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewMessage(val);
        const lastWord = val.split(' ').pop() || '';
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
        words[words.length - 1] = (mentionTrigger || '') + (item.username || item.name) + ' ';
        setNewMessage(words.join(' '));
        setMentionTrigger(null);
    };

    const handleSendMessage = async (content: string, files?: File[]) => {
        if (!content.trim() && (!files || files.length === 0)) return;

        // Enforce moderation on client side (RLS also enforces server side)
        if (isBanned) {
            toast({ title: 'You are banned from this room.', variant: 'destructive' });
            return;
        }
        if (isMuted) {
            toast({ title: 'You are muted in this room.', description: 'You cannot send messages right now.', variant: 'destructive' });
            return;
        }

        setSending(true);
        try {
            const { error } = await supabase.from('chat_messages').insert({
                content: content.trim(),
                room_id: activeRoom,
                user_id: user?.id,
            });
            if (error) throw error;
        } catch (error: any) {
            toast({ title: 'Dispatch Failure', description: error.message, variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    // ─── Room creation ────────────────────────────────────────────────────────

    const handleCreateRoom = async () => {
        if (!newRoomName.trim() || !user) return;
        setCreatingRoom(true);
        const roomId = newRoomName.trim().toLowerCase().replace(/\s+/g, '-');

        const { error } = await supabase.from('chat_rooms').insert({
            id: roomId,
            name: newRoomName.trim(),
            room_type: 'public',
        });

        if (error) {
            toast({ title: 'Error', description: 'Could not create room.', variant: 'destructive' });
            setCreatingRoom(false);
            return;
        }

        setNewRoomName('');
        setCreateRoomOpen(false);
        setCreatingRoom(false);
        setNewlyCreatedRoomId(roomId);
        await fetchRooms();
        await handleJoinRoom(roomId);

        // Visual feedback — flash cleared after 3 s
        setTimeout(() => setNewlyCreatedRoomId(null), 3000);
    };

    // ─── Guide handlers ───────────────────────────────────────────────────────

    const handleCloseGuide = () => {
        setShowGuide(false);
        if (activeRoom) setHasSeenGuide(prev => ({ ...prev, [activeRoom]: true }));
    };

    /** Called when user selects a room from the guide's room-picker step */
    const handleGuideRoomSelect = async (roomId: string) => {
        await handleJoinRoom(roomId);
        setHasSeenGuide(prev => ({ ...prev, [roomId]: true }));
    };

    // ─── Formatting ───────────────────────────────────────────────────────────

    const formatMessageDate = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return `Yesterday, ${format(date, 'HH:mm')}`;
        return format(date, 'MMM d, HH:mm');
    };

    // ─── Auth gate ────────────────────────────────────────────────────────────

    if (!session) {
        return (
            <Card className="h-[700px] flex flex-col items-center justify-center border-none shadow-2xl rounded-[40px] bg-white/50 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-primary/10 p-6 rounded-[32px] mb-8 shadow-inner">
                    <MessageCircle className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Join the Community</h3>
                <p className="text-muted-foreground text-center mb-8 max-w-sm px-4">Sign in to chat and connect with others.</p>
                <Button asChild size="lg" className="rounded-2xl px-12 h-14 text-lg font-bold shadow-xl">
                    <Link to="/auth" rel="nofollow">Sign In</Link>
                </Button>
            </Card>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="grid lg:grid-cols-12 gap-6 h-[800px] font-sans">

            {/* ── Sidebar (Rooms) ───────────────────────────────────────────────── */}
            <Card className="lg:col-span-3 flex flex-col border-none shadow-ios-low rounded-[32px] overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-xl">
                <CardHeader className="pb-4 pt-6">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Rooms
                        </CardTitle>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => setCreateRoomOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {!isPrivate ? (
                        rooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
                                <Hash className="h-8 w-8 text-muted-foreground opacity-30" />
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    No rooms yet.{' '}
                                    <button
                                        onClick={() => setCreateRoomOpen(true)}
                                        className="text-primary underline underline-offset-2"
                                    >
                                        Create one!
                                    </button>
                                </p>
                            </div>
                        ) : (
                            rooms.map(room => {
                                const isActive = activeRoom === room.id && !isPrivate;
                                const unread = unreadCounts[room.id] || 0;
                                const isNewRoom = newlyCreatedRoomId === room.id;
                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => handleJoinRoom(room.id)}
                                        className={cn(
                                            'w-full flex items-center gap-3 p-3.5 rounded-[20px] transition-all duration-300',
                                            isActive
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                                : isNewRoom
                                                    ? 'bg-primary/10 ring-1 ring-primary/30'
                                                    : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                                        )}
                                    >
                                        <div className={cn(
                                            'h-10 w-10 rounded-2xl flex items-center justify-center transition-colors shrink-0',
                                            isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/5'
                                        )}>
                                            <Hash className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-sm font-bold truncate">{room.name}</p>
                                            <p className={cn(
                                                'text-[10px]',
                                                isActive ? 'text-white/60' : 'text-muted-foreground'
                                            )}>
                                                {isNewRoom ? '✓ Just created' : 'Public room'}
                                            </p>
                                        </div>
                                        {/* Unread badge */}
                                        {unread > 0 && !isActive && (
                                            <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )
                    ) : (
                        <div className="p-4 text-center space-y-4">
                            <Shield className="h-10 w-10 text-primary mx-auto opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Private Chat
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsPrivate(false);
                                    setActiveRoom(params.get('room') || rooms[0]?.id || 'general');
                                }}
                                className="rounded-xl w-full text-[10px] font-bold"
                            >
                                Back to Public Chat
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Main Chat Area ────────────────────────────────────────────────── */}
            <Card className="lg:col-span-6 flex flex-col border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[40px] overflow-hidden bg-white dark:bg-[#1C1C1E] relative">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-black/40 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className={cn('p-2.5 rounded-[18px]', isPrivate ? 'bg-amber-500/10' : 'bg-primary/10')}>
                            {isPrivate
                                ? <Shield className="h-5 w-5 text-amber-500" />
                                : <MessageCircle className="h-5 w-5 text-primary" />
                            }
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">
                                {isPrivate
                                    ? `Private: ${selectedPeer?.full_name || 'Citizen'}`
                                    : (rooms.find(r => r.id === activeRoom)?.name || 'Chat')
                                }
                            </h2>
                            <p className={cn(
                                'text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5',
                                isPrivate ? 'text-amber-500' : 'text-green-500'
                            )}>
                                <span className={cn(
                                    'w-1.5 h-1.5 rounded-full animate-pulse',
                                    isPrivate ? 'bg-amber-500' : 'bg-green-500'
                                )} />
                                {/* Room-level online count */}
                                {isPrivate ? 'Private & Secure' : `${onlineUsers.length} in this room`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
                            <Users className="h-4.5 w-4.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
                            <MoreVertical className="h-4.5 w-4.5" />
                        </Button>
                    </div>
                </div>

                {/* Mute/ban notice */}
                {(isMuted || isBanned) && (
                    <div className={cn(
                        'mx-4 mt-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-center',
                        isBanned
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    )}>
                        {isBanned
                            ? 'You are banned from this room and cannot send messages.'
                            : 'You are currently muted in this room.'}
                    </div>
                )}

                {/* Messages */}
                <CardContent className="flex-1 p-0 overflow-hidden relative">
                    <ScrollArea className="h-full px-4" ref={scrollRef}>
                        <div ref={topSentinelRef} className="h-1 w-full" />

                        {loadingOlder && (
                            <div className="flex justify-center py-4">
                                <CEKALoader variant="ios" size="sm" />
                            </div>
                        )}

                        {messages.length === 0 && !loading && (
                            <Empty className="border-none mt-20">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon" className="bg-primary/10">
                                        <Hash className="h-8 w-8 text-primary" />
                                    </EmptyMedia>
                                    <EmptyTitle>Start the conversation</EmptyTitle>
                                    <EmptyDescription>
                                        Be the first to talk in {rooms.find(r => r.id === activeRoom)?.name}.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <Button
                                        onClick={() => (document.querySelector('input') as any)?.focus()}
                                        variant="outline"
                                        className="rounded-2xl"
                                    >
                                        Write a message
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
                                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                                        id={`message-${message.id}`}
                                        className={cn(
                                            'group flex gap-3 transition-all duration-500 mb-6 mx-4',
                                            isOwn ? 'flex-row-reverse' : 'flex-row',
                                            isHighlighted && 'bg-primary/5 -mx-0 px-4 py-4 border-y border-primary/10 shadow-inner rounded-2xl'
                                        )}
                                    >
                                        <div className="w-10 shrink-0 mt-1">
                                            {showAvatar ? (
                                                <div className="relative group">
                                                    <Avatar className="h-10 w-10 rounded-[16px] shadow-ios-soft border-2 border-white dark:border-white/10 ring-1 ring-black/5 transition-transform group-hover:scale-110 duration-300">
                                                        <AvatarImage src={message.profile?.avatar_url || ''} />
                                                        <AvatarFallback className="bg-slate-100 dark:bg-white/5 font-black text-[10px] text-primary">
                                                            {message.profile?.full_name?.charAt(0) || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-[#1C1C1E] rounded-full" />
                                                </div>
                                            ) : (
                                                <div className="w-10" />
                                            )}
                                        </div>

                                        <div className={cn('flex-1 flex flex-col space-y-1', isOwn ? 'items-end' : 'items-start')}>
                                            {showAvatar && (
                                                <div className={cn(
                                                    'flex items-center gap-2 mb-1 px-1',
                                                    isOwn ? 'flex-row-reverse' : 'flex-row'
                                                )}>
                                                    <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest opacity-80">
                                                        {message.profile?.full_name || 'Anonymous'}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground/50 font-black uppercase tracking-tighter">
                                                        {formatMessageDate(message.created_at)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={cn(
                                                'relative px-4.5 py-3 rounded-[22px] max-w-[85%] text-sm leading-relaxed shadow-ios-soft transition-all duration-300 group-hover:shadow-ios-low',
                                                isOwn
                                                    ? 'bg-primary text-white rounded-tr-[4px] font-medium'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 rounded-tl-[4px] border border-white/50 dark:border-white/5'
                                            )}>
                                                <p className="whitespace-pre-wrap break-words font-medium tracking-tight">
                                                    {message.content}
                                                </p>
                                                <InteractionLogger
                                                    targetId={message.id}
                                                    targetType="message"
                                                    metadata={{ room_id: activeRoom }}
                                                />
                                            </div>

                                            <div className={cn(
                                                'flex flex-col gap-1 w-full max-w-[85%] mt-1',
                                                isOwn ? 'items-end' : 'items-start'
                                            )}>
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
                            placeholder={
                                isBanned ? 'You are banned from this room.' :
                                    isMuted ? 'You are muted in this room.' :
                                        `Message ${rooms.find(r => r.id === activeRoom)?.name || 'the chat'}...`
                            }
                            disabled={!user || isBanned || isMuted}
                        />
                        <p className="mt-3 text-[10px] text-center text-muted-foreground/50 font-medium uppercase tracking-[0.15em]">
                            Messages are synced in real-time
                        </p>
                    </div>
                </CardFooter>
            </Card>

            {/* ── Right Sidebar: Audits & Online ───────────────────────────────── */}
            <div className="hidden lg:flex lg:col-span-3 flex-col gap-6 h-full overflow-hidden">

                {/* Live Votes */}
                <Card className="flex flex-col flex-1 border-none shadow-ios-low rounded-[32px] overflow-hidden bg-primary/5 dark:bg-primary/10 backdrop-blur-xl border-l-4 border-primary/20 max-h-[400px]">
                    <CardHeader className="pb-4 pt-6">
                        <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Radio className="h-4 w-4 animate-pulse" />
                            Live Votes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {activeAudits.length > 0 ? (
                            activeAudits.map(audit => (
                                <div
                                    key={audit.id}
                                    className="p-4 rounded-2xl bg-white/60 dark:bg-black/40 shadow-sm space-y-3 transition-transform hover:scale-[1.02] cursor-pointer"
                                >
                                    <p className="text-xs font-bold leading-tight">{audit.bills?.title}</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                            <span>Public Opinion</span>
                                            <span>
                                                {Math.round((audit.votes_against / ((audit.votes_for + audit.votes_against) || 1)) * 100)}% Rejection
                                            </span>
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
                                        <Button size="sm" variant="outline" className="w-full rounded-xl text-[9px] font-bold h-7 border-slate-200">
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/20 text-center py-8">
                                <p className="text-[10px] font-bold text-muted-foreground">No live polls</p>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            asChild
                            className="w-full rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
                        >
                            <Link to="/audit">View All</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Polls */}
                <Card className="flex flex-col flex-1 border-none shadow-ios-low rounded-[32px] overflow-hidden bg-white/60 dark:bg-black/20 backdrop-blur-xl relative">
                    <CardHeader className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Radio className="h-4 w-4" />
                            Polls
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto">
                        <SidebarPolls />
                    </CardContent>
                </Card>

                {/* Online — now scoped to active room */}
                <Card className="flex flex-col flex-1 border-none shadow-ios-low rounded-[32px] overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-xl">
                    <CardHeader className="pb-4 pt-6">
                        <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            In this room{' '}
                            <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-green-500/10 text-green-500 border-green-500/20">
                                {onlineUsers.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-2 space-y-1">
                        {onlineUsers.length === 0 ? (
                            <div className="flex-1 flex flex-col min-w-0 max-h-screen relative">
                                <div className="flex flex-col items-center justify-center h-40">
                                    <CEKALoader variant="scanning" size="md" text="Loading..." />
                                </div>
                            </div>
                        ) : (
                            onlineUsers
                                .filter(u => u.id !== user?.id)
                                .map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => { setSelectedPeer(u); setIsPrivate(true); }}
                                        className={cn(
                                            'w-full flex items-center gap-3 p-3 rounded-[20px] hover:bg-white/40 dark:hover:bg-white/5 transition-all group',
                                            selectedPeer?.id === u.id && isPrivate && 'bg-white/60 dark:bg-white/10 ring-1 ring-primary/20'
                                        )}
                                    >
                                        <div className="relative">
                                            <Avatar className="h-10 w-10 rounded-[14px] shadow-sm border-2 border-white dark:border-black/40 ring-1 ring-slate-200/50">
                                                <AvatarImage src={u.avatar_url || undefined} />
                                                <AvatarFallback className="text-[10px] bg-slate-100 font-bold">
                                                    {u.full_name?.charAt(0) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-black ring-1 ring-black/10" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                                                {u.full_name || 'Anonymous'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/60 font-medium">Online</p>
                                        </div>
                                    </button>
                                ))
                        )}
                    </CardContent>
                    <div className="p-6 border-t border-slate-100 dark:border-white/5">
                        <Button variant="outline" className="w-full rounded-2xl h-11 text-xs font-bold uppercase tracking-widest gap-2">
                            <Shield className="h-3.5 w-3.5" /> Private Chat
                        </Button>
                    </div>
                </Card>
            </div>

            {/* ── Join Room Guide ────────────────────────────────────────────────── */}
            <JoinRoomGuide
                isOpen={showGuide}
                onClose={handleCloseGuide}
                roomName={rooms.find(r => r.id === activeRoom)?.name || 'Chat'}
                rooms={rooms}
                onSelectRoom={handleGuideRoomSelect}
                currentRoomId={activeRoom}
            />

            {/* ── Create Room Dialog ─────────────────────────────────────────────── */}
            <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
                <DialogContent className="sm:max-w-sm rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>New Room</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Label htmlFor="new-room-name">Name</Label>
                        <Input
                            id="new-room-name"
                            value={newRoomName}
                            onChange={e => setNewRoomName(e.target.value)}
                            placeholder="Finance Bill 2026"
                            onKeyDown={e => { if (e.key === 'Enter') handleCreateRoom(); }}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleCreateRoom}
                            disabled={!newRoomName.trim() || creatingRoom}
                        >
                            {creatingRoom ? 'Creating…' : 'Create Room'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CommunityChat;