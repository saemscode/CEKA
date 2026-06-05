import React, { useRef, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
    Search,
    BookOpen,
    Scale,
    MessageSquare,
    Shield,
    Users,
    Globe,
    Smartphone,
    Heart,
    ArrowRight,
    ChevronDown,
    Mail,
    Github,
    ExternalLink,
    Zap,
    FileText,
    Map as MapIcon,
    Eye,
    Lock,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import BottomNavbar from '@/components/layout/BottomNavbar';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Ease Constants ───────────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface AboutSection {
    id: string;
    label: string;
    title: string;
    description: string;
    longDescription: string;
    icon: React.ComponentType<any>;
    features: string[];
    image: string;
    link?: string;
    linkLabel?: string;
}

// ─── CEKA Brand Palette ───────────────────────────────────────────────────────
const CEKA_GREEN = '#006600';
const CEKA_RED = '#bb0000';

// ─── Section Data — The full CEKA story ───────────────────────────────────────
const SECTIONS: AboutSection[] = [
    {
        id: 'legislative-tracker',
        label: 'Legislative Intelligence',
        title: 'Track Every Bill.\nUnderstand Every Law.',
        description: 'A production-grade 8-stage legislative pipeline that tracks Kenyan bills from Publication to Presidential Assent — with AI-generated neural summaries in plain language.',
        longDescription: 'The Legislative Tracker is the crown jewel of CEKA. It aggregates bills from Kenya Law and Parliament, tracks them through 8 distinct stages, provides full-text search, trending algorithms, and one-click bill following. Every bill gets an AI-generated "neural summary" — a plain-language explanation stored alongside the legal text.',
        icon: Scale,
        features: [
            '8-stage bill pipeline: Publication → Assent',
            'AI neural summaries in plain language',
            'Full-text PostgreSQL search (tsvector)',
            'Trending bills algorithm',
            'One-click bill following & alerts',
            'Secure PDF access',
        ],
        image: '/images/about-search.svg',
        link: '/legislative-tracker',
        linkLabel: 'Open Tracker',
    },
    {
        id: 'constitution',
        label: 'Constitutional Literacy',
        title: 'Ask the Constitution.\nGet Real Answers.',
        description: 'An interactive Constitution explorer with a RAG-powered AI chat that answers civic questions grounded in actual constitutional text.',
        longDescription: 'The Constitution Explorer provides an interactive, mobile-optimized journey through Kenya\'s 2010 Constitution — every Chapter, Article, and Schedule. The embedded RAG chat uses Full-Text Search on the constitution_sections table, retrieves the top 5 matching sections, then uses Google Gemini to generate authoritative answers grounded in the actual constitutional text.',
        icon: BookOpen,
        features: [
            'Interactive Chapter & Article browser',
            'RAG-powered AI chat (Gemini)',
            'Full-Text Search on constitutional sections',
            'NCEF framework integration',
            'Bilingual English/Swahili support',
            'Civic education explainers',
        ],
        image: '/images/about-global.svg',
        link: '/constitution',
        linkLabel: 'Explore Constitution',
    },
    {
        id: 'ai-assistant',
        label: 'AI-Powered Civic Intelligence',
        title: 'CEKA AI.\nYour Civic Guide.',
        description: 'A sophisticated civic AI assistant with 21 query categories and 8 response tiers — from casual greetings to deep constitutional analysis.',
        longDescription: 'The CEKA AI Global Assistant is the most sophisticated component in the codebase. It classifies user queries into 21 categories (including civic education, electoral, devolution, bill-specific) and generates responses across 8 tiers — from micro-responses for greetings to full cited legal analyses. It supports multiple AI providers (Gemini primary, DeepSeek fallback) and implements comprehensive adversarial filtering.',
        icon: MessageSquare,
        features: [
            '21 query categories with 100+ sub-categories',
            '8 response tiers (Micro → Refusal)',
            'Multi-provider AI (Gemini + DeepSeek)',
            'Context-aware page routing',
            'Adversarial prompt filtering',
            'Markdown-rendered responses',
        ],
        image: '/images/about-community.svg',
    },
    {
        id: 'resource-vault',
        label: 'Secure Document Access',
        title: 'The Resources.\nCivic Knowledge, Secured.',
        description: 'A secure document database powered by Backblaze B2 with authenticated access, signed URLs, and audit logging for every civic resource.',
        longDescription: 'The Resource database provides authenticated access to legislative PDFs, NCEF documents, guides, and civic education materials. Documents are stored on Backblaze B2 (S3-compatible) and accessed via time-limited signed URLs generated by the database-auth Edge Function. Every access is audit-logged with user ID, email, file path, and request duration.',
        icon: Lock,
        features: [
            'Backblaze B2 signed URLs (1hr expiry)',
            'Directory traversal prevention',
            'Full audit logging per access',
            'In-memory URL cache (55min TTL)',
            'Category-based browsing',
            'Multi-select batch downloads',
        ],
        image: '/images/about-location.svg',
        link: '/resources',
        linkLabel: 'Browse Resources',
    },
    {
        id: 'community',
        label: 'Community Mobilisation',
        title: 'For the People.\nBy the People.',
        description: 'A community portal with volunteer systems, discussion forums, chat rooms, and civic action campaigns — all bilingual.',
        longDescription: 'CEKA\'s Community Portal is the human heart of the platform. Citizens can join the community, volunteer for civic education initiatives, participate in discussion forums, and engage in real-time chat rooms. The advocacy toolkit provides step-by-step guides for civic action, while the civic calendar tracks key dates with .ics export.',
        icon: Users,
        features: [
            'Community join flow & profiles',
            'Volunteer opportunity matching',
            'Discussion forums & chat rooms',
            'Advocacy toolkit with guides',
            'Civic calendar with .ics export',
            'Bilingual throughout',
        ],
        image: '/images/about-map.svg',
        link: '/community',
        linkLabel: 'Join Community',
    },
    {
        id: 'mobile',
        label: 'Cross-Platform Reach',
        title: 'Mobile-First.\nKenya-Ready.',
        description: 'Built for Kenya\'s smartphone-dominant market with full Capacitor iOS/Android support, responsive design, and offline capabilities.',
        longDescription: 'With 85% of Kenya\'s internet users accessing via smartphone, CEKA is built mobile-first. Capacitor provides native iOS and Android builds with push notifications via Firebase, haptic feedback, and native camera/keyboard support. The responsive web app works across all screen sizes with Tailwind\'s mobile-first breakpoints.',
        icon: Smartphone,
        features: [
            'Capacitor iOS + Android builds',
            'Firebase push notifications',
            'Responsive Tailwind design',
            'Dark mode + high contrast',
            'Touch-optimised interactions',
            'PWA-capable web app',
        ],
        image: '/images/about-mobile.svg',
    },
];

// ─── Nav Items for floating nav ───────────────────────────────────────────────
const NAV_ITEMS = [
    { id: 'hero', label: 'CEKA' },
    ...SECTIONS.map(s => ({ id: s.id, label: s.label.split(' ')[0] })),
    { id: 'impact', label: 'Impact' },
    { id: 'partner', label: 'Partner' },
];

// ─── Floating Glassmorphism Nav ───────────────────────────────────────────────
const FloatingNav = () => {
    const [visible, setVisible] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 300);

            // Determine active section
            const sections = NAV_ITEMS.map(n => document.getElementById(n.id)).filter(Boolean);
            let current = 'hero';
            for (const section of sections) {
                if (section) {
                    const rect = section.getBoundingClientRect();
                    if (rect.top <= 200) {
                        current = section.id;
                    }
                }
            }
            setActiveSection(current);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.nav
                    initial={{ y: -80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -80, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]"
                >
                    <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl border border-white/10 bg-background/60 backdrop-blur-2xl shadow-2xl shadow-black/10">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollTo(item.id)}
                                className={cn(
                                    'px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap',
                                    activeSection === item.id
                                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </motion.nav>
            )}
        </AnimatePresence>
    );
};

// ─── Feathered Image (matching Tools.tsx pattern) ─────────────────────────────
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
                className="relative w-full max-w-md rounded-3xl overflow-hidden aspect-square"
                style={{
                    maskImage: maskStyle,
                    WebkitMaskImage: maskStyle,
                }}
            >
                <img
                    src={src}
                    alt=""
                    className="w-full h-full object-contain p-8"
                    loading="lazy"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            </div>
        </motion.div>
    );
};

// ─── About Section (each feature) ─────────────────────────────────────────────
const AboutSectionBlock = ({ section, index }: { section: AboutSection; index: number }) => {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: false, margin: '-10% 0px -10% 0px' });
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

    const flip = index % 2 === 1;
    const Icon = section.icon;

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
            id={section.id}
            className="relative py-20 md:py-32 overflow-hidden"
        >
            {/* Hairline separator */}
            <div className="absolute top-0 left-8 right-8 h-px bg-border opacity-40" />

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
                            <span className="text-xs font-black tracking-widest uppercase text-primary">
                                {section.label}
                            </span>
                        </motion.div>

                        {/* Title */}
                        <motion.h2
                            custom={1}
                            variants={sectionVariants}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-tight text-foreground whitespace-pre-line"
                        >
                            {section.title}
                        </motion.h2>

                        {/* Description */}
                        <motion.p
                            custom={2}
                            variants={sectionVariants}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg"
                        >
                            {section.description}
                        </motion.p>

                        {/* Features list */}
                        <motion.ul
                            custom={3}
                            variants={sectionVariants}
                            initial="hidden"
                            animate={isInView ? 'visible' : 'hidden'}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                        >
                            {section.features.map((feat) => (
                                <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                    {feat}
                                </li>
                            ))}
                        </motion.ul>

                        {/* CTA */}
                        {section.link && (
                            <motion.div
                                custom={4}
                                variants={sectionVariants}
                                initial="hidden"
                                animate={isInView ? 'visible' : 'hidden'}
                                className="flex flex-wrap gap-3 pt-2"
                            >
                                <Link to={section.link}>
                                    <Button className="group gap-2 font-bold">
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        {section.linkLabel || 'Explore'}
                                    </Button>
                                </Link>
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Visual column */}
                    <div className={cn('relative min-h-[300px] md:min-h-[400px]', flip ? 'md:col-start-1' : 'md:col-start-2')}>
                        <FeatheredImage src={section.image} flip={flip} scrollProgress={scrollYProgress} />
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Impact / Stats Section ───────────────────────────────────────────────────
const ImpactSection = () => {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-10%' });

    const stats = [
        { label: 'Supabase Edge Functions', value: '23', icon: Zap },
        { label: 'Page Routes', value: '52', icon: Globe },
        { label: 'Services', value: '25', icon: FileText },
        { label: 'Bilingual Components', value: '50+', icon: Eye },
        { label: 'AI Query Categories', value: '21', icon: MessageSquare },
        { label: 'Legislative Stages', value: '8', icon: Scale },
    ];

    return (
        <section ref={ref} id="impact" className="relative py-24 md:py-36 overflow-hidden">
            <div className="absolute top-0 left-8 right-8 h-px bg-border opacity-40" />

            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-transparent pointer-events-none" />

            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                    className="text-center mb-16"
                >
                    <Badge variant="outline" className="mb-4 text-[10px] font-black tracking-widest uppercase border-primary/30 text-primary">
                        Platform Scale
                    </Badge>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-4">
                        Built to <span className="text-primary">Scale</span>.
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Open-source civic infrastructure. Verified from the codebase. Every number here is real.
                    </p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
                    {stats.map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                                transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: i * 0.08 }}
                                className="group relative"
                            >
                                <div className="relative p-6 md:p-8 rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/15 transition-all duration-300">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <p className="text-3xl md:text-4xl font-black tracking-tighter text-foreground mb-1">
                                        {stat.value}
                                    </p>
                                    <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                                        {stat.label}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

// ─── Partnership / Contact Section ────────────────────────────────────────────
const PartnerSection = () => {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-10%' });

    const partnerships = [
        { title: 'Data Partnerships', desc: 'Integrate research datasets into our AI RAG system for deeper civic insights.' },
        { title: 'Reach & Advocacy', desc: 'Utilise CEKA\'s growing user base for civic surveys and mobilisation campaigns.' },
        { title: 'Technical Synergy', desc: 'Collaborative development of new civic tools — county dashboards, budget trackers.' },
        { title: 'Content Co-creation', desc: 'Jointly produce bilingual educational materials for the Resource Database.' },
    ];

    return (
        <section ref={ref} id="partner" className="relative py-24 md:py-36 overflow-hidden">
            <div className="absolute top-0 left-8 right-8 h-px bg-border opacity-40" />

            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-16 items-start">
                    {/* Left — Vision */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                        className="space-y-6"
                    >
                        <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase border-primary/30 text-primary">
                            Partner With Us
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight">
                            Pamoja,{'\n'}Tunaweza.
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Together, we can. CEKA is open-source, community-driven, and built for collaboration. We invite CSOs, academic institutions, and development partners to join our ecosystem.
                        </p>

                        {/* Contact links */}
                        <div className="space-y-3 pt-4">
                            <a
                                href="mailto:contact@civiceducationkenya.com"
                                className="flex items-center gap-3 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
                            >
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <Mail className="h-4 w-4 text-primary" />
                                </div>
                                contact@civiceducationkenya.com
                            </a>
                            <a
                                href="https://github.com/saemscodes/CEKA"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
                            >
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <Github className="h-4 w-4 text-primary" />
                                </div>
                                github.com/saemscodes/CEKA
                            </a>
                            <a
                                href="https://civiceducationkenya.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
                            >
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <Globe className="h-4 w-4 text-primary" />
                                </div>
                                civiceducationkenya.com
                            </a>
                        </div>

                        {/* Donate CTA */}
                        <div className="pt-4">
                            <Button
                                size="lg"
                                className="gap-2 font-bold h-12 px-8 rounded-2xl shadow-lg shadow-primary/20"
                                onClick={() => window.open('http://zenlipa.co.ke/zen/civiceducationke', '_blank')}
                            >
                                <Heart className="h-4 w-4" />
                                Support CEKA
                            </Button>
                        </div>
                    </motion.div>

                    {/* Right — Partnership cards */}
                    <div className="grid gap-4">
                        {partnerships.map((p, i) => (
                            <motion.div
                                key={p.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.15 + i * 0.1 }}
                                className="p-6 rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                                    <div>
                                        <h3 className="font-bold text-foreground mb-1">{p.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
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

    const scrollToFirst = () => {
        const el = document.getElementById('legislative-tracker');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section
            ref={ref}
            id="hero"
            className="relative min-h-[85vh] lg:min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16 pb-16"
        >
            {/* Background gradients */}
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
                        <Sparkles className="h-3 w-3" />
                        About CEKA
                    </div>

                    <h1 className="text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[0.85] mb-8 text-foreground">
                        Civic{' '}
                        <span className="text-primary">Education</span>
                        <br />
                        <span style={{ color: CEKA_RED }}>Kenya</span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-10">
                        An open-source, bilingual civic-education platform that aggregates Kenyan legislative content, explains laws in plain language using AI, and provides community mobilisation tools — free at the point of use.
                    </p>

                    {/* Search-style CTA — the interaction point */}
                    <div className="max-w-lg mx-auto mb-10">
                        <Link to="/search">
                            <div className="group flex items-center gap-3 px-6 py-4 rounded-2xl border border-border/60 bg-background/60 backdrop-blur-xl shadow-lg shadow-black/5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 cursor-pointer">
                                <Search className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm font-medium">
                                    Search bills, constitution, resources...
                                </span>
                                <div className="ml-auto px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                                    ⌘K
                                </div>
                            </div>
                        </Link>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button
                            size="lg"
                            className="gap-2 font-bold h-12 px-8 rounded-2xl shadow-lg shadow-primary/20"
                            onClick={scrollToFirst}
                        >
                            Discover CEKA
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="gap-2 font-bold h-12 px-8 rounded-2xl"
                            onClick={() => window.open('https://github.com/saemscodes/CEKA', '_blank')}
                        >
                            <Github className="h-4 w-4" />
                            View Source
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

// ─── Footer Section ───────────────────────────────────────────────────────────
const FooterSection = () => (
    <section className="relative py-16 border-t border-border/40">
        <div className="container mx-auto px-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
                Open Source · MIT License · Built for Kenya 🇰🇪
            </p>
            <p className="text-xs text-muted-foreground/60">
                © {new Date().getFullYear()} Civic Education Kenya (CEKA) · contact@civiceducationkenya.com
            </p>
        </div>
    </section>
);

// ─── Main About Page ──────────────────────────────────────────────────────────
const About = () => {
    return (
        <>
            <Helmet>
                <title>About CEKA — Civic Education Kenya</title>
                <meta
                    name="description"
                    content="CEKA is an open-source, bilingual civic-education platform for Kenya. AI-powered legislative tracking, interactive constitution explorer, and community mobilisation tools."
                />
            </Helmet>

            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <FloatingNav />

                {/* Hero */}
                <HeroSection />

                {/* Feature Sections */}
                {SECTIONS.map((section, index) => (
                    <AboutSectionBlock key={section.id} section={section} index={index} />
                ))}

                {/* Impact Stats */}
                <ImpactSection />

                {/* Partnership */}
                <PartnerSection />

                {/* Footer */}
                <FooterSection />

                <BottomNavbar />
            </div>
        </>
    );
};

export default About;
