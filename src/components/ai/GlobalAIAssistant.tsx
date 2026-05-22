import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, X, Bot, HelpCircle, AlertTriangle, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { CEKALoader } from '@/components/ui/ceka-loader';

// ============================================================================
// VERCEL FEATURE FLAGS
// ============================================================================
const FLAGS = {
    AI_ENABLED: import.meta.env.VITE_FLAG_AI_ENABLED !== 'false',
    DAILY_LIMIT: parseInt(import.meta.env.VITE_FLAG_DAILY_LIMIT ?? '20', 10),
    WARN_HIGH: parseInt(import.meta.env.VITE_FLAG_WARN_THRESHOLD_HIGH ?? '10', 10),
    WARN_MID: parseInt(import.meta.env.VITE_FLAG_WARN_THRESHOLD_MID ?? '5', 10),
    WARN_LOW: parseInt(import.meta.env.VITE_FLAG_WARN_THRESHOLD_LOW ?? '2', 10),
} as const;

// ============================================================================
// RATE LIMITING
// ============================================================================
const RATE_LIMIT_KEY = 'ceka_ai_usage';

const getUsageToday = (): number => {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (!stored) return 0;
    try {
        const { count, date } = JSON.parse(stored);
        if (date !== new Date().toDateString()) return 0;
        return count;
    } catch (e) {
        return 0;
    }
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
// COUNTER BADGE
// ============================================================================
interface CounterBadgeProps {
    remaining: number;
    total: number;
}

const CounterBadge: React.FC<CounterBadgeProps> = ({ remaining, total }) => {
    const tier = getWarningTier(remaining);

    const colourClass = tier === 'low'
        ? 'text-red-500 dark:text-red-400'
        : tier === 'mid'
            ? 'text-orange-500 dark:text-orange-400'
            : tier === 'high'
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400';

    return (
        <motion.span
            key={remaining}
            initial={{ scale: 1.3, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn('text-[10px] font-semibold tabular-nums', colourClass)}
        >
            {remaining}/{total}
        </motion.span>
    );
};

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
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [usage, setUsage] = useState(0);
    const [showPulse, setShowPulse] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const queryRef = React.useRef(query);
    const usageRef = React.useRef(usage);
    const loadingRef = React.useRef(loading);

    const location = useLocation();

    const remaining = FLAGS.DAILY_LIMIT - usage;
    const isExhausted = usage >= FLAGS.DAILY_LIMIT;

    useEffect(() => {
        const pulseTimer = setTimeout(() => {
            if (!isOpen) setShowPulse(true);
        }, 15000);

        return () => clearTimeout(pulseTimer);
    }, [isOpen]);

    useEffect(() => { queryRef.current = query; }, [query]);
    useEffect(() => { usageRef.current = usage; }, [usage]);
    useEffect(() => { loadingRef.current = loading; }, [loading]);

    useEffect(() => {
        setUsage(getUsageToday());
        const handleTrigger = (e: any) => {
            const { query: triggerQuery } = e.detail;
            setIsOpen(true);
            setQuery(triggerQuery);
            setTimeout(() => { handleSend(triggerQuery); }, 50);
        };
        window.addEventListener('ceka-ai-trigger', handleTrigger);
        return () => window.removeEventListener('ceka-ai-trigger', handleTrigger);
    }, []);

    const handleSend = async (overrideQuery?: string) => {
        const activeQuery = overrideQuery !== undefined ? overrideQuery : queryRef.current;
        if (!activeQuery.trim() || loadingRef.current) return;

        if (usageRef.current >= FLAGS.DAILY_LIMIT) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `You've used all ${FLAGS.DAILY_LIMIT} queries for today. Come back tomorrow.`
            }]);
            return;
        }

        const userMsg = activeQuery;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setQuery('');
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('ceka-ai-assistant', {
                body: {
                    query: userMsg,
                    context: location.pathname,
                    pageTitle: document.title || null
                }
            });

            if (error) throw error;
            if (data.error) {
                setMessages(prev => [...prev, { role: 'ai', content: data.message || "Error processing request." }]);
                return;
            }

            const newUsage = incrementUsage();
            setUsage(newUsage);
            setMessages(prev => [...prev, { role: 'ai', content: data.answer || "No response received." }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'ai', content: "Something went wrong. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!FLAGS.AI_ENABLED) return null;

    return (
        <AnimatePresence>
            {!isHidden && (
                <motion.div
                    drag={!isOpen ? "x" : false}
                    dragConstraints={{ left: 0, right: 300 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => {
                        if (!isOpen && info.offset.x > 80) {
                            onHide?.();
                        }
                    }}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 200 }}
                    className="fixed z-50 transition-none"
                    style={{
                        zIndex: 50,
                        bottom: isOpen ? 'auto' : '204px',
                        right: isOpen ? 'auto' : '2rem',
                        position: 'fixed',
                        touchAction: 'none',
                        ...(isOpen ? {
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                        } : {})
                    }}
                >
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]"
                            >
                                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                                    <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                                        <Bot className="h-5 w-5 text-kenya-green" />
                                        CEKA AI
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <CounterBadge remaining={remaining} total={FLAGS.DAILY_LIMIT} />
                                        <button onClick={() => setIsOpen(false)} className="hover:text-red-500 transition-colors">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-kenya-green text-white' : 'bg-gray-100 dark:bg-gray-800 text-slate-800 dark:text-white'}`}>
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown>
                                                        {m.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {loading && <CEKALoader variant="default" size="sm" />}
                                </div>

                                {!isExhausted && <CreditWarningBanner remaining={remaining} />}
                                
                                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Ask a question..."
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                            disabled={isExhausted}
                                            className="bg-gray-50 dark:bg-gray-800"
                                        />
                                        <Button onClick={() => handleSend()} size="icon" disabled={loading || isExhausted}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!isOpen && (
                        <motion.div
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                            className="relative group cursor-pointer"
                            onClick={() => { setIsOpen(true); setShowPulse(false); }}
                        >
                            <div className="w-48 h-12 flex items-center relative">
                                <div className={cn(
                                    "absolute right-12 px-4 py-2 bg-black/80 text-white rounded-full text-sm font-medium transition-all duration-300",
                                    isHovering ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
                                )}>
                                    Ask CEKA AI
                                </div>
                                <div className={cn(
                                    "absolute right-0 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                                    isHovering ? "bg-kenya-green scale-110 shadow-kenya-green/20" : "bg-kenya-green"
                                )}>
                                    <HelpCircle className="h-6 w-6 text-white" />
                                    {showPulse && !isHovering && (
                                        <div className="absolute inset-0 rounded-full bg-kenya-green animate-ping opacity-25" />
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
