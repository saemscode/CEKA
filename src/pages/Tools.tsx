import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
    Download,
    Smartphone,
    Map as MapIcon,
    Users,
    Radio,
    ArrowRight,
    ExternalLink,
    Lock,
    Globe,
    RefreshCw,
    AlertTriangle,
    ChevronDown,
    Star,
    Zap,
    Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import BottomNavbar from '@/components/layout/BottomNavbar';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tool {
    id: string;
    title: string;
    tagline: string;
    description: string;
    longDescription: string;
    icon: React.ComponentType<any>;
    badge: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
    status: 'Available' | 'Upcoming';
    downloadUrl?: string;
    siteUrl?: string;
    githubUrl?: string;
    features: string[];
    image: string;
}

interface FeaturedSite {
    id: string;
    name: string;
    description: string;
    url: string;
    category: string;
}

// ─── Real CEKA Tool Data ──────────────────────────────────────────────────────
const TOOLS: Tool[] = [
    {
        id: 'nasaka-wewe',
        title: 'Nasaka WEWE',
        tagline: 'Wireless Encrypted Wide Exchange',
        description: 'A secure messaging app built for Kenyan activists, journalists, and civic educators — forked from the Briar Project\'s battle-tested encrypted messaging engine.',
        longDescription: 'Nasaka WEWE is a secure messaging app built for Kenyan activists, journalists, civic educators and anyone who needs a safe, resilient way to communicate — even during internet blackouts. Unlike traditional messaging apps, Nasaka WEWE doesn\'t rely on a central server — messages are synchronized directly between users\' devices. If the Internet\'s down, Nasaka WEWE can sync via Bluetooth, Wi-Fi or memory cards.',
        icon: Smartphone,
        badge: 'Prototype',
        status: 'Available',
        downloadUrl: 'https://cajrvemigxghnfmyopiy.supabase.co/storage/v1/object/public/projects-outputs/nasakawewe-android-official-x86_64-debug.apk',
        githubUrl: 'https://github.com/saemscodes/Nasaka-WEWE',
        features: [
            'End-to-end encrypted messages',
            'Works offline via Bluetooth & Wi-Fi',
            'Tor network integration',
            'No ads, no tracking',
            'CEKA member auth or offline local account',
            'Forked from Briar Project',
        ],
        image: '/images/nasaka.png',
    },
    {
        id: 'nasaka-iebc',
        title: 'Nasaka IEBC',
        tagline: 'Register As A Voter | Find IEBC Office in Seconds',
        description: 'Find your nearest IEBC registration center in seconds. Interactive map with turn-by-turn navigation to verified IEBC office locations across Kenya.',
        longDescription: 'Nasaka IEBC is an independent civic platform by Civic Education Kenya (CEKA) that helps Kenyan citizens find official IEBC registration centers, verify office locations, and access electoral services with ease via interactive maps and directions.',
        icon: MapIcon,
        badge: 'Live',
        status: 'Available',
        siteUrl: '/nasaka-iebc',
        features: [
            '290+ geocoded IEBC offices',
            'GPS-based nearest-office detection',
            'Turn-by-turn navigation',
            'Offline-capable map tiles',
            'Android app available',
            'Open source & auditable',
        ],
        image: '/images/geoposters.png',
    },
    {
        id: 'peoples-audit',
        title: "People's Audit",
        tagline: 'Audit Report for Govt Spending',
        description: 'A breakdown of the economic state of the nation. Structured audit of Kenya\'s public finances, expenditure, and debt for citizen comprehension.',
        longDescription: 'The People\'s Audit provides a structured, citizen-accessible breakdown of Kenya\'s public finances. Tracking expenditure, debt and economic indicators in a way that every Kenyan can understand and act on.',
        icon: Radio,
        badge: 'Live',
        status: 'Available',
        siteUrl: '/peoples-audit',
        features: [
            'Live public finance data',
            'National debt tracker',
            'Constituency expenditure maps',
            'Budget cycle analysis',
            'PDF export reports',
            'Open data APIs',
        ],
        image: '/images/api.png',
    },
    {
        id: 'shambles',
        title: 'SHAmbles',
        tagline: 'Investigation & Accountability',
        description: 'Comprehensive investigation and accountability tracking infrastructure. Documenting and indexing corruption, malfeasance, and governance failures.',
        longDescription: 'SHAmbles is CEKA\'s investigative infrastructure — a living index of documented corruption cases, governance failures, and accountability gaps in Kenya\'s public sector. Built to make impunity visible.',
        icon: Shield,
        badge: 'Live',
        status: 'Available',
        siteUrl: '/shambles',
        features: [
            'Documented corruption cases',
            'Accountability timeline',
            'Linked legislative evidence',
            'Search & filter by county/sector',
            'Whistleblower submission channel',
            'Exportable case data',
        ],
        image: '/images/vault.png',
    },
    {
        id: 'report-by-ceka',
        title: 'Report by CEKA',
        tagline: 'Citizen Reporting & Collective Action',
        description: 'The ultimate reporting engine for civic issues. From pothole documentation to government malfeasance — report it, track it, and automate collective action.',
        longDescription: 'Report by CEKA is your frontline interface for civic accountability. It doesn\'t just store reports; it automates the follow-up process. Turn any documented issue into a multi-official petition instantly, sending copies to every relevant leader with a single tap.',
        icon: Radio,
        badge: 'Alpha',
        status: 'Available',
        siteUrl: '/feedback',
        features: [
            'Instant geo-tagged reporting',
            'Multi-email petition engine',
            'Automated follow-up tracking',
            'Evidence vault for media uploads',
            'Community co-signing',
            'Leader response tracking',
        ],
        image: '/images/api.png',
    },
];

const FEATURED_SITES: FeaturedSite[] = [
    {
        id: 'mtetezi',
        name: 'Mtetezi — Digital Panic Button',
        description: 'A high-risk safety application by Defenders Coalition featuring a one-tap panic alert system. Instantly notifies response teams and securely shares your live location during emergencies.',
        url: 'https://play.google.com/store/apps/details?id=org.defenderscoalition.mteteziapp',
        category: 'Digital Security',
    },
    {
        id: 'mzalendo',
        name: 'Mzalendo — MPs Performance',
        description: 'Track the performance of Members of Parliament in Kenya\'s 13th National Assembly. Attendance, motions, bills, and contributions — all in one place.',
        url: 'https://mzalendo.com/mps-performance/national-assembly/13th-parliament/',
        category: 'Legislative Accountability',
    },
    {
        id: 'open-elections',
        name: 'Open Elections Kenya',
        description: 'Interactive electoral map of Kenya. Visualize and explore election results, constituency data, and voting patterns across the country.',
        url: 'https://open-elections-kenya.vercel.app/map',
        category: 'Electoral Data',
    },
    {
        id: 'kiongozi',
        name: 'Kiongozi Online',
        description: 'Kenya\'s civic leadership intelligence platform. Profiles and performance data on elected leaders and public servants.',
        url: 'https://kiongozi.online/',
        category: 'Leadership Accountability',
    },
];

// ─── Ease constants ───────────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

// ─── Feature Image with Feathered Mask ───────────────────────────────────────
const FeatheredImage = ({
    src,
    flip,
    scrollProgress,
}: {
    src: string;
    flip: boolean;
    scrollProgress: any;
}) => {
    const scale = useTransform(scrollProgress, [0, 0.5, 1], [0.94, 1, 1.04]);
    const y = useTransform(scrollProgress, [0, 1], [30, -30]);
    const opacity = useTransform(scrollProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.3]);

    const maskStyle = flip
        ? 'radial-gradient(ellipse 85% 85% at 25% 50%, black 45%, transparent 90%)'
        : 'radial-gradient(ellipse 85% 85% at 75% 50%, black 45%, transparent 90%)';

    return (
        <motion.div
            style={{ scale, y, opacity }}
            className="relative w-full h-full flex items-center justify-center"
        >
            <div
                className="relative w-full max-w-xl rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl"
                style={{
                    maskImage: maskStyle,
                    WebkitMaskImage: maskStyle,
                }}
            >
                <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        // Graceful fallback: hide broken image
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
                {/* Edge gradient overlays for CEKA bg integration */}
                <div
                    className={cn(
                        'absolute inset-0 pointer-events-none',
                        flip
                            ? 'bg-gradient-to-r from-background via-transparent to-transparent opacity-70'
                            : 'bg-gradient-to-l from-background via-transparent to-transparent opacity-70'
                    )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-50 pointer-events-none" />
            </div>
        </motion.div>
    );
};

// ─── Tool Feature Section ─────────────────────────────────────────────────────
const ToolSection = ({ tool, index }: { tool: Tool; index: number }) => {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: false, margin: '-10% 0px -10% 0px' });
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

    const flip = index % 2 === 1;
    const Icon = tool.icon;

    const textDirection = flip ? 1 : -1;
    const textX = useTransform(scrollYProgress, [0.1, 0.35, 0.65, 0.9], [textDirection * 40, 0, 0, textDirection * -20]);
    const textOpacity = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [0, 1, 1, 0]);

    const sectionVariants = {
        hidden: { opacity: 0, y: 24 },
        visible: (d: number) => ({
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, ease: EASE_OUT_EXPO, delay: d * 0.08 },
        }),
    };

    return (
        <section
            ref={ref}
            id={`tool-${tool.id}`}
            className="relative py-20 md:py-32 overflow-hidden"
        >
            {/* Hairline separator */}
            <div className="absolute top-0 left-8 right-8 h-px bg-border opacity-60" />

            <div className="container mx-auto px-6">
                <div
                    className={cn(
                        'grid md:grid-cols-2 items-center gap-12 md:gap-20',
                        flip && 'md:grid-flow-col-dense'
                    )}
                >
                    {/* Text column */}
                    <motion.div
                        style={{ x: textX, opacity: textOpacity }}
                        className={cn('space-y-6', flip ? 'md:col-start-2' : 'md:col-start-1')}
                    >
                        {/* Tag row */}
                        <motion.div
                            custom={0}
                            variants={sectionVariants}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            className="flex flex-wrap items-center gap-2"
                        >
                            <div className="h-8 w-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase border-primary/30 text-primary">
                                {tool.badge}
                            </Badge>
                            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
                                {tool.tagline}
                            </span>
                        </motion.div>

                        {/* Title */}
                        <motion.h2
                            custom={1}
                            variants={sectionVariants}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-tight text-foreground"
                        >
                            {tool.title}
                        </motion.h2>

                        {/* Description */}
                        <motion.p
                            custom={2}
                            variants={sectionVariants}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg"
                        >
                            {tool.description}
                        </motion.p>

                        {/* Features list */}
                        <motion.ul
                            custom={3}
                            variants={sectionVariants}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                        >
                            {tool.features.map((feat) => (
                                <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                    {feat}
                                </li>
                            ))}
                        </motion.ul>

                        {/* CTA */}
                        <motion.div
                            custom={4}
                            variants={sectionVariants}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            className="flex flex-wrap gap-3 pt-2"
                        >
                            {tool.downloadUrl ? (
                                <Button
                                    className="group gap-2 font-bold"
                                    onClick={() => window.open(tool.downloadUrl, '_blank')}
                                >
                                    <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                                    Download APK
                                </Button>
                            ) : tool.siteUrl ? (
                                <Button
                                    className="group gap-2 font-bold"
                                    onClick={() => {
                                        if (tool.siteUrl?.startsWith('/')) {
                                            window.location.href = tool.siteUrl;
                                        } else {
                                            window.open(tool.siteUrl, '_blank');
                                        }
                                    }}
                                >
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    Open Tool
                                </Button>
                            ) : null}

                            {tool.githubUrl && (
                                <Button
                                    variant="outline"
                                    className="group gap-2 font-semibold"
                                    onClick={() => window.open(tool.githubUrl, '_blank')}
                                >
                                    <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    Source Code
                                </Button>
                            )}
                        </motion.div>
                    </motion.div>

                    {/* Visual column */}
                    <div className={cn('relative min-h-[300px] md:min-h-[450px]', flip ? 'md:col-start-1' : 'md:col-start-2')}>
                        <FeatheredImage src={tool.image} flip={flip} scrollProgress={scrollYProgress} />
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Featured Site Iframe Card ────────────────────────────────────────────────
const FeaturedSiteCard = ({ site, isActive }: { site: FeaturedSite; isActive: boolean }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (!isActive) {
            setLoaded(false);
            setMounted(false);
            setError(false);
            return;
        }
        const timer = setTimeout(() => setMounted(true), 150);
        return () => clearTimeout(timer);
    }, [isActive]);

    const handleRetry = () => {
        setError(false);
        setLoaded(false);
        setMounted(false);
        setTimeout(() => setMounted(true), 150);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Site meta */}
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px] font-bold tracking-widest uppercase">
                            {site.category}
                        </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{site.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{site.description}</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2 font-semibold"
                    onClick={() => window.open(site.url, '_blank')}
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                </Button>
            </div>

            {/* Iframe container */}
            <div className="flex-1 relative rounded-2xl overflow-hidden border border-border bg-muted/30 min-h-[480px]">
                {/* Loading state */}
                {!loaded && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                        <CEKALoader variant="scanning" size="md" text={`Loading ${site.name}...`} />
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-foreground">Unable to Load</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                This site may not allow embedding. Try opening it directly.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={handleRetry}>
                                <RefreshCw className="h-3.5 w-3.5" />
                                Retry
                            </Button>
                            <Button size="sm" className="gap-2" onClick={() => window.open(site.url, '_blank')}>
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open Directly
                            </Button>
                        </div>
                    </div>
                )}

                {/* Iframe */}
                {mounted && !error && (
                    <iframe
                        src={site.url}
                        className={cn(
                            'w-full h-full border-none transition-opacity duration-500',
                            loaded ? 'opacity-100' : 'opacity-0 absolute'
                        )}
                        style={{ minHeight: '480px', height: loaded ? '480px' : '1px' }}
                        title={site.name}
                        onLoad={() => { setLoaded(true); setError(false); }}
                        onError={() => { setError(true); setLoaded(false); }}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                )}
            </div>
        </div>
    );
};

// ─── Featured Section ─────────────────────────────────────────────────────────
const FeaturedSection = () => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <section id="featured" className="py-20 md:py-32">
            {/* Hairline */}
            <div className="absolute left-8 right-8 h-px bg-border opacity-60" />

            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                    className="mb-10"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-xs font-black tracking-widest uppercase text-primary">Featured</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground mb-3">
                        Featured Civic Tools For You
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                        Linked civic platforms's projects we endorse and/or collaborate with. Live previews powered directly from source. Go support their work!
                    </p>
                </motion.div>

                {/* Tab selector */}
                <div className="flex gap-2 mb-8 flex-wrap">
                    {FEATURED_SITES.map((site, i) => (
                        <button
                            key={site.id}
                            onClick={() => setActiveTab(i)}
                            className={cn(
                                'px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300',
                                activeTab === i
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                            )}
                        >
                            {site.name.split('—')[0].trim()}
                        </button>
                    ))}
                </div>

                {/* Active site panel */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.4, ease: EASE_IN_OUT }}
                    >
                        <FeaturedSiteCard site={FEATURED_SITES[activeTab]} isActive={true} />
                    </motion.div>
                </AnimatePresence>

                {/* Other site cards (summary) */}
                <div className="mt-10 grid sm:grid-cols-3 gap-4">
                    {FEATURED_SITES.map((site, i) => (
                        <motion.button
                            key={site.id}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: i * 0.08 }}
                            onClick={() => setActiveTab(i)}
                            className={cn(
                                'text-left p-4 rounded-2xl border transition-all duration-300 group',
                                activeTab === i
                                    ? 'border-primary/40 bg-primary/5 shadow-md shadow-primary/10'
                                    : 'border-border hover:border-primary/30 hover:bg-muted/40'
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-[9px] font-bold tracking-widest uppercase">
                                    {site.category}
                                </Badge>
                                {activeTab === i && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                )}
                            </div>
                            <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {site.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {site.description}
                            </p>
                        </motion.button>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── Hero Section ─────────────────────────────────────────────────────────────
const HeroSection = () => {
    const ref = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
    const featuredRef = useRef<HTMLElement | null>(null);

    const scrollToFeatured = () => {
        const el = document.getElementById('featured');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section
            ref={ref}
            className="relative min-h-[80vh] lg:min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16 pb-16"
        >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-radial from-primary/5 to-transparent pointer-events-none" />

            <motion.div
                style={{ y: heroY, opacity: heroOpacity }}
                className="relative z-10 text-center max-w-5xl mx-auto px-6"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
                >
                    <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-black tracking-[0.2em] uppercase">
                        <Zap className="h-3 w-3" />
                        Civic Tools
                    </div>

                    <h1 className="text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[0.85] mb-8 text-foreground">
                        Your <br />
                        <span className="text-primary">CEKA</span>{' '}
                        <span className="text-secondary">Tools</span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed mb-10">
                        High-performance civic toolkits, investigative data streams, and encrypted communications infrastructure - all in one home.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button
                            size="lg"
                            className="gap-2 font-bold h-12 px-8 rounded-2xl shadow-lg shadow-primary/20"
                            onClick={() => {
                                const el = document.getElementById('tool-nasaka-wewe');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            Explore Full Toolset
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="gap-2 font-bold h-12 px-8 rounded-2xl"
                            onClick={scrollToFeatured}
                        >
                            <Globe className="h-4 w-4" />
                            See Featured Tools
                        </Button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ChevronDown className="h-6 w-6 text-muted-foreground/50" />
                </motion.div>
            </motion.div>
        </section>
    );
};

// ─── Main Tools Page ──────────────────────────────────────────────────────────
const Tools = () => {
    return (
        <>
            <Helmet>
                <title>CEKA Tools — Civic Intelligence Infrastructure</title>
                <meta
                    name="description"
                    content="CEKA's suite of civic tools including Nasaka WEWE encrypted messaging, Nasaka IEBC office finder, People's Audit, and SHAmbles accountability tracker."
                />
            </Helmet>

            <div className="min-h-screen bg-background text-foreground">
                <Navbar />

                {/* Hero */}
                <HeroSection />

                {/* Tool Sections */}
                {TOOLS.map((tool, index) => (
                    <ToolSection key={tool.id} tool={tool} index={index} />
                ))}

                {/* Featured Sites */}
                <FeaturedSection />

                <BottomNavbar />
            </div>
        </>
    );
};

export default Tools;
