// src/components/search/SearchSuggestion.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { searchService, SearchSuggestion as SearchSuggestionType } from '@/lib/searchService';
import { useLanguage } from '@/contexts/LanguageContext';
import { translate } from '@/lib/utils';
import {
  SearchIcon, SearchSquareIcon, SearchListIcon, SearchLayerIcon, SearchFileIcon,
  CampaignIcon, ConstitutionChapterIcon, ConstitutionSectionIcon, CivicGlossaryIcon,
  CarouselSlideIcon, ClockIcon, CloseIcon, TrendingUpIcon
} from '@/components/ui/CustomIcons';

interface SearchSuggestionProps {
  isMobile?: boolean;
  onSearch?: (query: string) => void;
  autoFocus?: boolean;
  initialQuery?: string;
  className?: string;
}

const SearchSuggestion: React.FC<SearchSuggestionProps> = ({
  isMobile = false,
  onSearch,
  autoFocus = false,
  initialQuery = '',
  className = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestionType[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const isOnSearchPage = location.pathname === '/search';

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bill': return <SearchSquareIcon className="h-4 w-4" />;
      case 'blog': return <SearchListIcon className="h-4 w-4" />;
      case 'resource': return <SearchFileIcon className="h-4 w-4" />;
      case 'discussion': return <SearchLayerIcon className="h-4 w-4" />;
      case 'campaign': return <CampaignIcon className="h-4 w-4" />;
      case 'constitution_chapter': return <ConstitutionChapterIcon className="h-4 w-4" />;
      case 'constitution_section': return <ConstitutionSectionIcon className="h-4 w-4" />;
      case 'civic_glossary': return <CivicGlossaryIcon className="h-4 w-4" />;
      case 'carousel_slide': return <CarouselSlideIcon className="h-4 w-4" />;
      default: return <SearchIcon size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'resource':
        return 'bg-blue-500/10 text-blue-600';
      case 'blog':
        return 'bg-green-500/10 text-green-600';
      case 'bill':
        return 'bg-purple-500/10 text-purple-600';
      case 'discussion':
        return 'bg-amber-500/10 text-amber-600';
      case 'campaign':
        return 'bg-rose-500/10 text-rose-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  useEffect(() => {
    searchService.getPopularSearches().then(setPopularSearches);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery.trim()) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchService.getSuggestions(debouncedQuery);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    setShowSuggestions(false);
    setQuery('');
    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  }, [query, navigate]);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestionType) => {
    setShowSuggestions(false);
    setQuery('');
    if (suggestion.url && suggestion.url !== '/search') {
      navigate(suggestion.url);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.title)}`);
    }
  }, [navigate]);

  const handlePopularSearchClick = useCallback((searchTerm: string) => {
    setQuery('');
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  }, [navigate]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const handleInputFocus = useCallback(() => {
    if (query.trim() || popularSearches.length > 0) {
      setShowSuggestions(true);
    }
  }, [query, popularSearches.length]);

  const handleInputBlur = useCallback((e: React.FocusEvent) => {
    // Delay hiding to allow click on suggestions
    setTimeout(() => {
      if (!e.relatedTarget?.closest?.('.search-suggestions')) {
        setShowSuggestions(false);
      }
    }, 200);
  }, []);

  const animationVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  if (isOnSearchPage) return null;

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <SearchIcon className="z-10 absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={translate("Search resources, bills, blog posts...", language)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={`w-full pl-9 pr-10 ${isMobile ? 'py-4 text-base' : 'py-3'} bg-background/80 backdrop-blur-sm border-border/50`}
            autoFocus={autoFocus}
            aria-label="Search input"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={animationVariants}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-ios-high z-50 overflow-hidden search-suggestions"
          >
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto green-scrollbar">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Search Suggestions
                  </div>
                  {suggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.type}-${suggestion.id}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center space-x-3 group"
                    >
                      <div className={`p-2 rounded-lg ${getTypeColor(suggestion.type)}`}>
                        {getTypeIcon(suggestion.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                          {suggestion.title}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <span className="flex items-center gap-1">
                              {getTypeIcon(suggestion.type)}
                              {suggestion.type}
                            </span>
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {suggestion.category}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : query.trim() ? (
              <div className="p-6 text-center">
                <div className="text-muted-foreground mb-2">
                  No suggestions found for "{query}"
                </div>
                <Button variant="outline" size="sm" onClick={() => handleSubmit({ preventDefault: () => { } } as React.FormEvent)}>
                  Search anyway
                </Button>
              </div>
            ) : popularSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Popular Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handlePopularSearchClick(term)}
                      className="px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-all duration-200 flex items-center space-x-1"
                    >
                      <ClockIcon className="h-3 w-3" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border/30 p-3">
              <div className="text-xs text-muted-foreground">
                Search across: Bills, Blog Posts, Resources, Discussions, Constitution, Glossary, Campaigns, Featured
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchSuggestion;
