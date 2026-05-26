import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Coins, 
  Zap, 
  Instagram, 
  ChevronLeft,
  Lock,
  EyeOff,
  Server
} from 'lucide-react';

/**
 * TransparencyManifesto
 * STRICT MODE: High-fidelity transparency report.
 * Content populated with verified financial and restorative data.
 */
const TransparencyManifesto: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050805] text-white font-sans selection:bg-kenya-green/30">
      {/* iOS Style Header Blur */}
      <nav className="sticky top-0 z-50 w-full bg-black/40 backdrop-blur-2xl border-bottom border-white/5 px-6 py-4 flex items-center justify-between">
        <Link to="/maintenance" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
          <ChevronLeft size={18} />
          Back to Recovery
        </Link>
        <span className="text-xs font-black tracking-widest uppercase opacity-40">Transparency Protocol v1.0</span>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
        >
          <header className="mb-12">
            <div className="w-12 h-12 bg-kenya-green/20 rounded-2xl flex items-center justify-center mb-6 border border-kenya-green/30">
              <ShieldCheck className="text-kenya-green" />
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">Our Transparency Manifesto</h1>
            <p className="text-white/50 text-lg leading-relaxed">
              CEKA is owned by the people of Kenya. This document outlines exactly how your support is being deployed to restore our civic infrastructure.
            </p>
          </header>

          {/* LINE ITEM BREAKDOWN */}
          <section className="mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-kenya-green mb-6 flex items-center gap-2">
              <Coins size={14} />
              Financial Breakdown (KES 5,500 Target)
            </h2>
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="font-bold">Database & Scaling Package</h3>
                  <p className="text-xs text-white/40">Supabase Pro Tier + Vercel High-Egress Allocation</p>
                </div>
                <span className="text-xl font-mono font-bold">KSh 5,200</span>
              </div>
              <div className="p-6 flex justify-between items-center">
                <div>
                  <h3 className="font-bold">Operational Redundancies</h3>
                  <p className="text-xs text-white/40">Market fluctuations & payment processing buffers</p>
                </div>
                <span className="text-xl font-mono font-bold">KSh 300</span>
              </div>
            </div>
          </section>

          {/* PRIVACY PROMISE */}
          <section className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
              <Lock className="text-amber-500 mb-4" size={20} />
              <h3 className="font-bold mb-2 text-sm uppercase tracking-tight">Zero Data Trade</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                We do not sell, share, or trade donor information. Period. All data is handled via a separate, hardened ledger with zero 3rd-party exposure.
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
              <EyeOff className="text-kenya-green mb-4" size={20} />
              <h3 className="font-bold mb-2 text-sm uppercase tracking-tight">End-to-End Secrecy</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Transactions are encrypted and PII (Personally Identifiable Information) is scrubbed from public logs within 24 hours of successful verification.
              </p>
            </div>
          </section>

          {/* RESTORATION TARGETS */}
          <section className="mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-kenya-green mb-6 flex items-center gap-2">
              <Zap size={14} />
              Restoration Roadmap
            </h2>
            <div className="space-y-3">
              {[
                "Finance Bill 2026 Core Page & Interactive breakdown",
                "Legislative Tracker (Automatic Bill Updates)",
                "Resource Library (Civic Education PDF Repository)",
                "Pieces (Educative high-impact carousels)"
              ].map((service, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  <div className="w-2 h-2 bg-kenya-green rounded-full shadow-[0_0_8px_rgba(50,215,75,0.6)]" />
                  <span className="text-sm font-medium opacity-80">{service}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ACCOUNTABILITY LINK */}
          <footer className="bg-gradient-to-br from-kenya-green/10 to-transparent border border-kenya-green/20 p-8 rounded-[40px] text-center">
            <Instagram className="mx-auto mb-4 text-kenya-green" size={32} />
            <h3 className="text-xl font-black mb-2">Proof of Work</h3>
            <p className="text-sm text-white/50 mb-6">
              We post real-time updates and receipts on our Instagram Stories. Follow our journey to recovery.
            </p>
            <a 
              href="https://instagram.com/civiceducationkenya" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-all"
            >
              Follow Accountability Stories
            </a>
          </footer>
        </motion.div>
      </main>
    </div>
  );
};

export default TransparencyManifesto;
