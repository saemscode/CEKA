import React from 'react';
import { BarChart3, Users, Mail, Eye, TrendingUp, Calendar, ArrowUpRight, Activity, Percent, Zap, Fingerprint } from 'lucide-react';
import { SignatureCounter } from "./SignatureCounter";
import { cn } from "@/lib/utils";

interface CreatorDashboardProps {
  stats: {
    totalSigns: number;
    verifiedSigns: number;
    totalViews: number;
    shares: number;
    last24h: number;
    goal: number;
  };
  updates: any[];
  className?: string;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  stats,
  updates,
  className
}) => {
  const conversionRate = stats.totalViews > 0 ? (stats.totalSigns / stats.totalViews) * 100 : 0;

  return (
    <div className={cn("space-y-10", className)}>
      {/* Sovereign Dashboard Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Reach Node */}
        <div className="relative p-6 rounded-[32px] bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-black/5 dark:border-white/10 shadow-ios-soft group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transition-transform group-hover:scale-110">
             <Eye size={48} />
          </div>
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reach & Visibility</p>
             </div>
             <div className="flex items-end justify-between">
                <div>
                  <h4 className="text-4xl font-[1000] tracking-tighter italic leading-none">{stats.totalViews.toLocaleString()}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{conversionRate.toFixed(1)}% Conv. Rate</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Activity size={20} />
                </div>
             </div>
          </div>
        </div>

        {/* Integrity Node */}
        <div className="relative p-6 rounded-[32px] bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-black/5 dark:border-white/10 shadow-ios-soft group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transition-transform group-hover:scale-110">
             <Users size={48} />
          </div>
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-kenya-green shadow-[0_0_8px_rgba(0,186,0,0.5)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Data Integrity</p>
             </div>
             <div className="flex items-end justify-between">
                <div>
                  <h4 className="text-4xl font-[1000] tracking-tighter italic leading-none">{stats.verifiedSigns.toLocaleString()}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Verified Trace</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-kenya-green/10 flex items-center justify-center text-kenya-green">
                  <Fingerprint size={20} />
                </div>
             </div>
          </div>
        </div>

        {/* Velocity Node */}
        <div className="relative p-6 rounded-[32px] bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-black/5 dark:border-white/10 shadow-ios-soft group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] transition-transform group-hover:scale-110">
             <TrendingUp size={48} />
          </div>
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgba(255,191,0,0.5)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Viral Velocity</p>
             </div>
             <div className="flex items-end justify-between">
                <div>
                  <h4 className="text-4xl font-[1000] tracking-tighter italic leading-none">+{stats.last24h}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Spike Detected</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                  <Zap size={20} />
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
         <div className="space-y-6">
            <div className="flex items-center gap-3">
               <Percent size={16} className="text-kenya-green" />
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Active Momentum</h3>
            </div>
            <SignatureCounter current={stats.totalSigns} goal={stats.goal} variant="sovereign" />
         </div>
         
         <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-slate-400" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Campaign Updates</h3>
               </div>
               <button className="text-[10px] font-black text-kenya-green uppercase tracking-widest hover:underline">Manage Timeline</button>
            </div>
            
            <div className="space-y-4">
               {updates.length > 0 ? updates.map((update, idx) => (
                 <div key={idx} className="relative p-6 rounded-[28px] bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 group hover:bg-white dark:hover:bg-white/10 transition-all duration-500">
                    <div className="absolute top-6 right-6">
                       <ArrowUpRight size={14} className="text-slate-300 group-hover:text-kenya-green transition-colors" />
                    </div>
                    <p className="text-[10px] font-black text-kenya-green uppercase tracking-[0.2em] mb-2">{update.date}</p>
                    <h5 className="font-black italic tracking-tight text-slate-900 dark:text-white mb-2">{update.title}</h5>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{update.content}</p>
                 </div>
               )) : (
                 <div className="p-12 rounded-[32px] border-2 border-dashed border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-center opacity-40">
                    <Calendar size={32} className="text-slate-300 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No active updates logged in the sovereign trace.</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};
