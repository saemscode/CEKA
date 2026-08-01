// About.tsx — full corrected version with image placeholder fix + imageUrl support for tool cards

import React, { useRef, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
    Search,
    BookOpen,
    Scale,
    MessageSquare,
    Users,
    Globe,
    Smartphone,
    Heart,
    ArrowRight,
    ChevronDown,
    Mail,
    Github,
    Zap,
    FileText,
    Eye,
    Lock,
    Sparkles,
    Map,
    Newspaper,
    AlertTriangle,
    Activity,
    Vote,
    ExternalLink,
    CheckCircle2,
    Clock,
    Pause,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import { CarouselSlideIcon, LegislativeTrackerIcon, CommentsIcon, NavCommentIcon, NewspaperIcon, ThumbIcon } from '@/components/ui/CustomIcons';
import BottomNavbar from '@/components/layout/BottomNavbar';
import { cn } from '@/lib/utils';

// ─── Ease Constants ────────────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// ─── Brand colors now driven by the new CSS custom properties ─────────────────
const G = 'hsl(var(--primary))';   // Kenya Green
const R = 'hsl(var(--secondary))'; // Kenya Red

const NasakaIcon = ({ className }: { className?: string }) => (
    <svg
        version="1.0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1080 1080"
        preserveAspectRatio="xMidYMid meet"
        className={className}
    >
        <g
            transform="translate(0,1080) scale(0.1,-0.1)"
            fill="currentColor"
            stroke="none"
        >
            <path d="M5135 9223 c-559 -49 -1092 -260 -1555 -616 -117 -90 -384 -351 -477
-467 -290 -360 -500 -803 -593 -1250 -72 -351 -79 -741 -19 -1089 104 -604
429 -1261 949 -1922 103 -132 1951 -2309 1959 -2308 7 0 1719 2051 1854 2219
560 701 899 1332 1026 1905 50 227 56 288 56 580 0 294 -7 370 -52 595 -254
1267 -1318 2228 -2601 2350 -98 9 -453 11 -547 3z m575 -638 c250 -35 478
-104 692 -208 249 -122 436 -255 633 -452 356 -355 580 -799 657 -1299 31
-204 31 -519 0 -701 -86 -502 -308 -938 -653 -1284 -439 -438 -1025 -681
-1644 -681 -864 0 -1643 471 -2055 1243 -176 330 -261 685 -261 1092 0 476
126 888 394 1290 116 173 289 364 453 497 427 348 970 536 1514 523 85 -2 207
-11 270 -20z" />
            <path d="M5250 7760 c-597 -83 -1055 -488 -1213 -1070 -30 -112 -31 -122 -31
-330 -1 -172 3 -232 17 -300 125 -583 579 -1025 1157 -1125 126 -22 354 -22
485 0 575 96 1033 540 1161 1125 15 67 19 127 19 280 0 209 -10 279 -61 443
l-26 80 -119 -119 -120 -120 16 -88 c69 -397 -86 -810 -399 -1065 -134 -109
-267 -175 -450 -224 -69 -18 -108 -21 -266 -21 -159 0 -196 3 -265 21 -164 45
-307 116 -427 212 -214 170 -351 396 -409 673 -30 148 -23 372 16 503 36 121
74 211 125 292 206 327 541 524 920 540 296 12 569 -85 790 -283 l63 -56 106
107 106 106 -65 60 c-181 166 -432 292 -685 344 -94 19 -352 28 -445 15z" />
            <path d="M6780 7494 c-30 -8 -78 -29 -107 -46 -32 -20 -258 -238 -614 -594
l-563 -564 -196 195 c-170 169 -206 199 -266 227 -66 31 -75 33 -184 33 -105
0 -120 -2 -170 -27 -30 -15 -71 -41 -90 -57 l-35 -30 450 -450 c442 -443 451
-451 490 -451 39 0 49 9 867 827 l827 827 -20 22 c-31 33 -127 80 -187 93 -70
15 -135 13 -202 -5z" />
        </g>
    </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface CEKATool {
    id: string;
    name: string;
    tagline: string;
    description: string;
    icon: React.ComponentType<any>;
    link?: string;
    isExternal?: boolean;
    status: 'live' | 'building' | 'paused';
    color: string;   // accent hex or CSS variable reference
    label: string;   // short nav label
    features: string[];
    imageUrl?: string; // optional image to overlay on the placeholder
}

type ExternalTool = {
    name: string;
    description: string;
    url: string;
    category: string;
    icon: React.ComponentType<any>;
};

// ─── CEKA Core Tools ──────────────────────────────────────────────────────────
const CEKA_TOOLS: CEKATool[] = [
    {
        id: 'legislative-tracker',
        name: 'Legislative Tracker',
        label: 'Tracker',
        tagline: 'Every bill. Plain language. Right now.',
        description: 'Parliament passes laws that touch on every part of your life - but bills are buried in such complex legal language that it feels almost impossible to keep up with the changes as a normal Kenyan. CEKA\'s Legislative Tracker solves this by pulling every bill & translating the legal jargon into plain English and Swahili just for you. On top of that, it lets you follow the bills & get notifications on legislation that matter to you.',
        icon: LegislativeTrackerIcon,
        link: '/legislative-tracker',
        status: 'live',
        color: G,
        imageUrl: '/context/images/legislative-tracker.png', // user to replace with actual path
        features: [
            'Tracks all Bills from first publication to Presidential Assent',
            'Simple summaries in English and Swahili',
            'Smart search and adverse category filters',
            'Follow Bills and get notifications when they move stages',
            'Access the actual Bill document (PDF) in one click',
            'Send your Memorandum to Parliament for any Bill',
            'All in one page',
        ],
    },
    {
        id: 'nasaka-iebc',
        name: 'NASAKA IEBC',
        label: 'NASAKA',
        tagline: 'Find your nearest IEBC Office.',
        description: 'Accessed by over 1m Kenyans, "NASAKA" means "find" in Swahili. NASAKA IEBC is an interactive map of every IEBC office across Kenya\'s 47 counties - in 15 languages. Whether you speak Giriama, Somali, Turkana or Dholuo, you can find your nearest voter registration centre and get turn-by-turn directions.',
        icon: NasakaIcon,
        link: 'https://nasakaiebc.civiceducationkenya.com',
        isExternal: true,
        status: 'live',
        color: G,
        imageUrl: '/context/images/nasaka.png', // user to replace
        features: [
            'All 47 counties, every IEBC constituency office',
            'Supports 15 languages - reaching marginalized communities across Kenya',
            'Turn-by-turn directions to your nearest office',
            'Crowdsourced accuracy - real Kenyans verify real locations',
            'Trusted and accessed by 1m+ Kenyans',
        ],
    },
    {
        id: 'constitution',
        name: 'Constitution Chat',
        label: 'Constitution',
        tagline: 'We Mapped the Full Constitution For You',
        description: 'The Constitution of Kenya 2010 guarantees your rights - but 264 articles of legal text are hard to navigate. CEKA\'s Constitution Chat lets you ask plain questions ("Do I have the right to strike?" "What is devolution?") and get answers drawn directly from the constitutional text, not an opinion.',
        icon: CommentsIcon,
        link: '/constitution',
        status: 'live',
        color: G,
        imageUrl: '/context/images/constitution.png',
        features: [
            'All 264 articles and schedules fully searchable',
            'Bilingual English and Swahili support',
            'Browse by Chapter or jump straight to any Article',
            'Ask CEKA AI for summaries for any section',
        ],
    },
    {
        id: 'ai-assistant',
        name: 'Civic AI',
        label: 'AI',
        tagline: 'Ask CEKA AI',
        description: 'Imagine having a civic education expert on speed dial. We thought about this & are slowly making it happen for Kenyans. Ask anything about Kenya\'s laws, rights, elections, devolution... you name it!',
        icon: NavCommentIcon,
        status: 'live',
        color: G,
        imageUrl: '/context/images/ceka-ai.png',
        features: [
            'Answers verified against CEKA\'s own civic document library',
            'Knows about bills, the Constitution, IEBC, devolution and more',
            'It does not guess - confesses when it does not know',
            'Runs on multiple (13) AI models for accuracy and reliability',
            'Available across all pages of the platform',
        ],
    },
    {
        id: 'resource-vault',
        name: 'Resources',
        label: 'Resources',
        tagline: 'Civic knowledge. Verified and free.',
        description: 'A growing library of Kenya\'s most important civic documents - Electoral Acts, Controller of Budget reports, NCEF frameworks, CSO publications and more. Every document verified, categorised and available for free download. We do not train our AI on this data.',
        icon: Lock,
        link: '/resources',
        status: 'live',
        color: G,
        imageUrl: '/context/images/resources.png',
        features: [
            'Official government PDFs, reports and acts',
            'All documents power CEKA\'s AI knowledge base',
            'Filter by category, language or type',
            'Download what you need - no paywall',
            'New resources added regularly',
            'You can now upload your own civic resources',
        ],
    },
    {
        id: 'pieces',
        name: 'Pieces — Editorial',
        label: 'Pieces',
        tagline: 'A Social Media space for Civic Education content',
        description: 'Submitting our content on a social space we could lose in an instant due to "powers that be" has bothered us for a while, so we created a space we all could call our own and interact with civic content freely. Enter Pieces. A learning space with the most beautifully illustrated civic explainers, campaign analyses and legislative breakdowns. And we are welcoming submissions.',
        icon: NewspaperIcon,
        link: '/pieces',
        status: 'live',
        color: G,
        imageUrl: '/context/images/pieces.png',
        features: [
            'Civic explainers written for ordinary Kenyans',
            'Beautifully illustrated breakdowns',
            'Currently there are plans to mass-translate them',
            'Shared across CEKA\'s social channels',
        ],
    },
    {
        id: 'community',
        name: 'Community',
        label: 'Community',
        tagline: 'We Do It. Together.',
        description: 'The heart of CEKA is its community. We\'re building a space that ports discussions on Bills in Legislative Tracker to comments on Blog posts about a related civic injustice and making space for responses on a Pieces carousel - all in one safe community-led discussion. That\'s our vision! Join us to help make it happen!',
        icon: ThumbIcon,
        link: '/community',
        status: 'building',
        color: G,
        imageUrl: '',
        features: [
            'Discussion forums on live civic issues',
            'Volunteer coordination and matching',
            'Monthly civic newsletter',
            'Campaign coordination tools',
            'Gain Impact points from civic interactions',
            'Peer learning and civic education events',
        ],
    },
    {
        id: 'peoples-audit',
        name: "People's Audit",
        label: 'Audit',
        tagline: 'Public spending. Public scrutiny.',
        description: "The People's Audit tool is Kenya's citizen-facing public accountability layer; where you can submit, verify and amplify reports on government spending failures, governance breakdowns and civic issues at county and national level. Under development for Phase 3.",
        icon: Eye,
        status: 'paused',
        color: R,
        imageUrl: '', // no image yet
        features: [
            'Submit public spending failure reports',
            'Verify and amplify reports from other citizens',
            'County and national level coverage',
            'Connects to CEKA editorial for investigation pipeline',
            'Integrated with community mobilisation layer',
        ],
    },
    {
        id: 'shambles',
        name: 'SHAmbles',
        label: 'SHA',
        tagline: 'SHA accountability. Independent and public.',
        description: 'Named frankly after the widely-documented disarray of Kenya\'s Social Health Authority rollout, SHAmbles monitors SHA fund flows, health facility registration statuses and public health accountability metrics; giving citizens and CSOs an independent audit layer. Under development.',
        icon: Activity,
        status: 'paused',
        color: R,
        imageUrl: '',
        features: [
            'Tracks 10,000+ health facilities across Kenya',
            'Monitors SHA fund flows and provider registration',
            'Independent of government — no institutional capture',
            'Data sourced from Ministry of Health and COB reports',
            'Feeds into People\'s Audit accountability layer',
        ],
    },
];

// ─── External Tools We Love ───────────────────────────────────────────────────
const EXTERNAL_TOOLS: ExternalTool[] = [
    {
        name: 'Kenya Law',
        description: 'Official database of Kenya\'s statutes, bills and case law. The primary source CEKA scrapes for the Legislative Tracker.',
        url: 'https://new.kenyalaw.org',
        category: 'Legislative',
        icon: Scale,
    },
    {
        name: 'Parliament of Kenya',
        description: 'Official Parliament portal — Hansard, committee reports, bill readings and the full parliamentary calendar.',
        url: 'https://parliament.go.ke',
        category: 'Legislative',
        icon: FileText,
    },
    {
        name: 'IEBC Portal',
        description: 'Independent Electoral and Boundaries Commission — official voter registration info, polling stations and boundaries.',
        url: 'https://www.iebc.or.ke',
        category: 'Electoral',
        icon: Vote,
    },
    {
        name: 'Controller of Budget',
        description: 'County and national budget performance reports — the data backbone for the People\'s Audit tool.',
        url: 'https://cob.go.ke',
        category: 'Accountability',
        icon: Eye,
    },
    {
        name: 'KNBS Open Data',
        description: 'Kenya National Bureau of Statistics — demographic data, census results and governance metrics.',
        url: 'https://www.knbs.or.ke',
        category: 'Data',
        icon: Activity,
    },
    {
        name: 'Mzalendo',
        description: 'Kenya\'s parliamentary monitoring website — tracking MP activity, contributions and performance since 2005.',
        url: 'https://info.mzalendo.com',
        category: 'Accountability',
        icon: Users,
    },
    {
        name: 'The Kenyan IDEA',
        description: 'International IDEA\'s Kenya resource hub — electoral system data, democratic governance metrics and comparative analysis.',
        url: 'https://www.idea.int/data-tools/country-view/173/40',
        category: 'Data',
        icon: Globe,
    },
    {
        name: 'Constitution of Kenya 2010',
        description: 'The full constitutional text — 264 articles, schedules and transitional clauses. Basis of CEKA\'s Constitution RAG chat.',
        url: 'https://www.constituteproject.org/constitution/Kenya_2010',
        category: 'Constitutional',
        icon: BookOpen,
    },
    {
        name: 'Digital Defenders Partnership',
        description: 'Emergency support and security training for human rights defenders and civic technologists at risk.',
        url: 'https://www.digitaldefenders.org',
        category: 'Safety',
        icon: Lock,
    },
    {
        name: 'Briar',
        description: 'Peer-to-peer encrypted messenger that works without internet — the inspiration for NASAKA WEWE\'s offline mesh layer.',
        url: 'https://briarproject.org',
        category: 'Tech',
        icon: Smartphone,
    },
    {
        name: 'Twaweza East Africa',
        description: 'Evidence-based civic advocacy across East Africa — Uwezo data, Sauti za Wananchi surveys and education policy work.',
        url: 'https://twaweza.org',
        category: 'CSO',
        icon: Heart,
    },
    {
        name: 'AfriCAN Voices',
        description: 'African civic technology collective — connecting civic tech builders across the continent.',
        url: 'https://africanvoices.org',
        category: 'CSO',
        icon: Globe,
    },
];

// ─── Status Config — updated with design‑system classes ───────────────────────
const STATUS_CONFIG = {
    live: { label: 'Live', icon: CheckCircle2, cls: 'text-primary bg-primary/10 border-primary/20 dark:bg-primary/20 dark:border-primary/30' },
    building: { label: 'Coming Soon', icon: Clock, cls: 'text-secondary bg-secondary/10 border-secondary/20 dark:bg-secondary/20 dark:border-secondary/30' },
    paused: { label: 'Paused', icon: Pause, cls: 'text-muted-foreground bg-muted border-muted-foreground/20 dark:bg-muted/30 dark:border-muted-foreground/30' },
};

// ─── Nav Items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
    { id: 'hero', label: 'About' },
    { id: 'why-kenya', label: 'Why' },
    { id: 'ceka-tools', label: 'Tools' },
    { id: 'impact', label: 'Scale' },
    { id: 'ecosystem', label: 'Ecosystem' },
    { id: 'partner', label: 'Partner' },
];

// ─── Floating Glassmorphism Nav ───────────────────────────────────────────────
const FloatingNav = () => {
    const [visible, setVisible] = useState(false);
    const [activeSection, setActive] = useState('hero');

    useEffect(() => {
        const onScroll = () => {
            setVisible(window.scrollY > 350);
            const ids = NAV_ITEMS.map(n => document.getElementById(n.id)).filter(Boolean);
            let cur = 'hero';
            for (const el of ids) {
                if (el && el.getBoundingClientRect().top <= 180) cur = el.id;
            }
            setActive(cur);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = (id: string) =>
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return (
        <AnimatePresence>
            {visible && (
                <motion.nav
                    initial={{ y: -80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -80, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[96vw]"
                >
                    <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl border border-white/10 bg-background/70 backdrop-blur-2xl shadow-2xl shadow-black/10">
                        {NAV_ITEMS.map(item => (
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

// ─── Hero ─────────────────────────────────────────────────────────────────────
const HeroSection = () => {
    const ref = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

    const scrollDown = () =>
        document.getElementById('why-kenya')?.scrollIntoView({ behavior: 'smooth' });

    return (
        <section
            ref={ref}
            id="hero"
            className="relative min-h-[90vh] lg:min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-20"
        >
            {/* Layered ambient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/6 via-background to-background pointer-events-none" />
            <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                    background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${G}18, transparent)`,
                }}
            />

            {/* Flag-stripe accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] flex">
                <div className="flex-1" style={{ background: G }} />
                <div className="w-1/3" style={{ background: R }} />
                <div className="flex-1" style={{ background: G }} />
            </div>

            <motion.div
                style={{ y: heroY, opacity: heroOpacity }}
                className="relative z-10 text-center max-w-5xl mx-auto px-6"
            >
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
                >

                    {/* Display headline */}
                    <h1 className="text-5xl sm:text-7xl lg:text-[88px] xl:text-[104px] font-black tracking-tighter leading-[0.85] mb-6 text-foreground">
                        Civic
                        <br />
                        <span style={{ color: G }}>Education</span>
                        <br />
                        <span style={{ color: R }}>Kenya</span>
                    </h1>

                    {/* Sub-headline */}
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed mb-3">
                        Learn about civic education in Kenya
                    </p>
                    <p className="text-base text-muted-foreground/70 max-w-xl mx-auto leading-relaxed mb-10">
                        Tools · Content · People
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button
                            size="lg"
                            className="gap-2 font-bold h-12 px-8 rounded-2xl shadow-lg shadow-primary/20"
                            onClick={scrollDown}
                        >
                            Let's Start <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.8 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ChevronDown className="h-6 w-6 text-muted-foreground/40" />
                </motion.div>
            </motion.div>
        </section>
    );
};

// ─── Why Civic Education in Kenya ─────────────────────────────────────────────
const WhyKenyaSection = () => {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-10%' });
    const [communityImgFailed, setCommunityImgFailed] = useState(false);

    const facts = [
        { stat: '290', label: 'Constituencies', subtext: 'Potential points of impact through communal Civic Education initiatives.' },
        { stat: '22M', label: 'Registered Voters', subtext: 'with about 4.5 million still unregistered heading into 2027' },
        { stat: '20', label: "Kenya's Median Age", subtext: 'a mobile-first, digitally-native civic generation. One key demographic for us.' },
        { stat: 'YOU', label: 'A Citizen of Kenya', subtext: 'The most important factor in our work. ' },
    ];

    return (
        <section ref={ref} id="why-kenya" className="relative py-24 md:py-36 overflow-hidden">
            <div className="absolute top-0 left-8 right-8 h-px bg-border opacity-40" />

            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-16 items-start">

                    {/* Left — narrative */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
                        className="space-y-8"
                    >
                        <div>
                            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground leading-tight mb-6">
                                Democracy only works<br />
                                <span style={{ color: G }}>when people know</span><br />
                                their power.
                            </h2>
                        </div>
                        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                            Civic education in Kenya remains inaccessible to many citizens despite its central role in democratic participation. For decades, civic education efforts have largely been delivered through a mix of government programmes, donor-funded projects, and civil society initiatives that often operate independently of one another. This has resulted in uneven coverage, inconsistent delivery, and significant differences in civic knowledge between communities.
                        </p>

                        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                            Many civic education initiatives are tied to specific projects, funding cycles, elections, policy campaigns, or constitutional milestones. As a result, citizens are often engaged intermittently rather than through continuous learning. Access to civic information can also be limited by technical language, fragmented information sources, and the absence of simple, accessible tools that connect people to the institutions, processes, and decisions that affect their daily lives.
                        </p>
                        <a
                            href="/join-community?tab=join-community"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                            aria-label="Join the CEKA community"
                            title="Join the CEKA community"
                        >
                            {/* Visual callout: image with placeholder fallback */}
                            <div className="relative rounded-3xl overflow-hidden border border-border/50 bg-muted/30 aspect-[16/7] flex items-center justify-center">
                                {/* Placeholder (visible when image fails) */}
                                <div className={`flex flex-col items-center gap-3 text-muted-foreground/40 p-8 text-center z-0 ${communityImgFailed ? '' : 'absolute inset-0 opacity-0'}`}>
                                    <CarouselSlideIcon className="h-10 w-10" />
                                    <span className="text-xs font-medium tracking-wide uppercase">
                                        [Image: JOIN COMMUNITY]
                                    </span>
                                </div>
                                {/* Image in front */}
                                {!communityImgFailed && (
                                    <img
                                        src="/context/images/JOIN-COMMUNITY.webp"
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover z-10"
                                        onError={() => setCommunityImgFailed(true)}
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none z-20" />
                            </div>
                        </a>

                        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                            These challenges contribute to persistent gaps in public understanding of governance, constitutional rights and responsibilities, devolution, public participation, legislative processes, and accountability mechanisms. While numerous organizations continue to play an important role in civic education, the overall ecosystem remains fragmented and lacks a single, widely accessible platform that enables citizens to easily discover, understand, and act on civic information.
                        </p>

                        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                            CEKA (Civic Education Kenya) exists to help address this challenge by making civic education more accessible, practical, and understandable. Through plain-language content, digital tools, and civic resources, CEKA aims to help more Kenyans understand how government works, how public decisions are made, and how they can participate meaningfully in the governance of their communities and country.
                        </p>

                    </motion.div>

                    {/* Right — stat cards */}
                    <div className="grid grid-cols-2 gap-4 pt-4 md:pt-16">
                        {facts.map((f, i) => (
                            <motion.div
                                key={f.label}
                                initial={{ opacity: 0, y: 28, scale: 0.95 }}
                                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                                transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.1 + i * 0.1 }}
                                className="group p-6 rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500"
                            >
                                <p
                                    className="text-3xl md:text-4xl font-black tracking-tighter mb-1"
                                    style={{ color: i % 2 === 0 ? G : R }}
                                >
                                    {f.stat}
                                </p>
                                <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">{f.label}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{f.subtext}</p>
                            </motion.div>
                        ))}

                        {/* Quote card */}
                        <motion.blockquote
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.5 }}
                            className="col-span-2 p-6 rounded-3xl border-l-10 bg-primary/5 border-primary/60"
                            style={{ borderLeftColor: G }}
                        >
                            <p className="text-base md:text-xl text-center font-bold text-foreground leading-relaxed mb-2">
                                Educate · Amplify · Empower
                            </p>
                            <cite className="text-xs md:text-sm pt-2 pb-2 block w-full text-center text-muted-foreground not-italic font-medium tracking-widest uppercase">
                                Civic Education Kenya (CEKA)
                            </cite>
                        </motion.blockquote>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Individual Tool Card ─────────────────────────────────────────────────────
const ToolCard = ({ tool, index }: { tool: CEKATool; index: number }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-8%' });
    const StatusCfg = STATUS_CONFIG[tool.status];
    const StatusIcon = StatusCfg.icon;
    const Icon = tool.icon;
    const flip = index % 2 === 1;
    const [imgFailed, setImgFailed] = useState(false);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.05 }}
            className={cn(
                'grid md:grid-cols-[1fr_1fr] items-center gap-12 md:gap-20 py-20 md:py-28 relative',
                flip && 'md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1'
            )}
        >
            {/* Hairline */}
            <div className="absolute top-0 left-0 right-0 h-px bg-border opacity-40" />

            {/* Text column */}
            <div className="space-y-6">
                {/* Label row */}
                <div className="flex flex-wrap items-center gap-3">
                    <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${tool.color}18` }}
                    >
                        <Icon className="h-4.5 w-4.5" style={{ color: tool.color }} strokeWidth={1.75} />
                    </div>
                    <span
                        className="text-[11px] font-black tracking-widest uppercase"
                        style={{ color: tool.color }}
                    >
                        {tool.name}
                    </span>
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border', StatusCfg.cls)}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {StatusCfg.label}
                    </span>
                </div>

                {/* Tagline */}
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter leading-tight text-foreground">
                    {tool.tagline}
                </h3>

                {/* Description */}
                <p className="text-base md:text-[17px] text-muted-foreground leading-relaxed max-w-lg">
                    {tool.description}
                </p>

                {/* Features */}
                <ul className="space-y-2">
                    {tool.features.map(feat => (
                        <li key={feat} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <div
                                className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ background: tool.color }}
                            />
                            {feat}
                        </li>
                    ))}
                </ul>

                {/* CTA */}
                {tool.link && tool.status === 'live' && (
                    <div className="pt-2">
                        {tool.isExternal ? (
                            <a href={tool.link} target="_blank" rel="noopener noreferrer">
                                <Button
                                    className="group gap-2 font-bold rounded-xl"
                                    style={{ background: tool.color }}
                                >
                                    Open Tool
                                    <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </Button>
                            </a>
                        ) : (
                            <Link to={tool.link}>
                                <Button
                                    className="group gap-2 font-bold rounded-xl"
                                    style={{ background: tool.color }}
                                >
                                    Open Tool
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
                {tool.status === 'building' && (
                    <p className="text-xs text-muted-foreground/60 font-medium pt-1">
                        In active development — launching Phase 3
                    </p>
                )}
            </div>

            {/* Visual column — styled placeholder with optional image overlay */}
            <div className="relative min-h-[280px] md:min-h-[360px] flex items-center justify-center">
                <div
                    className="w-full max-w-sm h-72 md:h-80 rounded-3xl border border-border/40 bg-gradient-to-br from-background to-muted/30 relative overflow-hidden flex flex-col items-center justify-center gap-4"
                    style={{ boxShadow: `0 8px 40px ${tool.color}12` }}
                >
                    {/* Placeholder content (always rendered) */}
                    <div className="relative z-0 flex flex-col items-center justify-center gap-4 w-full h-full">
                        {/* Ambient blob */}
                        <div
                            className="absolute top-4 right-4 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
                            style={{ background: tool.color }}
                        />
                        {/* Icon */}
                        <div
                            className="h-16 w-16 rounded-2xl flex items-center justify-center"
                            style={{ background: `${tool.color}18`, border: `1.5px solid ${tool.color}30` }}
                        >
                            <Icon className="h-8 w-8" style={{ color: tool.color }} strokeWidth={1.5} />
                        </div>
                        {/* Name */}
                        <div className="text-center px-6">
                            <p className="text-sm font-bold text-foreground mb-1">{tool.name}</p>
                            <p className="text-xs text-muted-foreground/60">{tool.tagline}</p>
                        </div>
                        {/* Skeleton bars — implies content */}
                        <div className="w-48 space-y-2 opacity-30">
                            <div className="h-2 rounded-full bg-muted-foreground/40 w-full" />
                            <div className="h-2 rounded-full bg-muted-foreground/40 w-4/5" />
                            <div className="h-2 rounded-full bg-muted-foreground/40 w-3/5" />
                        </div>
                        <span className="absolute bottom-3 right-3 text-[9px] font-mono text-muted-foreground/30">
                            [screenshot: {tool.name}]
                        </span>
                    </div>

                    {/* Image overlay (on top of placeholder) */}
                    {tool.imageUrl && !imgFailed && (
                        <img
                            src={tool.imageUrl}
                            alt={tool.name}
                            className="absolute inset-0 w-full h-full object-cover rounded-3xl z-10"
                            onError={() => setImgFailed(true)}
                        />
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ─── CEKA Tools Section ───────────────────────────────────────────────────────
const CEKAToolsSection = () => (
    <section id="ceka-tools" className="relative overflow-hidden">
        <div className="container mx-auto px-6">
            {/* Section header */}
            <div className="pt-24 md:pt-32 pb-4 text-center">
                <Badge variant="outline" className="mb-4 text-[10px] font-black tracking-widest uppercase border-primary/30 text-primary">
                    What We Built
                </Badge>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-4">
                    The <span style={{ color: G }}>CEKA</span>.
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    An umbrella initiative of civic tools, community initiatives and impactful contributions.
                    This is what happens in the post-modern world when hunger for civic knowledge meets technology.
                </p>

                {/* Status legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                        const I = v.icon;
                        return (
                            <span key={k} className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border', v.cls)}>
                                <I className="h-3 w-3" /> {v.label}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Tools */}
            {CEKA_TOOLS.map((tool, i) => (
                <ToolCard key={tool.id} tool={tool} index={i} />
            ))}
        </div>
    </section>
);

// ─── Impact / Stats ───────────────────────────────────────────────────────────
const ImpactSection = () => {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-10%' });

    const stats = [
        { label: 'Cross-platform reach (annualised)', value: '12M+', icon: Users },
        { label: 'Voter Registration uses via NASAKA IEBC', value: '300K+', icon: Map },
        { label: 'Languages supported (NASAKA)', value: '10+', icon: Globe },
        { label: 'Bills tracked daily', value: '541', icon: Scale },
        { label: 'Constitutional articles searchable', value: '264', icon: BookOpen },
        { label: 'Years of CEKA\'s Existence', value: '2', icon: Zap },
    ];

    return (
        <section ref={ref} id="impact" className="relative py-24 md:py-36 overflow-hidden">
            <div className="absolute top-0 left-8 right-8 h-px bg-border opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.025] via-transparent to-transparent pointer-events-none" />

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
                        Real numbers.<br />
                        <span style={{ color: G }}>Real reach.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Every figure here is drawn directly from the platform. Open-source means
                        anyone can check.
                    </p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
                    {stats.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <motion.div
                                key={s.label}
                                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                                transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: i * 0.08 }}
                                className="group"
                            >
                                <div className="relative p-6 md:p-8 rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 h-full">
                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/15 transition-all duration-300">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <p className="text-3xl md:text-4xl font-black tracking-tighter text-foreground mb-1">{s.value}</p>
                                    <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase leading-snug">{s.label}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

// ─── External Tools / Ecosystem ───────────────────────────────────────────────
const CATEGORIES = ['All', ...Array.from(new Set(EXTERNAL_TOOLS.map(t => t.category)))];

const EcosystemSection = () => {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-5%' });
    const [active, setActive] = useState('All');

    const filtered = active === 'All'
        ? EXTERNAL_TOOLS
        : EXTERNAL_TOOLS.filter(t => t.category === active);

    return (
        <section ref={ref} id="ecosystem" className="relative py-24 md:py-36 overflow-hidden">
            <div className="absolute top-0 left-8 right-8 h-px bg-border opacity-40" />

            <div className="container mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                    className="text-center mb-12"
                >
                    <Badge variant="outline" className="mb-4 text-[10px] font-black tracking-widest uppercase border-primary/30 text-primary">
                        The Wider Ecosystem
                    </Badge>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-4">
                        Tools & spaces<br />
                        <span style={{ color: G }}>we trust.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Civic technology doesn't work in isolation. These are the platforms, datasets
                        and organisations that make Kenya's civic infrastructure better for everyone.
                    </p>
                </motion.div>

                {/* Category filter pills */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.15 }}
                    className="flex flex-wrap gap-2 justify-center mb-10"
                >
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActive(cat)}
                            className={cn(
                                'px-4 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-250 border',
                                active === cat
                                    ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                                    : 'bg-background text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground'
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </motion.div>

                {/* Tool grid */}
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={active}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        {filtered.map((tool, i) => {
                            const Icon = tool.icon;
                            return (
                                <motion.a
                                    key={tool.name}
                                    href={tool.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: i * 0.04 }}
                                    className="group relative p-5 rounded-2xl border border-border/50 bg-background/60 backdrop-blur-xl hover:border-primary/35 hover:shadow-xl hover:shadow-primary/5 transition-all duration-400 cursor-pointer block"
                                >
                                    {/* Icon + category */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                                            <Icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} />
                                        </div>
                                        <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/60 bg-muted/40 px-2 py-0.5 rounded-md">
                                            {tool.category}
                                        </span>
                                    </div>

                                    {/* Name */}
                                    <p className="font-bold text-sm text-foreground mb-1.5 group-hover:text-primary transition-colors">
                                        {tool.name}
                                        <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                                    </p>

                                    {/* Desc */}
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {tool.description}
                                    </p>
                                </motion.a>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>

                {/* "More coming" note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="text-center text-xs text-muted-foreground/50 mt-8"
                >
                    This list grows as the ecosystem grows. Missing something? Email us.
                </motion.p>
            </div>
        </section>
    );
};

// ─── Partner / Contact ────────────────────────────────────────────────────────
const PartnerSection = () => {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-10%' });

    const ways = [
        { title: 'Data Partnerships', desc: 'Integrate research datasets and verified civic sources into the CEKA Resource Vault and AI knowledge base.' },
        { title: 'Reach & Advocacy', desc: 'Use CEKA\'s growing platform for civic surveys, voter education campaigns and mobilisation.' },
        { title: 'Technical Synergy', desc: 'Co-develop civic tools — county budget dashboards, SHA accountability APIs, electoral tooling.' },
        { title: 'Content Co-creation', desc: 'Produce bilingual civic education materials, explainers and guides for the platform.' },
    ];

    return (
        <section ref={ref} id="partner" className="relative py-24 md:py-36 overflow-hidden">
            <div className="absolute top-0 left-8 right-8 h-px bg-border opacity-40" />

            {/* Flag accent bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] flex">
                <div className="flex-1" style={{ background: G }} />
                <div className="w-1/4" style={{ background: R }} />
                <div className="flex-1" style={{ background: G }} />
            </div>

            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-16 items-start">

                    {/* Left */}
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
                            Pamoja,<br />
                            <span style={{ color: G }}>Tunaweza.</span>
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Together, we can. CEKA is open-source, community-driven and built for
                            collaboration. We welcome CSOs, academic institutions, county governments and
                            development partners into our ecosystem.
                        </p>

                        {/* Contacts */}
                        <div className="space-y-3 pt-2">
                            {[
                                { icon: Mail, href: 'mailto:contact@civiceducationkenya.com', label: 'contact@civiceducationkenya.com' },
                                { icon: Github, href: 'https://github.com/saemscodes/CEKA', label: 'github.com/saemscodes/CEKA' },
                                { icon: Globe, href: 'https://civiceducationkenya.com', label: 'civiceducationkenya.com' },
                            ].map(({ icon: Icon, href, label }) => (
                                <a
                                    key={href}
                                    href={href}
                                    target={href.startsWith('http') ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
                                >
                                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                                        <Icon className="h-4 w-4 text-primary" />
                                    </div>
                                    {label}
                                </a>
                            ))}
                        </div>

                        {/* Donate */}
                        <div className="pt-4 flex flex-wrap gap-3">
                            <Button
                                size="lg"
                                className="gap-2 font-bold h-12 px-8 rounded-2xl shadow-lg shadow-primary/20"
                                onClick={() => window.open('http://zenlipa.co.ke/zen/civiceducationke', '_blank')}
                            >
                                <Heart className="h-4 w-4" />
                                Support CEKA
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="gap-2 font-bold h-12 px-6 rounded-2xl"
                                onClick={() => window.open('https://ko-fi.com/civiceducationkenya', '_blank')}
                            >
                                Ko-fi Membership
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </motion.div>

                    {/* Right — partnership cards */}
                    <div className="grid gap-4">
                        {ways.map((p, i) => (
                            <motion.div
                                key={p.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.15 + i * 0.1 }}
                                className="p-6 rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 group"
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className="h-2 w-2 rounded-full mt-2 shrink-0 group-hover:scale-150 transition-transform"
                                        style={{ background: G }}
                                    />
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

// ─── Footer ───────────────────────────────────────────────────────────────────
const FooterSection = () => (
    <section className="relative py-16 border-t border-border/40">
        <div className="container mx-auto px-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
                Open Source · MIT License · Built for Kenya 🇰🇪
            </p>
            <p className="text-xs text-muted-foreground/60">
                © {new Date().getFullYear()} Civic Education Kenya (CEKA) · CEKA V25.0.0 · contact@civiceducationkenya.com
            </p>
        </div>
    </section>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const About = () => (
    <>
        <Helmet>
            <title>About CEKA — Civic Education Kenya</title>
            <meta
                name="description"
                content="CEKA is an open-source, bilingual civic-education platform for Kenya. AI-powered legislative tracking, interactive constitution explorer, NASAKA IEBC finder, accountability tools and community mobilisation — free at the point of use."
            />
        </Helmet>

        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <FloatingNav />

            <HeroSection />
            <WhyKenyaSection />
            <CEKAToolsSection />
            <ImpactSection />
            <EcosystemSection />
            <PartnerSection />
            <FooterSection />

            <BottomNavbar />
        </div>
    </>
);

export default About;