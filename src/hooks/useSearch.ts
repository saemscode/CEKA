// src/hooks/useSearch.ts
// CEKA Search Hook v2 — with analytics, realtime feed, live chip counts

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchService, SearchResult, UserProfile, EnrichmentChip } from '@/lib/searchService';
import { offlineCache } from '@/lib/offlineCache';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

const PAGE_SIZE = 20;

export function useSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [chips, setChips] = useState<EnrichmentChip[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRestState, setIsRestState] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'county'>('relevance');

  const abortControllerRef = useRef<AbortController | null>(null);
  const searchStartTimeRef = useRef<number>(0);
  const sessionId = searchService.getSessionId();
  const isLoadMoreRef = useRef(false);

  // ── PROFILE FETCH ─────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, county, areas_of_interest, interests, contribution_points, preferences, civic_credits, verification_status')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data as unknown as UserProfile);
    };
    fetchProfile();
  }, [user]);

  // ── REST STATE FEED ───────────────────────────
  const loadDiscoveryFeed = useCallback(async () => {
    setLoading(true);
    // Seed from cache immediately (offline-first)
    const cached = await offlineCache.loadFeed<SearchResult>();
    if (cached && cached.length > 0) setAllResults(cached);
    try {
      let feed: SearchResult[];
      if (profile && (profile.areas_of_interest?.length || profile.interests?.length || profile.county)) {
        feed = await searchService.fetchPersonalised(profile);
      } else {
        feed = await searchService.fetchTrending();
      }
      setAllResults(feed);
      offlineCache.saveFeed(feed); // Persist for offline
      // Show popular searches as passive chips in rest state
      const popular = await searchService.getPopularSearches();
      setChips(popular.slice(0, 5).map(l => ({ label: `#${l}`, count: 0, active: false })));
    } catch (err) {
      console.error('Discovery feed error:', err);
      // Keep cached results visible on network failure
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (isRestState) loadDiscoveryFeed();
  }, [isRestState, loadDiscoveryFeed]);

  // ── REALTIME FEED (new content surfaces instantly) ───
  useEffect(() => {
    if (!isRestState) return; // only active in rest state

    const channel = supabase
      .channel('ceka-search-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bills' }, (payload) => {
        const b = payload.new as any;
        const base: any = {
          id: b.id, type: 'bill', title: b.title, description: b.summary || '', excerpt: b.summary || '',
          tags: b.tags || [], county: b.county, created_at: b.created_at, date: b.created_at,
          url: `/legislative-tracker/bills/${b.slug || b.id}`, category: 'Law',
          metadata: { bill_number: b.bill_number, status: b.status },
        };
        const scored = { ...base, ...searchService.computeRelevanceScore(base, profile, []) };
        setAllResults(prev => [scored, ...prev].slice(0, 20));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blog_posts' }, (payload) => {
        const p = payload.new as any;
        if (p.status !== 'published') return;
        const base: any = {
          id: p.id, type: 'blog', title: p.title, description: p.excerpt || '', excerpt: p.excerpt || '',
          tags: p.tags || [], county: p.county, created_at: p.created_at, date: p.created_at,
          url: `/blog/${p.slug || p.id}`, category: 'Blog',
        };
        const scored = { ...base, ...searchService.computeRelevanceScore(base, profile, []) };
        setAllResults(prev => [scored, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isRestState, profile]);

  // ── SEARCH EXECUTION (debounced 320ms) ────────
  useEffect(() => {
    if (!query.trim()) {
      setIsRestState(true);
      return;
    }

    setIsRestState(false);

    // Synchronous chip extraction (immediate, before debounce)
    const immediateChips = searchService.extractEnrichmentChipsSync(query);
    if (immediateChips.length > 0 && chips.every(c => !c.active)) {
      setChips(immediateChips);
      // Hydrate counts from RPC async (non-blocking)
      searchService.hydrateChipCounts(immediateChips).then(hydrated => {
        setChips(prev => {
          // Preserve active state from current chips
          const activeSet = new Set(prev.filter(c => c.active).map(c => c.label));
          return hydrated.map(c => ({ ...c, active: activeSet.has(c.label) }));
        });
      });
    }

    searchStartTimeRef.current = Date.now();

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setLoading(true);
      try {
        const activeChipLabels = chips.filter(c => c.active).map(c => c.label);
        const searchResults = await searchService.searchAll(query, profile, activeChipLabels, PAGE_SIZE, offset, sortBy);

        // Append on load-more, replace on new search
        if (isLoadMoreRef.current) {
          setAllResults(prev => [...prev, ...searchResults]);
          if (searchResults.length < PAGE_SIZE) setHasMore(false);
        } else {
          setAllResults(searchResults);
          setHasMore(searchResults.length === PAGE_SIZE);
        }
        isLoadMoreRef.current = false;

        // ── ANALYTICS: log search event ──────────
        const tokens = query.trim().split(' ').filter(Boolean);
        const resultTypes = [...new Set(searchResults.map(r => r.type))];
        const isZeroResults = searchResults.length === 0;

        await searchService.logSearchEvent({
          user_id: user?.id,
          session_id: sessionId,
          query,
          tokens,
          active_chips: activeChipLabels,
          results_count: searchResults.length,
          result_types_returned: resultTypes,
          zero_results: isZeroResults,
        });

        // ── ZERO RESULT ALERT (Telegram bridge) ────
        if (isZeroResults) {
          supabase.functions.invoke('notify-zero-results', {
            body: { query, userId: user?.id, timestamp: new Date().toISOString() },
          }).catch(() => { }); // fire-and-forget, never block UI
        } else {
          // Cache successful search results for offline
          offlineCache.saveSearch(query, searchResults);
        }

      } catch (err: any) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [query, profile, chips.filter(c => c.active).length, offset]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      isLoadMoreRef.current = true;
      setOffset(prev => prev + PAGE_SIZE);
    }
  }, [loading, hasMore]);

  const toggleChip = (label: string) => {
    setChips(prev => prev.map(c => (c.label === label ? { ...c, active: !c.active } : c)));
  };

  const clearQuery = () => {
    setQuery('');
    setChips([]);
    setAllResults([]);
    setOffset(0);
    setHasMore(true);
    setIsRestState(true);
    setError(null);
  };

  // ── CUSTOM CHIP ADD with auth persistence ─────
  const addCustomChip = useCallback(async (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const chipLabel = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

    setChips(prev => {
      if (prev.some(c => c.label.toLowerCase() === chipLabel.toLowerCase())) return prev;
      return [...prev, { label: chipLabel, count: 0, active: true }];
    });

    // Persist to Supabase for authenticated users
    if (user) {
      try {
        const currentPrefs = (profile?.preferences as any) ?? {};
        const existingCustom: string[] = currentPrefs.custom_chips ?? [];
        if (!existingCustom.includes(chipLabel)) {
          const updated = [...existingCustom, chipLabel].slice(-20);
          await (supabase as any).from('profiles').update({
            preferences: { ...currentPrefs, custom_chips: updated }
          }).eq('id', user.id);
        }
      } catch { /* non-critical, ignore */ }
    }
  }, [user, profile]);

  // ── LOAD SAVED CUSTOM CHIPS on profile load ───
  useEffect(() => {
    if (!profile) return;
    const saved: string[] = (profile.preferences as any)?.custom_chips ?? [];
    if (saved.length > 0) {
      setChips(prev => {
        const existing = new Set(prev.map(c => c.label.toLowerCase()));
        const toAdd = saved.filter(l => !existing.has(l.toLowerCase()))
          .map(l => ({ label: l, count: 0, active: false }));
        return toAdd.length ? [...prev, ...toAdd] : prev;
      });
    }
  }, [profile]);

  // ── ANALYTICS: click tracking ─────────────────
  const trackClick = useCallback((result: SearchResult, rank: number) => {
    const timeSinceSearch = Date.now() - searchStartTimeRef.current;
    searchService.logClickEvent({
      session_id: sessionId,
      query,
      clicked_result_id: result.id,
      clicked_result_type: result.type,
      clicked_result_rank: rank,
      clicked_relevance_score: result.relevanceScore,
      time_to_click_ms: timeSinceSearch,
    }, user?.id);
  }, [query, sessionId, user]);

  return {
    query,
    setQuery,
    results: allResults,
    chips,
    loading,
    error,
    isRestState,
    hasMore,
    loadMore,
    toggleChip,
    clearQuery,
    trackClick,
    addCustomChip,
    profile,
    sortBy,
    setSortBy,
  };
}
