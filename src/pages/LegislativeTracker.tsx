// src/pages/LegislativeTracker.tsx
import { vaultService } from '@/services/vaultService';
import React, { useEffect, useState, useMemo } from 'react';
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
import { Link } from 'react-router-dom';
import {
  FileText, Search, Filter, Calendar, ArrowRight, PlusCircle, ArrowUpDown,
  TrendingUp, RefreshCw, Layers, CheckCircle, Clock, Users, BookOpen, Globe, Shield, Scale
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BillFollowButton } from '@/components/legislative/BillFollowButton';
import { CEKALoader } from '@/components/ui/ceka-loader';
import FeaturedLegislationCarousel from '@/components/legislative/FeaturedLegislationCarousel';
import AIContextButton from '@/components/ai/AIContextButton';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BILL_STAGES, STAGE_COUNT, getStageIndex, getStageColor } from '@/lib/billStages';

// BILL_STAGES and getStageIndex imported from shared billStages.ts
// BILL_STAGES = 8 ordered stages, STAGE_COUNT = 8

interface Bill {
  id: string;
  title: string;
  summary: string;
  status: string;
  category: string;
  date: string;
  created_at: string;
  url?: string | null;
  sponsor?: string;
  description?: string;
  stage_index?: number;
  neural_summary?: string | null;
  text_content?: string | null;
  pdf_url?: string | null;
  follow_count?: number;
}

type SortOption = 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc' | 'status' | 'category';

const LegislativeTracker = () => {
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
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);

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

  useEffect(() => {
    if (intelligenceAlerts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAlertIndex(prev => (prev + 1) % intelligenceAlerts.length);
    }, 8000); // 8 seconds for reading intelligence
    return () => clearInterval(interval);
  }, [intelligenceAlerts]);

  const activeAlert = intelligenceAlerts[currentAlertIndex];
  const trendingBill = trendingBills[0] || billsData[0] || { id: "trending-placeholder", title: "Finance Bill", created_at: new Date().toISOString() };

  return (
    <Layout>
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
              <Badge className="mb-6 rounded-full px-4 py-1.5 bg-kenya-green/10 text-kenya-green border-kenya-green/20 font-black tracking-widest text-[10px] uppercase">
                <Globe className="h-3 w-3 mr-2 animate-pulse" />
                Civic Education Kenya (CEKA) presents
              </Badge>
              <h1 className="text-5xl md:text-8xl font-[1000] tracking-tight leading-[0.9] mb-8 dark:text-white">
                Kenya <span className="text-transparent bg-clip-text bg-gradient-to-r from-kenya-green to-primary">Bills Tracker</span>.
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
                The most advanced legislative tracker in Kenya. Real-time updates from
                <span className="text-foreground font-bold"> National Assembly</span>,
                <span className="text-foreground font-bold"> The Senate</span>, and
                <span className="text-foreground font-bold"> The Gazette</span>. The people’s smart guide to Kenyan lawmaking - tracking bills with clear explanations, constitutional grounding, and tools to act.
              </p>
            </motion.div>

            {/* DYNAMIC INTELLIGENCE ALERT: Vertical Cycle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-12 p-[1px] rounded-[32px] bg-gradient-to-r from-kenya-green/30 via-primary/30 to-kenya-green/30 max-w-md shadow-2xl overflow-hidden"
            >
              <div className="bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl p-6 rounded-[31px] min-h-[140px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {intelligenceAlerts.length > 0 ? (
                    <motion.div
                      key={activeAlert?.id || 'alert'}
                      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-start gap-4"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-kenya-green/10 flex items-center justify-center shrink-0 border border-kenya-green/5 shadow-inner">
                        <TrendingUp className="h-6 w-6 text-kenya-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-primary">Check Our Records</h4>
                          <span className="h-1 w-1 rounded-full bg-kenya-green animate-ping" />
                        </div>
                        <p className="font-bold text-sm leading-snug mb-3 dark:text-gray-200">
                          {activeAlert.headline} — <span className="text-kenya-green">{(activeAlert.bills as any)?.title || 'Legislative Update'}</span>
                        </p>
                        <Button
                          variant="link"
                          asChild
                          className="p-0 h-auto text-primary font-black text-xs uppercase tracking-widest gap-2 hover:no-underline"
                        >
                          <Link to={`/bill/${activeAlert.bill_id}`}>
                            Trace Now <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex items-start gap-4 opacity-50">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-[10px] uppercase tracking-[0.2em] mb-1">Scanning our database...</h4>
                        <p className="font-bold text-sm mb-3">Fetching the latest from local tabloids...</p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FEATURED LEGISLATION CAROUSEL */}
        <section className="container py-8">
          <FeaturedLegislationCarousel bills={trendingBills} isLoading={loading} />
        </section>

        {/* VAULT INTERFACE */}
        <div className="container pb-24">
          <div className="grid lg:grid-cols-12 gap-10">
            {/* SEARCH & FILTERS: Sidebar for Desktop, Floating Tray for Mobile */}
            <aside className="lg:col-span-3 space-y-8">
              <div className="sticky top-24 space-y-8">
                <div className="space-y-4">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Search Our Records
                  </h3>
                  <div className="relative group space-y-3">
                    <Input
                      id="bill-search"
                      name="bill_search"
                      placeholder="Title | Year | Keyword"
                      className="h-14 rounded-2xl bg-white dark:bg-[#111] border-slate-200 dark:border-white/5 shadow-sm focus:ring-primary/20 pr-12"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="flex items-center gap-2 px-2">
                      <button
                        onClick={() => setDeepSearch(!deepSearch)}
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all",
                          deepSearch
                            ? "bg-primary text-white"
                            : "bg-slate-100 dark:bg-white/5 opacity-50"
                        )}
                      >
                        {deepSearch ? 'Deep Neural Search Active' : 'Enable Deep PDF Search'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Categories
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {['all', 'Finance', 'Education', 'Healthcare', 'Environment'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "w-full text-left px-5 py-3 rounded-2xl text-sm font-bold transition-all",
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

                <Card className="rounded-[32px] border-none bg-kenya-green/5 overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Scale className="h-8 w-8 text-kenya-green opacity-40" />
                      <Badge className="bg-kenya-green text-white border-none font-black text-xs">
                        {stats.total} BILLS
                      </Badge>
                    </div>
                    <h5 className="font-black uppercase tracking-tighter text-lg">Bills Records</h5>
                    <div className="space-y-2">
                      {Object.entries(stats.byStatus).slice(0, 4).map(([status, count]: any) => (
                        <div key={status} className="flex justify-between items-center text-xs">
                          <span className="opacity-60">{status}</span>
                          <span className="font-black text-kenya-green">{count}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-kenya-green/10">
                      We aim to deliver to you the most accurate data from credible sources across the country.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* BILLS JOURNEY: Main Content */}
            <main className="lg:col-span-9 space-y-12">
              <Tabs defaultValue="all_stages" onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-border/50 pb-2">
                  <TabsList className="bg-transparent h-auto p-0 flex-wrap justify-start gap-6 overflow-x-auto no-scrollbar">
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

                  <div className="flex items-center gap-4">
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
                    filteredBills.map((bill) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={bill.id}
                      >
                        <Card className="group relative overflow-hidden border-none bg-white dark:bg-[#111] shadow-ios-high dark:shadow-ios-high-dark rounded-[40px] transition-all hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <div className="flex flex-col md:flex-row">
                            {/* Visual Progress Pillar */}
                            <div className="md:w-48 p-8 flex flex-col justify-between border-r border-border/50 bg-slate-50/30 dark:bg-white/[0.01]">
                              <div className="space-y-4">
                                <div className="h-14 w-14 rounded-2xl bg-white dark:bg-white/5 shadow-sm flex items-center justify-center">
                                  <Scale className="h-7 w-7 text-primary" />
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
                                          ? "bg-red-400 dark:bg-red-600" // all red when discarded
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
                            <div className="flex-1 p-8 md:p-10 space-y-8">
                              <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex gap-2">
                                  <Badge className="bg-primary/10 text-primary border-none font-bold rounded-lg px-3">
                                    {bill.category}
                                  </Badge>
                                  {bill.stage_index === 2 && (
                                    <Badge className="bg-orange-500/10 text-orange-500 border-none font-bold rounded-lg px-3 animate-pulse">
                                      Public Feedback Needed
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                  {new Date(bill.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h3 className="text-3xl font-[1000] tracking-tight leading-none dark:text-white group-hover:text-primary transition-colors">
                                  <Link to={`/bill/${bill.id}`}>{bill.title}</Link>
                                </h3>

                                {bill.neural_summary ? (
                                  <div className="bg-kenya-green/[0.03] border border-kenya-green/10 rounded-3xl p-6 mb-4">
                                    <div className="flex items-center gap-2 text-kenya-green mb-3">
                                      <Globe className="h-4 w-4" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Quick Summary</span>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed italic opacity-80">
                                      {bill.neural_summary}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl line-clamp-3">
                                    {bill.summary}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-border/50">
                                <div className="flex items-center gap-4">
                                  {bill.sponsor && (
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-xs">
                                        {bill.sponsor.charAt(0)}
                                      </div>
                                      <div className="text-xs font-bold leading-none">
                                        <div className="opacity-40 uppercase tracking-widest text-[8px] mb-1">Mover / Sponsor</div>
                                        {bill.sponsor}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  {bill.pdf_url && (
                                    <Button
                                      variant="outline"
                                      onClick={() => vaultService.openDocument(bill.pdf_url!)}
                                      className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 font-black text-xs uppercase tracking-widest"
                                    >
                                      Download PDF
                                      <BookOpen className="ml-2 h-4 w-4" />
                                    </Button>
                                  )}
                                  <AIContextButton label="Summarize" context={bill.title + ": " + bill.summary} className="h-12 px-6" />
                                  <BillFollowButton billId={bill.id} variant="ghost" className="h-12 px-6 rounded-2xl" />
                                  <Button asChild className="h-12 px-10 rounded-2xl bg-kenya-green text-white font-black hover:bg-kenya-green/90 shadow-xl">
                                    <Link to={`/bill/${bill.id}`}>
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
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LegislativeTracker;
