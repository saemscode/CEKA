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

// --- CUSTOM RELEVANT VISUALS (FEATHERED) ---

const NasakaVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-64 h-64 bg-primary/20 rounded-full blur-3xl"
        />
        <div className="relative z-10 w-48 h-80 bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-slate-800 rounded-b-xl" />
            <div className="p-4 pt-10">
                <div className="w-full h-32 bg-primary/10 rounded-2xl mb-4 flex items-center justify-center">
                    <MapIcon className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-2 bg-slate-800 rounded-full w-full" style={{ opacity: 1 - i * 0.2 }} />
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
                        opacity: [0.1, 0.5, 0.1],
                        scale: [0.8, 1, 0.8],
                        backgroundColor: i % 2 === 0 ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.05)"
                    }}
                    transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
                    className="w-16 h-16 rounded-xl border border-white/5 flex items-center justify-center"
                >
                    <Database className="h-6 w-6 text-white/20" />
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
                className="absolute w-64 h-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
                <Globe className="h-20 w-20 text-white/10" />
                <div className="absolute bottom-4 left-4 right-4 h-2 bg-white/5 rounded-full overflow-hidden">
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
        <div className="w-full max-w-md bg-[#0A0A0A] rounded-2xl border border-white/10 shadow-2xl overflow-hidden font-mono text-[10px] leading-tight">
            <div className="bg-white/5 p-2 flex gap-1.5 px-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            </div>
            <div className="p-4 space-y-2">
                <div className="text-primary">GET /v1/intelligence/bills</div>
                <div className="text-white/40">{`{`}</div>
                <div className="pl-4 text-white/60">
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
                <div className="text-white/40">{`}`}</div>
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
            className="absolute w-48 h-48 border border-white/10 rounded-full border-dashed"
        />
        <div className="relative z-10 p-10 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl group-hover:scale-110 transition-transform duration-500">
            <Shield className="h-24 w-24 text-primary" strokeWidth={1} />
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
                <Lock className="h-8 w-8 text-white/40" />
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
                            stroke="rgba(59, 130, 246, 0.2)"
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

    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.8, 1, 1, 0.8]);

    const isEven = index % 2 === 0;

    return (
        <section ref={containerRef} className="relative min-h-screen w-full flex items-center justify-center py-20 overflow-hidden">
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
                        <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter leading-tight">
                            {title}
                        </h2>
                        <p className="text-xl md:text-2xl text-white/50 font-medium leading-relaxed mb-12">
                            {description}
                        </p>

                        <div className="flex flex-wrap gap-4">
                            {downloadUrl ? (
                                <a href={downloadUrl} download={title.toLowerCase().replace(/\s+/g, '_') + '.apk'}>
                                    <Button className="h-16 px-10 rounded-full bg-white text-black hover:bg-primary hover:text-white transition-all duration-500 font-bold text-lg group">
                                        Download APK <Download className="ml-2 h-5 w-5 group-hover:translate-y-0.5 transition-transform" />
                                    </Button>
                                </a>
                            ) : siteUrl ? (
                                <Button
                                    className="h-16 px-10 rounded-full bg-white/5 text-white hover:bg-white hover:text-black border border-white/10 transition-all duration-500 font-bold text-lg group"
                                    onClick={() => window.open(siteUrl, '_blank')}
                                >
                                    Launch Interface <ExternalLink className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                                </Button>
                            ) : (
                                <Button
                                    className={cn(
                                        "h-16 px-10 rounded-full font-bold text-lg transition-all duration-500",
                                        status === 'Available'
                                            ? "bg-white text-black hover:bg-primary hover:text-white"
                                            : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
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
                <div className={cn("order-1 h-[400px] lg:h-[600px] relative rounded-[4rem] group overflow-hidden", !isEven ? "lg:order-1" : "lg:order-2")}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
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
    const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.9]);
    const heroY = useTransform(scrollYProgress, [0, 0.1], [0, -100]);

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
        <div ref={containerRef} className="bg-[#050505] text-white selection:bg-primary selection:text-white font-sans overflow-x-hidden">
            <Navbar />

            {/* Scroll Progress Indicator */}
            <div className="fixed top-24 right-8 z-[120] hidden lg:flex flex-col gap-3">
                {toolset.map((tool, i) => {
                    const step = 0.1 + (i / toolset.length) * 0.8;
                    return (
                        <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-white/20 relative"
                            style={{
                                backgroundColor: useTransform(smoothProgress, [step - 0.05, step, step + 0.05], ["rgba(255,255,255,0.2)", "rgba(59,130,246,1)", "rgba(255,255,255,0.2)"])
                            }}
                        >
                            <motion.div
                                className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black tracking-widest uppercase opacity-0 whitespace-nowrap"
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
            <section className="relative h-screen flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
                    className="z-10"
                >
                    <Badge className="mb-12 bg-white/5 text-white/40 border-none rounded-full px-6 py-2 text-xs font-bold tracking-[0.3em] uppercase">
                        Empowering Civic Intelligence
                    </Badge>
                    <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none mb-10">
                        CEKA <span className="text-primary">TOOLSET.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-white/30 max-w-2xl mx-auto font-medium leading-relaxed mb-16">
                        A sovereign infrastructure for accountability, investigative reporting, and data-driven governance.
                    </p>
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex flex-col items-center gap-4 text-white/20"
                    >
                        <span className="text-[10px] uppercase tracking-[0.5em] font-black">Scroll to Begin</span>
                        <ChevronDown className="h-6 w-6" />
                    </motion.div>
                </motion.div>

                {/* Ambient Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[160px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[140px] animate-pulse" />
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
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="container mx-auto px-6 text-center relative z-10"
                >
                    <h2 className="text-5xl md:text-8xl font-black mb-10 leading-[0.9] tracking-tighter">
                        READY TO <br />
                        <span className="text-primary italic">GO HAM?</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-white/50 max-w-3xl mx-auto font-medium leading-relaxed mb-16">
                        The future of Kenya is built on reliable data and unyielding transparency. Join the infrastructure movement today.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6">
                        <Button
                            size="lg"
                            className="h-20 px-12 rounded-full bg-primary text-white hover:bg-white hover:text-black transition-all duration-500 font-bold text-xl shadow-2xl shadow-primary/20"
                            onClick={() => window.location.href = '/settings'}
                        >
                            Request Developer Access
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-20 px-12 rounded-full border-white/20 bg-white/5 hover:bg-white hover:text-black transition-all duration-500 font-bold text-xl"
                            onClick={() => window.open('https://github.com/CEKA-HAM', '_blank')}
                        >
                            Github Explorer
                        </Button>
                    </div>
                </motion.div>
            </section>

            <BottomNavbar />
        </div>
    );
};

export default Tools;


