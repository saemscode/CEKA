import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    X, MessageSquare, Shield, Zap, Info,
    ArrowRight, Users, Radio, Scale
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translate } from '@/lib/utils';

interface JoinRoomGuideProps {
    roomName: string;
    isOpen: boolean;
    onClose: () => void;
}

const JoinRoomGuide = ({ roomName, isOpen, onClose }: JoinRoomGuideProps) => {
    const { language } = useLanguage();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-white/40 dark:bg-black/60 backdrop-blur-md rounded-[32px] overflow-hidden"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[40px] shadow-ios-high border border-white/20 max-w-sm w-full relative overflow-hidden"
                    >
                        {/* Blueprint Grid Background */}
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="absolute top-4 right-4 rounded-full h-10 w-10 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            <X className="h-5 w-5" />
                        </Button>

                        <div className="relative space-y-6">
                            <div className="bg-primary/10 h-16 w-16 rounded-[22px] flex items-center justify-center">
                                <Radio className="h-8 w-8 text-primary animate-pulse" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight leading-tight">
                                    Joining <span className="text-primary">{roomName}</span>
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                    {translate('This is a space for respectful discussions. Your contributions help drive the community.', language)}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-kenya-green" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Real‑time updates</p>
                                        <p className="text-[11px] text-muted-foreground font-medium">Messages appear instantly for everyone in the room.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Take action</p>
                                        <p className="text-[11px] text-muted-foreground font-medium">Use @ to tag topics or people for quick attention.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-gold" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Respect each other</p>
                                        <p className="text-[11px] text-muted-foreground font-medium">Follow community guidelines. Hostile messages will be removed.</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={onClose}
                                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 group"
                            >
                                {translate('Join Room', language)}
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default JoinRoomGuide;