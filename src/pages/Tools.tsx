import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Download,
    Map,
    Settings,
    Shield,
    Zap,
    Database,
    Smartphone,
    FileText,
    Lock,
    ArrowRight
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNavbar from '@/components/layout/BottomNavbar';
import { motion } from 'framer-motion';

const ToolCard = ({ title, description, icon: Icon, badge, status, downloadUrl, variant = "default" }: any) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="h-full"
    >
        <Card className="h-full border-none shadow-ios-low rounded-[32px] overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-xl group transition-all duration-500 hover:shadow-ios-high">
            <CardHeader>
                <div className="flex justify-between items-start mb-2">
                    <div className={`p-3 rounded-2xl ${variant === 'premium' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-white/5 text-slate-600'}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    {badge && <Badge variant="secondary" className="rounded-lg font-bold text-[10px] uppercase tracking-wider bg-primary/10 text-primary border-none">{badge}</Badge>}
                </div>
                <CardTitle className="text-xl font-bold tracking-tight">{title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
                <Button className="w-full rounded-2xl h-11 font-bold group-hover:bg-primary transition-colors" variant={status === 'Available' ? 'default' : 'secondary'} disabled={status !== 'Available'}>
                    {status === 'Available' ? (
                        <>Download <Download className="ml-2 h-4 w-4" /></>
                    ) : (
                        <>Upcoming <Lock className="ml-2 h-4 w-4 opacity-40" /></>
                    )}
                </Button>
            </CardFooter>
        </Card>
    </motion.div>
);

const Tools = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] font-sans pb-24">
            <Navbar />

            <main className="container mx-auto px-6 pt-32 lg:pt-40">
                <div className="max-w-4xl mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none rounded-full px-4 py-1 mb-6 font-bold tracking-wider uppercase text-[10px]">
                            Civic Infrastructure Hub
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-[0.9]">
                            Tools for <span className="text-primary italic">Active</span> Sovereignty.
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                            Access high-performance civic datasets, investigative toolkits, and sovereign AI assets. Empowering Kenyans with the data required for accountability.
                        </p>
                    </motion.div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Nasaka WEWE APK */}
                    <ToolCard
                        title="Nasaka WEWE"
                        description="The flagship CEKA mobile experience. Includes offline legislative seeds and IEBC proximity engine."
                        icon={Smartphone}
                        badge="Alpha"
                        status="Available"
                        variant="premium"
                    />

                    {/* Legislative Master-Pack */}
                    <ToolCard
                        title="Legislative Master-Pack"
                        description="A quarterly compiled dataset of all Kenyan bills (2024-2027) in machine-readable formats."
                        icon={Database}
                        badge="Q1 2026"
                        status="Available"
                    />

                    {/* CEKA GeoPosters */}
                    <ToolCard
                        title="CEKA GeoPosters"
                        description="High-resolution civic evidence posters documenting regional infrastructure and resource allocation."
                        icon={Map}
                        badge="Design"
                        status="Upcoming"
                    />

                    {/* Civic Monitor (API) */}
                    <ToolCard
                        title="Civic Data API"
                        description="Zero-trust access to realtime legislative and audit streams for developers and journalists."
                        icon={Zap}
                        badge="v1 HAM"
                        status="Available"
                        variant="premium"
                    />

                    {/* Journalists Vault */}
                    <ToolCard
                        title="Journalists Vault"
                        description="Secure, encrypted storage and submission tool for investigative evidence and documents."
                        icon={Shield}
                        badge="Secure"
                        status="Available"
                    />

                    {/* Constitution Guide */}
                    <ToolCard
                        title="Sovereign AI Pack"
                        description="Pre-trained weights and context for Kenyan constitutional alignment AI models."
                        icon={Lock}
                        badge="Restricted"
                        status="Upcoming"
                    />
                </div>

                <section className="mt-32 p-12 rounded-[48px] bg-primary text-white relative overflow-hidden shadow-2xl shadow-primary/30">
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-3xl font-black mb-4">Integrate with CEKA</h2>
                        <p className="text-white/80 mb-8 font-medium">
                            Are you a developer or researcher? Get your CEKA API key in settings to start building on top of the Kenyan civic graph.
                        </p>
                        <Button size="lg" variant="secondary" className="rounded-2xl h-14 px-8 font-bold text-primary hover:bg-white transition-all scale-110 origin-left">
                            Manage API Keys <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                    <Zap className="absolute -right-20 -bottom-20 h-96 w-96 text-white/5 rotate-12" />
                </section>
            </main>

            <BottomNavbar />
        </div>
    );
};

export default Tools;
