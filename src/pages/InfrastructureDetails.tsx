import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Activity,
  Database,
  ShieldAlert,
  Terminal,
  Zap,
  Cpu,
  Server,
  ChevronLeft
} from 'lucide-react';

/**
 * InfrastructureDetails
 * STRICT MODE: Technical breakdown of the 2026 Finance Bill surge.
 * Populated with verified data from Vercel, Supabase, and Linktree.
 */
const InfrastructureDetails: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020402] text-white font-sans selection:bg-kenya-green/30 selection:text-white">
      {/* iOS Style Header Blur */}
      <nav className="sticky top-0 z-50 w-full bg-black/40 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link to="/maintenance" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
          <ChevronLeft size={18} />
          Back
        </Link>
        <span className="text-xs font-mono opacity-40 uppercase tracking-widest">WHAT WENT DOWN THIS WEEKEND</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <header className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest mb-6">
              <ShieldAlert size={12} />
              Critical Overload Event
            </div>
            <h1 className="text-5xl font-black mb-6 tracking-tight">Why Did We Go Down?</h1>
            <p className="text-white/50 text-xl leading-relaxed max-w-2xl">
              This is a quick summary - not the full report - of why the 2026 Finance Bill mobilization crashed our database & what we are doing about it.<br />
              See some stats below:
            </p>
          </header>

          {/* TRAFFIC STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            {[
              { label: 'Recorded Emails', value: '21,000+', sub: 'All emails - including OTP & Parliament Logs', icon: <Activity className="text-kenya-green" /> },
              { label: 'Tool Link Clicks', value: '60,000+', sub: 'via our Linktree, for both tools', icon: <BarChart3 className="text-blue-400" /> },
              { label: 'Platform Reach', value: '1,073,816', sub: 'Unique Page Views, Cross-Platform', icon: <Zap className="text-amber-400" /> },
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 p-6 rounded-[32px] backdrop-blur-sm shadow-xl">
                <div className="mb-4">{stat.icon}</div>
                <div className="text-3xl font-black mb-1">{stat.value}</div>
                <div className="text-sm font-bold opacity-80">{stat.label}</div>
                <div className="text-[10px] opacity-40 uppercase tracking-tight">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* TECHNICAL LIMITS REACHED */}
          <section className="mb-16">
            <h2 className="text-sm font-black uppercase tracking-widest opacity-40 mb-8 border-b border-white/5 pb-4">What are the Numbers On The Database?</h2>
            <div className="space-y-6">
              {/* SUPABASE BOX */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Database className="text-kenya-green" />
                  <h3 className="text-xl font-bold">Name of Service Redacted (Security Reasons)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <div className="text-xs uppercase tracking-widest opacity-40 mb-2">Network Egress</div>
                    <div className="text-2xl font-black text-red-500">27.02 GB <span className="text-sm opacity-50">/ 5GB Limit</span></div>
                    <div className="text-[10px] bg-red-500/10 text-red-500 py-1 px-2 rounded inline-block mt-2 font-bold whitespace-nowrap">540% Over Quota</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest opacity-40 mb-2">Peak Concurrent Connections</div>
                    <div className="text-2xl font-black text-red-500">280 <span className="text-sm opacity-50">/ 200 Limit</span></div>
                    <div className="text-[10px] bg-red-500/10 text-red-500 py-1 px-2 rounded inline-block mt-2 font-bold whitespace-nowrap">140% Over Quota</div>
                  </div>
                </div>
              </div>

              {/* VERCEL BOX */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Server className="text-blue-400" />
                  <h3 className="text-xl font-bold">Name of Service Redacted (Security Reasons)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <div className="text-xs uppercase tracking-widest opacity-40 mb-2">Edge Requests</div>
                    <div className="text-2xl font-black opacity-90">996,000 <span className="text-sm opacity-50">/ 1M Limit</span></div>
                    <div className="text-[10px] bg-amber-500/10 text-amber-500 py-1 px-2 rounded inline-block mt-2 font-bold">99.6% Used - Too Near Limit</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest opacity-40 mb-2">Data Transfer</div>
                    <div className="text-2xl font-black opacity-90">76.44 GB <span className="text-sm opacity-50">/ 100GB Limit</span></div>
                    <div className="text-[10px] bg-amber-500/10 text-amber-500 py-1 px-2 rounded inline-block mt-2 font-bold">76% Used - Approaching Limit</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* STRATEGIC CONTEXT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <div className="bg-gradient-to-br from-kenya-green/10 to-transparent border border-kenya-green/20 p-8 rounded-[40px]">
              <Cpu className="text-kenya-green mb-4" />
              <h3 className="text-xl font-black mb-3 tracking-tight">How are we securing the Funding then?</h3>
              <p className="text-sm leading-relaxed text-white/60">
                To prevent further outages and guarantee secure transactions, - even with donations - we have isolated & distributed shards of some of our processes into their own separate instances. This keeps data separate from the main site traffic, ensuring total transparency and zero downtime as we fix the main site's issue.
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-8 rounded-[40px]">
              <Lock size={24} className="text-amber-500 mb-4" />
              <h3 className="text-xl font-black mb-3 tracking-tight">Who is funding CEKA?</h3>
              <p className="text-sm leading-relaxed text-white/60">
                CEKA does not take government funding or political endorsements. We return sponsorships from political figures upon discovery. We are funded by the people, built by the people, and we work for the people - PERIOD.
              </p>
            </div>
          </div>

          <footer className="text-center pb-20">
            <div className="text-xs font-mono opacity-20 uppercase tracking-[0.4em] mb-4">For more, await the official full report</div>
            <div className="text-[10px] opacity-10">Email: contact@civiceducationkenya.com</div>
          </footer>
        </motion.div>
      </main>
    </div>
  );
};

const Lock = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default InfrastructureDetails;
