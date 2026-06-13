import React, { useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  FileText, 
  Download, 
  ChevronRight, 
  BookOpen, 
  Shield, 
  Users, 
  Info,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import BottomNavbar from '@/components/layout/BottomNavbar';
import InteractiveConstitution from '@/components/constitution/InteractiveConstitution';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const ConstitutionPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  
  // Hero Paralax
  const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.98]);

  return (
    <>
      <Helmet>
        <title>Constitution Explorer — CEKA</title>
        <meta name="description" content="Interactive guide to the Constitution of Kenya 2010. Understand your rights and the law." />
      </Helmet>

      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] text-slate-900 dark:text-white selection:bg-kenya-green/30 px-0 md:px-0">
        <Navbar />

        {/* ── HERO SECTION (iOS SEMANTICS) ── */}
        <motion.section 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center text-center px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
            className="max-w-4xl mx-auto space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 dark:bg-white/10 backdrop-blur-md border border-slate-900/10 dark:border-white/20 text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              <Shield className="w-3 h-3 text-kenya-green" />
              The Supreme Law
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.9] text-slate-900 dark:text-white">
              The <span className="text-kenya-green">Constitution</span><br />
              of Kenya
            </h1>

            <p className="text-lg md:text-2xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Understand your rights, the structure of governance, and the foundations of our democracy.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
              <Button 
                size="lg" 
                className="h-14 px-8 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-[0.98] transition-all font-bold gap-2 text-base shadow-xl dark:shadow-white/5"
              >
                <Download className="w-5 h-5" />
                Download Full PDF
              </Button>
              <Button 
                variant="outline"
                size="lg" 
                className="h-14 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl hover:bg-white dark:hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold gap-2 text-base"
                onClick={() => {
                   document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Interactive Explorer
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          {/* Background blurred artifacts */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-kenya-green/10 dark:bg-kenya-green/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-1/2 -left-24 w-64 h-64 bg-kenya-red/5 dark:bg-kenya-red/10 blur-[120px] rounded-full pointer-events-none" />
        </motion.section>

        {/* ── MAIN CONTENT (MINIMALISTIC) ── */}
        <main className="relative z-10">
          
          {/* Section 1: Overview Cards */}
          <section className="py-20 bg-white dark:bg-[#111111]">
             <div className="container max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Users,
                    title: "Bill of Rights",
                    desc: "Chapter Four protects the fundamental freedoms and rights of every Kenyan."
                  },
                  {
                    icon: Info,
                    title: "Public Participation",
                    desc: "Sovereign power belongs to the people, exercised through participation."
                  },
                  {
                    icon: BookOpen,
                    title: "Devolved Gov",
                    desc: "Bringing gov services closer to you through the 47 county governments."
                  }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-8 rounded-[2.5rem] bg-[#F5F5F7] dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:shadow-2xl transition-all group"
                  >
                     <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                        <item.icon className="w-6 h-6 text-kenya-green" />
                     </div>
                     <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                     <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
             </div>
          </section>

          {/* Section 2: Interactive Explorer (Target) */}
          <section id="explorer" className="py-24 md:py-32 bg-[#F5F5F7] dark:bg-[#000000]">
             <div className="container max-w-5xl mx-auto px-6">
                <div className="text-center mb-16 space-y-4">
                   <h2 className="text-4xl md:text-6xl font-black tracking-tight">Dive into the <span className="text-kenya-green">Details</span></h2>
                   <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                     Browse every chapter, article, and schedule. Search for specific rights or responsibilities.
                   </p>
                </div>
                
                <div className="rounded-[3rem] overflow-hidden bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 shadow-3xl">
                   <InteractiveConstitution />
                </div>
             </div>
          </section>

          {/* Section 3: Dual CTA Sections (Bilingial/About) */}
          <section className="py-24 bg-white dark:bg-[#111111] overflow-hidden">
             <div className="container max-w-6xl mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-12">
                   <div className="relative p-10 md:p-16 rounded-[3rem] bg-gradient-to-br from-kenya-green to-emerald-700 text-white shadow-2xl overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform">
                         <BookOpen size={120} />
                      </div>
                      <h3 className="text-3xl md:text-4xl font-black mb-6 relative z-10">Soma Katiba<br />kwa Kiswahili</h3>
                      <p className="text-white/80 text-lg mb-8 relative z-10 max-w-md">
                        Toleo la Kiswahili la Katiba ya Kenya linapatikana pia ili kila raia aweze kuelewa sheria za nchi.
                      </p>
                      <Button className="h-14 px-8 rounded-2xl bg-white text-kenya-green hover:bg-slate-50 font-bold transition-all relative z-10">
                        Pakua PDF ya Kiswahili
                      </Button>
                   </div>

                   <div className="p-10 md:p-16 rounded-[3rem] bg-slate-900 text-white shadow-2xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-3xl md:text-4xl font-black mb-6">Ask the AI Assistant</h3>
                        <p className="text-white/60 text-lg mb-8">
                          Have a specific question about the Constitution? Our AI assistant is grounded in the supreme law.
                        </p>
                      </div>
                      <Link to="/search?q=Constitution">
                        <Button className="h-14 px-8 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 font-bold transition-all w-full md:w-auto">
                          Ask a Question
                          <MessageSquare className="ml-2 w-5 h-5" />
                        </Button>
                      </Link>
                   </div>
                </div>
             </div>
          </section>

        </main>

        <FooterSection />
        <BottomNavbar />
      </div>
    </>
  );
};

const FooterSection = () => (
  <section className="relative py-20 bg-white dark:bg-[#111111] border-t border-slate-200 dark:border-white/5">
      <div className="container mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-500 mb-2 uppercase tracking-widest">
              Civic Education Kenya · Pamoja Tunaweza
          </p>
          <div className="flex justify-center gap-6 mb-8 mt-6">
              {['About', 'Legislative Tracker', 'Resources', 'Community'].map(item => (
                <Link key={item} to={`/${item.toLowerCase().replace(' ', '-')}`} className="text-sm text-slate-900 dark:text-white/60 hover:text-kenya-green transition-colors font-medium">
                  {item}
                </Link>
              ))}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-600">
              © {new Date().getFullYear()} CEKA. MIT License. Open Source Infrastructure for Kenya.
          </p>
      </div>
  </section>
);

export default ConstitutionPage;
