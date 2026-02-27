import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useSpring, MotionValue } from 'framer-motion';
import {
    Download,
    Smartphone,
    Database,
    Map as MapIcon,
    Zap,
    Shield,
    Lock,
    ArrowRight,
    Globe,
    Cpu,
    ExternalLink,
    Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import BottomNavbar from '@/components/layout/BottomNavbar';

// ─── Feathered Visual Art per Tool ───────────────────────────────────────────
const ToolVisual = ({ type, flip }: { type: string; flip: boolean }) => {
    const visuals: Record<string, React.ReactNode> = {
        smartphone: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="sg1" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="sg2" cx="70%" cy="70%" r="40%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="220" fill="url(#sg1)" opacity="0.5" />
                <ellipse cx="260" cy="340" rx="120" ry="120" fill="url(#sg2)" opacity="0.6" />
            </svg>
        ),
        database: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="dg1" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="170" ry="200" fill="url(#dg1)" opacity="0.5" />
            </svg>
        ),
        map: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="mg1" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#065f46" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="200" fill="url(#mg1)" opacity="0.4" />
            </svg>
        ),
        terminal: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="tg1" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="200" fill="url(#tg1)" opacity="0.35" />
            </svg>
        ),
        shield: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="shg1" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#14532d" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="200" fill="url(#shg1)" opacity="0.4" />
            </svg>
        ),
        cpu: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="cg1" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#581c87" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="200" fill="url(#cg1)" opacity="0.4" />
            </svg>
        ),
    };
    return visuals[type] || visuals['smartphone'];
};

// ─── Feather Mask Wrapper ─────────────────────────────────────────────────────
const FeatheredVisual = ({ type, flip, scrollProgress, image }: { type: string; flip: boolean; scrollProgress: MotionValue<number>; image: string }) => {
    const scale = useTransform(scrollProgress, [0, 0.5, 1], [0.95, 1, 1.05]);
    const rotate = useTransform(scrollProgress, [0, 1], [flip ? 2 : -2, flip ? -1 : 1]);
    const opacity = useTransform(scrollProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0.4]);

    return (
        <motion.div
            style={{ scale, rotate, opacity }}
            className="relative w-full h-full flex items-center justify-center"
        >
            {/* Feathered image container */}
            <div
                className="relative w-full aspect-[4/5] md:aspect-square max-w-2xl rounded-[48px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
                style={{
                    maskImage: flip
                        ? 'radial-gradient(ellipse 90% 90% at 30% 50%, black 50%, transparent 95%)'
                        : 'radial-gradient(ellipse 90% 90% at 70% 50%, black 50%, transparent 95%)',
                    WebkitMaskImage: flip
                        ? 'radial-gradient(ellipse 90% 90% at 30% 50%, black 50%, transparent 95%)'
                        : 'radial-gradient(ellipse 90% 90% at 70% 50%, black 50%, transparent 95%)',
                }}
            >
                <img
                    src={image}
                    className="w-full h-full object-cover"
                    alt=""
                />
                {/* Secondary gradient overlay for deep integration */}
                <div className={`absolute inset-0 bg-gradient-to-${flip ? 'r' : 'l'} from-[#050505] via-transparent to-transparent opacity-60`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-40" />
            </div>

            {/* Background SVG glow – kept for atmospheric depth */}
            <div className="absolute inset-0 -z-10 opacity-30 blur-[100px]">
                <ToolVisual type={type} flip={flip} />
            </div>
        </motion.div>
    );
};

// ─── Scroll Feature Section ───────────────────────────────────────────────────
const FeatureSection = ({
    title, description, icon: Icon, badge, status, downloadUrl, siteUrl, variant, index,
    visualType, tagline, image
}: any) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, margin: '-20% 0px -20% 0px' });
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

    const flip = index % 2 === 1;

    const textX = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [flip ? 60 : -60, 0, 0, flip ? -30 : 30]);
    const textOpacity = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [0, 1, 1, 0]);

    // Parallax background bleed
    const bgY = useTransform(scrollYProgress, [0, 1], [-100, 100]);
    const bgOpacity = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0, 0.15, 0.15, 0]);

    const accentColors: Record<string, string> = {
        smartphone: '#3b82f6',
        database: '#8b5cf6',
        map: '#10b981',
        terminal: '#f59e0b',
        shield: '#22c55e',
        cpu: '#a855f7',
    };

    const accent = accentColors[visualType] || '#3b82f6';

    return (
        <section
            ref={ref}
            className="relative min-h-[120vh] flex items-center overflow-hidden"
        >
            {/* Background Image Bleed - Parallax */}
            <motion.div
                style={{ y: bgY, opacity: bgOpacity }}
                className="absolute inset-x-0 -inset-y-40 z-0 pointer-events-none"
            >
                <div
                    className="w-full h-full bg-cover bg-center opacity-30 grayscale saturate-50"
                    style={{ backgroundImage: `url(${image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
                <div className="absolute inset-0 bg-[#050505]/60" />
            </motion.div>

            {/* Hairline divider */}
            <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className={`relative z-10 w-full max-w-7xl mx-auto px-8 md:px-16 grid md:grid-cols-2 items-center gap-16 ${flip ? 'direction-rtl' : ''}`}>

                {/* Text Column */}
                <motion.div
                    style={{ x: textX, opacity: textOpacity }}
                    className={`py-24 ${flip ? 'md:order-2 md:pl-12' : 'md:order-1 md:pr-12'}`}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="flex items-center gap-3 mb-6"
                    >
                        <div
                            className="p-2.5 rounded-xl"
                            style={{ background: `${accent}22`, boxShadow: `0 0 20px ${accent}30` }}
                        >
                            <Icon strokeWidth={1.5} className="h-5 w-5" style={{ color: accent }} />
                        </div>
                        {badge && (
                            <span
                                className="text-[10px] font-black tracking-[0.25em] uppercase px-3 py-1.5 rounded-full border"
                                style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}
                            >
                                {badge}
                            </span>
                        )}
                    </motion.div>

                    {tagline && (
                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                            transition={{ duration: 0.7, delay: 0.15 }}
                            className="text-sm font-bold tracking-[0.15em] uppercase mb-3 text-white/50"
                        >
                            {tagline}
                        </motion.p>
                    )}

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.9, delay: 0.2 }}
                        className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-8 text-white"
                    >
                        {title}
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.9, delay: 0.3 }}
                        className="text-lg md:text-xl text-white/40 leading-relaxed mb-12 max-w-lg font-medium"
                    >
                        {description}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                    >
                        {downloadUrl ? (
                            <a href={downloadUrl} download={title.toLowerCase().replace(/\s+/g, '_') + '.apk'}>
                                <button
                                    className="group flex items-center gap-3 h-14 px-8 rounded-2xl font-bold text-base transition-all duration-500 bg-white text-black hover:bg-white/90"
                                    style={{ boxShadow: '0 20px 40px rgba(255,255,255,0.1)' }}
                                >
                                    Download APK
                                    <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                                </button>
                            </a>
                        ) : siteUrl ? (
                            <button
                                className="group flex items-center gap-3 h-14 px-8 rounded-2xl font-bold text-base border border-white/10 bg-white/5 text-white/80 hover:bg-white hover:text-black transition-all duration-500"
                                onClick={() => window.open(siteUrl, '_blank')}
                            >
                                Launch Site
                                <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </button>
                        ) : status === 'Available' ? (
                            <button
                                className="group flex items-center gap-3 h-14 px-8 rounded-2xl font-bold text-base transition-all duration-500 bg-white text-black hover:bg-white/90"
                                onClick={() => { window.location.href = variant === 'premium' ? '/settings' : '/tools'; }}
                            >
                                {variant === 'premium' ? 'Get API Key' : 'View Source'}
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </button>
                        ) : (
                            <button
                                disabled
                                className="flex items-center gap-3 h-14 px-8 rounded-2xl font-bold text-base border border-white/5 bg-white/5 text-white/20 cursor-not-allowed"
                            >
                                In Development
                                <Lock className="h-4 w-4 opacity-40" />
                            </button>
                        )}
                    </motion.div>
                </motion.div>

                {/* Visual Column - Integration of Live Images with Feathered Masks */}
                <div
                    className={`relative min-h-[60vh] md:min-h-[80vh] flex items-center justify-center ${flip ? 'md:order-1' : 'md:order-2'}`}
                >
                    <FeatheredVisual type={visualType} flip={flip} scrollProgress={scrollYProgress} image={image} />
                </div>
            </div>
        </section>
    );
};

// ─── Scroll Progress Pill ─────────────────────────────────────────────────────
const ScrollProgressPill = ({ progress }: { progress: MotionValue<number> }) => {
    const scaleX = useSpring(progress, { stiffness: 200, damping: 40 });

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10">
            <span className="text-[10px] text-white/30 font-bold tracking-widest uppercase">CEKA</span>
            <div className="w-24 h-[2px] bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-white/60 rounded-full" style={{ scaleX, transformOrigin: 'left' }} />
            </div>
            <span className="text-[10px] text-white/30 font-bold tracking-widest uppercase">HAM</span>
        </div>
    );
};

// ─── Feature Data ─────────────────────────────────────────────────────────────
const FEATURES = [
    {
        title: "Nasaka WEWE",
        tagline: "Mobile Intelligence",
        description: "Professional-grade mobile experience for civic monitoring. Seeded with geocoded IEBC office locations and offline legislative data.",
        icon: Smartphone,
        badge: "Alpha",
        status: "Available",
        variant: "premium",
        downloadUrl: "/binaries/nasaka_universal.apk",
        visualType: "smartphone",
        image: "/images/nasaka.png"
    },
    {
        title: "Master-Pack Q1",
        tagline: "Legislative Intelligence",
        description: "Quarterly consolidated legislative intelligence. JSON, CSV, and Markdown exports for all bills spanning 2024–2027.",
        icon: Database,
        badge: "2026.Q1",
        status: "Available",
        siteUrl: "https://ceka.sovereign.ke/data",
        visualType: "database",
        image: "/images/masterpack.png"
    },
    {
        title: "GeoPosters Engine",
        tagline: "Visual Evidence Layer",
        description: "High-resolution visual evidence of regional governance, healthcare infrastructure, and IEBC office proximity across Kenya.",
        icon: MapIcon,
        badge: "Live",
        status: "Available",
        variant: "premium",
        visualType: "map",
        image: "/images/geoposters.png"
    },
    {
        title: "Civic API",
        tagline: "Data Infrastructure",
        description: "Zero-trust legislative and audit streams. Built for journalists, developers, and researchers who demand sovereign data.",
        icon: Terminal,
        badge: "v1 HAM",
        status: "Available",
        variant: "premium",
        visualType: "terminal",
        image: "/images/api.png"
    },
    {
        title: "The Vault",
        tagline: "Secure Submissions",
        description: "Encrypted submission and storage for investigative documents and whistleblower evidence. Built on zero-knowledge architecture.",
        icon: Shield,
        badge: "Secure",
        status: "Available",
        siteUrl: "https://vault.ceka.sovereign.ke",
        visualType: "shield",
        image: "/images/vault.png"
    },
    {
        title: "Sovereign AI",
        tagline: "Constitutional Alignment",
        description: "Pre-trained weights and context for Kenyan constitutional alignment AI models. The future of accountable machine intelligence.",
        icon: Cpu,
        badge: "Restricted",
        status: "Upcoming",
        visualType: "cpu",
        image: "/images/ai.png"
    },
];

// ─── Main Tools Component ─────────────────────────────────────────────────────
const Tools = () => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });

    const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.85]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black overflow-x-hidden">
            <Navbar />
            <ScrollProgressPill progress={scrollYProgress} />

            {/* ── Hero Section ──────────────────────────────────────────── */}
            <section className="relative h-screen flex flex-col items-center justify-center px-6 overflow-hidden sticky top-0">
                <motion.div
                    style={{ scale: heroScale, opacity: heroOpacity }}
                    className="relative z-10 text-center max-w-5xl"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: [0.21, 0.47, 0.32, 0.98] }}
                    >
                        <h1 className="text-7xl md:text-[clamp(5rem,14vw,12rem)] font-black tracking-tighter leading-[0.82] mb-12">
                            POWER TO <br />
                            THE PEOPLE.
                        </h1>
                        <p className="text-xl md:text-3xl text-white/40 max-w-3xl mx-auto font-medium leading-relaxed tracking-[-0.01em]">
                            Civic intelligence infrastructure engineered for sovereign accountability.
                        </p>
                    </motion.div>
                </motion.div>
            </section>

            {/* ── Feature Sections ──────────────────────────────────────── */}
            <div className="relative z-10">
                {FEATURES.map((feature, index) => (
                    <FeatureSection
                        key={feature.title}
                        index={index}
                        {...feature}
                    />
                ))}
            </div>

            {/* ── Call To Action ────────────────────────────────────────── */}
            <section className="relative min-h-screen flex items-center justify-center px-8 py-40 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-12">
                        Build the Future.
                    </h2>
                    <Button
                        size="lg"
                        className="h-16 px-14 rounded-full bg-white text-black hover:bg-white/90 text-lg font-bold"
                        onClick={() => { window.location.href = '/settings'; }}
                    >
                        Get API Key <Zap className="ml-3 h-5 w-5 fill-current" />
                    </Button>
                </motion.div>
            </section>

            <BottomNavbar />
        </div>
    );
};

export default Tools;
