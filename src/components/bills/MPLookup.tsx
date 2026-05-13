import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { User, MapPin, Search, Mail } from "lucide-react";
import { getMPByConstituency } from "@/lib/parliamentaryContacts";

interface MPLookupProps {
  constituency: string;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  className?: string;
}

export const MPLookup: React.FC<MPLookupProps> = ({
  constituency,
  isSelected,
  onSelect,
  className
}) => {
  const mp = getMPByConstituency(constituency);

    if (!mp) return (
    <div className={cn("p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 opacity-60", className)}>
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Data pending for {constituency || 'Location'}</p>
    </div>
  );

  return (
    <div 
      className={cn(
        "group relative p-4 rounded-[28px] border transition-all duration-500 cursor-pointer overflow-hidden",
        isSelected 
          ? "bg-kenya-green border-kenya-green text-white shadow-xl shadow-kenya-green/20" 
          : "bg-white dark:bg-slate-900/40 border-black/5 dark:border-white/10 hover:border-kenya-green/30 hover:bg-kenya-green/[0.02]",
        className
      )}
      onClick={() => onSelect(!isSelected)}
    >
      {/* Subtle Background Pattern */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none transition-transform group-hover:scale-110">
         <User size={64} />
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
            isSelected ? "bg-white text-kenya-green shadow-lg" : "bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-kenya-green group-hover:text-white"
          )}>
            <User size={20} />
          </div>
          <div className="space-y-0.5">
            <p className={cn(
              "text-[10px] font-black uppercase tracking-widest transition-colors",
              isSelected ? "text-white/60" : "text-slate-400"
            )}>Local Representative</p>
            <h4 className="text-sm font-black italic tracking-tight">{mp.name}</h4>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-lg border uppercase tracking-tighter",
                isSelected ? "border-white/20 bg-white/10" : "border-slate-200 dark:border-white/10 text-slate-500"
              )}>
                {mp.constituency}
              </span>
              <span className={cn(
                 "text-[9px] font-medium opacity-60 flex items-center gap-1",
                 isSelected ? "text-white" : "text-slate-400"
              )}>
                <Mail size={8} /> {mp.email}
              </span>
            </div>
          </div>
        </div>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(checked as boolean)}
          className={cn(
            "rounded-full h-6 w-6 transition-all duration-500",
            isSelected ? "bg-white border-white text-kenya-green" : "border-slate-300 dark:border-white/20"
          )}
        />
      </div>
    </div>
  );
};
