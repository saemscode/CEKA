// src/pages/LegislativeTracker.tsx
import { vaultService } from '@/services/vaultService';
import { notificationService } from '@/services/notificationService'; // Added
import { useAuth } from '@/providers/AuthProvider'; // Added
import { useLanguage } from '@/contexts/LanguageContext';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Search, Filter, Calendar, ArrowRight, PlusCircle, ArrowUpDown,
  TrendingUp, RefreshCw, Layers, CheckCircle, Clock, Users, BookOpen, Globe, Shield, Scale, ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BillFollowButton } from '@/components/legislative/BillFollowButton';
import { CEKALoader } from '@/components/ui/ceka-loader';
import FeaturedLegislationCarousel from '@/components/legislative/FeaturedLegislationCarousel';
import SearchSuggestion from '@/components/SearchSuggestion';
import { Deep2Icon } from '@/components/ui/CustomIcons';
import { NasakaSVGIcon, DownloadIcon, ScalesIcon, NavPiecesIcon, EmailIcon, SearchIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/ui/CustomIcons';
import AIContextButton from '@/components/ai/AIContextButton';
import { motion, AnimatePresence } from 'framer-motion';
import { billService, getBillIdentifier } from '@/services/billService';
import { cn } from '@/lib/utils';
import { BILL_STAGES, STAGE_COUNT, getStageIndex, getStageColor } from '@/lib/billStages';
import { Helmet } from 'react-helmet-async';

// BILL_STAGES and getStageIndex imported from shared billStages.ts
// BILL_STAGES = 8 ordered stages, STAGE_COUNT = 8

interface Bill {
  id: string;
  slug?: string | null;
  title: string;
  summary: string;
  status: string;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
  url?: string | null;
  sponsor?: string;
  description?: string;
  stage_index?: number;
  neural_summary?: string | null;
  text_content?: string | null;
  pdf_url?: string | null;
  b2_url?: string | null;           // ✅ ADDED: Backblaze path for secure download
  follow_count?: number;
  tabloid_summary?: string | null;
  bill_no?: string | null;
  gazette_no?: string | null;
  corroboration_score?: number | null;
}

type SortOption = 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc' | 'status' | 'category';

const LegislativeTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Added for notification sync
  const { language } = useLanguage();
  const [billsData, setBillsData] = useState<Bill[]>([]);
  const [trendingBills, setTrendingBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all_stages');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [deepSearch, setDeepSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [stats, setStats] = useState<{ total: number; byStatus: any }>({ total: 0, byStatus: {} });
  const [realtimeFlash, setRealtimeFlash] = useState<string | null>(null);

  // Pagination & Virtualization Alternative
  const [visibleCount, setVisibleCount] = useState(10);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(10);
  }, [debouncedSearchTerm, activeTab, selectedCategory, sortBy, deepSearch]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 10);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [observerTarget]);

  // Per-card Read More state for neural_summary and sponsor text
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});
  const toggleSummaryExpanded = (billId: string) =>
    setExpandedSummaries(prev => ({ ...prev, [billId]: !prev[billId] }));
  const [expandedSponsors, setExpandedSponsors] = useState<Record<string, boolean>>({});
  const toggleSponsorExpanded = (billId: string) =>
    setExpandedSponsors(prev => ({ ...prev, [billId]: !prev[billId] }));
  const NEURAL_SUMMARY_COLLAPSE = 220; // chars before ellipsis kicks in

  // Debounce search input - only trigger after 300ms of no typing and 3+ chars
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim().length >= 3 || searchTerm.trim().length === 0) {
        setDebouncedSearchTerm(searchTerm.trim());
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch trending bills with robust fallback
        try {
          // Check if trending bills already exist in storage/cache if we had one
          const { data: trendingData, error: trendingError } = await (supabase.rpc as any)('get_trending_bills', {
            limit_count: 5
          });

          if (Array.isArray(trendingData) && trendingData.length > 0) {
            setTrendingBills(trendingData);
          } else {
            console.warn('RPC returned invalid or empty data, using fallback');
            throw new Error('RPC returned invalid or empty data');
          }
        } catch (rpcError) {
          // Fallback: Get most followed or latest bills
          const { data: fallbackTrending } = await supabase
            .from('bills')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

          if (Array.isArray(fallbackTrending)) {
            setTrendingBills(fallbackTrending);
          }
        }

        // 2. Fetch All Bills (Standard Query)
        let query = supabase.from('bills').select('*');

        if (deepSearch && debouncedSearchTerm) {
          query = query.textSearch('fts', debouncedSearchTerm);
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;

        const processedData = (data || []).map(bill => {
          const stageIndex = getStageIndex(bill.status); // -1 = Discarded, 0-7 = ordered stages
          return { ...bill, stage_index: stageIndex };
        });

        setBillsData(processedData as Bill[]);

        // 3. Fetch Stats
        const { data: statsData } = await (supabase as any).from('bills').select('status');
        const st = { total: (data || []).length, byStatus: {} as any };
        (statsData || []).forEach((b: any) => {
          st.byStatus[b.status] = (st.byStatus[b.status] || 0) + 1;
        });
        setStats(st);
      } catch (e: any) {
        console.error('Fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deepSearch, debouncedSearchTerm]);

  // Real-time Intelligence Sync
  useEffect(() => {
    const channel = supabase
      .channel('sovereign-hero-sync')
      .on('postgres_changes' as any, { event: '*', table: 'bills', schema: 'public' }, (payload: any) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const newBill = payload.new;
          setRealtimeFlash(newBill.id);
          setTimeout(() => setRealtimeFlash(null), 3000);

          // Sovereign Notification Sync: Generate a system notification if a new tabloid summary appears
          if (newBill.tabloid_summary && user) {
            notificationService.create(
              user.id,
              'bill_update',
              'Get Daily News Updates', // Strictly as requested
              `${newBill.title}: ${newBill.tabloid_summary}`,
              {
                sourceId: newBill.id,
                link: `/bill/${getBillIdentifier(newBill)}#memoranda`
              }
            );
          }

          // Silently update local data
          setBillsData(prev => {
            const index = prev.findIndex(b => b.id === newBill.id);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = { ...updated[index], ...newBill, stage_index: getStageIndex(newBill.status) };
              return updated;
            }
            return [{ ...newBill, stage_index: getStageIndex(newBill.status) }, ...prev];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const tabloidUpdates = useMemo(() =>
    billsData.filter(b => b.tabloid_summary && b.tabloid_summary.trim().length > 0),
    [billsData]
  );

  const tickerData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Monday-Friday of current week
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    // Filter by MOST RECENT activity (updated_at OR created_at)
    const getActivityDate = (b: Bill) => new Date(b.updated_at || b.created_at);

    const todayItems = billsData.filter(b => getActivityDate(b) >= today);
    const weekItems = billsData.filter(b => {
      const dt = getActivityDate(b);
      return dt >= monday && dt <= friday && dt < today;
    });

    return { today: todayItems, week: weekItems };
  }, [billsData]);

  const filteredBills = useMemo(() => {
    return billsData.filter(bill => {
      if (deepSearch && searchTerm) return true;

      const matchesSearch = bill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.summary.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || bill.category === selectedCategory;

      // Tab matching using canonical stage IDs
      let matchesTab = false;
      if (activeTab === 'all_stages') {
        matchesTab = true;
      } else if (activeTab === 'discarded') {
        matchesTab = (bill.stage_index || 0) === -1;
      } else {
        // Map tab value back to stage index and compare
        const tabToIdx: Record<string, number> = {
          pre_publication: 0, first_reading: 1, second_reading: 2,
          committee: 3, committee_stage: 3, report: 4, report_stage: 4,
          third: 5, third_reading: 5, assent: 6, presidential_assent: 6,
          publication: 7,
        };
        const tabIdx = tabToIdx[activeTab];
        matchesTab = tabIdx !== undefined
          ? (bill.stage_index || 0) === tabIdx
          : bill.status.toLowerCase().replace(/ /g, '_').includes(activeTab);
      }

      return matchesSearch && matchesCategory && matchesTab;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'alpha-asc') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [billsData, searchTerm, selectedCategory, activeTab, sortBy, deepSearch]);


  const [intelligenceAlerts, setIntelligenceAlerts] = useState<any[]>([]);


  useEffect(() => {
    const fetchIntelligence = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('bill_news_mentions')
          .select(`
            id,
            headline,
            bill_id,
            source_name,
            bills (
              id,
              title
            )
          `)
          .order('scraped_at', { ascending: false })
          .limit(8);

        if (error) throw error;
        if (data) setIntelligenceAlerts(data);
      } catch (err) {
        console.error('Intelligence fetch error:', err);
      }
    };

    fetchIntelligence();
  }, []);

  // UNIFIED SOVEREIGN STREAM: Merges tabloidUpdates (bill summaries) and intelligenceAlerts (news mentions)
  // into a single interleaved carousel array. Tabloids display for 10s, alerts for 8s.
  const sovereignStream = useMemo(() => {
    const stream: Array<{ type: 'tabloid'; data: Bill } | { type: 'alert'; data: any }> = [];
    const maxLen = Math.max(tabloidUpdates.length, intelligenceAlerts.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < tabloidUpdates.length) stream.push({ type: 'tabloid', data: tabloidUpdates[i] });
      if (i < intelligenceAlerts.length) stream.push({ type: 'alert', data: intelligenceAlerts[i] });
    }
    return stream;
  }, [tabloidUpdates, intelligenceAlerts]);

  const [sovereignIndex, setSovereignIndex] = useState(0);

  useEffect(() => {
    if (sovereignStream.length <= 1) return;
    const currentItem = sovereignStream[sovereignIndex];
    const duration = currentItem?.type === 'alert' ? 8000 : 10000;
    const timer = setTimeout(() => {
      setSovereignIndex(prev => (prev + 1) % sovereignStream.length);
    }, duration);
    return () => clearTimeout(timer);
  }, [sovereignIndex, sovereignStream]);

  const activeSovereignItem = sovereignStream[sovereignIndex];

  return (
    <Layout>
      <Helmet>
        <title>Kenya Legislative Tracker | Bill Tracker & Public Participation | CEKA</title>
        <meta name="description" content="Track ongoing bills in the Kenya National Assembly and Senate. Real-time updates on Finance Bill 2026, legislative progress, and public participation deadlines. Use CEKA to stay informed about Kenyan lawmaking." />
        <meta name="keywords" content="Finance Bill Kenya, Finance Bill 2026, Kenya Finance Bill, Bill Tracker Kenya, Kenya Parliament bill tracker, real-time bill tracker, legislative tracker Kenya, track bills in Kenya, public participation Kenya, CEKA, Civic Education Kenya, Muswada wa Fedha 2026, maoni ya umma, bunge la Kenya" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:title" content="Kenya Legislative Tracker | Bill Tracker & Public Participation | CEKA" />
        <meta property="og:description" content="Track ongoing bills in the Kenya National Assembly and Senate. Real-time updates on Finance Bill 2026." />
        <meta property="og:image" content="/icons/og-tracker.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={window.location.href} />
        <meta property="twitter:title" content="Kenya Legislative Tracker | Bill Tracker & Public Participation | CEKA" />
        <meta property="twitter:description" content="Track ongoing bills in the Kenya National Assembly and Senate. Real-time updates on Finance Bill 2026." />
        <meta property="twitter:image" content="/icons/og-tracker.png" />
      </Helmet>

      <div className="min-h-screen bg-[#FDFDFD] dark:bg-background overflow-x-hidden">
        {/* EXECUTIVE HERO: Mobile Optimized */}
        <section className="relative px-4 pt-12 pb-20 md:pt-24 md:pb-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-20 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-kenya-green/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
          </div>

          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="relative flex items-center justify-center w-36 h-36 rounded-[28px] bg-kenya-green/10 border border-kenya-green/20 shadow-ios-high backdrop-blur-xl shrink-0">
                  <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-kenya-green/20 to-primary/10 opacity-60" />
                  <img
                    src="/icons/legislative-tracker.svg"
                    alt="Legislative Tracker"
                    className="relative z-10 w-28 h-28 object-contain dark:brightness-0 dark:invert dark:sepia dark:saturate-200 dark:hue-rotate-[100deg]"
                  />
                </div>
              </div>
              <h1 className="text-5xl md:text-8xl font-[1000] tracking-tight leading-[0.9] mb-8 dark:text-white break-words whitespace-normal max-w-full">
                The <span className="text-transparent bg-clip-text bg-gradient-to-r from-kenya-green to-primary inline-block pb-2">Legislative </span>Tracker.
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
                The most advanced legislative tracker in Kenya. Real-time updates from
                <span className="text-foreground font-bold"> National Assembly</span>,
                <span className="text-foreground font-bold"> The Senate</span>, and
                <span className="text-foreground font-bold"> The Gazette</span>. The people’s smart guide to Kenyan lawmaking - tracking bills with clear explanations, constitutional grounding, and tools to act.
              </p>
            </motion.div>

            {/* DUAL-LAYER SOVEREIGN HERO: Intelligence Carousel + Bloomberg Ticker */}
            {/* UNIFIED SOVEREIGN HERO CONTAINER: News Carousel + Bloomberg Ticker */}
            <div className="mt-12 relative max-w-xl group">
              {/* Deep iOS-Inspired Glow & Shadow Layer */}
              <div className="absolute inset-x-0 -inset-y-4 bg-gradient-to-br from-kenya-green/20 via-primary/10 to-kenya-green/20 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity -z-10" />

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-20 rounded-[32px] bg-gradient-to-br from-kenya-green/40 via-primary/20 to-kenya-green/40 p-[1px] shadow-ios-high dark:shadow-ios-high-dark overflow-hidden ring-1 ring-white/20 dark:ring-white/10"
              >
                {/* Upper Layer: Unified Sovereign Stream — Tabloid Updates + Intelligence Alerts interleaved */}
                <div className="bg-white/80 dark:bg-black/90 backdrop-blur-3xl p-8 min-h-[180px] flex flex-col justify-center border-b border-white/10 dark:border-white/5">
                  <AnimatePresence mode="wait">
                    {sovereignStream.length > 0 && activeSovereignItem ? (
                      <motion.div
                        key={sovereignIndex}
                        initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5, ease: "circOut" }}
                        className="space-y-4"
                      >
                        {activeSovereignItem.type === 'tabloid' ? (
                          // ── TABLOID SLOT ──────────────────────────────────────────────
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-kenya-green">Get Daily News Updates</h4>
                                {activeSovereignItem.data?.status === 'ASSENT' && (
                                  <span className="flex h-2 w-2 rounded-full bg-kenya-green shadow-[0_0_8px_rgba(0,255,0,0.5)]" />
                                )}
                              </div>
                              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-full">
                                Latest this week
                              </Badge>
                            </div>
                            <p className="font-bold text-lg md:text-xl leading-tight dark:text-gray-100 tracking-normal">
                              {activeSovereignItem.data.tabloid_summary}
                            </p>
                            <div className="flex items-center justify-between pt-2">
                              <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                                Source: {activeSovereignItem.data.title}
                              </div>
                              <Button
                                variant="link"
                                asChild
                                className="p-0 h-auto text-primary font-black text-xs uppercase tracking-widest gap-2"
                              >
                                <Link to={`/bill/${getBillIdentifier(activeSovereignItem.data)}#memoranda`}>
                                  See Bill Here <ArrowRight className="h-3 w-3" />
                                </Link>
                              </Button>
                            </div>
                          </>
                        ) : (
                          // ── INTELLIGENCE ALERT SLOT ───────────────────────────────────
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />
                                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-primary">External News Headlines</h4>
                              </div>
                              <Badge className="bg-kenya-green/10 text-kenya-green border-none font-black text-[9px] px-2 py-0.5 rounded-full">
                                {activeSovereignItem.data.source_name || 'News'}
                              </Badge>
                            </div>
                            <p className="font-bold text-lg md:text-xl leading-tight dark:text-gray-100 tracking-normal">
                              {activeSovereignItem.data.headline}
                            </p>
                            {activeSovereignItem.data.bills?.title && (
                              <div className="flex items-center justify-between pt-2">
                                <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                                  Re: {activeSovereignItem.data.bills.title}
                                </div>
                                <Button
                                  variant="link"
                                  asChild
                                  className="p-0 h-auto text-kenya-green font-black text-xs uppercase tracking-widest gap-2"
                                >
                                  <Link to={`/bill/${activeSovereignItem.data.bill_id}`}>
                                    See Bill Here <ArrowRight className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>
                    ) : (
                      <div className="flex items-center gap-6 opacity-40">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                          <TrendingUp className="h-8 w-8" />
                        </div>
                        <div>
                          <h4 className="font-black text-[10px] uppercase tracking-[0.2em] mb-1">Scanning for Bills...</h4>
                          <p className="font-bold text-sm">Deep-scanning - will only be a moment...</p>
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Lower Layer: The Legislative Ticker (Bloomberg Dock) */}
                <div className="bg-black/10 dark:bg-white/10 backdrop-blur-2xl h-10 flex items-center overflow-hidden border-t border-white/5 shadow-inner">
                  <div className="bg-primary text-white text-[9px] font-black uppercase px-4 h-full flex items-center shrink-0 z-20 shadow-2xl relative">
                    {/* Bevel effect for ticker label */}
                    <div className="absolute inset-0 bg-white/10 opacity-10 pointer-events-none" />
                    Live
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    <motion.div
                      animate={{ x: [0, -2000] }}
                      transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                      className="flex whitespace-nowrap gap-12 items-center pl-8"
                    >
                      {/* NEW BILLS (TODAY) Segment */}
                      <span className="text-[10px] font-black text-kenya-green uppercase tracking-tighter">New Bills (Today)</span>
                      {tickerData.today.length > 0 ? tickerData.today.map(bill => (
                        <Link
                          key={`today-${bill.id}`}
                          to={`/bill/${getBillIdentifier(bill)}#memoranda`}
                          className={cn(
                            "flex items-center gap-3 group/ticker transition-colors",
                            realtimeFlash === bill.id && "text-kenya-green font-black"
                          )}
                        >
                          <span className="text-xs font-bold dark:text-white group-hover/ticker:text-primary">
                            {bill.title} | <span className="opacity-60 font-medium">{bill.summary?.substring(0, 40)}...</span>
                          </span>
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            bill.status === 'ASSENT' ? 'bg-kenya-green' : 'bg-primary'
                          )} />
                        </Link>
                      )) : <span className="text-xs opacity-40">No new bills today</span>}

                      {/* THIS WEEK Segment */}
                      <span className="text-[10px] font-black text-primary uppercase tracking-tighter ml-8">This Week</span>
                      {tickerData.week.length > 0 ? tickerData.week.map(bill => (
                        <Link
                          key={`week-${bill.id}`}
                          to={`/bill/${getBillIdentifier(bill)}#memoranda`}
                          className="flex items-center gap-3 group/ticker"
                        >
                          <span className="text-xs font-bold dark:text-white group-hover/ticker:text-primary">
                            {bill.title} | <span className="opacity-60 font-medium">{bill.summary?.substring(0, 40)}...</span>
                          </span>
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            bill.status === 'ASSENT' ? 'bg-kenya-green' : 'bg-slate-400'
                          )} />
                        </Link>
                      )) : <span className="text-xs opacity-40">Quiet week so far</span>}

                      {/* Repeat for Infinite Loop */}
                      <span className="text-[10px] font-black text-kenya-green uppercase tracking-tighter opacity-20">Loop Continuing...</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FEATURED LEGISLATION CAROUSEL */}
        <section className="container py-8">
          <FeaturedLegislationCarousel bills={trendingBills} isLoading={loading} />
        </section>

        {/* VAULT INTERFACE */}
        <div className="container pb-24">
          <div className="grid lg:grid-cols-12 gap-10">
            {/* SEARCH & FILTERS: Sidebar for Desktop, Dropdown tray for Mobile/Tablet */}
            <aside className="lg:col-span-3 space-y-4 lg:space-y-8">
              <div className="lg:sticky lg:top-24 space-y-4 lg:space-y-8">
                <div className="space-y-4">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Search Bills
                  </h3>
                  <div className="relative group space-y-3">
                    <Input
                      id="bill-search"
                      name="bill_search"
                      aria-label="Search bills by title, year or keyword"
                      placeholder="Title | Year | Keyword"
                      className="h-14 rounded-2xl bg-white dark:bg-[#111] border-slate-200 dark:border-white/5 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/50 pr-12"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="flex items-center justify-between px-2 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {deepSearch ? 'Deep Intelligence' : 'Standard Search'}
                        </span>
                        <span className="text-[9px] text-slate-400/60 font-medium">
                          {deepSearch ? 'Scanning PDF content...' : 'Indexing metadata only'}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={deepSearch}
                          onChange={() => setDeepSearch(!deepSearch)}
                          aria-label="Enable Deep Intelligence Search"
                        />
                        <div
                          className="
                            w-11 h-6 bg-slate-200 dark:bg-white/10
                            rounded-full
                            transition-colors duration-300 ease-in-out
                            peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30
                            peer-checked:bg-kenya-green
                            shadow-inner
                            after:content-[''] after:absolute after:top-[2px] after:start-[2px]
                            after:bg-white after:border-gray-300 after:border after:rounded-full
                            after:h-5 after:w-5
                            after:transition-transform after:duration-300 after:ease-in-out
                            after:translate-x-0
                            peer-checked:after:translate-x-full
                            rtl:peer-checked:after:-translate-x-full
                          "
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* CATEGORIES — Desktop: button grid, Mobile/Tablet: Select dropdown */}
                <div className="space-y-3">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Categories
                  </h3>

                  {/* Mobile/Tablet select */}
                  <div className="block lg:hidden">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-[#111] border-slate-200 dark:border-white/5 font-bold text-sm">
                        <SelectValue placeholder="All Portfolios" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl max-h-[40vh]">
                        {[
                          'all',
                          'Finance, Taxation & Budget',
                          'Devolution & County Governments',
                          'Parliamentary & Legislative Affairs',
                          'Public Administration & Civil Service',
                          'Health & Medical Services',
                          'Law, Justice & Judiciary',
                          'Agriculture, Livestock & Food Security',
                          'Education, Science & Research',
                          'Labour, Employment & Social Protection',
                          'Environment & Climate Change',
                          'Roads, Transport & Infrastructure',
                          'Trade, Investment & Industry',
                          'Constitutional & Legal Reform',
                          'Security, Defence & Intelligence',
                          'Youth, Sports & Creative Economy',
                          'ICT, Digital Economy & Communications',
                          'Cooperatives & MSMEs',
                          'Gender, Culture & Heritage',
                          'Mining, Blue Economy & Maritime',
                          'Energy & Petroleum',
                          'Housing & Urban Development',
                          'Water, Sanitation & Irrigation',
                          'Tourism & Wildlife',
                          'Lands & Natural Resources',
                          'Foreign Affairs, Diaspora & International Treaties'
                        ].map(cat => (
                          <SelectItem key={cat} value={cat} className="font-bold">
                            {cat === 'all' ? 'All Portfolios' : cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Desktop button grid */}
                  <div className="hidden lg:grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                    {[
                      'all',
                      'Finance, Taxation & Budget',
                      'Devolution & County Governments',
                      'Parliamentary & Legislative Affairs',
                      'Public Administration & Civil Service',
                      'Health & Medical Services',
                      'Law, Justice & Judiciary',
                      'Agriculture, Livestock & Food Security',
                      'Education, Science & Research',
                      'Labour, Employment & Social Protection',
                      'Environment & Climate Change',
                      'Roads, Transport & Infrastructure',
                      'Trade, Investment & Industry',
                      'Constitutional & Legal Reform',
                      'Security, Defence & Intelligence',
                      'Youth, Sports & Creative Economy',
                      'ICT, Digital Economy & Communications',
                      'Cooperatives & MSMEs',
                      'Gender, Culture & Heritage',
                      'Mining, Blue Economy & Maritime',
                      'Energy & Petroleum',
                      'Housing & Urban Development',
                      'Water, Sanitation & Irrigation',
                      'Tourism & Wildlife',
                      'Lands & Natural Resources',
                      'Foreign Affairs, Diaspora & International Treaties'
                    ].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        aria-pressed={selectedCategory === cat}
                        className={cn(
                          "w-full text-left px-5 py-3 rounded-2xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          selectedCategory === cat
                            ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                            : "bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
                        )}
                      >
                        {cat === 'all' ? 'All Portfolios' : cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* BILLS JOURNEY: Main Content */}
            <main className="lg:col-span-9 space-y-12 min-w-0 w-full">
              <Tabs defaultValue="all_stages" onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col gap-4 mb-10 border-b border-border/50 pb-4">
                  {/* Stage Tabs — Desktop: scrollable pill row; Mobile/Tablet: Select dropdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                    {/* Mobile stage select */}
                    <div className="flex sm:hidden items-center gap-3">
                      <Select value={activeTab} onValueChange={setActiveTab}>
                        <SelectTrigger className="flex-1 h-12 rounded-2xl bg-white dark:bg-[#111] border-slate-200 dark:border-white/5 font-bold text-sm">
                          <SelectValue placeholder="All Stages" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                          {[
                            { value: 'all_stages', label: 'All Stages' },
                            { value: 'pre_publication', label: 'Pre-publication' },
                            { value: 'first_reading', label: '1st Reading' },
                            { value: 'second_reading', label: '2nd Reading' },
                            { value: 'committee', label: 'Committee' },
                            { value: 'report', label: 'Report' },
                            { value: 'third', label: '3rd Reading' },
                            { value: 'assent', label: 'Assent' },
                            { value: 'publication', label: 'Published' },
                            { value: 'discarded', label: 'Discarded' },
                          ].map(tab => (
                            <SelectItem key={tab.value} value={tab.value} className="font-bold">
                              {tab.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="w-[130px] h-12 rounded-2xl bg-white dark:bg-[#111] border-slate-200 dark:border-white/5 font-bold text-xs uppercase tracking-widest">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          <SelectItem value="date-desc">Newest</SelectItem>
                          <SelectItem value="alpha-asc">A-Z</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tablet/Desktop scrollable tab pills */}
                    <TabsList className="hidden sm:flex bg-transparent h-auto p-0 flex-wrap justify-start gap-x-6 gap-y-2 overflow-x-auto no-scrollbar flex-1">
                      {[
                        { value: 'all_stages', label: 'All Stages' },
                        { value: 'pre_publication', label: 'Pre-publication' },
                        { value: 'first_reading', label: '1st Reading' },
                        { value: 'second_reading', label: '2nd Reading' },
                        { value: 'committee', label: 'Committee' },
                        { value: 'report', label: 'Report' },
                        { value: 'third', label: '3rd Reading' },
                        { value: 'assent', label: 'Assent' },
                        { value: 'publication', label: 'Published' },
                        { value: 'discarded', label: 'Discarded' },
                      ].map(tab => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="p-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none relative h-10 px-1"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-data-[state=active]:opacity-100">
                            {tab.label}
                          </span>
                          <AnimatePresence>
                            {activeTab === tab.value && (
                              <motion.div
                                layoutId="tab_underline"
                                className={cn(
                                  "absolute bottom-0 left-0 w-full h-1 rounded-full",
                                  tab.value === 'discarded' ? 'bg-red-500' : 'bg-primary'
                                )}
                              />
                            )}
                          </AnimatePresence>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Sort — Desktop only (mobile sort is in the mobile row above) */}
                    <div className="hidden sm:flex items-center gap-4">
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="w-[160px] h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-none font-bold text-xs uppercase tracking-widest">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          <SelectItem value="date-desc">Newest First</SelectItem>
                          <SelectItem value="alpha-asc">A-Z</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <TabsContent value={activeTab} className="space-y-6 mt-0">
                  {loading ? (
                    <div className="flex flex-col gap-6 py-12">
                      <CEKALoader variant="scanning" size="xl" text="Scanning Database for Bills..." />
                    </div>
                  ) : filteredBills.length === 0 ? (
                    <div className="py-32 text-center space-y-4">
                      <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto">
                        <Shield className="h-10 w-10 opacity-20" />
                      </div>
                      <h3 className="font-black text-2xl tracking-tight">We've not captured this bill yet. Let us know.</h3>
                      <p className="text-muted-foreground">The Legislative Tracker is currently scanning for updates on this bill.</p>
                    </div>
                  ) : (
                    <>
                      {filteredBills.slice(0, visibleCount).map((bill, billIndex) => (
                        <React.Fragment key={bill.id}>
                          {/* ── NASAKA IEBC MID-SCROLL INJECTION: appears after the 3rd bill (index 2) ── */}
                          {billIndex === 3 && (
                            <motion.div
                              layout
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="w-full min-w-0"
                            >
                              <Card className="group relative overflow-hidden border-none bg-white dark:bg-[#111] shadow-ios-high dark:shadow-ios-high-dark rounded-[40px] w-full">
                                <div className="flex flex-col md:flex-row w-full min-w-0">
                                  {/* Civic Duty Pillar */}
                                  <div className="md:w-48 p-8 flex flex-col justify-between border-r border-border/50 bg-kenya-green/[0.03] dark:bg-kenya-green/[0.06]">
                                    <div className="space-y-4">
                                      <div className="h-14 w-14 rounded-2xl bg-kenya-green/10 dark:bg-kenya-green/20 shadow-sm flex items-center justify-center">
                                        <NasakaSVGIcon className="h-7 w-7 text-kenya-green" />
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Ad</div>
                                        <div className="text-sm font-black text-kenya-green">Nasaka IEBC</div>
                                      </div>
                                    </div>
                                    {/* Decorative civic bar strip */}
                                    <div className="grid grid-cols-8 gap-1 h-1.5 mt-8">
                                      {Array.from({ length: 8 }).map((_, idx) => (
                                        <div key={idx} className="rounded-full bg-kenya-green" />
                                      ))}
                                    </div>
                                  </div>

                                  {/* Civic Content */}
                                  <div className="flex-1 p-6 md:p-10 space-y-6 md:space-y-8 min-w-0">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                      <div className="flex gap-2">
                                        <Badge className="bg-kenya-green/10 text-kenya-green border-none font-bold rounded-lg px-3">
                                          Nasaka IEBC
                                        </Badge>
                                        <Badge className="bg-orange-500/10 text-amber-500 border-none font-bold rounded-lg px-3">
                                          Act Now
                                        </Badge>
                                      </div>
                                      <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Tuesday, 10 August 2027</div>
                                    </div>

                                    <div className="space-y-4 min-w-0">
                                      <h3 className="text-3xl font-[1000] tracking-tight leading-none dark:text-white break-words">
                                        Registered as a voter?
                                      </h3>
                                      <div className="bg-kenya-green/[0.04] border border-kenya-green/10 rounded-3xl p-6 mb-4">
                                        <p className="text-sm font-medium leading-relaxed opacity-80">
                                          Expecting change from these Bills without being a registered voter is all in vain! Are you a registered voter? What are you waiting for? Visit the nearest IEBC office near you using <span className="font-black text-kenya-green"> <a href="https://nasakaiebc.civiceducationkenya.com/" target="_blank" rel="noopener noreferrer">Nasaka IEBC</a></span>. GO TODAY!
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full pt-6 border-t border-border/50 sm:w-auto">
                                      {/* Go Register — replaces Deep */}
                                      <Button
                                        asChild
                                        variant="outline"
                                        className="h-12 px-6 rounded-2xl border-kenya-green/30 text-kenya-green font-black text-xs uppercase tracking-widest hover:bg-kenya-green/5 transition-colors"
                                      >
                                        <a href="https://nasakaiebc.civiceducationkenya.com/" target="_blank" rel="noopener noreferrer">
                                          Go Register
                                          <ArrowRight className="ml-2 h-4 w-4" />
                                        </a>
                                      </Button>

                                      {/* Download App — replaces Follow Progress */}
                                      <Button
                                        asChild
                                        className="h-12 px-10 rounded-2xl bg-kenya-green text-white font-black hover:bg-kenya-green/90 shadow-xl"
                                      >
                                        <a href="https://play.google.com/store/apps/details?id=com.nasaka.app&hl=en" target="_blank" rel="noopener noreferrer">
                                          Download
                                          <ArrowRight className="ml-2 h-4 w-4" />
                                        </a>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          )}

                          {/* ── STANDARD BILL CARD ── */}
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full min-w-0"
                          >
                            <Card className="group relative overflow-hidden border-none bg-white dark:bg-[#111] shadow-ios-high dark:shadow-ios-high-dark rounded-[40px] w-full transition-all hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                              <div className="flex flex-col md:flex-row w-full min-w-0">
                                {/* Visual Progress Pillar */}
                                <div className="md:w-48 p-8 flex flex-col justify-between border-r border-border/50 bg-slate-50/30 dark:bg-white/[0.01]">
                                  <div className="space-y-4">
                                    <div className="h-14 w-14 rounded-2xl bg-white dark:bg-white/5 shadow-sm flex items-center justify-center">
                                      <ScalesIcon className="h-7 w-7 text-primary dark:text-slate-200 group-hover:text-slate-100 transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Current Stage</div>
                                      <div className={cn(
                                        "text-sm font-black",
                                        (bill.stage_index || 0) === -1 ? 'text-red-500' : 'text-kenya-green'
                                      )}>{bill.status}</div>
                                    </div>
                                  </div>

                                  {/* 8-rectangle stage journey mini-visualizer */}
                                  <div className="grid grid-cols-8 gap-1 h-1.5 mt-8">
                                    {BILL_STAGES.map((_, idx) => {
                                      const isDiscarded = (bill.stage_index || 0) === -1;
                                      return (
                                        <div
                                          key={idx}
                                          className={cn(
                                            "rounded-full transition-all",
                                            isDiscarded
                                              ? "bg-red-400 dark:bg-red-600"
                                              : idx <= (bill.stage_index || 0)
                                                ? "bg-kenya-green"
                                                : "bg-slate-200 dark:bg-white/10"
                                          )}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Bill Intelligence */}
                                <div className="flex-1 p-6 md:p-10 space-y-6 md:space-y-8 min-w-0">
                                  <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex gap-2">
                                      <Badge className="bg-primary/10 text-primary group-hover:text-slate-100 group-hover:bg-kenya-green border-none font-bold rounded-lg px-3 transition-colors">
                                        {bill.category}
                                      </Badge>
                                      {bill.stage_index === 2 && (
                                        <Badge className="bg-orange-500/10 text-orange-500 border-none font-bold rounded-lg px-3">
                                          Public Feedback Needed
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                      {new Date(bill.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                  </div>

                                  <div className="space-y-4 min-w-0">
                                    <h3 className="text-3xl font-[1000] tracking-tight leading-none dark:text-white group-hover:text-slate-100 transition-colors break-words">
                                      <Link to={`/bill/${getBillIdentifier(bill)}#memoranda`}>{bill.title}</Link>
                                    </h3>

                                    {bill.neural_summary ? (
                                      <div className="bg-kenya-green/[0.03] border border-kenya-green/10 rounded-3xl p-6 mb-4">
                                        <div className="flex items-center gap-2 text-kenya-green mb-3">
                                          <Globe className="h-4 w-4" />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Quick Summary</span>
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed opacity-80">
                                          {expandedSummaries[bill.id] || bill.neural_summary.length <= NEURAL_SUMMARY_COLLAPSE
                                            ? bill.neural_summary
                                            : bill.neural_summary.slice(0, NEURAL_SUMMARY_COLLAPSE) + '…'}
                                        </p>
                                        {bill.neural_summary.length > NEURAL_SUMMARY_COLLAPSE && (
                                          <motion.button
                                            onClick={() => toggleSummaryExpanded(bill.id)}
                                            whileTap={{ scale: 0.97 }}
                                            className="mt-3 flex items-center gap-1 text-kenya-green font-black text-[10px] uppercase tracking-widest hover:opacity-80 transition-opacity"
                                          >
                                            {expandedSummaries[bill.id] ? 'Show Less' : 'Read More'}
                                            <motion.span
                                              animate={{ rotate: expandedSummaries[bill.id] ? 180 : 0 }}
                                              transition={{ duration: 0.22 }}
                                            >
                                              <ChevronDown className="h-3 w-3" />
                                            </motion.span>
                                          </motion.button>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl line-clamp-3">
                                        {bill.summary}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-6 pt-6 border-t border-border/50">
                                    <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                                      {bill.sponsor && (
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                                            {bill.sponsor.charAt(0)}
                                          </div>
                                          <div className="text-xs font-bold leading-none min-w-0 flex-1">
                                            <div className="opacity-40 uppercase tracking-widest text-[8px] mb-1">Mover / Sponsor</div>
                                            <div
                                              onClick={() => toggleSponsorExpanded(bill.id)}
                                              className={cn(
                                                "cursor-pointer transition-all hover:opacity-80 py-1 pr-6 -ml-1 pl-1",
                                                expandedSponsors[bill.id] ? "break-words whitespace-normal leading-tight" : "truncate"
                                              )}
                                              title={bill.sponsor}
                                            >
                                              {bill.sponsor}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
                                      {/* ✅ FIXED: Use b2_url (Backblaze) if available, else fallback to pdf_url */}
                                      {(bill.b2_url || bill.pdf_url) && (
                                        <Button
                                          variant="outline"
                                          onClick={() => vaultService.openDocument(bill.b2_url || bill.pdf_url!)}
                                          className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 font-black text-xs uppercase tracking-widest"
                                        >
                                          Download PDF
                                          <DownloadIcon className="h-6 w-6" />
                                        </Button>
                                      )}

                                      {/* Split Summary Pill — Non-deep left half / Deep Summary right half */}
                                      <div className="flex items-stretch h-12 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-ios-soft">
                                        {/* Non-deep: quick AI context — existing AIContextButton behaviour */}
                                        <AIContextButton
                                          label="Summary"
                                          context={bill.title + ": " + bill.summary}
                                          className="h-full px-5 rounded-none border-none border-r border-slate-200 dark:border-white/10 text-xs font-black uppercase tracking-widest bg-white dark:bg-[#111] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                        />
                                        {/* Deep Summary: links to bill detail description section */}
                                        <Button
                                          asChild
                                          variant="ghost"
                                          className="h-full px-5 rounded-none text-xs font-black uppercase tracking-widest text-kenya-green hover:bg-kenya-green/5 transition-colors"
                                        >
                                          <Link to={`/bill/${getBillIdentifier(bill)}`}>
                                            <Deep2Icon size={16} />
                                            Deep
                                          </Link>
                                        </Button>
                                      </div>

                                      <BillFollowButton billId={bill.id} variant="ghost" className="h-12 px-6 rounded-2xl" />
                                      <Button asChild className="h-12 px-10 rounded-2xl bg-kenya-green text-white font-black hover:bg-kenya-green/90 shadow-xl">
                                        <Link to={`/bill/${getBillIdentifier(bill)}#memoranda`}>
                                          Follow Progress
                                          <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        </React.Fragment>
                      ))}
                      {filteredBills.length > visibleCount && (
                        <div ref={observerTarget} className="py-10 flex justify-center opacity-70">
                          <Button variant="outline" onClick={() => setVisibleCount(v => v + 10)} className="rounded-2xl border-kenya-green/20 text-kenya-green hover:bg-kenya-green/5 font-black uppercase tracking-widest text-[10px]">
                            Load More Bills <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>

              {/* ── Minimalist iOS-inspired Bottom Action Bar ── */}
              <div className="mt-20 mb-12 flex flex-col md:flex-row items-center justify-center gap-6 max-w-4xl mx-auto px-6">

                {/* Global Search Mirror (Static) */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const q = formData.get('q');
                    if (q) navigate(`/search?q=${encodeURIComponent(q.toString())}`);
                  }}
                  className="flex-1 w-full max-w-lg relative"
                >
                  <SearchIcon className="z-10 absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    name="q"
                    type="text"
                    placeholder="Find a missing bill..."
                    className="w-full pl-9 pr-4 py-3 h-[46px] shadow-sm rounded-xl border border-border/40 bg-white dark:bg-[#111] focus-visible:ring-kenya-green/20 focus-visible:border-kenya-green/30"
                  />
                </form>

                {/* Newsletter Block (Static) */}
                <Button
                  onClick={() => navigate('/join-community')}
                  className="w-full md:w-auto h-[46px] px-6 bg-white dark:bg-[#111] hover:bg-slate-50 dark:hover:bg-white/5 border border-border/40 text-slate-800 dark:text-slate-200 shadow-sm rounded-xl group transition-all flex-shrink-0"
                >
                  <div className="flex items-center gap-3">
                    <EmailIcon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm tracking-wide">Sign up to Our Newsletter</span>
                  </div>
                </Button>

              </div>

            </main>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          SEO CRAWLER ANCHOR DIRECTORY
          Invisible to users (display:none + aria-hidden) but fully readable
          by Googlebot, Ahrefs, Bing bots etc. Eliminates:
            • "707 Orphan Pages (has no incoming internal links)"
            • "707 Pages with no outgoing links"
          All bill URLs are stamped into the HTML at render time so bots can
          map the site architecture without triggering the IntersectionObserver
          infinite-scroll that human browsers use.
      ─────────────────────────────────────────────────────────────────────── */}
      <nav
        aria-hidden="true"
        style={{ display: 'none', position: 'absolute', overflow: 'hidden', height: 0, width: 0 }}
      >
        <ul>
          {billsData.map((bill) => (
            <li key={`seo-anchor-${bill.id}`}>
              <Link to={`/bill/${getBillIdentifier(bill)}`}>
                {bill.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

    </Layout>
  );
};

export default LegislativeTracker;