
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { mediaService, type MediaContent } from '@/services/mediaService';
import InstagramCarousel from '../carousel/InstagramCarousel';
import { placeholderService } from '@/services/placeholderService';
import {
  LayoutGridIcon as Grid2X2,
  AlertTriangleIcon as AlertTriangle,
  RefreshCwIcon as RefreshCw,
  Maximize2Icon as Maximize2,
  CarouselSlideIcon
} from '../ui/CustomIcons';
import { Button } from '@/components/ui/button';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { useAuth } from '@/providers/AuthProvider';
import { roleService } from '@/services/roleService';
import { supabase } from '@/integrations/supabase/client';
import ProposeCollab from '@/components/campaigns/ProposeCollab';
import piecesSocialService, { type InteractionState } from '@/services/piecesSocialService';
import { useNavigate } from 'react-router-dom';
import { PieceDetailModal } from './PieceDetailModal';

const ITEMS_PER_PAGE = 6;

// Detect breakpoint on mount for default viewMode
const getDefaultViewMode = (): 'feed' | 'grid' => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
        return 'grid';
    }
    return 'feed';
};

interface MediaFeedProps {
    targetSlug?: string | null;
}

const MediaFeed: React.FC<MediaFeedProps> = ({ targetSlug }) => {
    const navigate = useNavigate();
    const [content, setContent] = useState<MediaContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<'feed' | 'grid'>(getDefaultViewMode());
    const [isAlly, setIsAlly] = useState(false);
    const [allyPartnerId, setAllyPartnerId] = useState<string | null>(null);
    const [allyUserId, setAllyUserId] = useState<string | null>(null);
    // Map of media_content id -> { org_name, org_logo_url }[] (multi-partner support)
    const [coBrandedItems, setCoBrandedItems] = useState<Record<string, { org_name: string; org_logo_url: string | null }[]>>({});
    // Batch social state: content_id -> InteractionState
    const [socialState, setSocialState] = useState<Record<string, InteractionState>>({});

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const targetSlugRef = useRef<HTMLDivElement | null>(null);
    const [selectedPiece, setSelectedPiece] = useState<MediaContent | null>(null);
    const { user } = useAuth();

    // Initial fetch
    const fetchMedia = useCallback(async () => {
        setLoading(true);
        setFetchError(false);
        try {
            const data = await mediaService.listMediaContent('carousel', 1, ITEMS_PER_PAGE);
            const fullData = await Promise.all(
                data.map(async (item) => {
                    const detailed = await mediaService.getMediaContent(item.slug);
                    return detailed || item;
                })
            );
            setContent(fullData);
            setHasMore(data.length >= ITEMS_PER_PAGE);
            setPage(1);
        } catch (error) {
            console.error('[MediaFeed] Failed to fetch:', error);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMedia(); }, [fetchMedia]);

    // Batch-fetch social state (like/save) for loaded content
    useEffect(() => {
        if (!user || !content.length) return;
        const ids = content.map(c => c.id);
        piecesSocialService.batchGetInteractionState(user.id, ids).then(state => {
            setSocialState(state);
        });
    }, [user, content]);

    // Check ally role
    useEffect(() => {
        if (!user) return;
        roleService.getUserRole(user.id, user.email).then(async role => {
            if (role === 'ally') {
                setIsAlly(true);
                setAllyUserId(user.id);
                const { data: partnerData } = await (supabase.from('partners' as any) as any)
                    .select('id')
                    .eq('submitted_by_user_id', user.id)
                    .maybeSingle();
                if (partnerData?.id) setAllyPartnerId(partnerData.id);
            }
        });
    }, [user]);

    // Multi-partner co-branding fetch
    useEffect(() => {
        if (!content.length) return;
        const fetchCoBranding = async () => {
            const ids = content.map(c => c.id);
            const { data } = await (supabase.from('campaign_collaborations' as any) as any)
                .select('media_item_id, partner:partner_id (org_name, org_logo_url)')
                .in('media_item_id', ids)
                .eq('status', 'active');
            if (data?.length) {
                const map: Record<string, { org_name: string; org_logo_url: string | null }[]> = {};
                data.forEach((row: any) => {
                    if (row.media_item_id && row.partner) {
                        if (!map[row.media_item_id]) map[row.media_item_id] = [];
                        map[row.media_item_id].push(row.partner);
                    }
                });
                setCoBrandedItems(map);
            }
        };
        fetchCoBranding();
    }, [content]);

    // Supabase Realtime: cross-session deletion sync (alongside existing custom DOM event in Pieces.tsx)
    useEffect(() => {
        const channel = supabase
            .channel('media-content-realtime')
            .on(
                'postgres_changes' as any,
                { event: 'DELETE', schema: 'public', table: 'media_content' },
                (payload: any) => {
                    const deletedId = payload.old?.id;
                    if (deletedId) {
                        setContent(prev => prev.filter(item => item.id !== deletedId));
                    }
                }
            )
            .on(
                'postgres_changes' as any,
                { event: 'UPDATE', schema: 'public', table: 'media_content' },
                (payload: any) => {
                    const updated = payload.new;
                    if (updated?.status !== 'published') {
                        setContent(prev => prev.filter(item => item.id !== updated.id));
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Deep-link: scroll to targetSlug after content loads
    useEffect(() => {
        if (!targetSlug || loading || !content.length) return;
        const target = content.find(c => c.slug === targetSlug);
        if (!target) {
            // Piece not in current page — fetch directly and prepend
            mediaService.getMediaContent(targetSlug).then(piece => {
                if (piece) {
                    setContent(prev => {
                        if (prev.find(c => c.id === piece.id)) return prev;
                        return [piece, ...prev];
                    });
                }
            });
            return;
        }
        // Switch to feed mode so the carousel is visible
        setViewMode('feed');
        // Scroll to the target element
        setTimeout(() => {
            if (targetSlugRef.current) {
                targetSlugRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetSlugRef.current.classList.add('pieces-deep-link-highlight');
                setTimeout(() => {
                    targetSlugRef.current?.classList.remove('pieces-deep-link-highlight');
                }, 2000);
            }
        }, 300);
    }, [targetSlug, loading, content]);

    // Load more
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        setLoadMoreError(false);
        try {
            const nextPage = page + 1;
            const data = await mediaService.listMediaContent('carousel', nextPage, ITEMS_PER_PAGE);
            if (data.length === 0) { setHasMore(false); return; }
            const fullNewItems = await Promise.all(
                data.map(async (item) => {
                    const detailed = await mediaService.getMediaContent(item.slug);
                    return detailed || item;
                })
            );
            setContent(prev => [...prev, ...fullNewItems]);
            setPage(nextPage);
            setHasMore(data.length >= ITEMS_PER_PAGE);
        } catch (error) {
            console.error('[MediaFeed] loadMore failed:', error);
            setLoadMoreError(true);
        } finally {
            setLoadingMore(false);
        }
    }, [page, loadingMore, hasMore]);

    // Infinite scroll observer
    useEffect(() => {
        if (loading) return;
        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loadMoreError) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );
        if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
        return () => { observerRef.current?.disconnect(); };
    }, [loading, hasMore, loadingMore, loadMoreError, loadMore]);

    // ── Initial loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <CEKALoader variant="scanning" size="lg" />
                <p className="text-muted-foreground animate-pulse font-bold tracking-tight">Curating Media Feed...</p>
            </div>
        );
    }

    // ── Fetch error state
    if (fetchError) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle size={26} className="text-destructive/70" />
                </div>
                <div>
                    <p className="font-black text-sm uppercase tracking-tight mb-1">Could not load media</p>
                    <p className="text-xs text-muted-foreground font-medium">Check your connection and try again.</p>
                </div>
                <Button onClick={fetchMedia} variant="outline" className="rounded-full gap-2 font-bold text-xs">
                    <RefreshCw size={14} /> Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-0 md:px-4">
            {/* Header + view toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-4 md:px-0">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter text-kenya-black dark:text-white uppercase">
                        Our <span className="text-kenya-red">Posts</span>
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">Visual education series and carousels</p>
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                    <Button
                        variant={viewMode === 'feed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('feed')}
                        className="gap-1.5 rounded-full font-bold"
                    >
                        <CarouselSlideIcon size={16} /> Feed
                    </Button>
                    <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="gap-1.5 rounded-full font-bold"
                    >
                        <Grid2X2 size={16} /> Grid
                    </Button>
                </div>
            </div>

            {/* ── FEED MODE ── */}
            {viewMode === 'feed' ? (
                <div className="space-y-12 max-w-xl mx-auto px-0">
                    {content.length > 0 ? content.map((item) => {
                        const partners = coBrandedItems[item.id] || [];
                        const interaction = socialState[item.id] || { liked: false, saved: false, like_count: 0 };
                        const isTarget = item.slug === targetSlug;
                        return (
                            <div
                                key={item.id}
                                ref={isTarget ? targetSlugRef : undefined}
                                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                            >
                                <div className="mb-4 px-4 md:px-0">
                                    <h3
                                        onClick={() => navigate(`/pieces/${item.slug || item.id}`)}
                                        className="text-xl font-black tracking-tight uppercase hover:text-kenya-green transition-colors cursor-pointer flex items-center justify-between group"
                                    >
                                        <span>{item.title}</span>
                                        <Maximize2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h3>
                                    {item.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1 font-medium">{item.description}</p>
                                    )}
                                    {/* Multi-partner banner above carousel */}
                                    {partners.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {partners.map((p, pi) => (
                                                <div key={pi} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-kenya-green/5 border border-kenya-green/15 w-fit">
                                                    {p.org_logo_url && (
                                                        <img src={p.org_logo_url} alt={p.org_name} className="w-5 h-5 object-contain rounded" />
                                                    )}
                                                    <span className="text-[10px] font-black text-kenya-green uppercase tracking-widest">
                                                        Presented in Partnership with {p.org_name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <InstagramCarousel
                                    content={item}
                                    initialLiked={interaction.liked}
                                    initialSaved={interaction.saved}
                                    initialLikeCount={interaction.like_count}
                                    coPartners={partners}
                                    targetSlug={targetSlug}
                                />

                                {isAlly && allyPartnerId && (
                                    <div className="px-4 md:px-0 mt-4">
                                        <ProposeCollab
                                            mediaItemId={item.id}
                                            contentTitle={item.title}
                                            partnerId={allyPartnerId}
                                            partnerUserId={allyUserId || ''}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-50 bg-muted/20 mx-4">
                            <p className="font-bold">No visual media published yet.</p>
                        </div>
                    )}

                    {/* Infinite scroll trigger */}
                    <div ref={loadMoreRef} className="py-8 flex flex-col items-center justify-center gap-3">
                        {loadingMore && (
                            <>
                                <CEKALoader variant="scanning" size="sm" />
                                <span className="text-xs font-bold text-muted-foreground animate-pulse">Scanning for more...</span>
                            </>
                        )}
                        {loadMoreError && (
                            <Button onClick={loadMore} variant="outline" className="rounded-full gap-2 font-bold text-xs">
                                <RefreshCw size={14} /> Couldn't load more — tap to retry
                            </Button>
                        )}
                        {!hasMore && content.length > 0 && (
                            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">End of Feed</p>
                        )}
                    </div>
                </div>
            ) : (
                /* ── GRID MODE ── */
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-1">
                    {content.map((item) => (
                        <div
                            key={item.id}
                            className="aspect-[4/5] relative group cursor-pointer overflow-hidden bg-muted"
                            onClick={() => navigate(`/pieces/${item.slug || item.id}`)}
                        >
                            <img
                                src={item.cover_url || item.items?.[0]?.file_url || placeholderService.getPlaceholderByTags(item.tags || [])}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = placeholderService.getPlaceholderByTags(item.tags || []);
                                }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                <p className="text-white text-xs font-bold text-center uppercase tracking-tight">{item.title}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Piece detail modal overlay when navigating to /pieces/:slug */}
            <PieceDetailModal targetSlug={targetSlug} />
        </div>
    );
};

export default MediaFeed;