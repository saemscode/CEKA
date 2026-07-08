import React, { useEffect, useState, useCallback, useRef } from 'react';
import { mediaService, type MediaContent } from '@/services/mediaService';
import InstagramCarousel from '../carousel/InstagramCarousel';
import { placeholderService } from '@/services/placeholderService';
import { Grid2X2, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { useAuth } from '@/providers/AuthProvider';
import { roleService } from '@/services/roleService';
import { supabase } from '@/integrations/supabase/client';
import ProposeCollab from '@/components/campaigns/ProposeCollab';

const ITEMS_PER_PAGE = 6;

const MediaFeed: React.FC = () => {
    const [content, setContent] = useState<MediaContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
    const [isAlly, setIsAlly] = useState(false);
    const [allyPartnerId, setAllyPartnerId] = useState<string | null>(null);
    const [allyUserId, setAllyUserId] = useState<string | null>(null);
    // Map of media_item_id -> partner branding for co-authored pieces
    const [coBrandedItems, setCoBrandedItems] = useState<Record<string, { org_name: string; org_logo_url: string | null }>>({});
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    // Initial fetch
    useEffect(() => {
        const fetchMedia = async () => {
            try {
                // Fetch all published carousels
                const data = await mediaService.listMediaContent('carousel', 1, ITEMS_PER_PAGE);

                // Fetch detailed content for each summary (to get items/slides)
                const fullData = await Promise.all(
                    data.map(async (item) => {
                        const detailed = await mediaService.getMediaContent(item.slug);
                        return detailed || item;
                    })
                );

                setContent(fullData);
                setHasMore(data.length >= ITEMS_PER_PAGE);
            } catch (error) {
                console.error('Failed to fetch media feed:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMedia();
    }, []);

    // Check ally role + fetch partner record once on mount
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

    // After content loads, fetch co-branding data for any linked pieces
    useEffect(() => {
        if (!content.length) return;
        const fetchCoBranding = async () => {
            const ids = content.map(c => c.id);
            const { data } = await (supabase.from('campaign_collaborations' as any) as any)
                .select('media_item_id, partner:partner_id (org_name, org_logo_url)')
                .in('media_item_id', ids)
                .eq('status', 'active');
            if (data?.length) {
                const map: Record<string, { org_name: string; org_logo_url: string | null }> = {};
                data.forEach((row: any) => {
                    if (row.media_item_id && row.partner) {
                        map[row.media_item_id] = row.partner;
                    }
                });
                setCoBrandedItems(map);
            }
        };
        fetchCoBranding();
    }, [content]);

    // Load more function
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const data = await mediaService.listMediaContent('carousel', nextPage, ITEMS_PER_PAGE);

            if (data.length === 0) {
                setHasMore(false);
                return;
            }

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
            console.error('Failed to load more:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [page, loadingMore, hasMore]);

    // Infinite scroll observer
    useEffect(() => {
        if (loading) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loading, hasMore, loadingMore, loadMore]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <CEKALoader variant="scanning" size="lg" />
                <p className="text-muted-foreground animate-pulse font-bold tracking-tight">Curating Media Feed...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
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
                        <List size={16} />
                        Feed
                    </Button>
                    <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="gap-1.5 rounded-full font-bold"
                    >
                        <Grid2X2 size={16} />
                        Grid
                    </Button>
                </div>
            </div>

            {viewMode === 'feed' ? (
                <div className="space-y-12 max-w-xl mx-auto">
                    {content.length > 0 ? content.map((item) => {
                        const coPartner = coBrandedItems[item.id];
                        return (
                        <div key={item.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-4">
                                <h3 className="text-xl font-black tracking-tight uppercase">{item.title}</h3>
                                {item.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1 font-medium">{item.description}</p>
                                )}
                                {/* Co-branding banner — shown when a verified partner is linked */}
                                {coPartner && (
                                    <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-kenya-green/5 border border-kenya-green/15 w-fit">
                                        {coPartner.org_logo_url && (
                                            <img src={coPartner.org_logo_url} alt={coPartner.org_name} className="w-5 h-5 object-contain rounded" />
                                        )}
                                        <span className="text-[10px] font-black text-kenya-green uppercase tracking-widest">
                                            Presented in Partnership with {coPartner.org_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <InstagramCarousel content={item} />
                            {/* Native In-App Collab Proposal — only for verified ally users */}
                            {isAlly && allyPartnerId && (
                                <ProposeCollab
                                    mediaItemId={item.id}
                                    contentTitle={item.title}
                                    partnerId={allyPartnerId}
                                    partnerUserId={allyUserId || ''}
                                />
                            )}
                        </div>
                        );
                    })
                    )) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-50 bg-muted/20">
                            <p className="font-bold">No visual media published yet.</p>
                        </div>
                    )}

                    {/* Infinite Scroll Trigger */}
                    <div ref={loadMoreRef} className="py-8 flex flex-col items-center justify-center gap-2">
                        {loadingMore && (
                            <>
                                <CEKALoader variant="scanning" size="sm" />
                                <span className="text-xs font-bold text-muted-foreground animate-pulse">Scanning for more...</span>
                            </>
                        )}
                        {!hasMore && content.length > 0 && (
                            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">End of Feed</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-1">
                    {content.map((item) => (
                        <div
                            key={item.id}
                            className="aspect-[4/5] relative group cursor-pointer overflow-hidden bg-muted"
                            onClick={() => setViewMode('feed')}
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
        </div>
    );
};

export default MediaFeed;