import React from 'react';
import { cn } from "@/lib/utils";
import { TrendingUp, Users } from "lucide-react";

interface SignatureCounterProps {
  current: number;
  goal: number;
  className?: string;
  variant?: 'default' | 'compact' | 'sovereign';
}

export const SignatureCounter: React.FC<SignatureCounterProps> = ({
  current,
  goal,
  className,
  variant = 'default'
}) => {
  const percentage = Math.min((current / goal) * 100, 100);

  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span className="flex items-center gap-1.5 text-kenya-green">
            <Users size={10} />
            {current.toLocaleString()}
          </span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
        <div className="h-[2px] w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-kenya-green transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,128,0,0.3)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative p-6 rounded-[32px] overflow-hidden transition-all duration-500",
      "bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-black/5 dark:border-white/10 shadow-ios-soft",
      className
    )}>
      {/* Background Subtle Gauge */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] border-[40px] border-black dark:border-white rounded-full" />
      </div>

      <div className="relative z-10 space-y-5">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <TrendingUp size={12} className="text-kenya-green" />
              Campaign Goal
            </p>
            <h4 className="text-4xl font-[1000] tracking-tighter italic text-slate-900 dark:text-white leading-none">
              {current.toLocaleString()}
            </h4>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Target</p>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{goal.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-[2px]">
            <div 
              className="h-full bg-gradient-to-r from-kenya-green to-[#00bf00] rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(0,186,0,0.4)]"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
            <span className={cn(
               percentage > 70 ? "text-kenya-green" : "text-slate-400"
            )}>
              {percentage.toFixed(1)}% Signed
            </span>
            <span className="text-slate-400">
               {Math.max(0, goal - current).toLocaleString()} More Signatures Needed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
