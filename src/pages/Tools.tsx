import React, { useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
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
    Terminal,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import BottomNavbar from '@/components/layout/BottomNavbar';
import { cn } from '@/lib/utils';

// --- CUSTOM RELEVANT VISUALS (FEATHERED & THEME-AWARE) ---

const NasakaVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-64 h-64 bg-primary/20 rounded-full blur-3xl"
        />
        <div className="relative z-10 w-48 h-80 bg-zinc-900 dark:bg-slate-900 rounded-[3.5rem] border-8 border-zinc-800 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-zinc-800 dark:bg-slate-800 rounded-b-xl" />
            <div className="p-4 pt-10">
                <div className="w-full h-32 bg-primary/10 rounded-2xl mb-4 flex items-center justify-center">
                    <MapIcon className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-2 bg-zinc-800 dark:bg-slate-700 rounded-full w-full" style={{ opacity: 1 - i * 0.2 }} />
                    ))}
                </div>
            </div>
            <motion.div
                animate={{ y: [0, 100, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
            />
        </div>
    </div>
);

const MasterPackVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <div className="grid grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0.1, scale: 0.8 }}
                    animate={{
                        opacity: [0.1, 0.4, 0.1],
                        scale: [0.8, 1, 0.8],
                        backgroundColor: i % 2 === 0 ? "hsl(var(--primary) / 0.1)" : "hsl(var(--foreground) / 0.03)"
                    }}
                    transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
                    className="w-16 h-16 rounded-xl border border-border/20 flex items-center justify-center"
                >
                    <Database className="h-6 w-6 text-foreground/20" />
                </motion.div>
            ))}
        </div>
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute w-80 h-80 border border-primary/20 rounded-full border-dashed"
        />
    </div>
);

const GeoPostersVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        {[...Array(3)].map((_, i) => (
            <motion.div
                key={i}
                style={{ zIndex: 10 - i }}
                animate={{
                    y: [0, -20 * i, 0],
                    rotateX: [45, 45, 45],
                    rotateZ: [-10, -10, -10]
                }}
                transition={{ duration: 4, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-64 h-48 bg-background/40 backdrop-blur-xl border border-border/30 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                <Globe className="h-20 w-20 text-foreground/10" />
                <div className="absolute bottom-4 left-4 right-4 h-2 bg-muted/20 rounded-full overflow-hidden">
                    <motion.div
                        animate={{ width: ["0%", "100%", "0%"] }}
                        transition={{ duration: 3, delay: i, repeat: Infinity }}
                        className="h-full bg-primary"
                    />
                </div>
            </motion.div>
        ))}
    </div>
);

const CivicApiVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-zinc-950 dark:bg-black rounded-2xl border border-border/40 shadow-2xl overflow-hidden font-mono text-[10px] leading-tight">
            <div className="bg-muted/30 p-2 flex gap-1.5 px-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            </div>
            <div className="p-4 space-y-2">
                <div className="text-primary">GET /v1/intelligence/bills</div>
                <div className="text-muted-foreground/40">{`{`}</div>
                <div className="pl-4 text-muted-foreground/60">
                    <div>"status": "success",</div>
                    <div>"data": [</div>
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="pl-4"
                    >
                        {`{ "id": "bill_0xFE", "title": "IEBC Audit" }`}
                    </motion.div>
                    <div>]</div>
                </div>
                <div className="text-muted-foreground/40">{`}`}</div>
                <motion.div
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-2 h-4 bg-primary inline-block ml-1"
                />
            </div>
        </div>
    </div>
);

const VaultVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute w-64 h-64 border-2 border-primary/20 rounded-full border-dashed"
        />
        <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute w-48 h-48 border border-border/10 rounded-full border-dashed"
        />
        <div className="relative z-10 p-10 bg-zinc-900 dark:bg-slate-900 border border-border/20 rounded-[3rem] shadow-2xl group-hover:scale-110 transition-transform duration-500">
            <Shield className="h-24 w-24 text-primary" strokeWidth={1} />
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
                <Lock className="h-8 w-8 text-foreground/40" />
            </motion.div>
        </div>
    </div>
);

const SovereignAIVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <svg className="w-64 h-64 overflow-visible">
            <defs>
                <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </radialGradient>
            </defs>
            {[...Array(6)].map((_, i) => {
                const angle = (i / 6) * Math.PI * 2;
                const x = 32 + Math.cos(angle) * 80;
                const y = 32 + Math.sin(angle) * 80;
                return (
                    <React.Fragment key={i}>
                        <motion.line
                            x1="32" y1="32" x2={x} y2={y}
                            stroke="hsl(var(--primary) / 0.1)"
                            strokeWidth="1"
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                        />
                        <motion.circle
                            cx={x} cy={y} r="4"
                            fill="url(#nodeGrad)"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
                        />
                    </React.Fragment>
                );
            })}
            <motion.circle
                cx="32" cy="32" r="8"
                fill="#3B82F6"
                animate={{ filter: ["blur(4px)", "blur(12px)", "blur(4px)"] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </svg>
    </div>
);

// --- FEATURE SECTION COMPONENT ---

const FeatureSection = ({
    title,
    description,
    badge,
    status,
    downloadUrl,
    siteUrl,
    variant,
    visual: Visual,
    index
}: any) => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.95, 1, 1, 0.95]);

    const isEven = index % 2 === 0;

    return (
        <section ref={containerRef} className="relative min-h-[80vh] w-full flex items-center justify-center py-20 overflow-hidden">
            <motion.div
                style={{ opacity, scale }}
                className={cn(
                    "container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center",
                    !isEven && "lg:flex-row-reverse"
                )}
            >
                {/* Content */}
                <div className={cn("order-2", !isEven ? "lg:order-2" : "lg:order-1")}>
                    <motion.div style={{ y }}>
                        <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 rounded-full px-4 py-1 text-[10px] font-bold tracking-widest uppercase">
                            {badge}
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter leading-tight text-foreground">
                            {title}
                        </h2>
                        <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed mb-12">
                            {description}
                        </p>

                        <div className="flex flex-wrap gap-4">
                            {downloadUrl ? (
                                <a href={downloadUrl} download={title.toLowerCase().replace(/\s+/g, '_') + '.apk'}>
                                    <Button className="h-16 px-10 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-500 font-bold text-lg group shadow-xl shadow-primary/20">
                                        Download APK <Download className="ml-2 h-5 w-5 group-hover:translate-y-0.5 transition-transform" />
                                    </Button>
                                </a>
                            ) : siteUrl ? (
                                <Button
                                    className="h-16 px-10 rounded-2xl bg-card text-foreground hover:bg-accent border border-border shadow-sm transition-all duration-500 font-bold text-lg group"
                                    onClick={() => window.open(siteUrl, '_blank')}
                                >
                                    Launch Interface <ExternalLink className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                                </Button>
                            ) : (
                                <Button
                                    className={cn(
                                        "h-16 px-10 rounded-2xl font-bold text-lg transition-all duration-500",
                                        status === 'Available'
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20"
                                            : "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                                    )}
                                    disabled={status !== 'Available'}
                                    onClick={() => status === 'Available' && (window.location.href = variant === 'premium' ? '/settings' : '/tools')}
                                >
                                    {status === 'Available' ? (
                                        <span className="flex items-center group">
                                            {variant === 'premium' ? 'Get Intelligence Access' : 'View Source'}
                                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    ) : (
                                        <span className="flex items-center">
                                            Phase Deployment Pending <Lock className="ml-2 h-4 w-4 opacity-40" />
                                        </span>
                                    )}
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Visual */}
                <div className={cn("order-1 h-[400px] lg:h-[500px] relative rounded-[3rem] group overflow-hidden bg-muted/20 border border-border/40 hover:border-primary/20 transition-colors", !isEven ? "lg:order-1" : "lg:order-2")}>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
                    <Visual />
                </div>
            </motion.div>
        </section>
    );
};

// --- MAIN PAGE ---

const Tools = () => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Hero Transforms
    const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);
    const heroY = useTransform(scrollYProgress, [0, 0.1], [0, -40]);

    const toolset = [
        {
            title: "Nasaka WEWE",
            description: "A professional-grade mobile toolset for field monitoring, featuring geocoded IEBC checkpoints and offline legislative intelligence.",
            badge: "Operational - Alpha",
            status: "Available",
            variant: "premium",
            downloadUrl: "/binaries/nasaka_universal.apk",
            visual: NasakaVisual
        },
        {
            title: "Master-Pack Q1",
            description: "The definitive legislative dataset for 2026. High-fidelity JSON and CSV exports for every bill, audit, and public expenditure.",
            badge: "Data Stream",
            status: "Available",
            variant: "default",
            siteUrl: "https://ceka.sovereign.ke/data",
            visual: MasterPackVisual
        },
        {
            title: "GeoPosters Engine",
            description: "High-resolution cartographic evidence of regional governance and infrastructure status. Visualizing accountability through maps.",
            badge: "Live Visualization",
            status: "Available",
            variant: "premium",
            visual: GeoPostersVisual
        },
        {
            title: "Civic API",
            description: "Programmable endpoints for Kenyan civic data. Zero-trust architecture designed for researchers and high-frequency monitoring.",
            badge: "Developer Tier",
            status: "Available",
            variant: "premium",
            visual: CivicApiVisual
        },
        {
            title: "The Vault",
            description: "Military-grade encrypted repository for sensitive investigative documents and collective sovereign memory.",
            badge: "Secure Storage",
            status: "Available",
            variant: "default",
            siteUrl: "https://vault.ceka.sovereign.ke",
            visual: VaultVisual
        },
        {
            title: "Sovereign AI",
            description: "Constitutional LLM layers trained on the 2010 Constitution. Ensuring AI alignment with Kenyan sovereign values.",
            badge: "AI Evolution",
            status: "Upcoming",
            variant: "default",
            visual: SovereignAIVisual
        }
    ];

    return (
        <div ref={containerRef} className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans overflow-x-hidden transition-colors duration-500">
            <Navbar />

            {/* Scroll Progress Indicator */}
            <div className="fixed top-32 right-8 z-[120] hidden lg:flex flex-col gap-4">
                {toolset.map((tool, i) => {
                    const step = 0.1 + (i / toolset.length) * 0.8;
                    return (
                        <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 relative cursor-pointer hover:bg-primary/50 transition-colors"
                            onClick={() => {
                                const section = document.querySelectorAll('section')[i + 1];
                                section?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            style={{
                                backgroundColor: useTransform(smoothProgress, [step - 0.05, step, step + 0.05], ["hsl(var(--foreground) / 0.1)", "hsl(var(--primary) / 1)", "hsl(var(--foreground) / 0.1)"])
                            }}
                        >
                            <motion.div
                                className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black tracking-widest uppercase opacity-0 whitespace-nowrap text-foreground/60"
                                style={{
                                    opacity: useTransform(smoothProgress, [step - 0.05, step, step + 0.05], [0, 1, 0]),
                                    x: useTransform(smoothProgress, [step - 0.05, step, step + 0.05], [-10, 0, -10])
                                }}
                            >
                                {tool.title}
                            </motion.div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Sticky Hero */}
            <section className="relative h-[90vh] flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
                    className="z-10"
                >
                    <Badge className="mb-8 bg-primary/5 text-primary border-primary/20 rounded-full px-6 py-2 text-xs font-bold tracking-[0.3em] uppercase">
                        Unified Intelligence Infrastructure
                    </Badge>
                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-10 text-foreground">
                        CEKA <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-foreground">TOOLSET.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed mb-16">
                        A sovereign infrastructure for accountability, investigative reporting, and data-driven governance.
                    </p>
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex flex-col items-center gap-4 text-muted-foreground/40"
                    >
                        <span className="text-[10px] uppercase tracking-[0.5em] font-black">Begin Intelligence Journey</span>
                        <ChevronDown className="h-6 w-6" />
                    </motion.div>
                </motion.div>

                {/* Ambient Background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 dark:bg-primary/20 rounded-full blur-[160px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-[140px] animate-pulse" />
                </div>
            </section>

            {/* Vertical Features */}
            <div className="relative z-10">
                {toolset.map((tool, i) => (
                    <FeatureSection key={i} index={i} {...tool} />
                ))}
            </div>

            {/* Apple-style Final CTA */}
            <section className="relative min-h-screen flex items-center justify-center py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="container mx-auto px-6 text-center relative z-10"
                >
                    <h2 className="text-5xl md:text-8xl font-black mb-10 leading-[0.9] tracking-tighter text-foreground">
                        READY TO <br />
                        <span className="text-primary italic">BUILD THE FUTURE?</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed mb-16">
                        The future of Kenya is built on reliable data and unyielding transparency. Join the infrastructure movement today.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6">
                        <Button
                            size="lg"
                            className="h-20 px-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-500 font-bold text-xl shadow-2xl shadow-primary/20"
                            onClick={() => window.location.href = '/settings'}
                        >
                            Request Access
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-20 px-12 rounded-2xl border-border bg-card hover:bg-accent text-foreground transition-all duration-500 font-bold text-xl shadow-sm"
                            onClick={() => window.open('https://github.com/CEKA-HAM', '_blank')}
                        >
                            GitHub Explorer
                        </Button>
                    </div>
                </motion.div>
            </section>

            <BottomNavbar />
        </div>
    );
};

export default Tools;
