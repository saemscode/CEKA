// Pieces.tsx (updated with realtime carousel deletion listener + deep-link slug routing)
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import Layout from '@/components/layout/Layout';
import MediaFeed from '@/components/resources/MediaFeed';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Instagram, Facebook, Twitter, Users, Eye, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

// Upscrolled Logo SVG Component
const UpscrolledLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg
        viewBox="0 0 256 256"
        className={className}
        fill="currentColor"
    >
        <g transform="translate(0,256) scale(0.1,-0.1)">
            <path d="M680 1786 c0 -128 4 -256 10 -285 30 -158 156 -294 318 -342 l42 -12
0 -299 0 -299 120 150 c76 95 128 152 142 155 13 3 79 7 148 9 111 3 131 6
182 31 84 40 152 106 190 184 31 63 33 72 33 177 0 99 -3 116 -27 168 -45 95
-150 184 -260 221 -16 5 -18 23 -18 191 l0 185 -440 0 -440 0 0 -234z" />
        </g>
    </svg>
);

// TikTok Icon Component
const TikTokIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

// CEKA Social Media Accounts - Full Data
const CEKA_SOCIALS = [
    {
        platform: 'Instagram',
        handle: '@civiceducationke',
        followers: '10,000+',
        reach: '1M+ avg monthly',
        url: 'https://instagram.com/civiceducationke',
        icon: Instagram,
        color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
        textColor: 'text-white'
    },
    {
        platform: 'TikTok',
        handle: '@civiceducationkenya',
        followers: '3,000+',
        reach: null,
        url: 'https://tiktok.com/@civiceducationkenya',
        icon: TikTokIcon,
        color: 'bg-black',
        textColor: 'text-white'
    },
    {
        platform: 'X (Twitter)',
        handle: '@CivicEdKenya',
        followers: '800+',
        reach: null,
        url: 'https://x.com/CivicEdKenya',
        icon: Twitter,
        color: 'bg-black',
        textColor: 'text-white'
    },
    {
        platform: 'Upscrolled',
        handle: '@civiceducationkenya',
        followers: '6',
        reach: null,
        url: 'https://share.upscrolled.com/en/user/538b4769-8e08-48cf-9f50-debeb4885ac1/',
        icon: UpscrolledLogo,
        color: 'bg-blue-600',
        textColor: 'text-white'
    },
    {
        platform: 'Facebook',
        handle: '@civiceducationkenya',
        followers: '40+',
        reach: null,
        url: 'https://facebook.com/civiceducationkenya',
        icon: Facebook,
        color: 'bg-blue-600',
        textColor: 'text-white'
    }
];

// Social Card Component
const SocialCard: React.FC<{ social: typeof CEKA_SOCIALS[0] }> = ({ social }) => {
    const IconComponent = social.icon;
    return (
        <a
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
        >
            <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className={`p-4 ${social.color} ${social.textColor}`}>
                    <div className="flex items-center justify-between mb-3">
                        <IconComponent className="w-6 h-6" />
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-sm">{social.platform}</p>
                        <p className="text-xs opacity-80">{social.handle}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Users className="w-3.5 h-3.5" />
                            <span>{social.followers} followers</span>
                        </div>
                        {social.reach && (
                            <div className="flex items-center gap-1.5 text-xs font-medium mt-1 opacity-80">
                                <Eye className="w-3.5 h-3.5" />
                                <span>{social.reach}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </a>
    );
};

// CEKA About Info for AI Context
const CEKA_ABOUT = {
    name: 'Civic Education Kenya (CEKA)',
    mission: 'Empowering Kenyans with civic knowledge to actively participate in governance and democracy.',
    focus_areas: [
        'Constitutional Rights',
        'Electoral Education',
        'Public Participation',
        'Governance & Accountability',
        'Youth Civic Engagement',
        'Legal Literacy'
    ],
    content_types: [
        'Educational Carousels',
        'Infographic Series',
        'PDF Explainers',
        'Video Content',
        'Live Sessions'
    ],
    tagline: 'Know Your Rights. Use Your Voice. Shape Your Future.'
};

const Pieces = () => {
    const navigate = useNavigate();
    const { slug } = useParams<{ slug?: string }>();
    const { theme } = useTheme();
    const [refreshKey, setRefreshKey] = useState(0); // used to force MediaFeed re-fetch

    // Listen for carousel deletion events from BulkUploadManager (same-tab, instant)
    useEffect(() => {
        const handleCarouselDeleted = (e: CustomEvent) => {
            console.log('Carousel deleted, refreshing feed', e.detail.carouselId);
            setRefreshKey(prev => prev + 1);
        };
        window.addEventListener('carousel-deleted', handleCarouselDeleted as EventListener);
        return () => window.removeEventListener('carousel-deleted', handleCarouselDeleted as EventListener);
    }, []);

    // Supabase Realtime: cross-session deletion for visitors in other tabs
    useEffect(() => {
        const channel = supabase
            .channel('pieces-page-deletions')
            .on(
                'postgres_changes' as any,
                { event: 'DELETE', schema: 'public', table: 'media_content' },
                () => { setRefreshKey(prev => prev + 1); }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleTagClick = (area: string) => {
        navigate(`/search?q=${encodeURIComponent(area)}`);
    };

    return (
        <Layout>
            <div className="container mx-auto py-12 px-4 shadow-pattern bg-pattern-grid/30 dark:bg-pattern-grid-dark/20">
                {/* Header - Redesigned with minimal social media aesthetic */}
                <header className="mb-16 max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-[40px] border border-white/20 dark:border-white/5 bg-white/60 dark:bg-black/40 backdrop-blur-2xl shadow-ios-high dark:shadow-ios-high-dark p-10 md:p-14"
                    >
                        {/* Decorative ambient glow */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-kenya-green/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-kenya-red/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 space-y-6">
                            {/* Capsule badge */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.05 }}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-kenya-green/10 dark:bg-kenya-green/20 border border-kenya-green/20 dark:border-kenya-green/30 text-kenya-green dark:text-kenya-green text-[11px] font-bold uppercase tracking-[0.15em]"
                            >
                                Social Media
                            </motion.div>

                            {/* Title */}
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="text-5xl md:text-7xl font-[1000] tracking-[-0.03em] leading-[0.95] text-kenya-black dark:text-white"
                            >
                                Our{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-kenya-green to-kenya-green/80 dark:from-kenya-green dark:to-kenya-green/60">
                                    Pieces
                                </span>
                            </motion.h1>

                            {/* Description */}
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="text-lg md:text-xl text-muted-foreground font-normal leading-relaxed max-w-2xl"
                            >
                                <span className="font-semibold text-foreground dark:text-white/90">{CEKA_ABOUT.tagline}</span>{" "} <br />
                                <br />Explore our collection of educational carousels, PDF series and visual explainers designed to simplify complex civic, social and legal concepts for everyday Kenyans.
                            </motion.p>
                        </div>
                    </motion.div>
                </header>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-[1fr_320px] gap-8">
                    {/* Main Feed Area */}
                    <div key={refreshKey}>
                        <MediaFeed targetSlug={slug || null} />
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-8">
                        {/* About Section */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="overflow-hidden border-kenya-green/20">
                                <CardContent className="p-8 relative">
                                    {/* Subtle decorative background element */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-kenya-green/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />

                                    <h3 className="text-xl font-black mb-4 text-kenya-black dark:text-white tracking-tighter uppercase">About CEKA</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-8 font-medium">
                                        {CEKA_ABOUT.mission}
                                    </p>
                                    <div className="space-y-4">
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-kenya-green/80 dark:text-kenya-green">
                                            Focus Areas
                                        </p>
                                        <div className="flex flex-wrap gap-2.5">
                                            {CEKA_ABOUT.focus_areas.map((area, index) => (
                                                <motion.button
                                                    key={area}
                                                    onClick={() => handleTagClick(area)}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{
                                                        delay: 0.1 + (index * 0.05),
                                                        type: "spring",
                                                        stiffness: 260,
                                                        damping: 20
                                                    }}
                                                    whileHover={{
                                                        y: -5,
                                                        scale: 1.05,
                                                        transition: { type: "spring", stiffness: 400, damping: 10 }
                                                    }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={cn(
                                                        "group relative overflow-hidden px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2",
                                                        "shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.1)]",
                                                        "border border-black/5 dark:border-white/10",
                                                        theme === 'light'
                                                            ? "bg-white/80 hover:bg-kenya-green hover:text-white text-kenya-black backdrop-blur-md"
                                                            : "bg-white/5 hover:bg-kenya-green/20 hover:text-kenya-green text-white/90 backdrop-blur-xl"
                                                    )}
                                                >
                                                    <span className="relative z-10">{area}</span>
                                                    <Search className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0" />

                                                    {/* Premium Glass Shine Effect */}
                                                    <div className="absolute inset-x-0 -top-full bottom-full bg-gradient-to-b from-white/20 to-transparent group-hover:top-0 group-hover:bottom-0 transition-all duration-500 pointer-events-none" />
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Social Links */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-black text-kenya-black dark:text-white tracking-tighter uppercase">Follow CEKA</h3>
                            <div className="space-y-3">
                                {CEKA_SOCIALS.map((social) => (
                                    <SocialCard key={social.platform} social={social} />
                                ))}
                            </div>
                        </motion.div>

                        {/* Content Types */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Card className="border-kenya-red/10 bg-gradient-to-br from-white to-kenya-red/[0.02] dark:from-kenya-black dark:to-kenya-red/[0.05] overflow-hidden">
                                <CardContent className="p-8 relative">
                                    {/* Animated background shape */}
                                    <motion.div
                                        className="absolute -bottom-10 -right-10 w-40 h-40 bg-kenya-red/5 rounded-full blur-3xl"
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.3, 0.5, 0.3]
                                        }}
                                        transition={{ duration: 8, repeat: Infinity }}
                                    />

                                    <h3 className="text-xl font-black mb-5 text-kenya-black dark:text-white tracking-tighter uppercase">Content We Create</h3>
                                    <ul className="space-y-3 relative z-10">
                                        {CEKA_ABOUT.content_types.map((type, idx) => (
                                            <motion.li
                                                key={type}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.6 + (idx * 0.1) }}
                                                className="flex items-center gap-3 text-sm font-semibold text-muted-foreground hover:text-kenya-red transition-colors duration-300"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-kenya-red shadow-[0_0_10px_rgba(220,38,38,0.4)]" />
                                                {type}
                                            </motion.li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </aside>
                </div>
            </div>
        </Layout>
    );
};

export default Pieces;