// Featured Legislation Carousel with Embla
import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { BillFollowButton } from './BillFollowButton';
import { getBillIdentifier } from '@/services/billService';

interface Bill {
    id: string;
    slug?: string | null;
    title: string;
    summary: string;
    status: string;
    category?: string;
    created_at: string;
    follow_count?: number;
}

interface FeaturedLegislationCarouselProps {
    bills: Bill[];
    isLoading?: boolean;
}

const FeaturedLegislationCarousel: React.FC<FeaturedLegislationCarouselProps> = ({ bills, isLoading }) => {
    // Derived state for loop physics (Data Buffer)
    const isLoopable = bills.length > 1;
    const displayBills = bills.length > 0 && bills.length < 8 
        ? [...bills, ...bills, ...bills] // Triple for ultra-smooth loop on small lists
        : bills;

    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            loop: isLoopable,
            align: 'start',
            skipSnaps: false,
            dragFree: false,
            slidesToScroll: 1,
            containScroll: false,
        },
        [
            Autoplay({
                delay: 4000,
                stopOnInteraction: true,
                stopOnMouseEnter: true,
            }),
        ]
    );

    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setCanScrollPrev(emblaApi.canScrollPrev());
        setCanScrollNext(emblaApi.canScrollNext());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        setScrollSnaps(emblaApi.scrollSnapList());
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
            emblaApi.off('reInit', onSelect);
        };
    }, [emblaApi, onSelect]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-[320px] h-48 bg-slate-100 dark:bg-white/5 rounded-3xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!bills.length) return null;

    return (
        <section className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-kenya-green/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-kenya-green" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight">Featured Legislation</h2>
                        <p className="text-xs text-muted-foreground">Most followed bills this week</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Dot Indicators — mapped to original bills, not buffered duplicates */}
                    <div className="hidden sm:flex items-center gap-1.5 mr-2">
                        {bills.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => emblaApi?.scrollTo(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${(selectedIndex % bills.length) === idx
                                        ? 'w-6 bg-kenya-green'
                                        : 'w-1.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
                                    }`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={scrollPrev}
                        className="h-9 w-9 rounded-xl border-slate-200 dark:border-white/10 hover:bg-kenya-green/10 hover:border-kenya-green/30 transition-all"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={scrollNext}
                        className="h-9 w-9 rounded-xl border-slate-200 dark:border-white/10 hover:bg-kenya-green/10 hover:border-kenya-green/30 transition-all"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Carousel */}
            <div className="overflow-hidden relative" ref={emblaRef}>
                <div className="flex gap-4">
                    {Array.isArray(displayBills) && displayBills.map((bill, index) => (
                        <motion.div
                            key={`${bill.id}-${index}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (index % bills.length) * 0.1 }}
                            className="min-w-[280px] sm:min-w-[320px] md:min-w-[380px] flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_31%]"
                        >
                            <Card className="h-full border-0 bg-white dark:bg-white/5 shadow-lg hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden group">
                                <CardContent className="p-6 flex flex-col h-full">
                                    {/* Top Row */}
                                    <div className="flex items-start justify-between mb-4">
                                        <Badge
                                            variant="outline"
                                            className="rounded-full text-[10px] font-black uppercase tracking-widest bg-kenya-green/10 text-kenya-green border-kenya-green/20"
                                        >
                                            {bill.status || 'In Progress'}
                                        </Badge>
                                        {bill.follow_count !== undefined && (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 group-hover:text-kenya-green transition-colors">
                                                <img
                                                    src="/context/icons 3/person-2-svgrepo-com.svg"
                                                    className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity dark:invert"
                                                    alt="Followers"
                                                />
                                                {bill.follow_count} Followers
                                            </div>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-kenya-green transition-colors line-clamp-2">
                                        {bill.title}
                                    </h3>

                                    {/* Summary */}
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                                        {bill.summary || 'No summary available'}
                                    </p>

                                    {/* Action Row */}
                                    <div className="flex items-center gap-2 mt-auto">
                                        <Button
                                            asChild
                                            className="flex-1 rounded-2xl h-12 bg-kenya-green hover:bg-kenya-green/90 text-white font-bold group/btn shadow-md hover:shadow-lg transition-all"
                                        >
                                            <Link to={`/bill/${getBillIdentifier(bill)}#memoranda`}>
                                                <span className="flex items-center justify-center w-full">
                                                    <span className="truncate">Track This Bill</span>
                                                    <ArrowRight className="ml-2 h-4 w-4 shrink-0 transition-transform group-hover/btn:translate-x-1" />
                                                </span>
                                            </Link>
                                        </Button>
                                        <BillFollowButton
                                            billId={bill.id}
                                            variant="ghost"
                                            className="h-12 w-auto px-3 rounded-2xl border border-slate-200 dark:border-white/10 shrink-0"
                                            showLabelOnMobile={false}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Gradient Fades — scoped to carousel viewport only */}
                <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
            </div>

            {/* Mobile Dot Indicators — mapped to original bills, not buffered duplicates */}
            <div className="flex sm:hidden items-center justify-center gap-1.5 mt-4">
                {bills.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => emblaApi?.scrollTo(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${(selectedIndex % bills.length) === idx
                                ? 'w-6 bg-kenya-green'
                                : 'w-1.5 bg-slate-300 dark:bg-white/20'
                            }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};

export default FeaturedLegislationCarousel;
