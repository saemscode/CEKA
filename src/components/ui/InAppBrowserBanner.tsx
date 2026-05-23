
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, ExternalLink, X, Smartphone, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const InAppBrowserBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
        const isInstagram = ua.indexOf('Instagram') > -1;
        const isFB = (ua.indexOf('FBAN') > -1) || (ua.indexOf('FBAV') > -1);
        
        if (isInstagram || isFB) {
            // Delay showing to ensure it's not jarring
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -100 }}
                    className="fixed top-4 left-4 right-4 z-[10000] flex justify-center"
                >
                    <div className="w-full max-w-md bg-white/20 dark:bg-black/40 backdrop-blur-3xl border border-white/30 dark:border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col">
                        {/* iOS Style Handle */}
                        <div className="h-1.5 w-12 bg-white/30 rounded-full mx-auto mt-3 mb-1" />
                        
                        <div className="p-6 pt-2">
                            <div className="flex items-start justify-between mb-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                        <Smartphone className="w-5 h-5 text-kenya-green" />
                                        Optimize Experience
                                    </h3>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Instagram browser may be unstable. For full functionality, open in your system browser.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setIsVisible(false)}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>

                            {/* Visual Instructions */}
                            <div className="relative rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-white/10 flex flex-col">
                                <img 
                                    src="/assets/iab-guide.jpg" 
                                    alt="Browser Guide" 
                                    className="w-full h-auto opacity-90"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-kenya-green flex items-center justify-center text-[10px] font-black text-white shadow-lg">1</div>
                                            <p className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                Tap the three dots <MoreHorizontal className="w-4 h-4 inline" /> in the top right
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-kenya-green flex items-center justify-center text-[10px] font-black text-white shadow-lg">2</div>
                                            <p className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                Select <ExternalLink className="w-4 h-4 inline" /> 'Open in System Browser'
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsVisible(false)}
                                className="w-full mt-5 py-4 bg-gradient-to-r from-kenya-green to-primary rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <Globe className="w-4 h-4" />
                                I Understood
                            </button>
                        </div>
                        
                        {/* Bottom Sheen */}
                        <div className="h-2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InAppBrowserBanner;
