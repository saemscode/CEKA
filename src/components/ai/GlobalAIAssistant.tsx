// Global AI Assistant FAB - positioned above donation button
// Credit warnings at 10, 5, 2 remaining — Vercel feature flags integrated
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, X, Bot, HelpCircle, AlertTriangle, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { SearchStatusIcon } from '@/components/ui/CustomIcons';

const ChatRoundIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M7.45648 3.08984C4.21754 4.74468 2 8.1136 2 12.0004C2 13.6001 2.37562 15.1121 3.04346 16.4529C3.22094 16.8092 3.28001 17.2165 3.17712 17.6011L2.58151 19.8271C2.32295 20.7934 3.20701 21.6775 4.17335 21.4189L6.39939 20.8233C6.78393 20.7204 7.19121 20.7795 7.54753 20.957C8.88836 21.6248 10.4003 22.0005 12 22.0005C16.8853 22.0005 20.9524 18.4973 21.8263 13.866C20.1758 15.7851 17.7298 17.0004 15 17.0004C10.0294 17.0004 6 12.971 6 8.00045C6 6.18869 6.53534 4.50197 7.45648 3.08984Z" fill="currentColor" />
        <path opacity="0.5" d="M21.8263 13.8655C21.9403 13.2611 22 12.6375 22 12C22 6.47715 17.5228 2 12 2C10.4467 2 8.97611 2.35415 7.66459 2.98611C7.59476 3.01975 7.52539 3.05419 7.45648 3.08939C6.53534 4.50152 6 6.18824 6 8C6 12.9706 10.0294 17 15 17C17.7298 17 20.1758 15.7847 21.8263 13.8655Z" fill="currentColor" />
    </svg>
);

// ============================================================================
// VERCEL FEATURE FLAGS
// These are read from environment variables set in your Vercel project dashboard.
// To override them: Vercel Dashboard → Project → Settings → Environment Variables
// Redeploy after changing any flag for it to take effect.
//
// FLAG REFERENCE:
//   VITE_FLAG_AI_ENABLED          → "true" / "false"  — kill switch for the entire assistant
//   VITE_FLAG_DAILY_LIMIT         → number as string   — daily message cap (default: "20")
//   VITE_FLAG_WARN_THRESHOLD_HIGH → number as string   — first warning (default: "10")
//   VITE_FLAG_WARN_THRESHOLD_MID  → number as string   — second warning (default: "5")
//   VITE_FLAG_WARN_THRESHOLD_LOW  → number as string   — final warning (default: "2")
// ============================================================================
const FLAGS = {
    AI_ENABLED: import.meta.env.VITE_FLAG_AI_ENABLED !== 'false',
    DAILY_LIMIT: parseInt(import.meta.env.VITE_FLAG_DAILY_LIMIT ?? '20', 10),
    WARN_HIGH: parseInt(import.meta.env.VITE_FLAG_WARN_THRESHOLD_HIGH ?? '10', 10),
    WARN_MID: parseInt(import.meta.env.VITE_FLAG_WARN_THRESHOLD_MID ?? '5', 10),
    WARN_LOW: parseInt(import.meta.env.VITE_FLAG_WARN_THRESHOLD_LOW ?? '2', 10),
} as const;

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// ============================================================================
// RATE LIMITING
// ============================================================================
const RATE_LIMIT_KEY = 'ceka_ai_usage';

const getUsageToday = (): number => {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (!stored) return 0;
    const { count, date } = JSON.parse(stored);
    if (date !== new Date().toDateString()) return 0;
    return count;
};

const incrementUsage = () => {
    const count = getUsageToday() + 1;
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
        count,
        date: new Date().toDateString()
    }));
    return count;
};

// ============================================================================
// CREDIT WARNING LOGIC
// Returns the warning tier for the current remaining count, or null if safe.
// ============================================================================
type WarningTier = 'high' | 'mid' | 'low' | null;

const getWarningTier = (remaining: number): WarningTier => {
    if (remaining <= FLAGS.WARN_LOW) return 'low';
    if (remaining <= FLAGS.WARN_MID) return 'mid';
    if (remaining <= FLAGS.WARN_HIGH) return 'high';
    return null;
};

const WARNING_CONFIG: Record<
    Exclude<WarningTier, null>,
    { label: string | ((r: number) => string); colour: string; bgColour: string; borderColour: string; icon: React.ReactNode }
> = {
    high: {
        label: 'queries remaining today',
        colour: 'text-amber-600 dark:text-amber-400',
        bgColour: 'bg-amber-50 dark:bg-amber-900/20',
        borderColour: 'border-amber-200 dark:border-amber-700/40',
        icon: <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />,
    },
    mid: {
        label: 'queries left — use them wisely',
        colour: 'text-orange-600 dark:text-orange-400',
        bgColour: 'bg-orange-50 dark:bg-orange-900/20',
        borderColour: 'border-orange-200 dark:border-orange-700/40',
        icon: <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />,
    },
    low: {
        label: (r: number) => r === 1 ? 'query left — last one!' : 'queries left — almost out!',
        colour: 'text-red-600 dark:text-red-400',
        bgColour: 'bg-red-50 dark:bg-red-900/20',
        borderColour: 'border-red-200 dark:border-red-700/40',
        icon: <Flame className="h-3 w-3 text-red-500 shrink-0" />,
    },
};

// ============================================================================
// CREDIT WARNING BANNER
// Renders inline above the input bar when approaching the daily limit.
// ============================================================================
interface CreditWarningProps {
    remaining: number;
}

const CreditWarningBanner: React.FC<CreditWarningProps> = ({ remaining }) => {
    const tier = getWarningTier(remaining);
    if (!tier) return null;

    const config = WARNING_CONFIG[tier];
    const label = typeof config.label === 'function' ? config.label(remaining) : config.label;

    return (
        <AnimatePresence>
            <motion.div
                key={`warning-${tier}`}
                initial={{ opacity: 0, y: 4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={cn(
                    'mx-4 mb-0 mt-2 px-3 py-2 rounded-xl border flex items-center gap-2',
                    config.bgColour,
                    config.borderColour
                )}
            >
                {config.icon}
                <span className={cn('text-[10px] font-semibold leading-tight', config.colour)}>
                    <span className="font-bold">{remaining}</span> {label}
                </span>
            </motion.div>
        </AnimatePresence>
    );
};

// ============================================================================
// COUNTER BADGE — shown in the header, colour-shifts with warning tier
// ============================================================================
interface CounterBadgeProps {
    remaining: number;
    total: number;
}

const CounterBadge: React.FC<CounterBadgeProps> = ({ remaining, total }) => {
    const tier = getWarningTier(remaining);

    const colourClass = tier === 'low'
        ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50'
        : tier === 'mid'
            ? 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/50'
            : tier === 'high'
                ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50'
                : 'text-kenya-green dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30';

    return (
        <motion.span
            key={remaining}
            initial={{ scale: 1.3, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn('text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-md', colourClass)}
        >
            {remaining}/{total}
        </motion.span>
    );
};

// ============================================================================
// PAGE DICTIONARY — CEKA site map for fuzzy links
// ============================================================================
let PAGE_DICTIONARY: Record<string, string> = {
    'home': '/',
    'bills': '/legislative-tracker',
    'constitution': '/constitution'
};
let PAGE_KEYS = Object.keys(PAGE_DICTIONARY);
let FUZZY_REGEX = new RegExp(`\\b(${PAGE_KEYS.sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})\\b`, 'gi');

const SITEMAP_CACHE_KEY = 'ceka_sitemap_dictionary_cache';
const SITEMAP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function initializeSitemapDictionary() {
    try {
        const cached = localStorage.getItem(SITEMAP_CACHE_KEY);
        if (cached) {
            const { dictionary, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < SITEMAP_CACHE_TTL) {
                PAGE_DICTIONARY = dictionary;
                PAGE_KEYS = Object.keys(PAGE_DICTIONARY);
                if (PAGE_KEYS.length > 0) {
                    FUZZY_REGEX = new RegExp(`\\b(${PAGE_KEYS.sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})\\b`, 'gi');
                }
                return;
            }
        }

        const res = await fetch('/sitemap.xml');
        if (!res.ok) return;
        const text = await res.text();
        
        const locRegex = /<loc>(.*?)<\/loc>/g;
        const newDict: Record<string, string> = {
            'home': '/', 'about': '/about', 'tools': '/tools', 'community': '/community', 'calendar': '/calendar'
        };
        
        let match;
        while ((match = locRegex.exec(text)) !== null) {
            try {
                const path = new URL(match[1]).pathname;
                if (path === '/' || path.includes('/bill/')) continue; // Skip massive bill list
                const key = path.split('/').pop()?.replace(/-/g, ' ').toLowerCase();
                if (key && key.length > 2) newDict[key] = path;
            } catch (e) {}
        }
        
        // Add manual aliases for critical pages
        Object.assign(newDict, {
            'bills': '/legislative-tracker', 'bills tracker': '/legislative-tracker',
            'legislative tracker': '/legislative-tracker', 'visual insights': '/pieces',
            'events': '/calendar', 'civic calendar': '/calendar',
            'nasaka': '/nasaka-iebc', 'iebc': '/nasaka-iebc',
            'volunteer': '/join-community?tab=volunteer',
            'peoples audit': '/peoples-audit'
        });

        PAGE_DICTIONARY = newDict;
        PAGE_KEYS = Object.keys(PAGE_DICTIONARY);
        if (PAGE_KEYS.length > 0) {
            FUZZY_REGEX = new RegExp(`\\b(${PAGE_KEYS.sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})\\b`, 'gi');
        }

        localStorage.setItem(SITEMAP_CACHE_KEY, JSON.stringify({
            dictionary: PAGE_DICTIONARY,
            timestamp: Date.now()
        }));
    } catch (err) {
        console.error("[CEKA AI] Sitemap parsing failed", err);
    }
}

// ============================================================================
// LIVE PAGE DISCOVERY
// ============================================================================
interface PageSnapshot {
    title: string;
    description: string;
    headings: string[];
    textExcerpt: string;
}

function capturePageSnapshot(): PageSnapshot {
    const title = document.title || '';
    const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    const description = metaDesc?.content || '';
    const headings = Array.from(document.querySelectorAll('h1, h2, [data-ai-context]'))
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean)
        .slice(0, 8);
    const paras = Array.from(document.querySelectorAll('p, [data-ai-excerpt]'))
        .map(el => el.textContent?.trim() || '')
        .filter(t => t.length > 40)
        .slice(0, 3);
    const textExcerpt = paras.join(' ').slice(0, 500);
    return { title, description, headings, textExcerpt };
}

// ============================================================================
// TYPES
// ============================================================================
interface Message {
    role: 'user' | 'ai';
    content: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
interface GlobalAIAssistantProps {
    isHidden?: boolean;
    onHide?: () => void;
}

const GlobalAIAssistant: React.FC<GlobalAIAssistantProps> = ({ isHidden, onHide }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [count, setCount] = useState<number | null>(null);
    const [cycleIndex, setCycleIndex] = useState(0);

    const QUESTIONS = [
        'What is Article 43?', 'Explain Finance Bill', 'What can I do as a citizen?',
        'What is Chapter Six?', 'Who is the Auditor General?', 'How laws are made?',
        'Meaning of Devolution', 'IEBC current status', 'Rights of the accused',
        'Supreme Court role', 'Article 2 of Constitution', 'How to join community?',
        'Public Participation role', 'What is EACC?', 'How to recall an MP?',
        'County vs National govt', 'Sovereignty of people', 'Bill of Rights summary',
        'National Values (Art 10)', 'Taxpayer rights in Kenya', 'Ombudsman role'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCycleIndex(prev => (prev + 1) % Math.ceil(QUESTIONS.length / 3));
        }, 8000); // Slightly slower for better readability
        return () => clearInterval(interval);
    }, [QUESTIONS.length]);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [usage, setUsage] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isIdle, setIsIdle] = useState(false);
    const [showPulse, setShowPulse] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [navLabel, setNavLabel] = useState<string | null>(null);

    const queryRef = React.useRef(query);
    const usageRef = React.useRef(usage);
    const loadingRef = React.useRef(loading);

    const location = useLocation();
    const navigate = useNavigate();

    const remaining = FLAGS.DAILY_LIMIT - usage;
    const isExhausted = usage >= FLAGS.DAILY_LIMIT;

    // Engagement effects
    useEffect(() => {
        const pulseTimer = setTimeout(() => {
            if (!isOpen) setShowPulse(true);
        }, 15000);

        const idleTimer = setTimeout(() => {
            if (!isOpen && !isHovering) setIsIdle(true);
        }, 45000);

        return () => {
            clearTimeout(pulseTimer);
            clearTimeout(idleTimer);
        };
    }, [isOpen, isHovering]);

    // Sync refs
    useEffect(() => { queryRef.current = query; }, [query]);
    useEffect(() => { usageRef.current = usage; }, [usage]);
    useEffect(() => { loadingRef.current = loading; }, [loading]);

    const hiddenPaths = [] as string[];
    const shouldHide = hiddenPaths.some(p => location.pathname.startsWith(p));

    useEffect(() => {
        setUsage(getUsageToday());
        
        initializeSitemapDictionary();

        const handleTrigger = (e: any) => {
            const { query: triggerQuery } = e.detail;
            setIsOpen(true);
            setQuery(triggerQuery);
            setTimeout(() => {
                handleSend(triggerQuery);
            }, 50);
        };

        const visibilityTimer = setTimeout(() => {
            setIsVisible(true);
        }, 5000);

        window.addEventListener('ceka-ai-trigger', handleTrigger);
        return () => {
            window.removeEventListener('ceka-ai-trigger', handleTrigger);
            clearTimeout(visibilityTimer);
        };
    }, []);

    useEffect(() => {
        const handleSendNow = () => handleSend();
        document.addEventListener('ceka-ai-send-now', handleSendNow);
        return () => document.removeEventListener('ceka-ai-send-now', handleSendNow);
    }, []);

    const extractBillIdFromPath = (path: string): string | null => {
        const match = path.match(/\/bill\/([0-9a-fA-F-]{36})/);
        return match ? match[1] : null;
    };

    const handleSend = async (overrideQuery?: string) => {
        const activeQuery = overrideQuery !== undefined ? overrideQuery : queryRef.current;

        if (!activeQuery.trim() || loadingRef.current) return;

        if (usageRef.current >= FLAGS.DAILY_LIMIT) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `You've used all ${FLAGS.DAILY_LIMIT} queries for today. Come back tomorrow — we'll be here.`
            }]);
            return;
        }

        const userMsg = activeQuery;
        const updatedMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
        setMessages(updatedMessages);
        setQuery('');
        setLoading(true);

        const pageSnapshot = capturePageSnapshot();
        const conversationHistory = updatedMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

        try {
            const { data, error } = await supabase.functions.invoke('ceka-ai-assistant', {
                body: {
                    query: userMsg,
                    context: location.pathname,
                    billId: extractBillIdFromPath(location.pathname) || null,
                    pageTitle: document.title || null,
                    conversationHistory,
                    pageSnapshot
                }
            });

            if (error) throw error;

            if (data.error) {
                let userMessage: string;
                if (data.exhausted) {
                    userMessage = "All of our AI systems are currently at capacity. This is a temporary spike in demand – please try again in a few minutes.";
                } else if (data.message?.includes('rate limit') || data.message?.includes('429')) {
                    userMessage = "Our AI systems are experiencing high demand right now. Please try again in a moment.";
                } else if (data.message?.includes('timeout') || data.message?.includes('timed out')) {
                    userMessage = "Your question is taking a bit longer than usual to process. Please try again.";
                } else {
                    userMessage = data.message || "Something went wrong on our end. Please try again shortly.";
                }

                setMessages(prev => [...prev, { role: 'ai', content: userMessage }]);
                return;
            }

            const newUsage = incrementUsage();
            setUsage(newUsage);

            setMessages(prev => [...prev, {
                role: 'ai',
                content: data.answer || "I couldn't process that request. Please try again."
            }]);

            if (data.action && data.action.type === 'navigate_to' && data.action.target) {
                const target = data.action.target;
                if (location.pathname !== target) {
                    const pageName = target.replace('/', '').replace(/-/g, ' ') || 'home';
                    setNavLabel(`Opening ${pageName}…`);
                    setTimeout(() => {
                        navigate(target);
                        setTimeout(() => setNavLabel(null), 1200);
                    }, 1400);
                }
            }
        } catch (err: any) {
            let errorMessage: string;
            if (err?.message?.includes('FetchError') || err?.message?.includes('network') || err?.message?.includes('Failed to fetch')) {
                errorMessage = "We're having trouble reaching our AI service. Please check your internet connection and try again.";
            } else if (err?.message?.includes('timeout')) {
                errorMessage = "The request took too long to complete. Please try again in a moment.";
            } else {
                errorMessage = "Something went wrong on our end. Please try again shortly.";
            }
            setMessages(prev => [...prev, { role: 'ai', content: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };

    if (!FLAGS.AI_ENABLED) return null;

    return (
        <AnimatePresence>
            {(shouldHide || isHidden) ? null : (
                <motion.div
                    drag={!isOpen ? "x" : false}
                    dragConstraints={{ left: 0, right: 300 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => {
                        if (!isOpen && info.offset.x > 80) {
                            onHide?.();
                        }
                    }}
                    className={cn(
                        "fixed pointer-events-auto",
                        isOpen ? "inset-0 flex items-center justify-center z-[9999]" : "z-40",
                        !isVisible && !isOpen && "opacity-0 translate-y-20 pointer-events-none"
                    )}
                    style={{
                        touchAction: 'none',
                        ...(isOpen ? {
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0
                        } : {
                            bottom: '208px',
                            right: '2rem'
                        })
                    }}
                >
                    <AnimatePresence>
                        {isOpen && (
                            <>
                                {/* Dimming Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsOpen(false)}
                                    className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[-1]"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="w-80 max-h-[90vh] bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                                >
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-kenya-green/10 to-primary/10 p-4 border-b border-white/10 dark:border-gray-700/10">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-lg flex items-center text-fill-[#013001] dark:text-white">
                                                <div className="relative mr-3">
                                                    <SearchStatusIcon className="h-6 w-6 text-kenya-green drop-shadow-sm" />
                                                    <div className="absolute inset-0 bg-kenya-green/20 blur-sm rounded-full" />
                                                </div>
                                                CEKA AI
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <CounterBadge remaining={remaining} total={FLAGS.DAILY_LIMIT} />
                                                <button
                                                    className="relative group rounded-full p-2 hover:bg-white/10 dark:hover:bg-gray-800/10 transition-all duration-300 backdrop-blur-sm"
                                                    onClick={() => setIsOpen(false)}
                                                >
                                                    <X className="h-4 w-4 text-slate-500 dark:text-gray-400 group-hover:text-kenya-red transition-colors" />
                                                    <div className="absolute inset-0 rounded-full bg-white/5 scale-0 group-hover:scale-100 transition-transform duration-300" />
                                                </button>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {navLabel && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                    className="mt-2 flex items-center gap-2 text-[11px] text-kenya-green font-semibold"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12H19M13 6L19 12L13 18"/></svg>
                                                    {navLabel}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 green-scrollbar">
                                        {messages.length === 0 && (
                                            <div className="text-center py-8 space-y-4">
                                                <div className="h-16 w-16 rounded-2xl bg-kenya-green/10 flex items-center justify-center mx-auto animate-float">
                                                    <ChatRoundIcon size={32} className="text-kenya-green" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-fill-[#013001] dark:text-white">Your Civic Assistant</p>
                                                    <p className="text-xs text-slate-700 dark:text-gray-400 mt-1">Ask about legislation or the Constitution</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2 justify-center min-h-[4rem]">
                                                    <AnimatePresence mode="wait">
                                                        <motion.div
                                                            key={cycleIndex}
                                                            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                                                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                                            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                                                            transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
                                                            className="flex flex-wrap gap-2 justify-center"
                                                        >
                                                            {QUESTIONS.slice(cycleIndex * 3, (cycleIndex * 3) + 3).map(q => (
                                                                <button
                                                                    key={q}
                                                                    onClick={() => {
                                                                        setQuery(q);
                                                                        handleSend(q);
                                                                    }}
                                                                    className="text-[10px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-kenya-green/10 hover:border-kenya-green/20 text-slate-700 dark:text-white/60 hover:text-kenya-green transition-all hover:scale-105 backdrop-blur-sm shadow-sm"
                                                                >
                                                                    {q}
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        )}

                                        {messages.map((m, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[90%] p-3 rounded-2xl text-xs md:text-sm shadow-lg backdrop-blur-md ${m.role === 'user'
                                                    ? 'bg-kenya-green text-white rounded-tr-none'
                                                    : 'bg-white/10 dark:bg-gray-800/20 border border-white/20 dark:border-white/10 text-fill-[#013001] dark:text-white rounded-tl-none'
                                                    }`}>
                                                    <div className={cn(
                                                        "prose prose-sm dark:prose-invert prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-li:my-0.5 whitespace-pre-wrap break-words max-w-full overflow-hidden leading-snug",
                                                        m.role === 'user' && "text-white prose-p:text-white prose-headings:text-white prose-strong:text-white prose-em:text-white prose-code:text-white"
                                                    )}>
                                                        <ReactMarkdown
                                                            components={{
                                                                a: ({ href, children }) => {
                                                                    if (!href) return <span>{children}</span>;
                                                                    const isInternal = href.startsWith('/') && !href.startsWith('//');
                                                                    if (isInternal) {
                                                                        return (
                                                                            <Link to={href} onClick={() => setIsOpen(false)} className="underline font-semibold text-kenya-green hover:opacity-80 transition-colors">
                                                                                {children}
                                                                            </Link>
                                                                        );
                                                                    }
                                                                    return <a href={href} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-kenya-green hover:opacity-80 transition-colors">{children}</a>;
                                                                },
                                                                p: ({ children }) => {
                                                                    const processChildren = (kids: React.ReactNode): React.ReactNode => {
                                                                        if (typeof kids === 'string') {
                                                                            const parts = kids.split(FUZZY_REGEX);
                                                                            if (parts.length === 1) return kids;
                                                                            return parts.map((p, i) => {
                                                                                const url = PAGE_DICTIONARY[p.toLowerCase()];
                                                                                return url ? (
                                                                                    <Link key={i} to={url} onClick={() => setIsOpen(false)} className="underline font-semibold text-kenya-green hover:opacity-80 transition-colors">{p}</Link>
                                                                                ) : p;
                                                                            });
                                                                        }
                                                                        if (Array.isArray(kids)) return kids.map(processChildren);
                                                                        return kids;
                                                                    };
                                                                    return <p className="my-1">{processChildren(children)}</p>;
                                                                }
                                                            }}
                                                        >
                                                            {m.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}

                                        {loading && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/10 dark:bg-gray-800/20 border border-white/20 dark:border-white/10 p-3 rounded-2xl rounded-tl-none shadow-lg backdrop-blur-md">
                                                    <CEKALoader variant="default" size="sm" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Credit warning banner — mounts between messages and input */}
                                    {!isExhausted && <CreditWarningBanner remaining={remaining} />}

                                    {/* Exhausted state banner */}
                                    {isExhausted && (
                                        <div className="mx-4 mt-2 px-3 py-2 rounded-xl border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/40 flex items-center gap-2">
                                            <Flame className="h-3 w-3 text-red-500 shrink-0" />
                                            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 leading-tight">
                                                Daily limit reached. Resets at midnight.
                                            </span>
                                        </div>
                                    )}

                                    {/* Input */}
                                    <div className="p-4 border-t border-white/10 dark:border-gray-700/10 bg-white/5 dark:bg-black/20">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Ask about Kenya law..."
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                                className="h-10 text-sm rounded-xl border-white/20 dark:border-white/10 bg-white/10 dark:bg-black/20 focus:ring-kenya-green/50 placeholder:text-slate-600"
                                                disabled={isExhausted}
                                            />
                                            <Button
                                                onClick={() => handleSend()}
                                                size="icon"
                                                className="h-10 w-10 rounded-xl bg-gradient-to-br from-kenya-green to-primary hover:from-primary hover:to-kenya-green text-white shrink-0 shadow-lg hover:scale-105 transition-all"
                                                disabled={loading || isExhausted}
                                            >
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {!isOpen && (
                        <motion.div
                            onMouseEnter={() => {
                                setIsHovering(true);
                                setIsIdle(false);
                            }}
                            onMouseLeave={() => setIsHovering(false)}
                            className="relative group cursor-pointer"
                            onClick={() => {
                                setIsOpen(true);
                                setShowPulse(false);
                            }}
                        >
                            <div className="relative w-48 h-12 flex items-center">
                                <div
                                    className={`absolute right-12 top-0 h-12 flex items-center transition-all duration-500 ease-out ${isHovering
                                        ? 'opacity-100 translate-x-0'
                                        : 'opacity-0 translate-x-4 pointer-events-none'
                                        }`}
                                >
                                    <div
                                        className={`absolute inset-0 rounded-full transition-all duration-500 ease-out ${isHovering
                                            ? 'bg-black/20 backdrop-blur-sm scale-100'
                                            : 'bg-black/0 backdrop-blur-none scale-75'
                                            }`}
                                    />
                                    <span
                                        className={`relative px-4 py-2 text-white font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-out drop-shadow-lg ${isHovering
                                            ? 'opacity-100 scale-100'
                                            : 'opacity-0 scale-90'
                                            }`}
                                    >
                                        Ask CEKA AI
                                    </span>
                                </div>
                                <div
                                    className={`absolute right-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ease-out shadow-2xl ${isHovering || showPulse
                                        ? 'bg-gradient-to-br from-kenya-green via-primary to-kenya-green shadow-kenya-green/50 scale-110'
                                        : 'bg-gradient-to-br from-kenya-green to-primary shadow-kenya-green/40 scale-100'
                                        }`}
                                >
                                    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                                    <ChatRoundIcon
                                        size={24}
                                        className={cn(
                                            "relative z-10 transition-all duration-300 ease-out",
                                            isHovering ? 'text-white scale-110 drop-shadow-lg' : 'text-white/90'
                                        )}
                                    />
                                    {showPulse && !isHovering && (
                                        <div className="absolute inset-0 rounded-full bg-kenya-green animate-ping opacity-20" />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalAIAssistant;
