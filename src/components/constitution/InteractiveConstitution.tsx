import React, { useState, useEffect } from 'react';
import {
    ConstitutionService,
    ConstitutionChapter,
    ConstitutionSection
} from '@/services/constitutionService';
import { gamificationService } from '@/services/gamificationService';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Search,
    Languages,
    Book,
    Trophy,
    ChevronDown,
    ChevronRight,
    MessageSquare,
    Link as LinkIcon
} from 'lucide-react';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import AIContextButton from '@/components/ai/AIContextButton';
import { cn } from '@/lib/utils';

const InteractiveConstitution = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [chapters, setChapters] = useState<ConstitutionChapter[]>([]);
    const [activeChapter, setActiveChapter] = useState<number | null>(null);
    const [sections, setSections] = useState<ConstitutionSection[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLanguageSwahili, setIsLanguageSwahili] = useState(false);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

    // Track progress to award points
    const [readCount, setReadCount] = useState(0);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            const data = await ConstitutionService.getChapters();
            setChapters(data);
            if (data.length > 0) {
                handleChapterClick(data[0].id);
            }
            setLoading(false);
        };
        fetchInitialData();
    }, []);

    const handleChapterClick = async (chapterId: number) => {
        if (activeChapter === chapterId) return;
        setLoading(true);
        setActiveChapter(chapterId);
        const data = await ConstitutionService.getSectionsByChapter(chapterId);
        setSections(data);
        setSearchQuery('');
        setSearchResults([]);
        setLoading(false);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);
        const outcomes = await ConstitutionService.searchConstitution(searchQuery);
        setSearchResults(outcomes);
        setActiveChapter(null);
        setLoading(false);
    };

    const toggleSection = (sectionId: number) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
            handleProgress(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    const handleProgress = async (sectionId: number) => {
        if (!user) return;

        // Award points every 5 sections read
        const newCount = readCount + 1;
        setReadCount(newCount);

        if (newCount % 5 === 0) {
            const total = await gamificationService.awardPoints(user.id, 'chapter_read', { sectionId });
            if (total) {
                toast({
                    title: "Civic Milestone! 🏆",
                    description: `You've read 5 sections! +10 Points awarded. Total: ${total}`,
                    variant: "default",
                });
            }
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Search and Language Header - Premium iOS Style */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 dark:bg-black/20 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl">
                <form onSubmit={handleSearch} className="relative w-full md:max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-kenya-green transition-colors" />
                    <Input
                        placeholder="Search articles, keywords, or rights..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-12 bg-white/50 dark:bg-black/20 border-white/30 dark:border-white/5 rounded-2xl focus-visible:ring-kenya-green/50 placeholder:text-slate-400 text-lg shadow-inner"
                    />
                </form>

                <div className="flex bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl border border-white/20">
                    <button
                        onClick={() => setIsLanguageSwahili(false)}
                        className={`px-6 py-2 rounded-xl text-sm font-black transition-all duration-300 ${!isLanguageSwahili ? 'bg-white dark:bg-white/10 shadow-lg text-kenya-green' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        English
                    </button>
                    <button
                        onClick={() => setIsLanguageSwahili(true)}
                        className={`px-6 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all duration-300 ${isLanguageSwahili ? 'bg-white dark:bg-white/10 shadow-lg text-kenya-green' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Languages className="h-4 w-4" />
                        Kiswahili
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Chapters Sidebar - Glassmorphism */}
                <div className="lg:col-span-4 space-y-4 sticky top-24">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Constitutional Chapters</h3>
                        <Badge variant="outline" className="rounded-full bg-kenya-green/10 text-kenya-green border-kenya-green/20 text-[10px] font-black">
                            {chapters.length} TOTAL
                        </Badge>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar mask-fade-bottom">
                        {chapters.map((chapter) => (
                            <motion.button
                                key={chapter.id}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleChapterClick(chapter.id)}
                                className={`w-full text-left group relative overflow-hidden rounded-2xl p-4 transition-all duration-500 ${activeChapter === chapter.id
                                    ? 'bg-gradient-to-br from-kenya-black to-slate-800 text-white shadow-xl shadow-black/20'
                                    : 'bg-white/5 hover:bg-white/10 border border-white/10 dark:border-white/5'
                                    }`}
                            >
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all duration-500 ${activeChapter === chapter.id ? 'bg-kenya-green text-white shadow-glow-green' : 'bg-slate-200/50 dark:bg-white/5 text-slate-500'
                                        }`}>
                                        {chapter.chapter_number}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <p className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${activeChapter === chapter.id ? 'text-kenya-green' : ''}`}>
                                            {isLanguageSwahili ? 'Sura' : 'Chapter'} {chapter.chapter_number}
                                        </p>
                                        <p className={`text-sm font-bold leading-tight ${activeChapter === chapter.id ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {isLanguageSwahili && chapter.title_sw ? chapter.title_sw : chapter.title_en}
                                        </p>
                                    </div>
                                </div>
                                {activeChapter === chapter.id && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute right-0 top-0 bottom-0 w-1.5 bg-kenya-green"
                                    />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Content Area - Clean & Lucid */}
                <div className="lg:col-span-8 min-h-[600px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-6">
                            <CEKALoader variant="scanning" size="xl" />
                            <p className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">Accessing Sovereign Records...</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeChapter || 'search'}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="space-y-6 pb-20"
                            >
                                {(searchQuery && searchResults.length === 0) ? (
                                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/20">
                                        <div className="h-20 w-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-400">No results for "{searchQuery}"</h4>
                                        <p className="text-sm text-slate-500 mt-2">Try searching by keyword like "Land", "Police", or "Right"</p>
                                    </div>
                                ) : (
                                    <>
                                        {searchResults.length > 0 && (
                                            <div className="flex items-center gap-3 px-4 py-3 bg-kenya-green/10 border border-kenya-green/20 rounded-2xl mb-6">
                                                <Sparkles className="h-4 w-4 text-kenya-green" />
                                                <span className="text-xs font-black text-kenya-green uppercase tracking-widest">
                                                    Analysis Complete: {searchResults.length} Relevant Findings
                                                </span>
                                            </div>
                                        )}

                                        <div className="grid gap-6">
                                            {(searchResults.length > 0 ? searchResults : sections).map((section, idx) => (
                                                <ConstitutionItem
                                                    key={section.id}
                                                    section={section}
                                                    isSwahili={isLanguageSwahili}
                                                    isExpanded={expandedSections.has(section.id)}
                                                    onToggle={() => toggleSection(section.id)}
                                                    index={idx}
                                                />
                                            ))}

                                            {sections.length === 0 && !loading && !searchQuery && (
                                                <div className="text-center py-32 bg-white/5 rounded-3xl border border-dashed border-white/20">
                                                    <Book className="h-16 w-16 text-slate-200 dark:text-white/10 mx-auto mb-6" />
                                                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">Archival process in progress...</p>
                                                    <p className="text-xs text-slate-500 mt-2">This chapter's contents are being vectorized for CEKA AI.</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Gamification Progress Bar - Floating iOS style */}
            {user && (
                <div className="fixed bottom-24 right-8 z-40">
                    <motion.div
                        initial={{ scale: 0, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        className="bg-kenya-black text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-md"
                    >
                        <div className="h-10 w-10 bg-kenya-green rounded-2xl flex items-center justify-center shadow-glow-green">
                            <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[9px] uppercase font-black text-kenya-green tracking-[0.2em] leading-none mb-1">Civic Progress</p>
                            <p className="text-sm font-bold">{readCount % 5}/5 articles read</p>
                            <div className="w-24 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                <motion.div
                                    className="h-full bg-kenya-green"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(readCount % 5) * 20}%` }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

const ConstitutionItem = ({ section, isSwahili, isExpanded, onToggle, index }: any) => {
    const content = isSwahili && section.content_sw ? section.content_sw : section.content_en;
    const title = isSwahili && section.title_sw ? section.title_sw : section.title_en;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className={cn(
                "group overflow-hidden transition-all duration-500 rounded-[2rem]",
                isExpanded
                    ? "border-kenya-green shadow-xl shadow-kenya-green/5 ring-1 ring-kenya-green/20 bg-white dark:bg-white/5"
                    : "border-slate-200 dark:border-white/5 hover:border-kenya-green/30 hover:shadow-lg bg-white/50 dark:bg-black/10"
            )}>
                <CardHeader
                    className="p-6 cursor-pointer flex flex-row items-center justify-between gap-4"
                    onClick={onToggle}
                >
                    <div className="flex items-center gap-6">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center font-black transition-all duration-500 shrink-0",
                            isExpanded ? "bg-kenya-green text-white shadow-glow-green" : "bg-slate-100 dark:bg-white/5 text-slate-500 group-hover:bg-kenya-green/10 group-hover:text-kenya-green"
                        )}>
                            {section.article_number === 0 ? 'P' : section.article_number}
                        </div>
                        <div className="space-y-1">
                            {section.article_number > 0 && (
                                <p className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.2em]",
                                    isExpanded ? "text-kenya-green" : "text-slate-400"
                                )}>
                                    Article {section.article_number}
                                </p>
                            )}
                            <CardTitle className={cn(
                                "text-lg md:text-xl font-black leading-tight transition-colors duration-300",
                                isExpanded ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300 group-hover:text-kenya-green"
                            )}>
                                {title}
                            </CardTitle>
                        </div>
                    </div>
                    <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                        isExpanded ? "bg-kenya-green/10 text-kenya-green rotate-180" : "bg-slate-100 dark:bg-white/5 text-slate-400"
                    )}>
                        <ChevronDown className="h-5 w-5" />
                    </div>
                </CardHeader>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="overflow-hidden"
                        >
                            <CardContent className="px-8 pb-8 pt-2">
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent mb-8" />

                                <div className="relative">
                                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-kenya-green/20 rounded-full" />
                                    <div className="prose prose-lg dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed font-medium pl-2 italic">
                                        {content}
                                    </div>
                                </div>

                                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 shadow-inner">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-kenya-green/10 flex items-center justify-center">
                                            <Sparkles className="h-5 w-5 text-kenya-green" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lex Neuralis Bridge</p>
                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 italic">"Empowering Citizens through Intelligence"</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <AIContextButton
                                            label="CEKA AI, explain this article!"
                                            context={`Article ${section.article_number}: ${title}. ${content}`}
                                            variant="premium"
                                            className="h-12 px-6 rounded-2xl flex-1 sm:flex-none shadow-glow-green"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-12 w-12 rounded-2xl border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5"
                                        >
                                            <LinkIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
};

export default InteractiveConstitution;
