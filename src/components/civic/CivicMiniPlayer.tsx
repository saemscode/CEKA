import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { useCivicPlayerStore } from '@/stores/useCivicPlayerStore';
import { useCivicPlayerData } from '@/hooks/useCivicPlayerData';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ChevronLeft, ChevronRight, Flame, Calendar,
  FileText, TrendingUp, CheckCircle, Clock,
  X, Award, ChevronUp, ChevronDown, RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── News-Microphone SVG (Stage A FAB + Stage C header) ──────────────────────
const NewsMicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 445.167 445.167" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M309.253,197.513c6.316,2.358,13.126,3.735,20.561,3.735c25.749,0,54.267-16.524,89.746-52.003c16.512-16.512,25.606-38.467,25.606-61.819c0-23.353-9.095-45.307-25.606-61.819C403.047,9.095,381.092,0.001,357.741,0.001s-45.307,9.094-61.819,25.606c-34.706,34.707-51.223,62.66-51.977,87.969c-0.242,8.123,1.167,15.51,3.715,22.33L232.387,152.2l-47.964-47.964c-1.407-1.407-3.314-2.197-5.304-2.197s-3.896,0.79-5.304,2.197L54.219,223.832c-1.406,1.406-2.196,3.314-2.196,5.303s0.79,3.897,2.196,5.303l52.171,52.171L8.634,390.895c-11.79,12.576-11.465,32.724,0.725,44.913c6.229,6.229,14.534,9.359,22.847,9.358c7.955,0,15.917-2.868,22.066-8.633l104.285-97.757l52.171,52.171c1.407,1.407,3.314,2.197,5.304,2.197s3.896-0.79,5.304-2.197l119.596-119.596c2.929-2.929,2.929-7.678,0-10.606l-36.91-36.91c-0.001-0.001-0.001-0.002-0.002-0.003s-0.002-0.001-0.003-0.002l-11.05-11.05L309.253,197.513z" />
    <path d="M291.423,107.565c2.133,0,4.14-0.83,5.657-2.343c3.119-3.12,3.119-8.195-0.007-11.321c-1.511-1.506-3.518-2.336-5.65-2.336s-4.14,0.83-5.657,2.343c-3.119,3.119-3.119,8.194,0.007,11.321C287.284,106.736,289.291,107.565,291.423,107.565z" />
    <path d="M291.494,119.62c-4.064,1.689-6.004,6.374-4.321,10.446c1.242,3.001,4.144,4.941,7.393,4.941c1.054,0,2.083-0.205,3.069-0.613c4.064-1.689,6.004-6.374,4.321-10.446c-1.242-3.001-4.144-4.941-7.393-4.941C293.509,119.007,292.48,119.212,291.494,119.62z" />
  </svg>
);

// ─── Kenyan Bill Legislative Stages — 8-Stage Constitutional Pipeline ────────
const BILL_STAGES = [
  { label: 'Gazetted',   keys: ['published', 'gazetted', 'gazette', 'introduced'] },
  { label: '1st Reading', keys: ['1st reading', 'first reading', '1st_reading', 'first_reading'] },
  { label: 'Public Part.', keys: ['public participation', 'public part', 'stakeholder', 'consultation'] },
  { label: '2nd Reading', keys: ['2nd reading', 'second reading', '2nd_reading', 'second_reading'] },
  { label: 'Committee',  keys: ['committee of the whole', 'committee stage', 'committee'] },
  { label: '3rd Reading', keys: ['3rd reading', 'third reading', '3rd_reading', 'third_reading', 'passed'] },
  { label: 'Assent',     keys: ['assent', 'presidential assent', 'assented', 'president'] },
  { label: 'Act / Law',  keys: ['enacted', 'enacted into law', 'law', 'act', 'commencement'] },
];

const DISCARDED_KEYS = ['withdrawn', 'dropped', 'rejected', 'lapsed', 'negatived', 'shelved'];

function getBillStageIndex(status: string): number {
  if (!status) return 0;
  const s = status.toLowerCase().trim();
  // Check discarded/terminal state first
  if (DISCARDED_KEYS.some(k => s.includes(k))) return -1; // -1 = terminated
  for (let i = BILL_STAGES.length - 1; i >= 0; i--) {
    if (BILL_STAGES[i].keys.some(k => s.includes(k.toLowerCase()))) return i;
  }
  return 0; // default to Gazetted if unknown
}

// Swahili Civic Level definitions wired to point thresholds
const CIVIC_LEVELS = [
  { min: 0,    max: 99,   level: 1, title: 'Raia',           subtitle: 'Citizen' },
  { min: 100,  max: 499,  level: 2, title: 'Mfuatiliaji',    subtitle: 'Tracker' },
  { min: 500,  max: 1499, level: 3, title: 'Mzalendo',       subtitle: 'Patriot' },
  { min: 1500, max: 4999, level: 4, title: 'Mwanaharakati',  subtitle: 'Activist' },
  { min: 5000, max: Infinity, level: 5, title: 'Shujaa',     subtitle: 'Hero' },
];

function getCivicLevel(points: number) {
  return CIVIC_LEVELS.find(l => points >= l.min && points <= l.max) || CIVIC_LEVELS[0];
}

function getRingPct(points: number) {
  const lvl = getCivicLevel(points);
  if (lvl.max === Infinity) return 100;
  return Math.min(100, Math.round(((points - lvl.min) / (lvl.max - lvl.min + 1)) * 100));
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Bill { id: string; title: string; status: string; slug?: string; category?: string; summary?: string; }
interface CivicEvent { id: string; title: string; event_date: string; start_time?: string; description?: string; }
interface Campaign { id: string; title: string; description?: string; slug?: string; }
interface TickerItem { tag: string; text: string; }

// Rotating mini-bar content item
interface MiniContent {
  title: string;
  type: string;
  link: string;
  summary?: string;
}

// ─── Player modes ─────────────────────────────────────────────────────────────
type PlayerMode = 'fab' | 'mini' | 'detail' | 'hidden';

// ─── Slide definitions ────────────────────────────────────────────────────────
const SLIDES = ['now', 'bills', 'calendar', 'alerts', 'impact'] as const;
type SlideKey = typeof SLIDES[number];
const SLIDE_LABELS: Record<SlideKey, string> = { now: 'Now', bills: 'Followed Bills', calendar: 'Calendar', alerts: 'Alerts', impact: 'Impact' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  return { month: d.toLocaleDateString('en-KE', { month: 'short' }).toUpperCase(), day: d.getDate() };
}
function timeSince(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Bill Stage Track — 8-node with terminated state ─────────────────────────
const BillTrack: React.FC<{ status: string }> = ({ status }) => {
  const active = getBillStageIndex(status);
  const isTerminated = active === -1;
  return (
    <div className="flex items-center w-full mt-2 gap-0">
      {BILL_STAGES.map((stage, i) => (
        <React.Fragment key={stage.label}>
          <div className="flex flex-col items-center gap-0.5" style={{ flex: i < BILL_STAGES.length - 1 ? '1 1 0' : 'none' }}>
            <div className={`w-2 h-2 rounded-full transition-all ${
              isTerminated ? 'bg-red-400/50'
              : i <= active ? 'bg-kenya-green'
              : 'bg-slate-200 dark:bg-white/10'
            } ${i === active && !isTerminated ? 'ring-2 ring-kenya-green/30 scale-125' : ''}`} />
            <span className={`text-[7px] text-center leading-tight max-w-[28px] truncate ${
              isTerminated ? 'text-red-400/60'
              : i <= active ? 'text-kenya-green font-semibold'
              : 'text-slate-400 dark:text-white/20'
            }`}>{stage.label}</span>
          </div>
          {i < BILL_STAGES.length - 1 && (
            <div className={`h-px flex-1 mb-3 transition-all ${
              isTerminated ? 'bg-red-400/30'
              : i < active ? 'bg-kenya-green'
              : 'bg-slate-200 dark:bg-white/10'
            }`} />
          )}
        </React.Fragment>
      ))}
      {isTerminated && (
        <span className="ml-1 text-[7px] font-bold text-red-400 uppercase tracking-wide whitespace-nowrap">Withdrawn</span>
      )}
    </div>
  );
};

// ─── Scrolling Ticker ─────────────────────────────────────────────────────────
const Ticker: React.FC<{ items: TickerItem[]; dark?: boolean }> = ({ items, dark }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => { if (ref.current) setW(ref.current.scrollWidth / 2); }, [items]);
  const dur = w > 0 ? w / 36 : 18;
  return (
    <div className="overflow-hidden w-full">
      <motion.div ref={ref} className="flex gap-8 whitespace-nowrap w-max" animate={{ x: [0, -w] }} transition={{ duration: dur, ease: 'linear', repeat: Infinity }}>
        {[...items, ...items].map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1.5 text-[11px] shrink-0 ${dark ? 'text-white/70' : 'text-slate-600 dark:text-white/70'}`}>
            <span className="text-[9px] font-bold uppercase tracking-wide text-kenya-green bg-kenya-green/10 px-1.5 py-px rounded-full">{item.tag}</span>
            {item.text}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

// ─── FAB (Stage A) — BLACK, Kenyan flag: red=Donation, black=CEKA, green=AI ──
// Behaves identically to Donation/AI: right:'2rem', swipe-right to hide, same restoration bar
const CivicFAB: React.FC<{
  unreadCount: number;
  temperature: 'cool' | 'warm' | 'hot';
  onTap: () => void;
  onHide: () => void;
}> = ({ unreadCount, temperature, onTap, onHide }) => {
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 300 }}
      dragElastic={0.1}
      onDragEnd={(_, info) => { if (info.offset.x > 80) onHide(); }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="fixed z-40 cursor-pointer"
      style={{ bottom: 88, right: '2rem', touchAction: 'none' }}
    >
      {/* Ping ring — black, only on hot */}
      {temperature === 'hot' && (
        <div className="absolute inset-0 rounded-full bg-black/60 animate-ping opacity-20" />
      )}

      <motion.button
        onClick={onTap}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="relative w-12 h-12 rounded-full flex items-center justify-center shadow-2xl shadow-black/50"
        style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #050505 100%)' }}
        aria-label="Civic Mini-Player"
      >
        <div className="absolute inset-1 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
        {/* Icon only — news-microphone on cool, bell on warm, flame on hot */}
        {temperature === 'hot'
          ? <Flame className="relative z-10 w-5 h-5 text-white drop-shadow" />
          : temperature === 'warm'
            ? <Bell className="relative z-10 w-5 h-5 text-white/90" />
            : <NewsMicIcon className="relative z-10 w-5 h-5 text-white/80" />}
      </motion.button>

      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center shadow-lg border border-white"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Mini-Player Bar (Stage B) ────────────────────────────────────────────────
const MiniPlayerBar: React.FC<{
  contentItems: MiniContent[];
  temperature: 'cool' | 'warm' | 'hot';
  unreadCount: number;
  slideIndex: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onExpand: () => void;    // Stage B → C
  onCollapse: () => void;  // Stage B → A
  currentBill?: Bill;
}> = ({ contentItems, temperature, unreadCount, slideIndex, onSwipeLeft, onSwipeRight, onExpand, onCollapse, currentBill }) => {
  const dragX = useMotionValue(0);
  const navigate = useNavigate();

  // Auto-rotate content every 4 s
  const [curIdx, setCurIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  useEffect(() => {
    if (contentItems.length < 2) return;
    const t = setInterval(() => {
      setDir(1);
      setCurIdx(i => (i + 1) % contentItems.length);
    }, 4000);
    return () => clearInterval(t);
  }, [contentItems.length]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -40) onSwipeLeft();
    else if (info.offset.x > 40) onSwipeRight();
    else if (info.offset.y < -30) onExpand();
    dragX.set(0);
  };

  const tempAccentLine = { cool: 'bg-black', warm: 'bg-amber-500', hot: 'bg-red-500' }[temperature];
  const current = contentItems[curIdx] ?? { title: 'Civic Education Kenya', type: 'CEKA', link: '/', summary: '' };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="fixed z-[9998]"
      style={{ bottom: 92, left: '50%', x: '-50%' }}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ x: dragX, touchAction: 'pan-y', cursor: 'grab' }}
        className="w-[340px] max-w-[calc(100vw-32px)]"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
          {/* Top accent line */}
          <div className={`h-0.5 w-full ${tempAccentLine}`} />

          <div className="flex items-center gap-2.5 px-3 py-2.5">
            {/* Left: CEKA icon — black */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #050505 100%)' }}
            >
              {temperature === 'hot' ? (
                <Flame className="w-4 h-4 text-white" />
              ) : temperature === 'warm' ? (
                <Bell className="w-4 h-4 text-white/90" />
              ) : (
                /* news-svgrepo-com.svg — Fluent filled newspaper icon */
                <svg viewBox="0 0 28 28" className="w-4 h-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path className="text-white/90" d="M22,5.75 L22,20.5 C22,20.7761424 22.2238576,21 22.5,21 C22.7454599,21 22.9496084,20.8231248 22.9919443,20.5898756 L23,20.5 L23,7 L24.25,7 C25.1681734,7 25.9211923,7.70711027 25.9941988,8.60647279 L26,8.75 L26,20.75 C26,22.4830315 24.6435452,23.8992459 22.9344239,23.9948552 L22.75,24 L5.25,24 C3.51696854,24 2.10075407,22.6435452 2.00514479,20.9344239 L2,20.75 L2,5.75 C2,4.8318266 2.70711027,4.07880766 3.60647279,4.0058012 L3.75,4 L20.25,4 C21.1681734,4 21.9211923,4.70711027 21.9941988,5.60647279 L22,5.75 Z M9.74652744,13.0034726 L7.25,13.0034726 C6.3318266,13.0034726 5.57880766,13.7105828 5.5058012,14.6099454 L5.5,14.7534726 L5.5,17.25 C5.5,18.1681734 6.20711027,18.9211923 7.10647279,18.9941988 L7.25,19 L9.74652744,19 C10.6647008,19 11.4177198,18.2928897 11.4907262,17.3935272 L11.4965274,17.25 L11.4965274,14.7534726 C11.4965274,13.8352992 10.7894172,13.0822802 9.89005465,13.0092738 L9.74652744,13.0034726 Z M17.75,17.5 L14.25,17.5 C13.8357864,17.5 13.5,17.8357864 13.5,18.25 C13.5,18.6296958 13.7821539,18.943491 14.1482294,18.9931534 L14.25,19 L17.75,19 C18.1642136,19 18.5,18.6642136 18.5,18.25 C18.5,17.8357864 18.1642136,17.5 17.75,17.5 Z M9.74652744,14.5034726 L7.25,14.5034726 L7.25,17.5 L9.74652744,17.5 L9.74652744,14.5034726 Z M17.75,13.0034726 L14.25,13.0034726 C13.8357864,13.0034726 13.5,13.3392589 13.5,13.7534726 C13.5,14.1676862 13.8357864,14.5034726 14.25,14.5034726 L17.75,14.5034726 C18.1642136,14.5034726 18.5,14.1676862 18.5,13.7534726 C18.5,13.3392589 18.1642136,13.0034726 17.75,13.0034726 Z M17.75,8.49665793 L6.25,8.49665793 C5.83578644,8.49665793 5.5,8.83244437 5.5,9.24665793 C5.5,9.66087149 5.83578644,9.99665793 6.25,9.99665793 L17.75,9.99665793 C18.1642136,9.99665793 18.5,9.66087149 18.5,9.24665793 C18.5,8.83244437 18.1642136,8.49665793 17.75,8.49665793 Z" />
                </svg>
              )}
            </div>

            {/* Centre: rotating content — title + type subtitle, tappable */}
            <button
              className="flex-1 min-w-0 text-left"
              onClick={() => navigate(current.link)}
            >
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={curIdx}
                  custom={dir}
                  variants={{
                    enter: (d: number) => ({ y: d * 10, opacity: 0 }),
                    center: { y: 0, opacity: 1 },
                    exit: (d: number) => ({ y: d * -10, opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  <p className="text-xs font-semibold text-slate-800 dark:text-white truncate leading-tight">
                    {current.title}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-white/35 font-medium uppercase tracking-wide mt-0.5">
                    {current.type}
                  </p>
                </motion.div>
              </AnimatePresence>
            </button>

            {/* Right: unread badge + dual-chevron control */}
            <div className="flex items-center gap-1.5 shrink-0">
              {unreadCount > 0 && (
                <div className="w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}

              {/* ── Dual Chevron Control (iOS-inspired) ── */}
              {/* Up = expand to Stage C | Down = collapse to Stage A */}
              <div
                className="relative flex flex-col overflow-hidden shrink-0"
                style={{ width: 32, height: 44, borderRadius: 12, background: 'rgba(0,0,0,0.05)' }}
              >
                <div className="absolute inset-x-2 top-1/2 -translate-y-px h-px bg-slate-200 dark:bg-white/10 z-10" />

                {/* Up chevron — slightly right-offset */}
                <motion.button
                  onClick={onExpand}
                  whileTap={{ scale: 0.85 }}
                  className="flex-1 flex items-center justify-center"
                  style={{ paddingLeft: 5 }}
                  title="Expand"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-white/50" strokeWidth={2.5} />
                </motion.button>

                {/* Down chevron — slightly left-offset */}
                <motion.button
                  onClick={onCollapse}
                  whileTap={{ scale: 0.85 }}
                  className="flex-1 flex items-center justify-center"
                  style={{ paddingRight: 5 }}
                  title="Close"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-white/50" strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Live ticker strip — restores the bottom news bar, no 'Current activity' label */}
          {/* Cycles through all content types: bills, events, campaigns, headlines */}
          <div className="px-3 pb-2.5 overflow-hidden">
            <Ticker
              items={contentItems.map(c => ({ tag: c.type, text: c.title }))}
            />
          </div>

          {/* Bill stage track — only when top content is a bill */}
          {current.type === 'Bill' && currentBill && (
            <div className="px-3 pb-1.5">
              <BillTrack status={currentBill.status} />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── FollowedBillsSlide — Accordion engine ──────────────────────────────────
const FollowedBillsSlide: React.FC<{
  user: any;
  followedBills: Bill[];
}> = ({ user, followedBills }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const active = followedBills.filter(b => !archived.has(b.id));
  const archivedList = followedBills.filter(b => archived.has(b.id));
  const displayed = showArchived ? archivedList : active;

  if (!user) return (
    <div className="flex flex-col items-center py-8 gap-3">
      <FileText className="w-8 h-8 text-slate-300 dark:text-white/20" />
      <p className="text-sm text-slate-500 dark:text-white/40">Sign in to track bills</p>
      <Link to="/auth" className="px-5 py-2 text-xs font-bold rounded-full bg-kenya-green text-white">Login</Link>
    </div>
  );

  if (followedBills.length === 0) return (
    <div className="flex flex-col items-center py-8 gap-2">
      <FileText className="w-7 h-7 text-slate-200 dark:text-white/10" />
      <p className="text-xs text-slate-400 dark:text-white/30 text-center">No bills followed.<br />Browse the tracker and tap Follow.</p>
      <Link to="/legislative-tracker" className="inline-flex items-center gap-1 text-xs text-kenya-green font-semibold mt-1">
        Browse <img src="/chevron.svg" className="w-3 h-3 inline" alt="" />
      </Link>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Archive toggle */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
          {showArchived ? `Archived (${archivedList.length})` : `Active (${active.length})`}
        </p>
        <button
          onClick={() => { setShowArchived(s => !s); setExpandedId(null); }}
          className="text-[9px] font-bold text-kenya-green hover:underline"
        >
          {showArchived ? 'View Active' : 'View Archived'}
        </button>
      </div>

      {displayed.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-white/30 text-center py-6">
          {showArchived ? 'No archived bills.' : 'No active bills.'}
        </p>
      )}

      {displayed.map((bill) => {
        const isExpanded = expandedId === bill.id;
        return (
          <div key={bill.id} className="rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 overflow-hidden">
            <AnimatePresence mode="wait">
              {isExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-white flex-1 truncate pr-2">{bill.title}</p>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="shrink-0 p-1 rounded-full hover:bg-slate-200/60 dark:hover:bg-white/10 transition"
                      aria-label="Collapse"
                    >
                      <img src="/chevron.svg" className="w-4 h-4 opacity-50" style={{ transform: 'rotate(180deg)' }} alt="collapse" />
                    </button>
                  </div>
                  <span className="text-[9px] font-bold text-kenya-green bg-kenya-green/10 px-1.5 py-px rounded-full">{bill.status || 'Active'}</span>
                  <BillTrack status={bill.status} />
                  {bill.summary && <p className="text-[10px] text-slate-500 dark:text-white/40 mt-2 line-clamp-3">{bill.summary}</p>}
                  <button
                    onClick={() => navigate(`/bill/${bill.slug || bill.id}`)}
                    className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-kenya-green hover:underline"
                  >
                    Full details <img src="/chevron.svg" className="w-2.5 h-2.5" alt="" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="mini"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-stretch"
                >
                  <div className="flex-[2] p-3 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{bill.title}</p>
                    <span className="text-[9px] font-bold text-kenya-green bg-kenya-green/10 px-1.5 py-px rounded-full mt-1 inline-block">
                      {bill.status?.split(' ').slice(0, 2).join(' ') || 'Active'}
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-slate-200/60 dark:border-white/10">
                    <button onClick={() => setExpandedId(bill.id)} className="flex-1 flex items-center justify-center px-3 hover:bg-kenya-green/5 transition border-b border-slate-200/60 dark:border-white/10" title="Open">
                      <span className="text-[9px] font-black text-kenya-green uppercase">Open</span>
                    </button>
                    <div className="flex-1 flex items-center justify-center px-3 border-b border-slate-200/60 dark:border-white/10" title="Following">
                      <span className="text-[9px] font-black text-slate-300 dark:text-white/20 uppercase">Following</span>
                    </div>
                    <button
                      onClick={() => setArchived(prev => { const n = new Set(prev); showArchived ? n.delete(bill.id) : n.add(bill.id); return n; })}
                      className="flex-1 flex items-center justify-center px-3 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                      title={showArchived ? 'Restore' : 'Archive'}
                    >
                      <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase">{showArchived ? 'Restore' : 'Archive'}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

// ─── ImpactSlide — Swahili levels, badge detail, navigator.share() ───────────
const ImpactSlide: React.FC<{
  user: any;
  totalPoints: number;
  leaderboardRank: number | null;
  followedBills: Bill[];
  participatedCampaigns: Campaign[];
  userBadges: any[];
}> = ({ user, totalPoints, leaderboardRank, followedBills, participatedCampaigns, userBadges }) => {
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
  const lvlData = getCivicLevel(totalPoints);
  const ringPct = getRingPct(totalPoints);

  const handleShare = async () => {
    const text = `My CEKA Civic Score: ${totalPoints.toLocaleString()} pts | ${lvlData.title} (${lvlData.subtitle}) | Rank #${leaderboardRank ?? '?'} — ceka.africa`;
    if (navigator.share) {
      await navigator.share({ title: 'My CEKA Civic Impact', text, url: 'https://ceka.africa' }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  if (!user) return (
    <div className="flex flex-col items-center py-8 gap-3">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/20 flex items-center justify-center">
        <TrendingUp className="w-7 h-7 text-slate-300 dark:text-white/20" />
      </div>
      <p className="text-xs text-slate-400 dark:text-white/30 text-center max-w-[180px]">Grow your civic score by tracking bills and joining campaigns.</p>
      <Link to="/auth" className="px-5 py-2 text-xs font-bold rounded-full bg-kenya-green text-white">Get Started</Link>
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 my-2">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-200 dark:text-white/10" />
          <motion.circle cx="50" cy="50" r="40" fill="none" stroke="#006B3F" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 40}
            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 40 - (ringPct / 100) * 2 * Math.PI * 40 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{totalPoints.toLocaleString()}</span>
          <span className="text-[8px] text-slate-400 dark:text-white/30 font-semibold uppercase tracking-wider">pts</span>
        </div>
      </div>
      <p className="text-sm font-bold text-slate-800 dark:text-white mb-0.5">
        {lvlData.title} <span className="text-slate-400 dark:text-white/40 font-normal text-xs">({lvlData.subtitle})</span>
      </p>
      {leaderboardRank && <p className="text-xs text-kenya-green mb-3">🏅 Rank #{leaderboardRank} on CEKA</p>}
      <div className="grid grid-cols-3 gap-2 w-full mb-3">
        {[{ v: followedBills.length, l: 'Bills' }, { v: participatedCampaigns.length, l: 'Campaigns' }, { v: userBadges.length, l: 'Badges' }].map(({ v, l }) => (
          <div key={l} className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-center">
            <p className="text-lg font-black text-slate-900 dark:text-white">{v}</p>
            <p className="text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-wide">{l}</p>
          </div>
        ))}
      </div>
      {userBadges.length > 0 && (
        <div className="w-full mb-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 text-center mb-2">Earned Badges</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {userBadges.map((ub: any, idx: number) => {
              const b = ub.civic_badges;
              return (
                <button key={idx} onClick={() => setSelectedBadge(selectedBadge?.name === b?.name ? null : b)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition ${selectedBadge?.name === b?.name ? 'bg-amber-500/20 border-amber-500/50 shadow-sm' : 'bg-amber-500/10 border-amber-500/20'} text-amber-600 dark:text-amber-300`}
                >
                  {b?.icon_url ? <img src={b.icon_url} alt={b.name} className="w-3 h-3 rounded object-contain" /> : <Award className="w-2.5 h-2.5" />}
                  <span className="text-[9px] font-bold uppercase tracking-wide">{b?.name || 'Badge'}</span>
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {selectedBadge && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
              >
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-0.5">{selectedBadge.name}</p>
                <p className="text-[10px] text-amber-600/80 dark:text-amber-200/60 leading-relaxed">
                  {selectedBadge.description || 'Awarded for outstanding civic participation on CEKA.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <button onClick={handleShare} className="mt-1 px-5 py-2 text-[10px] font-bold rounded-full border border-kenya-green/30 text-kenya-green hover:bg-kenya-green/10 transition uppercase tracking-widest">
        Share My Impact
      </button>
    </div>
  );
};

// ─── Detail Card (Stage C) ─────────────────────────────────────────────────────────
// Compact floating card (NOT full-width bottom sheet)
// Music-player inspired — floats above nav, rounded all sides
const DetailCard: React.FC<{
  slideIndex: number;
  onClose: () => void;
  onSlideChange: (i: number) => void;
  // Data props
  user: any;
  latestHeadline: string | null;
  temperature: 'cool' | 'warm' | 'hot';
  tickerItems: TickerItem[];
  followedBills: Bill[];
  recentBills: Bill[];
  upcomingEvents: CivicEvent[];
  alerts: any[];
  userNotifications: any[];
  npsAnswered: Set<string>;
  markAlertRead: (id: string) => void;
  markNotifRead: (id: string) => void;
  handleNpsResponse: (id: string, r: 'very_likely' | 'maybe' | 'not_likely') => void;
  totalPoints: number;
  ringPct: number;
  civicLevel: number;
  civicTitle: string;
  leaderboardRank: number | null;
  participatedCampaigns: Campaign[];
  userBadges: any[];
  resetUnreadCount: () => void;
}> = (props) => {
  const { slideIndex, onClose, onSlideChange } = props;
  const dragX = useMotionValue(0);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -50) onSlideChange(Math.min(SLIDES.length - 1, slideIndex + 1));
    else if (info.offset.x > 50) onSlideChange(Math.max(0, slideIndex - 1));
    else if (info.offset.y > 60) onClose();
    dragX.set(0);
  };

  const slide = SLIDES[slideIndex];

  return (
    <>
      {/* Scrim */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
      />

      {/* Floating compact card — NOT full-width, NOT full-height */}
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="fixed z-[9999]"
        style={{
          bottom: 92,
          left: '50%',
          x: '-50%',  // Must live inside Framer Motion style — not Tailwind, which gets clobbered by animation transform
          width: 'min(420px, calc(100vw - 24px))',
        }}
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">

            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center">
                  <NewsMicIcon className="w-3.5 h-3.5 text-slate-700 dark:text-white/80" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-white">Civic Mini-Player</span>
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-px rounded-full ${props.temperature === 'hot' ? 'bg-red-500/10 text-red-500' : props.temperature === 'warm' ? 'bg-amber-500/10 text-amber-500' : 'bg-kenya-green/10 text-kenya-green'}`}>
                  {props.temperature}
                </span>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition">
                <X className="w-3.5 h-3.5 text-slate-500 dark:text-white/60" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex px-4 pb-2 gap-0.5 bg-slate-50 dark:bg-white/5 mx-4 rounded-xl mb-2">
              {SLIDES.map((s, i) => (
                <button
                  key={s}
                  onClick={() => onSlideChange(i)}
                  className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all duration-200 ${i === slideIndex ? 'bg-white dark:bg-white/20 shadow-sm text-kenya-green' : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70'}`}
                >
                  {SLIDE_LABELS[s]}
                </button>
              ))}
            </div>

            {/* Swipeable content */}
            <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12} onDragEnd={handleDragEnd} style={{ x: dragX, touchAction: 'pan-y', cursor: 'grab' }}>
              <div style={{ height: 280, overflowY: 'auto', overflowX: 'hidden' }} className="scrollbar-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pb-4"
                  >
                    {/* NOW */}
                    {slide === 'now' && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${props.temperature === 'hot' ? 'bg-red-500' : 'bg-kenya-green'} animate-pulse`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${props.temperature === 'hot' ? 'text-red-500' : 'text-kenya-green'}`}>
                              {props.temperature === 'hot' ? 'Parliament in Session' : props.temperature === 'warm' ? 'Live Updates' : 'Live Updates'}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug">{props.latestHeadline || 'No new updates right now.'}</p>
                          <Link to="/legislative-tracker" className="inline-flex items-center gap-1 text-xs font-semibold text-kenya-green mt-2 hover:underline">
                            View tracker <img src="/chevron.svg" className="w-3 h-3" alt="" />
                          </Link>
                        </div>
                        {props.recentBills.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Latest Updates</p>
                            {props.recentBills.map(bill => (
                              <Link
                                key={bill.id}
                                to={`/bill/${bill.slug || bill.id}`}
                                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-kenya-green/5 dark:hover:bg-kenya-green/10 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-700 dark:text-white/80 truncate">{bill.title}</p>
                                  {bill.summary && <p className="text-[10px] text-slate-500 dark:text-white/40 truncate mt-0.5">{bill.summary}</p>}
                                </div>
                                <img src="/chevron.svg" className="w-3 h-3 shrink-0 opacity-40" alt="" />
                              </Link>
                            ))}
                          </div>
                        )}
                        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-2">
                          <Ticker items={props.tickerItems} />
                        </div>
                      </div>
                    )}

                    {/* FOLLOWED BILLS */}
                    {slide === 'bills' && (
                      <FollowedBillsSlide
                        user={props.user}
                        followedBills={props.followedBills}
                      />
                    )}

                    {/* CALENDAR */}
                    {slide === 'calendar' && (
                      <div className="space-y-2">
                        {props.upcomingEvents.length === 0 ? (
                          <div className="flex flex-col items-center py-8 gap-2">
                            <Calendar className="w-7 h-7 text-slate-200 dark:text-white/10" />
                            <p className="text-xs text-slate-400 dark:text-white/30 text-center">No upcoming civic events.</p>
                          </div>
                        ) : (
                          props.upcomingEvents.map((event) => {
                            const { month, day } = fmtDate(event.event_date);
                            return (
                              <div key={event.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                                <div className="w-10 shrink-0 bg-kenya-green/10 border border-kenya-green/20 rounded-xl px-1 py-1.5 text-center">
                                  <p className="text-[8px] font-black text-kenya-green uppercase tracking-wide">{month}</p>
                                  <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5">{day}</p>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-white mb-1">{event.title}</p>
                                  {event.description && <p className="text-[10px] text-slate-500 dark:text-white/40 line-clamp-2">{event.description}</p>}
                                  {event.start_time && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                                      <span className="text-[10px] text-slate-500 dark:text-white/40">{event.start_time.slice(0, 5)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* ALERTS */}
                    {slide === 'alerts' && (
                      <div className="space-y-2">
                        {!props.user ? (
                          <div className="flex flex-col items-center py-8 gap-2">
                            <Bell className="w-7 h-7 text-slate-200 dark:text-white/10" />
                            <p className="text-xs text-slate-400 dark:text-white/30">Sign in to see alerts</p>
                          </div>
                        ) : props.alerts.length === 0 && props.userNotifications.length === 0 ? (
                          <div className="flex flex-col items-center py-8 gap-2">
                            <CheckCircle className="w-7 h-7 text-slate-200 dark:text-white/10" />
                            <p className="text-xs text-slate-400 dark:text-white/30">No new updates right now.</p>
                          </div>
                        ) : (
                          <>
                            {props.alerts.map(alert => (
                              <div key={alert.id} onClick={() => { props.markAlertRead(alert.id); if (alert.url && alert.url !== '#') window.location.href = alert.url; }}
                                className={`flex gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${!alert.read ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10'}`}>
                                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${!alert.read ? 'bg-red-500/10' : 'bg-slate-200/50 dark:bg-white/10'}`}>
                                  <Bell className={`w-3 h-3 ${!alert.read ? 'text-red-500' : 'text-slate-400 dark:text-white/30'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{alert.title}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-white/40">{alert.description}</p>
                                  <p className="text-[9px] text-slate-400 dark:text-white/25 mt-0.5">{timeSince(alert.timestamp)}</p>
                                </div>
                                {!alert.read && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />}
                              </div>
                            ))}
                            {props.userNotifications.map((notif: any) => {
                              const isNps = notif.metadata?.nps_type === 'signature' && !props.npsAnswered.has(notif.id);
                              // Format source_type: bill_update → Bill Update
                              const typeLabel = notif.source_type
                                ? notif.source_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                                : '';
                              return (
                                <div key={notif.id} className="p-2.5 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                                  <div className="flex justify-between items-center gap-2 mb-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-kenya-green shrink-0" />}
                                      <p className={`text-xs font-semibold text-slate-800 dark:text-white truncate ${!notif.is_read ? 'text-primary' : ''}`}>{notif.title}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[9px] text-slate-400 dark:text-white/25 whitespace-nowrap">{new Date(notif.created_at).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                      <button onClick={() => props.markNotifRead(notif.id)} className="opacity-40 hover:opacity-80 transition">
                                        <X className="w-3 h-3 text-slate-500 dark:text-white/50" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-white/40 line-clamp-2 mb-1.5">{notif.message}</p>
                                  {isNps && (
                                    <div className="flex gap-1.5">
                                      {(['very_likely', 'maybe', 'not_likely'] as const).map((opt) => (
                                        <button key={opt} onClick={() => props.handleNpsResponse(notif.id, opt)}
                                          className="flex-1 text-[9px] font-bold py-1.5 rounded-lg border border-kenya-green/30 text-kenya-green bg-kenya-green/5 hover:bg-kenya-green hover:text-white transition uppercase tracking-wide">
                                          {opt === 'very_likely' ? '👍 Yes' : opt === 'maybe' ? '🤔 Maybe' : '👎 No'}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {!isNps && notif.link && (
                                    <button onClick={() => { props.markNotifRead(notif.id); window.location.href = notif.link; }}
                                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-kenya-green hover:underline mt-1">
                                      {typeLabel || 'View'} <img src="/chevron.svg" className="w-2.5 h-2.5" alt="" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}

                    {/* IMPACT */}
                    {slide === 'impact' && (
                      <ImpactSlide
                        user={props.user}
                        totalPoints={props.totalPoints}
                        leaderboardRank={props.leaderboardRank}
                        followedBills={props.followedBills}
                        participatedCampaigns={props.participatedCampaigns}
                        userBadges={props.userBadges}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-white/10">
              <button onClick={props.resetUnreadCount} className="text-[10px] font-medium text-slate-400 dark:text-white/30 hover:text-kenya-green transition">Mark all read</button>
              <div className="flex items-center gap-1">
                {SLIDES.map((_, i) => (
                  <div key={i} onClick={() => onSlideChange(i)} className={`h-1 rounded-full cursor-pointer transition-all duration-300 ${i === slideIndex ? 'w-4 bg-kenya-green' : 'w-1 bg-slate-200 dark:bg-white/20'}`} />
                ))}
              </div>
              <button onClick={onClose} className="text-[10px] font-medium text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition">Close</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface CivicMiniPlayerProps {
  isHidden?: boolean;
  onHide?: () => void;
}

const CivicMiniPlayer: React.FC<CivicMiniPlayerProps> = ({ isHidden, onHide }) => {
  const { user } = useAuth();
  const {
    activeTab, setActiveTab,
    unreadCount, latestHeadline, temperature,
    alerts, markAlertRead, resetUnreadCount,
  } = useCivicPlayerStore();
  useCivicPlayerData();

  // ── 3-stage player mode (local — does not conflict with store) ────────────
  const [mode, setMode] = useState<PlayerMode>('fab');
  const [slideIndex, setSlideIndex] = useState(0);

  // When Layout signals hide (swipe off by user), suppress rendering entirely
  if (isHidden) return null;

  // ── Canonical data state ──────────────────────────────────────────────────
  const [followedBills, setFollowedBills] = useState<Bill[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CivicEvent[]>([]);
  const [participatedCampaigns, setParticipatedCampaigns] = useState<Campaign[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [npsAnswered, setNpsAnswered] = useState<Set<string>>(new Set());

  // Derived Swahili level — computed from points, not from DB
  const swahiliLevel = getCivicLevel(totalPoints);
  const civicLevel = swahiliLevel.level;
  const civicTitle = swahiliLevel.title;
  const ringPct = getRingPct(totalPoints);

  // ── markNotifRead (canonical) ─────────────────────────────────────────────
  const markNotifRead = useCallback(async (notifId: string) => {
    setUserNotifications(prev => prev.filter(n => n.id !== notifId));
    await (supabase as any).from('user_notifications').update({ is_read: true }).eq('id', notifId);
  }, []);

  // ── NPS response (canonical RPC) ─────────────────────────────────────────
  const handleNpsResponse = useCallback(async (notifId: string, response: 'very_likely' | 'maybe' | 'not_likely') => {
    if (!user) return;
    setNpsAnswered(prev => new Set([...prev, notifId]));
    await (supabase as any).rpc('record_nps_response', { p_user_id: user.id, p_response: response, p_source: 'signature' });
    markNotifRead(notifId);
  }, [user, markNotifRead]);

  // ── Full canonical fetch (all 9 queries from original) ───────────────────
  const fetchPersonalData = useCallback(async () => {
    if (!user) return;
    // 1. Bill follows (include summary)
    const { data: fD } = await supabase.from('bill_follows').select('bill_id, bills!inner(id, title, status, slug, category, summary)').eq('user_id', user.id);
    setFollowedBills((fD?.map((f: any) => f.bills) || []) as Bill[]);
    // 2. Events
    const { data: ev } = await supabase.from('civic_events').select('id, title, event_date, start_time, description').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date', { ascending: true }).limit(10);
    setUpcomingEvents(ev || []);
    // 3. Campaigns
    const { data: cD } = await supabase.from('campaign_participants').select('campaign_id, campaigns!inner(id, title, description, slug)').eq('user_id', user.id);
    setParticipatedCampaigns((cD?.map((c: any) => c.campaigns) || []) as Campaign[]);
    // 4. Recent bills (include summary)
    const { data: rB } = await (supabase as any).from('bills').select('id, title, status, slug, summary').order('updated_at', { ascending: false }).limit(3);
    setRecentBills((rB || []) as Bill[]);
    // 5. user_points (CANONICAL — only points, no level)
    const { data: pR } = await (supabase as any).from('user_points').select('total_points').eq('user_id', user.id).single();
    const pts = pR?.total_points || 0;
    setTotalPoints(pts);
    // 6. leaderboard rank (CANONICAL)
    const { data: rk } = await (supabase as any).from('leaderboard').select('user_id, rank').eq('user_id', user.id).single();
    setLeaderboardRank(rk?.rank || null);
    // 8. user_badges + civic_badges (CANONICAL)
    const { data: bD } = await (supabase as any).from('user_badges').select('awarded_at, civic_badges(name, description, icon_url, category)').eq('user_id', user.id);
    setUserBadges(bD || []);
    // 9. user_notifications unread (CANONICAL)
    const { data: nf } = await (supabase as any).from('user_notifications').select('id, title, message, is_read, link, category, priority, created_at, metadata, source_type').eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(20);
    setUserNotifications(nf || []);
  }, [user]);

  useEffect(() => {
    if (mode !== 'fab') fetchPersonalData();
  }, [mode, user, fetchPersonalData]);

  // Sync store activeTab → slideIndex
  useEffect(() => {
    const idx = SLIDES.indexOf(activeTab as SlideKey);
    if (idx !== -1) setSlideIndex(idx);
  }, [activeTab]);

  const handleSlideChange = useCallback((i: number) => {
    const c = Math.max(0, Math.min(SLIDES.length - 1, i));
    setSlideIndex(c); setActiveTab(SLIDES[c] as any);
  }, [setActiveTab]);

  // Content items for Stage B rotating mini-bar — live data, deeplinked
  const contentItems: MiniContent[] = React.useMemo(() => {
    const items: MiniContent[] = [];
    if (latestHeadline) items.push({ title: latestHeadline, type: 'Live Update', link: '/legislative-tracker' });
    followedBills.slice(0, 3).forEach(b => items.push({ title: b.title, type: 'Bill', link: `/bill/${b.slug || b.id}` }));
    upcomingEvents.slice(0, 2).forEach(e => { const { day, month } = fmtDate(e.event_date); items.push({ title: e.title, type: `Event · ${day} ${month}`, link: '/civic-events' }); });
    recentBills.slice(0, 2).forEach(b => items.push({ title: b.title, type: 'Latest Bill', link: `/bill/${b.slug || b.id}` }));
    participatedCampaigns.slice(0, 2).forEach(c => items.push({ title: c.title, type: 'Campaign', link: `/campaign/${c.slug || c.id}` }));
    if (!items.length) {
      items.push({ title: 'Civic Education Kenya', type: 'CEKA', link: '/' });
      items.push({ title: 'Follow bills in the tracker', type: 'Resource', link: '/legislative-tracker' });
      items.push({ title: 'Stay informed. Stay engaged.', type: 'CEKA', link: '/' });
    }
    return items;
  }, [latestHeadline, followedBills, upcomingEvents, recentBills, participatedCampaigns]);

  const sharedProps = {
    user, latestHeadline: latestHeadline || '', temperature, tickerItems: [] as TickerItem[],
    followedBills, recentBills, upcomingEvents, alerts, userNotifications,
    npsAnswered, markAlertRead, markNotifRead, handleNpsResponse,
    totalPoints, ringPct, civicLevel, civicTitle, leaderboardRank,
    participatedCampaigns, userBadges, resetUnreadCount,
    unreadCount,
  };

  return (
    <>
      {/* STAGE A: FAB (idle) */}
      <AnimatePresence>
        {mode === 'fab' && (
          <CivicFAB
            unreadCount={unreadCount}
            temperature={temperature}
            onTap={() => setMode('mini')}
            onHide={() => onHide?.()}
          />
        )}
      </AnimatePresence>

      {/* STAGE B: Mini-player bar */}
      <AnimatePresence>
        {mode === 'mini' && (
          <MiniPlayerBar
            contentItems={contentItems}
            temperature={temperature}
            unreadCount={unreadCount}
            slideIndex={slideIndex}
            onSwipeLeft={() => handleSlideChange(slideIndex + 1)}
            onSwipeRight={() => handleSlideChange(slideIndex - 1)}
            onExpand={() => setMode('detail')}
            onCollapse={() => setMode('fab')}
            currentBill={followedBills[0]}
          />
        )}
      </AnimatePresence>

      {/* STAGE C: Detail card */}
      <AnimatePresence>
        {mode === 'detail' && (
          <DetailCard
            {...sharedProps}
            slideIndex={slideIndex}
            onClose={() => setMode('mini')}
            onSlideChange={handleSlideChange}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default CivicMiniPlayer;