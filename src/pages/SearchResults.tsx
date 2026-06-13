// src/pages/SearchResults.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Search as SearchIcon, 
  X as XIcon, 
  SlidersHorizontal as FilterIcon, 
  ArrowRight as ArrowRightIcon, 
  FileText as FileTextIcon, 
  Gavel as GavelIcon, 
  Users as UsersIcon, 
  Info as InfoIcon,
  RotateCcw as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  MessageSquare as MessageSquareIcon,
  CheckCircle2 as PerfectMatchIcon,
  Clock as ClockIcon,
  MapPin as LocationIcon,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { translate, cn } from '@/lib/utils';
import { useSearch } from '@/hooks/useSearch';
import { SearchResult } from '@/lib/searchService';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import FilterDrawer, { FilterState } from '@/components/search/FilterDrawer';
import {
  SearchSquareIcon,
  SearchListIcon,
  SearchLayerIcon,
  SearchFileIcon,
  CampaignIcon,
  ConstitutionChapterIcon,
  ConstitutionSectionIcon,
  CivicGlossaryIcon,
  CarouselSlideIcon,
  DiscoveryLayerIcon,
  AskCekaAiIcon,
} from '@/components/ui/CustomIcons';

const DEFAULT_FILTERS: FilterState = { types: [], sort: 'relevance', county: '', customFilters: [] };

const TOPIC_GUIDANCE: Record<string, { desc: string; prompt: string }> = {
  'constitution': {
    desc: 'The supreme law of Kenya. Understand your rights and the foundations of our nation.',
    prompt: 'Explain the Constitution of Kenya in simple terms, focusing on the Bill of Rights and how it protects citizens.'
  },
  'finance bill': {
    desc: 'Track the latest tax changes and legislative proposals affecting our economy.',
    prompt: 'Provide a simple breakdown of the latest Finance Bill, its key tax implications, and why it matters to Kenyans.'
  },
  'iebc': {
    desc: 'Electoral processes and voter registration simplified.',
    prompt: 'Explain the role of the IEBC and how voter registration works in Kenya for the next election cycle.'
  },
  'shambles': {
    desc: 'Critical insights into the NHIF to SHA health insurance transition.',
    prompt: 'Explain the transition from NHIF to SHA (Social Health Authority) and what Kenyans need to know about their health coverage now.'
  },
  'devolution': {
    desc: 'How county governments work and the power of local governance in your area.',
    prompt: 'Explain devolution in Kenya, the role of County Governments, and how citizens can participate in local decision-making.'
  },
  'judiciary': {
    desc: 'Understanding our courts, the rule of law, and how to access justice.',
    prompt: 'Explain how the Kenyan Judiciary works and the process for a citizen to seek justice in the court system.'
  }
};

const SearchResults = () => {
  const { language } = useLanguage();
  const {
    query, setQuery, results, chips, loading,
    isRestState, hasMore, loadMore,
    toggleChip, clearQuery, trackClick, addCustomChip, profile,
    sortBy, setSortBy
  } = useSearch();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [newChipInput, setNewChipInput] = useState('');
  const [isAddingChip, setIsAddingChip] = useState(false);
  const [aiDisabled, setAiDisabled] = useState(() => localStorage.getItem('ceka-search-ai-disabled') === 'true');
  const newChipRef = useRef<HTMLSpanElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Client-side filter: type gate + custom keyword gate
  const displayResults = results.filter(r => {
    if (filters.types.length && !filters.types.includes(r.type as any)) return false;
    if (filters.customFilters.length) {
      const hay = `${r.title} ${r.description}`.toLowerCase();
      if (!filters.customFilters.every(f => hay.includes(f.toLowerCase()))) return false;
    }
    return true;
  });

  const navigate = useNavigate();
  const activeFilterCount = filters.types.length + filters.customFilters.length + (filters.county ? 1 : 0);

  // ── URL SEED — syncs ?q= changes to live search (supports trending-topic taps) ──
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery.trim()) {
      setQuery(urlQuery.trim());
    } else if (!urlQuery) {
      // Clear search when navigating to /search with no q param
      clearQuery();
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (filters.sort !== sortBy) {
      setSortBy(filters.sort);
    }
  }, [filters.sort, sortBy, setSortBy]);

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'bill': return <SearchSquareIcon className="w-5 h-5 text-purple-500 dark:text-purple-400" />;
      case 'blog': return <SearchListIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />;
      case 'resource': return <SearchFileIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
      case 'discussion': return <SearchLayerIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
      case 'campaign': return <CampaignIcon className="w-5 h-5 text-rose-500 dark:text-rose-400" />;
      case 'constitution_chapter': return <ConstitutionChapterIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
      case 'constitution_section': return <ConstitutionSectionIcon className="w-5 h-5 text-sky-500 dark:text-sky-400" />;
      case 'civic_glossary': return <CivicGlossaryIcon className="w-5 h-5 text-teal-500 dark:text-teal-400" />;
      case 'carousel_slide': return <CarouselSlideIcon className="w-5 h-5 text-orange-500 dark:text-orange-400" />;
      case 'ai-prompt': return <AskCekaAiIcon size={20} className="text-slate-400 dark:text-white/40" />;
      default: return <SearchSquareIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  const getRelevanceLabel = (score: number) => {
    if (score > 0.8) return { text: 'Perfect Match', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
    if (score > 0.5) return { text: 'Closest', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' };
    return { text: 'Related', color: 'text-slate-500 dark:text-slate-400 bg-slate-500/10' };
  };

  // ── AI Card Logic ──
  const isTappedTopic = searchParams.get('t') === 'true';
  const topicMatch = query ? Object.keys(TOPIC_GUIDANCE).find(k => query.toLowerCase().includes(k)) : null;

  const aiCard: SearchResult | null = !isRestState && query && !aiDisabled ? {
    id: 'ai-prompt-trigger',
    type: 'ai-prompt' as any,
    title: topicMatch ? `Understanding ${query.toUpperCase()}` : `Ask CEKA AI about "${query}"`,
    description: topicMatch 
      ? TOPIC_GUIDANCE[topicMatch].desc 
      : `Get a neutral, AI-powered explanation of "${query}" based on Kenyan law and current affairs.`,
    url: `/search?q=${encodeURIComponent(query)}&trigger-ai=true`,
    category: 'Civic Assistant',
    relevanceScore: 1.0,
    matchScore: 100,
    recencyScore: 100,
    countyScore: 100,
    tags: ['AI', 'Guide', 'Education']
  } : null;

  // Gate AI card: Full card only for tapped topics ('t=true'), otherwise it's just 'residue' (handled in list)
  const showFullAiCard = isTappedTopic && !!topicMatch;
  const finalDisplayResults = [...(aiCard && showFullAiCard ? [aiCard] : []), ...displayResults];

  const handleAiCardClick = (searchTerm: string) => {
    // Standard prompt as requested by user
    const prompt = `Define ${searchTerm} given that the user wants to understand more about this topic.`;
    const event = new CustomEvent('ceka-ai-trigger', { 
      detail: { 
        query: prompt,
        autoSubmit: true 
      } 
    });
    window.dispatchEvent(event);
  };

  const handleDisableAi = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setAiDisabled(true);
    localStorage.setItem('ceka-search-ai-disabled', 'true');
  };

  const handleEnableAi = () => {
    setAiDisabled(false);
    localStorage.removeItem('ceka-search-ai-disabled');
  };

  return (
    <Layout>
      {/* 
        Theme-responsive wrapper — NO hardcoded dark colors.
        Light mode: white bg, dark text.
        Dark mode: midnight-blue (#0d1a2d approx from --midnight: 220 60% 12%), white text.
      */}
      <div className="relative min-h-screen bg-white dark:bg-[hsl(220,60%,8%)] text-slate-900 dark:text-white overflow-hidden pb-24 transition-colors duration-300">
        {/* Procedural background glow — visible in both modes */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="container max-w-4xl pt-8 md:pt-16 relative z-10 px-4 md:px-6">
          {/* Main Search Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isRestState ? translate("Search CEKA", language) : translate("Search Results", language)}
              </h1>
              {profile?.county && (
                <Badge variant="outline" className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 flex items-center gap-1.5 py-1 px-3">
                  <LocationIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
                  {profile.county}
                </Badge>
              )}
            </div>

            {/* Smart Search Bar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-purple-500/10 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-slate-50 dark:bg-[#1C1C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 focus-within:border-emerald-500/60 dark:focus-within:border-emerald-500/50 transition-all shadow-sm dark:shadow-2xl">
                <div className="pl-4 pr-2">
                  <SearchIcon size={20} className="text-slate-400 dark:text-white/40 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors" />
                </div>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={translate("What's on your mind...", language)}
                  className="border-none bg-transparent text-lg h-12 focus-visible:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white"
                    onClick={clearQuery}
                    aria-label="Clear search"
                  >
                    <span className="text-lg font-light">✕</span>
                  </Button>
                )}
                <button
                  onClick={() => setFilterOpen(true)}
                  aria-label="Open filters"
                  className="relative h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 dark:text-white/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                >
                  <FilterIcon size={20} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Dynamic Enrichment Cloud (Hidden in Zen Mode) */}
            <AnimatePresence>
              {!isRestState && chips.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 overflow-hidden items-center"
                >
                  {chips.map((chip) => (
                    <motion.button
                      key={chip.label}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleChip(chip.label)}
                      className={`
                        px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2
                        ${chip.active
                          ? 'bg-emerald-500 text-black border-transparent shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}
                      `}
                    >
                      {chip.label}
                      {!chip.active && chip.count > 0 && (
                        <span className="text-[10px] opacity-40 tabular-nums">{chip.count}</span>
                      )}
                    </motion.button>
                  ))}

                  {/* ── Inline + add custom chip ── */}
                  {isAddingChip ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-white/5 border border-dashed border-emerald-400/60 text-slate-700 dark:text-white/60 min-w-[80px] cursor-text"
                      onClick={() => newChipRef.current?.focus()}
                    >
                      <span
                        ref={newChipRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="outline-none min-w-[48px] text-emerald-600 dark:text-emerald-400 placeholder:text-slate-400"
                        onInput={e => setNewChipInput((e.target as HTMLElement).textContent || '')}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newChipInput.trim();
                            if (val) addCustomChip(val);
                            setIsAddingChip(false);
                            setNewChipInput('');
                          }
                          if (e.key === 'Escape') {
                            setIsAddingChip(false);
                            setNewChipInput('');
                          }
                        }}
                        onBlur={() => {
                          const val = newChipInput.trim();
                          if (val) addCustomChip(val);
                          setIsAddingChip(false);
                          setNewChipInput('');
                        }}
                      />
                    </motion.span>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => { setIsAddingChip(true); setTimeout(() => newChipRef.current?.focus(), 50); }}
                      className="w-7 h-7 pb-1 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/30 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all text-base leading-none"
                      title="Add custom filter"
                    >
                      +
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Results Area */}
          <div className="mt-12 space-y-8">
            {isRestState ? (
              /* ZEN MODE EMPTY STATE DASHBOARD */
              <SearchEmptyState />
            ) : (
              /* ACTIVE SEARCH STATE */
              <>
                <header className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <PerfectMatchIcon size={18} className="text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-slate-500 dark:text-white/40 uppercase tracking-widest">{results.length} {translate("Matches Found", language)}</span>
                  </div>
                  {/* Residue trigger - always available or replaces disabled recommendation */}
                  {(aiDisabled || !aiCard) && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => handleAiCardClick(`Explain the key facts about "${query}" in the Kenyan context.`)}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:border-emerald-500/50 transition-all shadow-sm"
                    >
                      <AskCekaAiIcon size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 tracking-wider uppercase group-hover:text-slate-800 dark:group-hover:text-white transition-colors">Ask CEKA AI</span>
                      {aiDisabled && (
                        <div 
                          onClick={(e) => { e.stopPropagation(); handleEnableAi(); }}
                          className="ml-1 pl-2 border-l border-slate-200 dark:border-white/10 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          RESTORE
                        </div>
                      )}
                    </motion.button>
                  )}
                </header>

                {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-6 border border-slate-200 dark:border-white/10">
                    <Skeleton className="h-6 w-3/4 mb-4 bg-slate-200 dark:bg-white/10" />
                    <Skeleton className="h-4 w-full bg-slate-200 dark:bg-white/10" />
                    <Skeleton className="h-4 w-1/2 mt-2 bg-slate-200 dark:bg-white/10" />
                  </div>
                ))}
              </div>
            ) : finalDisplayResults.length > 0 ? (
              <>
                <motion.div layout className="grid gap-4">
                  <AnimatePresence mode="popLayout">
                    {finalDisplayResults.map((result, idx) => {
                      const rel = getRelevanceLabel(result.relevanceScore);
                      const isAiCard = (result.type as any) === 'ai-prompt';

                      const cardContent = (
                        <div className={cn(
                          "group relative border rounded-2xl p-5 transition-all overflow-hidden",
                          "bg-slate-50 dark:bg-[#1C1C1E] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/10"
                        )}>
                          {/* Bevel effect */}
                          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />

                          {/* Close Button for AI Recommendation */}
                          {isAiCard && (
                            <button
                              onClick={handleDisableAi}
                              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                              title="Hide AI recommendations"
                            >
                              <XIcon size={16} />
                            </button>
                          )}

                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "flex-shrink-0 p-3 rounded-xl border transition-colors",
                              "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 group-hover:bg-slate-200 dark:group-hover:bg-white/10"
                            )}>
                              {getResultIcon(result.type)}
                            </div>
                            <div className="flex-1 min-w-0 pr-12">
                              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                                <span className={cn(
                                  "text-xs font-medium uppercase tracking-wider",
                                  "text-slate-400 dark:text-white/30"
                                )}>
                                  {result.category}
                                </span>
                                {!isRestState && (
                                  <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                    rel.color
                                  )}>
                                  {isAiCard ? 'Expert AI' : rel.text}
                                  </span>
                                )}
                              </div>
                              <h3 className={cn(
                                "text-lg font-semibold mb-2 truncate transition-colors",
                                isAiCard 
                                  ? "text-slate-800 dark:text-white/90"
                                  : "text-slate-800 dark:text-white/90 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                              )}>
                                {result.title}
                              </h3>
                              <p className={cn(
                                "text-sm line-clamp-2 leading-relaxed mb-4",
                                isAiCard ? "text-slate-500 dark:text-white/40" : "text-slate-500 dark:text-white/40"
                              )}>
                                {result.excerpt || result.description}
                              </p>
                              <div className={cn(
                                "flex items-center justify-between pt-3 border-t",
                                "border-slate-100 dark:border-white/5"
                              )}>
                                <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400 dark:text-white/30">
                                  {!isAiCard && (
                                    <>
                                      <span className="flex items-center gap-1.5">
                                        <ClockIcon size={12} />
                                        {result.date ? new Date(result.date).toLocaleDateString() : 'Active'}
                                      </span>
                                      {result.county && (
                                        <span className="flex items-center gap-1.5">
                                          <LocationIcon size={12} />
                                          {result.county}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {isAiCard && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold tracking-wide">LET'S BREAK IT DOWN →</span>
                                  )}
                                </div>
                                <div className={cn(
                                  "transition-all transform translate-x-2 group-hover:translate-x-0",
                                  "text-emerald-500/0 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"
                                )}>
                                  <ChevronRightIcon size={18} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );

                      return (
                        <motion.div
                          layout
                          key={result.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          {isAiCard ? (
                            <button className="w-full text-left" onClick={() => handleAiCardClick(query)}>
                              {cardContent}
                            </button>
                          ) : (
                            <Link to={result.url} onClick={() => trackClick(result, idx)}>
                              {cardContent}
                            </Link>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>

                {/* AI Residue: Small option at the bottom when not showing full card */}
                {aiCard && !showFullAiCard && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all"
                    onClick={() => handleAiCardClick(query)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <AskCekaAiIcon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Ask CEKA AI about "{query}"</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">AI Assistant</p>
                      </div>
                    </div>
                    <ChevronRightIcon size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </motion.div>
                )}

                {/* ── Load More Button ── */}
                {!isRestState && !loading && hasMore && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center pt-6 pb-4"
                  >
                    <button
                      onClick={loadMore}
                      className="group flex items-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-sm
                        border border-emerald-500/50 dark:border-emerald-500/40
                        text-emerald-600 dark:text-emerald-400
                        bg-emerald-50 dark:bg-emerald-500/10
                        hover:bg-emerald-500 hover:text-black hover:border-transparent
                        dark:hover:bg-emerald-500 dark:hover:text-black
                        shadow-[0_0_0_0_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]
                        active:scale-95 transition-all duration-200"
                    >
                      <span>Load more results</span>
                      <span className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</span>
                    </button>
                  </motion.div>
                )}

                {!isRestState && !loading && !hasMore && (
                  <p className="text-center text-xs text-slate-400 dark:text-white/20 pt-4 pb-2">
                    You've seen all matching results.
                  </p>
                )}
              </>
            ) : null}

            {/* Empty state — only for active non-rest queries with zero results */}
            {!loading && !isRestState && displayResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10"
              >
                <SearchIcon size={48} className="mx-auto text-slate-300 dark:text-white/10 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-slate-800 dark:text-white">{translate("No exact matches found", language)}</h3>
                <p className="text-slate-500 dark:text-white/40 mb-8 px-6">
                  {translate("Our scouts are logging this query. Try one of these trending topics instead:", language)}
                </p>
                <div className="flex flex-wrap justify-center gap-3 px-6">
                  {['Finance Bill', 'IEBC Registration', 'Constitution 2010', 'NHIF Transition'].map(topic => (
                    <Button
                      key={topic}
                      variant="outline"
                      className="rounded-full bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-emerald-500 hover:text-black hover:border-transparent transition-all"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(topic)}&t=true`)}
                    >
                      {topic}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
              </>
            )}
          </div>
        </div>

        {/* ── Filter Drawer ── */}
        <FilterDrawer
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
    </Layout>
  );
};

export default SearchResults;
