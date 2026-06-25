// src/pages/ResourceLibrary.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, Filter,
  ChevronDown, X, SortAsc, SortDesc, List, Grid3X3, Plus, RefreshCw, BookOpen
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { notificationService } from '@/services/notificationService';
import { translate, cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { placeholderService } from '@/services/placeholderService';
import ResourceCard from '@/components/resources/ResourceCard';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { BookIcon } from '@/components/ui/CustomIcons';

// Table for Windows List Mode
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Resource {
  id: string;
  title: string;
  description: string;
  summary?: string;
  provider?: string;
  type: 'pdf' | 'video' | 'image' | 'audio' | 'link' | 'document' | 'legal';
  category: string;
  url: string;
  thumbnail?: string;
  dateAdded: string;
  author?: string;
  views: number;
  downloads: number;
  tags: string[];
  featured?: boolean;
  county?: string;
  canDownload?: boolean;
}

const ResourceLibrary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const { language } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'alphabetical'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [dynamicThumbnails, setDynamicThumbnails] = useState<Record<string, string>>({});
  const [shakeSearch, setShakeSearch] = useState(false);

  // Pagination State
  const ITEMS_PER_PAGE = 12;
  const [page, setPage] = useState(1);

  // Load resources from Supabase with debounced search and filters
  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('resources' as any)
          .select('*');

        // We fetch all to handle complex local filtering for tags/metadata
        // but sorting is done on server where possible
        if (sortBy === 'date') {
          query = query.order('created_at', { ascending: sortDirection === 'asc' });
        } else if (sortBy === 'alphabetical') {
          query = query.order('title', { ascending: sortDirection === 'asc' });
        }

        const { data, error } = await query;

        if (error) throw error;

        const mappedResources: Resource[] = (data || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || item.summary || '',
          type: (item.type || 'link').toLowerCase() as any,
          category: item.category || 'General',
          url: item.url,
          thumbnail: item.thumbnail_url,
          dateAdded: new Date(item.created_at).toISOString().split('T')[0],
          author: item.provider || 'Civic Education Kenya',
          views: item.views || 0,
          downloads: item.downloads || 0,
          tags: item.tags || [],
          featured: item.is_featured || false,
          canDownload: item.is_downloadable !== false,
          summary: item.summary,
          provider: item.provider
        }));

        setResources(mappedResources);

        // Derive categories and providers
        const uniqueCats = Array.from(new Set(mappedResources.map(r => r.category)));
        setCategories(uniqueCats);
      } catch (error) {
        console.error('Error loading resources:', error);
        toast({
          title: "Connection Error",
          description: "Could not access the database. Please check your connection.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchResources, 400);
    return () => clearTimeout(debounceTimer);
  }, [sortBy, sortDirection, toast, activeCategory]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeCategory, selectedTypes, sortBy, sortDirection]);

  // Handle auto-thumbnail generation for videos/media
  useEffect(() => {
    const generateNeededThumbnails = async () => {
      const needed = resources.filter(r => !r.thumbnail && r.type === 'video');
      for (const res of needed) {
        if (dynamicThumbnails[res.id]) continue;
        const thumb = await notificationService.getAutoThumbnail(res.url, res.type);
        if (thumb) {
          setDynamicThumbnails(prev => ({ ...prev, [res.id]: thumb }));
        }
      }
    };
    if (resources.length > 0) generateNeededThumbnails();
  }, [resources]);

  // No longer fetching from dedicated table to ensure consistency with scraped data categories
  /* 
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('resource_categories' as any).select('name');
      if (data) setCategories((data as any[]).map(c => c.name));
    };
    fetchCategories();
  }, []);
  */

  const allResources = resources;

  const allCategories = Array.from(new Set(allResources.map(resource => resource.category)));
  const allTypes = Array.from(new Set(allResources.map(resource => resource.type)));

  // Filter and sort resources based on current state
  const filteredResources = useMemo(() => {
    let filtered = [...resources];

    // Apply search term filter (Case-insensitive, checks multiple fields)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const terms = term.split(' ').filter(t => t.length > 0);

      filtered = filtered.filter(resource => {
        const title = (resource.title || '').toLowerCase();
        const desc = (resource.description || '').toLowerCase();
        const category = (resource.category || '').toLowerCase();
        const tags = (resource.tags || []).map(t => t.toLowerCase());

        // Match if ANY search word is found in ANY field (Less restrictive, better UX)
        return terms.some(word =>
          title.includes(word) ||
          desc.includes(word) ||
          category.includes(word) ||
          tags.some(t => t.includes(word))
        );
      });
    }

    // Apply category filter (Sync with activeCategory)
    if (activeCategory !== 'All') {
      filtered = filtered.filter(resource => resource.category === activeCategory);
    }

    // Apply type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(resource => selectedTypes.includes(resource.type));
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.dateAdded).getTime();
        const dateB = new Date(b.dateAdded).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'popularity') {
        const aPopularity = (a.views || 0) + (a.downloads || 0);
        const bPopularity = (b.views || 0) + (b.downloads || 0);
        return sortDirection === 'asc' ? aPopularity - bPopularity : bPopularity - aPopularity;
      } else { // alphabetical
        return sortDirection === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
    });
  }, [resources, searchTerm, activeCategory, selectedTypes, sortBy, sortDirection]);

  // Slice for Pagination
  const displayedResources = filteredResources.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = displayedResources.length < filteredResources.length;

  // Group resources by category for the tabbed interface
  const resourcesByCategory = useMemo(() => {
    const grouped: Record<string, Resource[]> = {};
    allCategories.forEach(category => {
      grouped[category] = filteredResources.filter(resource => resource.category === category);
    });
    return grouped;
  }, [filteredResources, allCategories]);

  // Function to toggle resource selection
  const toggleResourceSelection = (resourceId: string) => {
    if (selectedResources.includes(resourceId)) {
      setSelectedResources(selectedResources.filter(id => id !== resourceId));
    } else {
      setSelectedResources([...selectedResources, resourceId]);
    }
  };

  // Function to download selected resources
  const downloadSelectedResources = () => {
    if (selectedResources.length === 0) {
      toast({
        description: "Please select resources to download.",
        variant: "destructive",
      });
      return;
    }

    if (!session) {
      toast({
        title: "Login Required",
        description: "Please sign in to download resources.",
      });
      navigate('/auth');
      return;
    }

    toast({
      title: "Download Started",
      description: `Downloading ${selectedResources.length} resources.`,
    });

    console.log("Downloading resources:", selectedResources);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSortBy('date');
    setSortDirection('desc');
  };

  // Render resource card using the shared ResourceCard component
  const renderResourceCard = (resource: any) => {
    return (
      <ResourceCard
        key={resource.id}
        variant={viewMode as any}
        resource={{
          ...resource,
          isSelected: selectedResources.includes(resource.id)
        }}
        onToggleSelect={() => toggleResourceSelection(resource.id)}
      />
    );
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex flex-col gap-8 mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                <BookIcon className="h-8 w-8 mt-2 text-primary" />
                {translate("Resources", language)}
              </h1>
              <p className="text-muted-foreground text-sm font-medium">
                {translate("Access our repository of civic resources and materials for your knowledge", language)}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-muted/20 p-1 rounded-2xl backdrop-blur-md">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-xl px-4 gap-2 font-bold group">
                    <Filter className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform" />
                    Sort
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 p-2 rounded-[24px] glass-card border-none shadow-2xl">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 pt-2">Sort By</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setSortBy('date')} className="rounded-xl p-3 cursor-pointer">Latest Arrivals</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('popularity')} className="rounded-xl p-3 cursor-pointer">Most Popular</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('alphabetical')} className="rounded-xl p-3 cursor-pointer">Alphabetical</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 pt-2">Direction</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setSortDirection('desc')} className="rounded-xl p-3 cursor-pointer">Descending</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortDirection('asc')} className="rounded-xl p-3 cursor-pointer">Ascending</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-8 w-[1px] bg-border mx-1" />

              <div className="flex bg-muted/50 p-1 rounded-xl">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 rounded-lg"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 rounded-lg"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={() => navigate('/resources/upload')} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-10 px-6 shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" />
                {translate("Upload", language)}
              </Button>
            </div>
          </div>

          {/* iOS-inspired Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
            <Button
              variant={activeCategory === 'All' ? 'default' : 'outline'}
              className={cn(
                "rounded-full px-5 py-5 text-sm font-bold transition-all shadow-sm",
                activeCategory === 'All' ? "shadow-primary/20 scale-105" : "hover:border-primary/50"
              )}
              onClick={() => { setActiveCategory('All'); setSelectedCategories([]); }}
            >
              All Topics
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                className={cn(
                  "rounded-full px-5 py-5 text-sm font-bold transition-all shadow-sm whitespace-nowrap",
                  activeCategory === cat ? "shadow-primary/20 scale-105" : "hover:border-primary/50"
                )}
                onClick={() => { setActiveCategory(cat); setSelectedCategories([cat]); }}
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="flex gap-3 max-w-2xl mx-auto w-full">
            <motion.div
              className="relative flex-1"
              animate={shakeSearch ? { x: [0, -6, 6, -6, 6, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="resource-search"
                name="q"
                type="text"
                placeholder={translate("Search resources...", language)}
                className="pl-12 h-14 rounded-2xl glass-card border-none shadow-ios-high dark:shadow-ios-high-dark text-lg focus-visible:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = searchTerm.trim();
                    if (!trimmed) {
                      setShakeSearch(true);
                      setTimeout(() => setShakeSearch(false), 400);
                      toast({
                        title: "Let's try that again",
                        description: "Type something to search the resource library.",
                      });
                    } else {
                      toast({
                        title: "Searching…",
                        description: `Here's what I found for "${trimmed}"`,
                      });
                    }
                  }
                }}
              />
            </motion.div>
            <Button
              onClick={() => {
                const trimmed = searchTerm.trim();
                if (!trimmed) {
                  setShakeSearch(true);
                  setTimeout(() => setShakeSearch(false), 400);
                  toast({
                    title: "Need a Search Term",
                    description: "Type something to search the resource library.",
                  });
                } else {
                  toast({
                    title: "Searching…",
                    description: `Now looking for "${trimmed}"`,
                  });
                }
              }}
              className={`
                relative h-10 px-8 mt-1 rounded-2xl font-bold select-none
                transition-all duration-300 ease-out
                bg-black/20 dark:bg-white/70
                backdrop-blur-xl
                border border-white/20 dark:border-white/40
                text-white dark:text-black
                shadow-lg hover:shadow-xl
                hover:bg-black/30 dark:hover:bg-white/80
                active:scale-[0.97]
                active:bg-black/40 dark:active:bg-white/90
                active:shadow-inner
                [text-shadow:_0_1px_2px_rgb(0_0_0_/_20%)] dark:[text-shadow:_0_1px_2px_rgb(255_255_255_/_20%)]
              `}
            >
              <span className="text-sm">Search</span>
            </Button>
          </div>

          <div className="w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <CEKALoader variant="scanning" size="lg" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse mt-4">Loading...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-[40px]">
                <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <X className="h-10 w-10 text-muted-foreground opacity-20" />
                </div>
                <h3 className="text-2xl font-black mb-2">No Results Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">Try adjusting your filters or search term to discover curated civic educational materials.</p>
                <Button variant="outline" onClick={resetFilters} className="rounded-2xl px-8 h-12 border-primary/20 hover:bg-primary/5">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Your Search Filters
                </Button>
              </div>
            ) : (
              <div className="w-full space-y-8">
                {viewMode === 'grid' ? (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {displayedResources.map(resource => renderResourceCard(resource))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-black/40 border border-slate-100 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-white/5">
                        <TableRow className="border-border/10 hover:bg-transparent">
                          <TableHead className="font-bold uppercase tracking-wider text-[10px]">Name</TableHead>
                          <TableHead className="font-bold uppercase tracking-wider text-[10px]">Type</TableHead>
                          <TableHead className="font-bold uppercase tracking-wider text-[10px] hidden md:table-cell">Category</TableHead>
                          <TableHead className="font-bold uppercase tracking-wider text-[10px] hidden md:table-cell">Date Added</TableHead>
                          <TableHead className="text-right font-bold uppercase tracking-wider text-[10px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedResources.map((res) => (
                          <TableRow key={res.id} className="border-border/10 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors" onClick={() => navigate(`/resources/${res.id}`)}>
                            <TableCell className="font-medium flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-kenya-red/10 flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4 text-kenya-red" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate text-sm font-bold text-slate-800 dark:text-white leading-tight">{res.title}</span>
                                <span className="truncate text-[10px] text-muted-foreground">{res.provider || 'CEKA Database'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold">{res.type}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-slate-500 dark:text-slate-400">
                              {res.category}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-slate-500 dark:text-slate-400">
                              {res.dateAdded}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" className="h-8 rounded-lg hover:bg-kenya-red/10 hover:text-kenya-red font-bold">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {hasMore && (
                  <div className="flex justify-center pt-8 fade-in animate-in">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full px-12 h-14 font-bold tracking-tight border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
                      onClick={() => setPage(p => p + 1)}
                    >
                      <List className="w-4 h-4 mr-2" />
                      Load More Resources
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResourceLibrary;