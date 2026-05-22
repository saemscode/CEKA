import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FINANCE_BILL_2026_CLAUSES, FinanceBillClause } from '@/data/financeBill2026';
import { cn } from "@/lib/utils";
import {
  DetailsIcon, MailOpenAltIcon, LocationIcon, CloseIcon,
  LibraryIcon, PenNewSquareIcon, Send2Icon, Share2Icon, MailBulkIcon
} from "../ui/CustomIcons";
import { toast } from "@/hooks/use-toast";

interface BuilderProps {
  billTitle: string;
  onDispatch: (memo: string) => void;
}

export const CitizenMemorandumBuilder: React.FC<BuilderProps> = ({ billTitle, onDispatch }) => {
  const [activeTab, setActiveTab] = useState<'DELETE' | 'AMEND' | 'ACCEPT'>('DELETE');
  const [selectedClauses, setSelectedClauses] = useState<Set<string>>(new Set());
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: '',
    county: '',
    organization: 'Individual Citizen'
  });
  const [memoText, setMemoText] = useState('');

  const toggleClause = (id: string) => {
    const newSelected = new Set(selectedClauses);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedClauses(newSelected);
  };

  // Generate Memorandum Content
  useEffect(() => {
    const selectedList = FINANCE_BILL_2026_CLAUSES.filter(c => selectedClauses.has(c.id));
    const deleteList = selectedList.filter(c => c.category === 'DELETE');
    const amendList = selectedList.filter(c => c.category === 'AMEND');
    const acceptList = selectedList.filter(c => c.category === 'ACCEPT');

    const isConstitutionalChallengeSelected = selectedClauses.has('unconstitutional-assembly-violation');
    const filteredDeleteList = deleteList.filter(c => c.id !== 'unconstitutional-assembly-violation');

    const connectors = [
      "Also,", "Moreover,", "Additively,", "Next,", "Additionally,", 
      "Furthermore,", "Equally,", "Second,", "Third,", "Again,",
      "More significantly,", "Beyond this I note that,", "In the same vein,", 
      "Crucially,", "Of equal importance is,", "Correspondingly,", "Parallel to this,",
      "Similarly,", "Consequently,", "In light of this,", "Following from that,",
      "Likewise,", "Notably,", "Specifically,", "By extension,", "To that end,",
      "In addition,", "Concurrently,"
    ];

    const getPrefix = (index: number, total: number) => {
      if (index === 0) return "Starting with my most critical concerns, I first wish to address";
      if (index === total - 1 && total > 1) return "Finally, and perhaps most critically, I must address";
      return connectors[index % connectors.length];
    };

    let text = `MEMORANDUM TO PARLIAMENT\nRe: Finance Bill 2026\nDate: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\nSubmitted by: ${userDetails.name || '[Your Name]'}\nEmail: ${userDetails.email || '[Your Email]'}\n\nI submit this memorandum as a citizen of Kenya in response to the Finance Bill 2026, currently before the National Assembly. I urge Parliament to consider the following positions on the clauses listed below.\n\n`;

    if (filteredDeleteList.length > 0) {
      text += `I formally request that Parliament DELETES the following sections:\n\n`;
      filteredDeleteList.forEach((c, i) => {
        const prefix = getPrefix(i, filteredDeleteList.length);
        text += `${prefix} ${c.clauseId} (${c.title}).\nMy concern is that ${c.concern.charAt(0).toLowerCase() + c.concern.slice(1)}\nPosition: ${c.position}\n\n`;
      });
    }

    if (amendList.length > 0) {
      const bridge = filteredDeleteList.length > 0 
        ? "While the above clauses require deletion, I believe others can be salvaged through amendment specifically:"
        : "Regarding areas requiring AMENDMENT:";
      text += `${bridge}\n\n`;
      amendList.forEach((c, i) => {
        text += `In addition to the points above, I propose amendments to ${c.clauseId} (${c.title}).\nConcern: ${c.concern}\nProposed Action: ${c.position}\n\n`;
      });
    }

    if (acceptList.length > 0) {
      const bridge = (filteredDeleteList.length > 0 || amendList.length > 0)
        ? "That said, for the following measures, I find the legislative intent sound and formally support them as drafted:"
        : "Finally, I acknowledge and SUPPORT the following measures as written:";
      text += `${bridge}\n\n`;
      acceptList.forEach((c, i) => {
        text += `${i + 1}. ${c.clauseId} (${c.title}): ${c.concern}\n\n`;
      });
    }

    if (isConstitutionalChallengeSelected) {
      text += `FINAL CONSTITUTIONAL OBJECTION (BOMBSHELL)\nLastly, I must raise a fundamental constitutional objection that challenges the very legality of this entire process. Under Articles 27(8) and 81(b) of the Constitution of Kenya, and following the Supreme Court Advisory Opinion 2 of 2012, this National Assembly is improperly and unconstitutionally constituted. Any business conducted, including the consideration of the Finance Bill 2026, is a direct violation of Article 3(2) of the Constitution. I formally challenge the status of this Assembly to process this Bill and demand its immediate dissolution.\n\n`;
    }

    text += `I trust that Parliament will act in the public interest and uphold the constitutional mandate to serve all Kenyans.\n\nRespectfully submitted,\n${userDetails.name || '[Your Name]'}\n${userDetails.email || '[Your Email]'}`;

    setMemoText(text);
  }, [selectedClauses, userDetails]);

  const handleSend = () => {
    if (!userDetails.name || !userDetails.email || !userDetails.county) {
      toast({ title: "Details Missing", description: "Please fill in your name, email and county.", variant: "destructive" });
      return;
    }
    onDispatch(memoText);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-kenya-green/10 rounded-3xl animate-pulse-gentle">
            <MailBulkIcon size={32} className="text-kenya-green" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-kenya-green mt-1">Sovereign Petition</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-[1000] uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">
          Citizen <span className="text-kenya-green">Memorandum</span> Builder
        </h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-slate-50 dark:bg-white/5 px-6 py-2 rounded-full border border-black/5 dark:border-white/5">
          Finance Bill 2026 • Policy Participation Engine
        </p>
      </div>

      {/* Tabs & Bulk Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
        <div className="flex items-center p-1.5 bg-slate-100/50 dark:bg-white/5 rounded-3xl backdrop-blur-xl border border-black/5">
          {(['DELETE', 'AMEND', 'ACCEPT'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all",
                activeTab === tab
                  ? tab === 'DELETE' ? "bg-kenya-red text-white shadow-lg" : tab === 'AMEND' ? "bg-amber-500 text-white shadow-lg" : "bg-kenya-green text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'DELETE' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allDeleteIds = FINANCE_BILL_2026_CLAUSES.filter(c => c.category === 'DELETE').map(c => c.id);
              setSelectedClauses(new Set([...selectedClauses, ...allDeleteIds]));
              toast({ title: "Objections Listed", description: "Successfully added all critical concerns to your memorandum." });
            }}
            className="h-12 px-6 rounded-2xl border-kenya-red/20 text-kenya-red font-black text-[9px] uppercase tracking-widest hover:bg-kenya-red/5"
          >
            Reject All
          </Button>
        )}

        {activeTab === 'ACCEPT' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allAcceptIds = FINANCE_BILL_2026_CLAUSES.filter(c => c.category === 'ACCEPT').map(c => c.id);
              setSelectedClauses(new Set([...selectedClauses, ...allAcceptIds]));
              toast({ title: "Supports Listed", description: "All positive legislative measures have been added to your draft." });
            }}
            className="h-12 px-6 rounded-2xl border-kenya-green/20 text-kenya-green font-black text-[9px] uppercase tracking-widest hover:bg-kenya-green/5"
          >
            Accept All
          </Button>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white dark:from-black to-transparent z-10 pointer-events-none" />
        {/* Selector Grid - With capped height for large lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto p-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            {FINANCE_BILL_2026_CLAUSES.filter(c => c.category === activeTab).map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => toggleClause(c.id)}
                className={cn(
                  "p-6 rounded-[32px] border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group",
                  selectedClauses.has(c.id)
                    ? activeTab === 'DELETE' ? "bg-kenya-red/5 border-kenya-red" : activeTab === 'AMEND' ? "bg-amber-500/5 border-amber-500" : "bg-kenya-green/5 border-kenya-green"
                    : "bg-white dark:bg-slate-900/40 border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 shadow-ios-soft"
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      activeTab === 'DELETE' ? "bg-kenya-red/10 text-kenya-red" : activeTab === 'AMEND' ? "bg-amber-500/10 text-amber-500" : "bg-kenya-green/10 text-kenya-green"
                    )}>
                      {c.clauseId}
                    </span>
                    {selectedClauses.has(c.id) && (
                      <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center">
                        <span className="text-[10px] text-white dark:text-slate-900 font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-black leading-snug text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-kenya-green transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-3">
                    {c.concern}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* User Inputs & Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Detail Form */}
        <div className="space-y-6 bg-slate-50/50 dark:bg-white/5 p-8 rounded-[40px] border border-black/5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <DetailsIcon size={20} className="text-kenya-green" />
            <h2 className="text-xl font-black uppercase tracking-[0.1em] text-slate-900 dark:text-white">Your Credentials</h2>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Input
                value={userDetails.name}
                onChange={(e) => setUserDetails(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full Name"
                className="h-14 pl-12 rounded-2xl bg-white dark:bg-slate-900 border-none shadow-ios-soft font-bold text-sm"
              />
              <DetailsIcon size={14} className="absolute left-4 top-5 text-slate-400" />
            </div>
            <div className="relative">
              <Input
                value={userDetails.email}
                onChange={(e) => setUserDetails(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email Address"
                className="h-14 pl-12 rounded-2xl bg-white dark:bg-slate-900 border-none shadow-ios-soft font-bold text-sm"
              />
              <MailOpenAltIcon size={14} className="absolute left-4 top-5 text-slate-400" />
            </div>
            <div className="relative">
              <Input
                value={userDetails.county}
                onChange={(e) => setUserDetails(prev => ({ ...prev, county: e.target.value }))}
                placeholder="Select County"
                className="h-14 pl-12 rounded-2xl bg-white dark:bg-slate-900 border-none shadow-ios-soft font-bold text-sm"
              />
              <LocationIcon size={14} className="absolute left-4 top-5 text-slate-400" />
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={selectedClauses.size === 0}
            className="w-full h-16 rounded-2xl bg-kenya-green hover:bg-[#004d00] text-white text-[10px] font-[1000] uppercase tracking-[0.3em] shadow-ios-high transition-transform active:scale-95 disabled:opacity-50"
          >
            Dispatch Memorandum <MailBulkIcon size={18} className="ml-2" />
          </Button>
        </div>

        {/* Memo Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LibraryIcon size={20} className="text-slate-400" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Memorandum Preview</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Updates in Real-time</span>
          </div>
          <div className="relative h-[480px] rounded-[40px] border border-black/5 dark:border-white/5 bg-white dark:bg-slate-950 p-8 overflow-y-auto shadow-ios-inner custom-scrollbar">
            <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {memoText}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-slate-950 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
