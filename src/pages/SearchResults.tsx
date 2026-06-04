// src/pages/SearchResults.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { translate } from '@/lib/utils';
import { useSearch } from '@/hooks/useSearch';
import { SearchResult } from '@/lib/searchService';
import { Skeleton } from '@/components/ui/skeleton';
import FilterDrawer, { FilterState } from '@/components/search/FilterDrawer';
import {
  SearchIcon,
  FilterIcon,
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
  PerfectMatchIcon,
  LocationIcon,
  ClockIcon,
  ChevronRightIcon
} from '@/components/ui/CustomIcons';

const DEFAULT_FILTERS: FilterState = { types: [], sort: 'relevance', county: '', customFilters: [] };

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

  const activeFilterCount = filters.types.length + filters.customFilters.length + (filters.county ? 1 : 0);

  // ── URL SEED — receives query from navbar navigation (/search?q=...) ──
  const [searchParams] = useSearchParams();
  const didSeedFromUrl = useRef(false);

  useEffect(() => {
    if (didSeedFromUrl.current) return;
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery.trim()) {
      setQuery(urlQuery.trim());
    }
    didSeedFromUrl.current = true;
  }, [searchParams, setQuery]);

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
      default: return <SearchSquareIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  const getRelevanceLabel = (score: number) => {
    if (score > 0.8) return { text: 'Perfect Match', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
    if (score > 0.5) return { text: 'Closest', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' };
    return { text: 'Related', color: 'text-slate-500 dark:text-slate-400 bg-slate-500/10' };
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

            {/* Dynamic Enrichment Cloud */}
            <AnimatePresence>
              {chips.length > 0 && (
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
            <header className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                {isRestState ? (
                  <>
                    <DiscoveryLayerIcon size={18} className="text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-slate-500 dark:text-white/40 uppercase tracking-widest">{translate("Results from Search", language)}</span>
                  </>
                ) : (
                  <>
                    <PerfectMatchIcon size={18} className="text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-slate-500 dark:text-white/40 uppercase tracking-widest">{results.length} {translate("Matches Found", language)}</span>
                  </>
                )}
              </div>
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
            ) : displayResults.length > 0 ? (
              <>
                <motion.div layout className="grid gap-4">
                  <AnimatePresence mode="popLayout">
                    {displayResults.map((result, idx) => {
                      const rel = getRelevanceLabel(result.relevanceScore);
                      return (
                        <motion.div
                          layout
                          key={result.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <Link to={result.url} onClick={() => trackClick(result, idx)}>
                            <div className="group relative bg-slate-50 dark:bg-[#1C1C1E] border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:bg-slate-100 dark:hover:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/10 transition-all overflow-hidden">
                              {/* Bevel effect */}
                              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />

                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 p-3 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors">
                                  {getResultIcon(result.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs font-medium text-slate-400 dark:text-white/30 uppercase tracking-wider">{result.category}</span>
                                    {!isRestState && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${rel.color}`}>
                                        {rel.text}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white/90 mb-2 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {result.title}
                                  </h3>
                                  <p className="text-sm text-slate-500 dark:text-white/40 line-clamp-2 leading-relaxed mb-4">
                                    {result.excerpt || result.description}
                                  </p>
                                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-white/30">
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
                                    </div>
                                    <div className="text-emerald-500/0 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-all transform translate-x-2 group-hover:translate-x-0">
                                      <ChevronRightIcon size={18} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>

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
                      onClick={() => setQuery(topic)}
                    >
                      {topic}
                    </Button>
                  ))}
                </div>
              </motion.div>
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
