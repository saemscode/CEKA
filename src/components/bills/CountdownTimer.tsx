import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Clock, Timer } from "lucide-react";

interface CountdownTimerProps {
  deadline?: string | null;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ deadline, className }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!deadline) return;

    const calculateTimeLeft = () => {
      const difference = +new Date(deadline) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!deadline || !timeLeft) return (
    <div className={cn("p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center", className)}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">All Template Are Free To Use</p>
    </div>
  );

  const isUrgent = timeLeft.days < 3;

  return (
    <div className={cn(
      "p-4 rounded-[28px] border transition-all duration-500 flex items-center justify-between group",
      isUrgent
        ? "bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400"
        : "bg-slate-50 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-300",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-2xl flex items-center justify-center transition-colors",
          isUrgent ? "bg-red-500 text-white" : "bg-white dark:bg-white/10 shadow-ios-soft"
        )}>
          <Clock size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Submission Deadline</p>
          <p className="text-xs font-bold font-mono">
            {new Date(deadline).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { val: timeLeft.days, label: 'D' },
          { val: timeLeft.hours, label: 'H' },
          { val: timeLeft.minutes, label: 'M' }
        ].map((unit, i) => (
          <div key={i} className="flex flex-col items-center min-w-[32px]">
            <span className="text-base font-[1000] tracking-tighter leading-none">{unit.val}</span>
            <span className="text-[8px] font-black opacity-40 uppercase">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
