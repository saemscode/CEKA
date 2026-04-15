// CEKA Custom Loading Animation Component
// Premium loading states with Deep iOS-inspired styling & Kenya branding
// Highly optimized for performance (GPU-accelerated) and accessibility

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface CEKALoaderProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    text?: string;
    variant?: 'default' | 'pulse' | 'orbit' | 'bars' | 'ios' | 'scanning';
    showProgressMessages?: boolean;
}

// Brand Colors
const COLORS = {
    green: '#16a34a',
    red: '#dc2626',
    black: '#000000',
    white: '#ffffff',
    kenyaGreen: 'rgb(5, 150, 105)',
    kenyaRed: 'rgb(220, 38, 38)',
};

const PROGRESS_MESSAGES = [
    "Loading CEKA Platform...",
    "Gathering civic insights...",
    "Preparing educational cards...",
    "You'll be there shortly...",
    "Loading...",
    "Crunching our code...",
    "Almost there...",
    "Revising our pages...",
    "Granting you access...",
];

export const CEKALoader: React.FC<CEKALoaderProps> = ({
    size = 'md',
    text,
    variant = 'default',
    showProgressMessages = false
}) => {
    const [messageIndex, setMessageIndex] = useState(0);
    const { theme } = useTheme();

    const logoSrc = theme === 'dark' ? '/logo-white.png' : '/logo-colored.png';

    useEffect(() => {
        if (!showProgressMessages) return;
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [showProgressMessages]);

    const displayMessage = text || (showProgressMessages ? PROGRESS_MESSAGES[messageIndex] : null);

    const sizes = {
        xs: { wrapper: 'w-8 h-8', icon: 16, text: 'text-[10px]' },
        sm: { wrapper: 'w-16 h-16', icon: 24, text: 'text-xs' },
        md: { wrapper: 'w-24 h-24', icon: 34, text: 'text-sm' },
        lg: { wrapper: 'w-32 h-32', icon: 44, text: 'text-base' },
        xl: { wrapper: 'w-48 h-48', icon: 60, text: 'text-lg' }
    };

    const s = sizes[size];

    const renderMessage = () => (
        <AnimatePresence mode="wait">
            {displayMessage && (
                <motion.p
                    key={displayMessage}
                    initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className={`${s.text} font-semibold uppercase tracking-[0.15em] text-slate-500/80 dark:text-slate-400/80 text-center max-w-[280px] mt-8 px-6 font-mono`}
                >
                    {displayMessage}
                </motion.p>
            )}
        </AnimatePresence>
    );

    const renderContent = () => {
        // SIGNATURE: The Unified CEKA Design
        // Blends iOS elegance with the Kenyan Identity
        if (variant === 'default' || variant === 'ios' || variant === 'scanning') {
            const segments = 12;
            const isScanning = variant === 'scanning';
            
            return (
                <div className={`${s.wrapper} relative flex items-center justify-center`}>
                    {/* 1. Signature Aura Flush (Kenyan Identity) */}
                    <motion.div 
                        className="absolute inset-0 rounded-full bg-gradient-to-tr from-green-500/10 via-black/5 to-red-500/10 blur-2xl"
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3],
                            rotate: [0, 90, 180, 270, 360]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    />

                    {/* 2. Premium iOS Segments with Fixed Math & Signature Colors */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {[...Array(segments)].map((_, i) => {
                            // Cycle through Kenyan colors for the signature trail
                            const segmentColor = i % 3 === 0 ? COLORS.kenyaGreen : (i % 3 === 1 ? (theme === 'dark' ? '#333' : COLORS.black) : COLORS.kenyaRed);
                            
                            return (
                                <motion.div
                                    key={i}
                                    className="absolute rounded-full"
                                    style={{
                                        width: '6%',
                                        height: '22%',
                                        backgroundColor: segmentColor,
                                        transform: `rotate(${i * (360 / segments)}deg) translateY(-140%)`,
                                        transformOrigin: '50% 50%',
                                        opacity: 0.1,
                                        boxShadow: isScanning ? `0 0 10px ${segmentColor}40` : 'none'
                                    }}
                                    animate={{ 
                                        opacity: [0.1, 1, 0.1],
                                        scale: isScanning ? [1, 1.2, 1] : 1
                                    }}
                                    transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        delay: i * (1.2 / segments),
                                        ease: "linear"
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* 3. The "Pulse" Core (CEKA Identity) */}
                    <motion.div
                        className="relative z-10 flex items-center justify-center bg-background/40 backdrop-blur-md rounded-full p-3 shadow-xl border border-white/20 dark:border-white/5"
                        animate={{ 
                            scale: [1, 1.05, 1],
                            boxShadow: [
                                '0 10px 40px -10px rgba(0,0,0,0.1)',
                                '0 10px 60px -5px rgba(0,0,0,0.2)',
                                '0 10px 40px -10px rgba(0,0,0,0.1)'
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <img
                            src={logoSrc}
                            alt="CEKA"
                            className={cn(
                                "object-contain",
                                size === 'xs' ? 'h-3' : size === 'sm' ? 'h-5' : size === 'md' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-16'
                            )}
                        />
                    </motion.div>

                    {/* 4. Scanning Ring (Optional Overlay) */}
                    {isScanning && (
                        <motion.div 
                            className="absolute inset-0 rounded-full border-2 border-primary/20"
                            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        />
                    )}
                </div>
            );
        }

        if (variant === 'bars') {
            return (
                <div className="flex items-end gap-2 h-12">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                            key={i}
                            className="w-1.5 rounded-full"
                            style={{
                                background: `linear-gradient(to top, ${COLORS.kenyaGreen}, ${COLORS.white}, ${COLORS.kenyaRed})`,
                                height: '100%',
                            }}
                            animate={{
                                scaleY: [0.2, 1, 0.2],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.1,
                                ease: 'easeInOut',
                            }}
                        />
                    ))}
                </div>
            );
        }

        if (variant === 'pulse' || variant === 'orbit') {
            return (
                <div className={`${s.wrapper} relative flex items-center justify-center`}>
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute inset-4 rounded-full border border-primary/10"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />
                    
                    <motion.div
                        className="relative z-10"
                        animate={{ 
                            scale: [0.95, 1.05, 0.95],
                            filter: ['drop-shadow(0 0 0px transparent)', 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))', 'drop-shadow(0 0 0px transparent)']
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        <img
                            src={logoSrc}
                            alt="CEKA"
                            className={cn(
                                "object-contain",
                                size === 'xs' ? 'h-4' : size === 'sm' ? 'h-8' : size === 'md' ? 'h-12' : size === 'lg' ? 'h-16' : 'h-24'
                            )}
                        />
                    </motion.div>
                </div>
            );
        }

        return null; // Should not happen with current logic
    };

    return (
        <div
            className="flex flex-col items-center justify-center"
            role="status"
            aria-busy="true"
        >
            {renderContent()}
            {renderMessage()}
        </div>
    );
};

export const CEKACardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-card rounded-2xl p-6 shadow-sm border border-border/40 ${className}`}>
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-muted rounded-full" />
            <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded-full w-3/4" />
                <div className="h-3 bg-muted rounded-full w-1/2" />
            </div>
        </div>
        <div className="space-y-3">
            <div className="h-3 bg-muted rounded-full w-full" />
            <div className="h-3 bg-muted rounded-full w-full" />
            <div className="h-3 bg-muted rounded-full w-5/6" />
        </div>
        <div className="mt-8 h-10 bg-muted rounded-xl w-full" />
    </div>
);

export const CEKAImagePlaceholder: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`relative overflow-hidden bg-gradient-to-br from-kenya-green/5 via-background to-kenya-red/5 flex items-center justify-center ${className}`}>
        <div className="absolute inset-0 backdrop-blur-[2px] opacity-20" />
        <CEKALoader size="xs" variant="pulse" text="" />
    </div>
);

export const CEKAFullLoader: React.FC<{ message?: string }> = ({ message }) => (
    <AnimatePresence>
        <motion.div
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-2xl flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.div
                className="p-12 rounded-[40px] bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.5, ease: "circOut" }}
            >
                <CEKALoader size="lg" variant="default" text={message} showProgressMessages={!message} />
            </motion.div>
        </motion.div>
    </AnimatePresence>
);

export default CEKALoader;
