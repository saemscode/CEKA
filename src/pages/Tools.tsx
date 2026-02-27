import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
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

const FeatureCard = ({ title, description, icon: Icon, badge, status, downloadUrl, siteUrl, variant = "default", index }: any) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="group relative"
        >
            <div className="relative h-full p-8 rounded-[40px] bg-white/5 dark:bg-white/[0.03] backdrop-blur-2xl border border-white/10 dark:border-white/5 overflow-hidden transition-all duration-500 hover:bg-white/[0.08] hover:border-primary/60 hover:shadow-[0_40px_80px_rgba(59,130,246,0.2)] group-hover:-translate-y-3">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]" />

                <div className="flex justify-between items-start mb-8">
                    <div className={`p-4 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${variant === 'premium' ? 'bg-primary/30 text-primary shadow-[0_0_25px_rgba(59,130,246,0.3)]' : 'bg-white/10 text-white/70'}`}>
                        <Icon strokeWidth={1.5} className="h-8 w-8" />
                    </div>
                    {badge && (
                        <Badge className="bg-primary/20 text-primary border border-primary/30 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase animate-pulse">
                            {badge}
                        </Badge>
                    )}
                </div>

                <h3 className="text-2xl font-bold mb-4 tracking-tight group-hover:text-primary transition-colors duration-300">
                    {title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-8 text-lg font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                    {description}
                </p>

                <div className="mt-auto">
                    {downloadUrl ? (
                        <a href={downloadUrl} download={title.toLowerCase().replace(/\s+/g, '_') + '.apk'}>
                            <Button
                                className="w-full h-14 rounded-2xl font-bold transition-all duration-500 bg-white text-black hover:bg-primary hover:text-white hover:shadow-[0_10px_30px_rgba(59,130,246,0.3)]"
                            >
                                <span className="flex items-center">
                                    Download APK <Download className="ml-2 h-5 w-5" />
                                </span>
                            </Button>
                        </a>
                    ) : siteUrl ? (
                        <Button
                            className="w-full h-14 rounded-2xl font-bold transition-all duration-500 bg-white/5 text-white/70 hover:bg-white hover:text-black border border-white/10"
                            onClick={() => window.open(siteUrl, '_blank')}
                        >
                            <span className="flex items-center">
                                Launch Site <ExternalLink className="ml-2 h-5 w-5" />
                            </span>
                        </Button>
                    ) : (
                        <Button
                            className={`w-full h-14 rounded-2xl font-bold transition-all duration-300 ${status === 'Available'
                                ? 'bg-white text-black hover:bg-primary hover:text-white'
                                : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                }`}
                            disabled={status !== 'Available'}
                            onClick={() => {
                                if (status === 'Available') {
                                    window.location.href = variant === 'premium' ? '/settings' : '/tools';
                                }
                            }}
                        >
                            {status === 'Available' ? (
                                <span className="flex items-center">
                                    {variant === 'premium' ? 'Get API Key' : 'View Source'} <ArrowRight className="ml-2 h-5 w-5" />
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    In Development <Lock className="ml-2 h-4 w-4 opacity-40" />
                                </span>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const Tools = () => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const headerY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);
    const headerOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-white">
            <Navbar />

            {/* Hero Section */}
            <section className="relative h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
                <motion.div
                    style={{ y: headerY, opacity: headerOpacity }}
                    className="relative z-10 text-center max-w-5xl"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
                    >
                        <Badge className="mb-8 bg-white/10 text-white/70 hover:bg-white/20 border-none rounded-full px-6 py-2 text-xs font-bold tracking-[0.2em] uppercase">
                            CEKA HAM INFRASTRUCTURE
                        </Badge>
                        <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] mb-8">
                            POWER TO THE <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">PEOPLE.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-white/50 max-w-3xl mx-auto font-medium leading-relaxed mb-12">
                            High-performance civic toolkits, investigative data streams, and sovereign AI assets.
                            Built for the next generation of Kenyan accountability.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 1 }}
                    >
                        <Button size="lg" className="h-16 px-12 rounded-full bg-white text-black hover:bg-primary hover:text-white transition-all duration-500 font-bold text-lg shadow-2xl shadow-white/5">
                            Explore Toolset
                        </Button>
                    </motion.div>
                </motion.div>

                {/* Animated Background Gradients */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-40">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
                </div>

                <motion.div
                    className="absolute bottom-10 left-1/2 -translate-x-1/2"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center p-2">
                        <div className="w-1 h-2 bg-white/40 rounded-full" />
                    </div>
                </motion.div>
            </section>

            {/* Grid Section */}
            <main id="grid-section" className="container mx-auto px-6 py-32">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard
                        index={0}
                        title="Nasaka WEWE"
                        description="Professional-grade mobile experience for civic monitoring. Seeded with geocoded IEBC office locations and offline legislative data."
                        icon={Smartphone}
                        badge="Alpha"
                        status="Available"
                        variant="premium"
                        downloadUrl="/binaries/nasaka_universal.apk"
                    />
                    <FeatureCard
                        index={1}
                        title="Master-Pack Q1"
                        description="Quarterly consolidated legislative intelligence. JSON, CSV, and Markdown exports for all bills (2024-2027)."
                        icon={Database}
                        badge="2026.Q1"
                        status="Available"
                        siteUrl="https://ceka.sovereign.ke/data"
                    />
                    <FeatureCard
                        index={2}
                        title="GeoPosters Engine"
                        description="High-resolution visual evidence of regional governance, healthcare infrastructure, and IEBC office proximity."
                        icon={MapIcon}
                        badge="Live"
                        status="Available"
                        variant="premium"
                    />
                    <FeatureCard
                        index={3}
                        title="Civic API"
                        description="Zero-trust legislative and audit streams. Built for journalists, developers, and researchers."
                        icon={Terminal}
                        badge="v1 HAM"
                        status="Available"
                        variant="premium"
                    />
                    <FeatureCard
                        index={4}
                        title="The Vault"
                        description="Encrypted submission and storage for investigative documents and whistleblower evidence."
                        icon={Shield}
                        badge="Secure"
                        status="Available"
                        siteUrl="https://vault.ceka.sovereign.ke"
                    />
                    <FeatureCard
                        index={5}
                        title="Sovereign AI"
                        description="Pre-trained weights and context for Kenyan constitutional alignment AI models."
                        icon={Cpu}
                        badge="Restricted"
                        status="Upcoming"
                    />
                </div>

                {/* Call To Action */}
                <motion.section
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                    className="mt-40 relative rounded-[64px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-12 md:p-24 overflow-hidden"
                >
                    <div className="relative z-10 grid md:grid-cols-2 items-center gap-16">
                        <div>
                            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                                BUILD THE <br />
                                <span className="text-primary italic">FUTURE</span> OF KENYA.
                            </h2>
                            <p className="text-xl text-white/50 font-medium leading-relaxed mb-12">
                                Start integrating with the CEKA Civic Graph today. Access our API, datasets, and AI models to build more transparent governance.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Button
                                    size="lg"
                                    className="h-16 px-10 rounded-2xl bg-primary text-white hover:bg-white hover:text-black transition-all duration-500 font-bold text-lg"
                                    onClick={() => window.location.href = '/settings'}
                                >
                                    Get API Key <Zap className="ml-2 h-5 w-5 fill-current" />
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-16 px-10 rounded-2xl border-white/20 hover:bg-white/10 transition-all duration-500 font-bold text-lg"
                                    onClick={() => window.open('https://github.com/CEKA-HAM', '_blank')}
                                >
                                    Documentation <ExternalLink className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                        <div className="relative aspect-square">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
                            <Globe className="w-full h-full text-white/10" strokeWidth={0.5} />
                        </div>
                    </div>
                </motion.section>
            </main>

            <BottomNavbar />
        </div>
    );
};

export default Tools;

