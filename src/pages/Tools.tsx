import React, { useRef } from 'react';
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
    Terminal,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import BottomNavbar from '@/components/layout/BottomNavbar';
import { cn } from '@/lib/utils';

// --- FEATHERED VISUAL ART PER TOOL (THEME-AWARE) ---

const ToolVisual = ({ type, flip }: { type: string; flip: boolean }) => {
    const visuals: Record<string, React.ReactNode> = {
        smartphone: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="sg1" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="sg2" cx="70%" cy="70%" r="40%">
                        <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="220" fill="url(#sg1)" opacity="0.3" />
                <ellipse cx="260" cy="340" rx="120" ry="120" fill="url(#sg2)" opacity="0.3" />
                <rect x="110" y="80" width="180" height="340" rx="36" className="fill-card stroke-border" strokeWidth="1.5" />
                <rect x="122" y="115" width="156" height="260" rx="12" className="fill-muted/20" />
                <line x1="134" y1="145" x2="266" y2="145" className="stroke-primary/30" strokeWidth="1" />
                <line x1="134" y1="165" x2="230" y2="165" className="stroke-foreground/10" strokeWidth="1" />
                <rect x="134" y="225" width="44" height="44" rx="12" className="fill-primary/10 stroke-primary/30" strokeWidth="1" />
                <rect x="184" y="225" width="44" height="44" rx="12" className="fill-secondary/10 stroke-secondary/30" strokeWidth="1" />
                <circle cx="200" cy="440" r="14" fill="none" className="stroke-foreground/10" strokeWidth="1.5" />
                <circle cx="200" cy="95" r="4" className="fill-foreground/10" />
            </svg>
        ),
        database: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="dg1" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="170" ry="200" fill="url(#dg1)" opacity="0.3" />
                {[120, 190, 260, 330].map((y, i) => (
                    <g key={i}>
                        <ellipse cx="200" cy={y} rx="110" ry="28" className="fill-primary/10 stroke-primary/30" strokeWidth="1" />
                        <rect x="90" y={y} width="220" height="48" className="fill-primary/5" />
                        <ellipse cx="200" cy={y + 48} rx="110" ry="28" className="fill-primary/10 stroke-primary/15" strokeWidth="1" />
                    </g>
                ))}
            </svg>
        ),
        map: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="mg1" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="200" fill="url(#mg1)" opacity="0.3" />
                {[80, 130, 180, 230, 280, 330, 380].map((y, i) => (
                    <path key={i} d={`M 60 ${y} Q ${100 + i * 10} ${y - 10} 340 ${y + 5}`} className="stroke-primary/10" strokeWidth="1" fill="none" />
                ))}
                <circle cx="200" cy="240" r="60" className="fill-primary/5 stroke-primary/20" strokeWidth="1" />
                <circle cx="200" cy="240" r="20" className="fill-primary/20 stroke-primary/60" strokeWidth="1.5" />
                <circle cx="200" cy="240" r="5" className="fill-primary" />
            </svg>
        ),
        terminal: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="tg1" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="200" fill="url(#tg1)" opacity="0.3" />
                <rect x="80" y="100" width="240" height="300" rx="24" className="fill-card stroke-border shadow-2xl" strokeWidth="1" />
                <rect x="80" y="100" width="240" height="40" rx="24" className="fill-muted/30" />
                <circle cx="104" cy="120" r="6" className="fill-red-500/50" />
                <circle cx="124" cy="120" r="6" className="fill-amber-500/50" />
                <circle cx="144" cy="120" r="6" className="fill-primary/50" />
                {[170, 200, 230, 260, 290].map((y, i) => (
                    <rect key={i} x="100" y={y} width={100 + Math.random() * 100} height="10" rx="4" className="fill-foreground/10" />
                ))}
                <rect x="100" y="320" width="10" height="20" rx="2" className="fill-primary animate-pulse" />
            </svg>
        ),
        shield: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="shg1" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="200" fill="url(#shg1)" opacity="0.3" />
                <path d="M200 80 L320 120 L320 250 Q320 380 200 440 Q80 380 80 250 L80 120 Z" className="fill-primary/5 stroke-primary/30" strokeWidth="2" />
                <path d="M180 250 L200 270 L240 230" className="stroke-primary" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
        ),
        cpu: (
            <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <radialGradient id="cg1" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <ellipse cx="200" cy="250" rx="180" ry="200" fill="url(#cg1)" opacity="0.3" />
                <rect x="120" y="160" width="160" height="160" rx="32" className="fill-card stroke-primary/30" strokeWidth="2" />
                <rect x="150" y="190" width="100" height="100" rx="20" className="fill-primary/10 stroke-primary/20" />
                {[145, 175, 205, 235, 265].map((pos) => (<React.Fragment key={pos}>
                    <rect x={pos} y="150" width="10" height="15" rx="3" className="fill-primary/40" />
                    <rect x={pos} y="315" width="10" height="15" rx="3" className="fill-primary/40" />
                    <rect x="110" y={pos} width="15" height="10" rx="3" className="fill-primary/40" />
                    <rect x="275" y={pos} width="15" height="10" rx="3" className="fill-primary/40" />
                </React.Fragment>))}
            </svg>
        ),
    };
    return visuals[type] || visuals['smartphone'];
};

// --- FEATHERED VISUAL WRAPPER ---

const FeatheredVisual = ({ type, flip, scrollProgress }: { type: string; flip: boolean; scrollProgress: MotionValue<number> }) => {
    const scale = useTransform(scrollProgress, [0, 0.5, 1], [0.95, 1, 1.05]);
    const opacity = useTransform(scrollProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

    return (
        <motion.div style={{ scale, opacity }} className="relative w-full h-full">
            <div
                className="w-full h-full p-12"
                style={{
                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
                }}
            >
                <ToolVisual type={type} flip={flip} />
            </div>
        </motion.div>
    );
};

// --- FEATURE SECTION ---

const FeatureSection = ({
    title, tagline, description, icon: Icon, badge, status, downloadUrl, siteUrl, variant, index, visualType
}: any) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, margin: '-20% 0px -20% 0px' });
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

    const flip = index % 2 === 1;
    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

    return (
        <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden py-32">
            <motion.div
                style={{ opacity }}
                className={cn(
                    "container mx-auto px-6 grid md:grid-cols-2 gap-16 items-center",
                    flip && "md:flex-row-reverse"
                )}
            >
                {/* Visual */}
                <div className={cn("order-1 h-[400px] md:h-[600px] relative", flip && "md:order-2")}>
                    <FeatheredVisual type={visualType} flip={flip} scrollProgress={scrollYProgress} />
                </div>

                {/* Content */}
                <motion.div style={{ y }} className={cn("order-2 space-y-8", flip && "md:order-1")}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                        </div>
                        {badge && (
                            <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest text-[10px] py-1.5 px-4 font-black">
                                {badge}
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-4">
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">{tagline}</p>
                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-foreground">
                            {title}
                        </h2>
                    </div>

                    <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-xl">
                        {description}
                    </p>

                    <div className="pt-4">
                        {downloadUrl ? (
                            <a href={downloadUrl} download>
                                <Button className="h-16 px-10 rounded-2xl bg-primary text-primary-foreground font-black text-lg gap-4 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                                    Download APK <Download className="h-5 w-5" />
                                </Button>
                            </a>
                        ) : siteUrl ? (
                            <Button
                                onClick={() => window.open(siteUrl, '_blank')}
                                className="h-16 px-10 rounded-2xl bg-foreground text-background font-black text-lg gap-4 hover:scale-[1.02] transition-transform"
                            >
                                Launch Interface <ExternalLink className="h-5 w-5" />
                            </Button>
                        ) : (
                            <Button
                                disabled={status !== 'Available'}
                                className={cn(
                                    "h-16 px-10 rounded-2xl font-black text-lg gap-4 transition-all duration-500",
                                    status === 'Available' ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20" : "bg-muted text-muted-foreground/40"
                                )}
                            >
                                {status === 'Available' ? (
                                    <>Access Kit <ArrowRight className="h-5 w-5" /></>
                                ) : (
                                    <>Scheduled Deployment <Lock className="h-4 w-4" /></>
                                )}
                            </Button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
};

// --- SCROLL PROGRESS PILL ---

const ScrollProgressPill = ({ progress }: { progress: MotionValue<number> }) => {
    const scaleX = useSpring(progress, { stiffness: 100, damping: 30 });
    return (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-full bg-card/80 backdrop-blur-2xl border border-border shadow-2xl flex items-center gap-4">
            <span className="text-[10px] font-black tracking-widest text-primary">Sovereign Progress</span>
            <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary" style={{ scaleX, transformOrigin: 'left' }} />
            </div>
        </div>
    );
};

// --- MAIN TOOLS PAGE ---

const Tools = () => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.9]);

    const toolset = [
        {
            title: "Nasaka WEWE",
            tagline: "Mobile Intelligence",
            description: "A professional-grade mobile toolset for field monitoring, featuring geocoded IEBC checkpoints and offline legislative intelligence.",
            icon: Smartphone,
            badge: "Operational - Alpha",
            status: "Available",
            variant: "premium",
            downloadUrl: "/binaries/nasaka_universal.apk",
            visualType: "smartphone"
        },
        {
            title: "Master-Pack Q1",
            tagline: "Data Extraction",
            description: "The definitive legislative dataset for 2026. High-fidelity JSON and CSV exports for every bill, audit, and public expenditure.",
            icon: Database,
            badge: "Data Stream",
            status: "Available",
            variant: "default",
            siteUrl: "https://ceka.sovereign.ke/data",
            visualType: "database"
        },
        {
            title: "GeoPosters Engine",
            tagline: "Cartographic Evidence",
            description: "High-resolution visual evidence of regional governance and infrastructure status. Visualizing accountability through maps.",
            icon: MapIcon,
            badge: "Live Visualization",
            status: "Available",
            variant: "premium",
            visualType: "map"
        },
        {
            title: "Civic API",
            tagline: "Developer Infrastructure",
            description: "Programmable endpoints for Kenyan civic data. Zero-trust architecture designed for researchers and high-frequency monitoring.",
            icon: Terminal,
            badge: "Developer Tier",
            status: "Available",
            variant: "premium",
            visualType: "terminal"
        },
        {
            title: "The Vault",
            tagline: "Secure Submission",
            description: "Military-grade encrypted repository for sensitive investigative documents and collective sovereign memory.",
            icon: Shield,
            badge: "Secure Storage",
            status: "Available",
            variant: "default",
            siteUrl: "https://vault.ceka.sovereign.ke",
            visualType: "shield"
        },
        {
            title: "Sovereign AI",
            tagline: "Neural Constitution",
            description: "Constitutional LLM layers trained on the 2010 Constitution. Ensuring AI alignment with Kenyan sovereign values.",
            icon: Cpu,
            badge: "AI Evolution",
            status: "Upcoming",
            variant: "default",
            visualType: "cpu"
        }
    ];

    return (
        <div ref={containerRef} className="bg-background text-foreground transition-colors duration-500 overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
            <Navbar />
            <ScrollProgressPill progress={scrollYProgress} />

            {/* Sticky Hero Section */}
            <section className="h-screen sticky top-0 flex flex-col items-center justify-center p-6 text-center z-10">
                <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="max-w-6xl space-y-12">
                    <div className="space-y-4">
                        <Badge className="bg-primary/5 text-primary border-primary/20 rounded-full px-8 py-3 text-xs font-black tracking-[0.5em] uppercase">
                            Empowering The People
                        </Badge>
                        <h1 className="text-7xl md:text-[10rem] font-black tracking-tight leading-[0.8] mb-8">
                            POWER TO <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/30">THE PEOPLE.</span>
                        </h1>
                    </div>
                    <p className="text-2xl md:text-3xl text-muted-foreground/60 max-w-4xl mx-auto font-medium leading-relaxed">
                        Civic intelligence infrastructure engineered for sovereign accountability.
                    </p>
                    <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="pt-12 text-muted-foreground/20">
                        <ChevronDown className="h-12 w-12 mx-auto" />
                    </motion.div>
                </motion.div>

                {/* Ambient Glows */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-primary/20 dark:bg-primary/10 rounded-full blur-[200px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/10 dark:bg-secondary/5 rounded-full blur-[150px]" />
                </div>
            </section>

            {/* Feature Sections */}
            <div className="relative z-20 bg-background/50 backdrop-blur-sm">
                {toolset.map((tool, i) => (
                    <FeatureSection key={tool.title} index={i} {...tool} />
                ))}
            </div>

            {/* Final CTA */}
            <section className="min-h-screen flex items-center justify-center text-center px-6 relative z-30">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="max-w-4xl space-y-12"
                >
                    <h2 className="text-6xl md:text-9xl font-black tracking-tighter leading-none text-foreground">
                        READY TO <br />
                        <span className="italic text-primary underline decoration-primary/20 underline-offset-8">GOHAM?</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-muted-foreground/60 font-medium leading-relaxed">
                        Join the infrastructure of the next republic. Access the data, secure the record, and build the future.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 pt-6">
                        <Button className="h-20 px-12 rounded-[2.5rem] bg-primary text-primary-foreground font-black text-xl shadow-2xl shadow-primary/20 hover:scale-[1.05] transition-transform">
                            Request API Access
                        </Button>
                        <Button variant="outline" className="h-20 px-12 rounded-[2.5rem] border-primary/20 text-primary font-black text-xl hover:bg-primary/5">
                            Documentation
                        </Button>
                    </div>
                </motion.div>
            </section>

            <BottomNavbar />
        </div>
    );
};

export default Tools;
