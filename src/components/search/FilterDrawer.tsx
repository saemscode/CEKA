// src/components/search/FilterDrawer.tsx
// iOS-inspired bottom sheet filter panel for CEKA Search

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SearchSquareIcon, SearchListIcon, SearchLayerIcon, SearchFileIcon,
  CampaignIcon, ConstitutionChapterIcon, ConstitutionSectionIcon,
  CivicGlossaryIcon, CarouselSlideIcon, FilterIcon, CloseIcon, PlusIcon
} from '@/components/ui/CustomIcons';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContentType =
  | 'bill' | 'blog' | 'resource' | 'discussion' | 'campaign'
  | 'constitution_chapter' | 'constitution_section' | 'civic_glossary' | 'carousel_slide';

export type SortOption = 'relevance' | 'newest' | 'county';

export interface FilterState {
  types: ContentType[];
  sort: SortOption;
  county: string;
  customFilters: string[];
}

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
}

// ─── Icon + label map ────────────────────────────────────────────────────────

const TYPE_META: { type: ContentType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'bill',                 label: 'Bills',          icon: <SearchSquareIcon size={16}/>,         color: 'text-purple-500' },
  { type: 'blog',                 label: 'Blog',           icon: <SearchListIcon size={16}/>,           color: 'text-emerald-500' },
  { type: 'resource',             label: 'Resources',      icon: <SearchFileIcon size={16}/>,           color: 'text-blue-500' },
  { type: 'discussion',           label: 'Discussions',    icon: <SearchLayerIcon size={16}/>,          color: 'text-amber-500' },
  { type: 'campaign',             label: 'Campaigns',      icon: <CampaignIcon size={16}/>,             color: 'text-rose-500' },
  { type: 'constitution_chapter', label: 'Const. Chapters',icon: <ConstitutionChapterIcon size={16}/>, color: 'text-indigo-500' },
  { type: 'constitution_section', label: 'Const. Sections',icon: <ConstitutionSectionIcon size={16}/>, color: 'text-sky-500' },
  { type: 'civic_glossary',       label: 'Glossary',       icon: <CivicGlossaryIcon size={16}/>,       color: 'text-teal-500' },
  { type: 'carousel_slide',       label: 'Featured',       icon: <CarouselSlideIcon size={16}/>,       color: 'text-orange-500' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest',    label: 'Most Recent'   },
  { value: 'county',    label: 'County Match'  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const FilterDrawer: React.FC<FilterDrawerProps> = ({ open, onClose, filters, onFiltersChange }) => {
  const [addingCustom, setAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleType = useCallback((t: ContentType) => {
    const next = filters.types.includes(t)
      ? filters.types.filter(x => x !== t)
      : [...filters.types, t];
    onFiltersChange({ ...filters, types: next });
  }, [filters, onFiltersChange]);

  const addCustomFilter = () => {
    const val = customInput.trim();
    if (val && !filters.customFilters.includes(val)) {
      onFiltersChange({ ...filters, customFilters: [...filters.customFilters, val] });
    }
    setCustomInput('');
    setAddingCustom(false);
  };

  const removeCustomFilter = (f: string) => {
    onFiltersChange({ ...filters, customFilters: filters.customFilters.filter(x => x !== f) });
  };

  const clearAll = () => {
    onFiltersChange({ types: [], sort: 'relevance', county: '', customFilters: [] });
  };

  const activeCount = filters.types.length + (filters.county ? 1 : 0) + filters.customFilters.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden
              bg-white dark:bg-[hsl(222.2_84%_4.9%)]
              shadow-[0_-8px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.5)]
              border-t border-slate-200/60 dark:border-white/10
              pb-[env(safe-area-inset-bottom,16px)]"
            style={{ maxHeight: '85vh' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <FilterIcon size={18} className="text-emerald-500" />
                <span className="font-semibold text-base text-slate-800 dark:text-white">Filters</span>
                {activeCount > 0 && (
                  <span className="text-xs font-bold bg-emerald-500 text-black px-2 py-0.5 rounded-full">
                    {activeCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activeCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-slate-400 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                >
                  <CloseIcon size={14} className="text-slate-600 dark:text-white/60" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              <div className="px-5 py-4 space-y-6">

                {/* ── Content Type ── */}
                <section>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">
                    Content Type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_META.map(({ type, label, icon, color }) => {
                      const active = filters.types.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                            ${active
                              ? 'bg-emerald-500 border-transparent text-black shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:border-emerald-400 dark:hover:border-emerald-500/60'
                            }`}
                        >
                          <span className={active ? 'text-black' : color}>{icon}</span>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* ── Sort By ── */}
                <section>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">
                    Sort By
                  </p>
                  <div className="flex gap-2">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => onFiltersChange({ ...filters, sort: opt.value })}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                          ${filters.sort === opt.value
                            ? 'bg-emerald-500 border-transparent text-black'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:border-emerald-400'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* ── Custom Filters ── */}
                <section>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">
                    Custom Filters
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    {filters.customFilters.map(f => (
                      <span
                        key={f}
                        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                          bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10
                          text-slate-700 dark:text-white/70"
                      >
                        {f}
                        <button
                          onClick={() => removeCustomFilter(f)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-slate-400 hover:text-red-500"
                          aria-label={`Remove ${f}`}
                        >
                          <CloseIcon size={12} />
                        </button>
                      </span>
                    ))}

                    {/* Inline input when adding */}
                    {addingCustom && (
                      <input
                        ref={inputRef}
                        autoFocus
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') addCustomFilter();
                          if (e.key === 'Escape') { setAddingCustom(false); setCustomInput(''); }
                        }}
                        onBlur={addCustomFilter}
                        placeholder="Type & press Enter"
                        className="px-3 py-1.5 rounded-full text-sm border border-emerald-400 dark:border-emerald-500
                          bg-white dark:bg-white/5 text-slate-800 dark:text-white outline-none
                          min-w-[140px] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                      />
                    )}

                    {/* + Add button */}
                    {!addingCustom && (
                      <button
                        onClick={() => { setAddingCustom(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium
                          border border-dashed border-emerald-400/60 dark:border-emerald-500/50
                          text-emerald-600 dark:text-emerald-400
                          hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10
                          transition-all"
                      >
                        <PlusIcon size={14} />
                        Add filter
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-white/25 mt-2">
                    Custom filters narrow results by keyword within the selected categories.
                  </p>
                </section>

              </div>
            </div>

            {/* Apply button */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl font-semibold text-base
                  bg-emerald-500 text-black
                  hover:bg-emerald-400 active:scale-[0.98]
                  shadow-[0_0_20px_rgba(16,185,129,0.3)]
                  transition-all duration-150"
              >
                Apply Filters{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FilterDrawer;
