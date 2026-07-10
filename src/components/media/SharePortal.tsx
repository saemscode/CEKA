// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Wallet, Info, ArrowRight, Clock, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { useMedia } from 'react-use';
import { Drawer } from 'vaul';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import storageService from '@/services/storageService';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { useAuth } from '@/providers/AuthProvider';
import piecesTransactionService from '@/services/piecesTransactionService';

interface SharePortalProps {
    filePath: string;
    title: string;
    contentSlug?: string;
    contentId?: string;
    trigger: React.ReactNode;
}

const VERIFICATION_TIMEOUT_MS = 90_000;

const SharePortal: React.FC<SharePortalProps> = ({
    filePath,
    title,
    contentSlug = '',
    contentId = '',
    trigger
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'selection' | 'donation' | 'verifying' | 'timeout' | 'preparing'>('selection');
    const [donationAmount, setDonationAmount] = useState<number>(100);
    const [isPaying, setIsPaying] = useState(false);
    const [pendingRef, setPendingRef] = useState<string | null>(null);
    const [selectedTier, setSelectedTier] = useState<'standard' | 'premium' | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const isDesktop = useMedia('(min-width: 768px)', false);

    const unsubscribeRef = useRef<(() => void) | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            unsubscribeRef.current?.();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const resetToSelection = useCallback(() => {
        unsubscribeRef.current?.();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStep('selection');
        setSelectedTier(null);
        setPendingRef(null);
        setIsPaying(false);
    }, []);

    const executeNativeShare = async (urlToFetch: string, isPremium: boolean) => {
        setStep('preparing');
        const shareUrl = `${window.location.origin}/pieces/${contentSlug}`;
        
        try {
            if (navigator.canShare && navigator.canShare({ files: [] })) {
                const response = await fetch(urlToFetch);
                if (!response.ok) throw new Error('Fetch failed');
                const blob = await response.blob();
                const file = new File([blob], `${title.replace(/\s+/g, '-')}-share.jpg`, { type: blob.type || 'image/jpeg' });
                
                await navigator.share({
                    title: title,
                    text: isPremium ? `Check out this 4K asset from CEKA!` : `Check out this piece from CEKA!`,
                    url: shareUrl,
                    files: [file]
                });
            } else {
                await navigator.share({ title: title, text: isPremium ? `Check out this 4K asset from CEKA!` : `Check out this piece from CEKA!`, url: shareUrl });
            }
            toast({ title: 'Shared successfully!' });
            resetToSelection();
            setIsOpen(false);
        } catch (err) {
            console.error('[SharePortal] Share error:', err);
            resetToSelection();
            setIsOpen(false);
        }
    };

    const handleStandardShare = async () => {
        const swipeSrc = filePath.replace('/upload/', `/upload/w_640,q_auto:eco,f_webp/`);
        await executeNativeShare(swipeSrc, false);
    };

    const handlePremiumShareSuccess = async () => {
        try {
            const signedUrl = await storageService.getAuthorizedUrl(filePath);
            if (!signedUrl) throw new Error('Could not get signed URL');
            await executeNativeShare(signedUrl, true);
        } catch (err) {
            toast({ title: 'Error preparing HD asset', variant: 'destructive' });
            resetToSelection();
        }
    };

    const handleCheckAgain = async () => {
        if (!pendingRef) return;
        setStep('verifying');
        const tx = await piecesTransactionService.getTransactionByReference(pendingRef);
        if (tx?.status === 'verified') {
            await handlePremiumShareSuccess();
        } else {
            setStep('timeout');
            toast({ title: 'Still processing', description: 'Your payment is still being confirmed. Check back shortly.' });
        }
    };

    const handlePaystackPayment = async () => {
        if (!window.PaystackPop) {
            toast({ title: 'System busy', variant: 'destructive' });
            return;
        }

        const publicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, '');
        const paymentRef = `DL-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const userEmail = user?.email || 'support@civiceducationkenya.com';

        await piecesTransactionService.createPendingTransaction({
            reference: paymentRef,
            user_id: user?.id || null,
            user_email: userEmail,
            content_id: contentId || null,
            content_slug: contentSlug,
            asset_path: filePath,
            tier: 'premium-share',
            amount_kes: donationAmount,
        });

        setPendingRef(paymentRef);
        setIsPaying(true);

        try {
            const handler = window.PaystackPop.setup({
                key: publicKey,
                email: userEmail,
                amount: Math.round(donationAmount * 100),
                currency: 'KES',
                ref: paymentRef,
                metadata: {
                    custom_fields: [
                        { display_name: 'Asset', variable_name: 'asset_title', value: title },
                        { display_name: 'Quality', variable_name: 'output_quality', value: 'HD Share' },
                        { display_name: 'Asset Path', variable_name: 'asset_path', value: filePath },
                    ]
                },
                callback: () => {
                    setIsPaying(false);
                    setStep('verifying');
                    const unsub = piecesTransactionService.subscribeToVerification(paymentRef, async (tx) => {
                        unsub();
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        await handlePremiumShareSuccess();
                    });
                    unsubscribeRef.current = unsub;

                    timeoutRef.current = setTimeout(() => {
                        unsub();
                        unsubscribeRef.current = null;
                        setStep('timeout');
                    }, VERIFICATION_TIMEOUT_MS);
                },
                onClose: () => {
                    setIsPaying(false);
                }
            });
            handler.openIframe();
        } catch (error) {
            setIsPaying(false);
            toast({ title: 'Payment failed', variant: 'destructive' });
        }
    };

    const PortalContent = (
        <div className="flex flex-col gap-6 h-full min-h-[400px]">
            <AnimatePresence mode="wait">
                {step === 'selection' && (
                    <motion.div key="selection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                        <div className="flex items-center gap-2 px-1 mb-4">
                            <Info size={14} className="text-muted-foreground opacity-50" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Select Share Quality</p>
                        </div>

                        {/* Standard Share */}
                        <button onClick={handleStandardShare} className="w-full flex items-center justify-between p-4 rounded-[22px] transition-all group active:scale-[0.98] bg-muted/5 border border-white/10 hover:border-white/20 glass-card">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors shadow-inner">
                                    <Smartphone size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm tracking-tight">Standard Preview</p>
                                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Free • Compressed</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-muted-foreground/40 group-hover:translate-x-1 transition-all" />
                        </button>

                        {/* Premium Share */}
                        <button onClick={() => { setSelectedTier('premium'); setStep('donation'); }} className="w-full flex items-center justify-between p-4 rounded-[22px] transition-all group active:scale-[0.98] bg-muted/5 border border-white/10 hover:border-kenya-red/30 hover:bg-kenya-red/[0.03] glass-card">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-kenya-red/10 transition-colors shadow-inner">
                                    <Monitor size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm tracking-tight">High-Fidelity 4K</p>
                                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Unlock Master Quality</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-kenya-red/10 text-kenya-red border-kenya-red/20 text-[8px] font-black tracking-widest uppercase px-1.5 py-0">Premium</Badge>
                                <ArrowRight size={16} className="text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-kenya-red/60 transition-all" />
                            </div>
                        </button>
                    </motion.div>
                )}

                {step === 'donation' && (
                    <motion.div key="donation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pt-2 pb-6">
                        <div className="text-center space-y-3">
                            <div className="mx-auto w-20 h-20 rounded-full bg-kenya-red/5 border border-kenya-red/10 flex items-center justify-center mb-2 shadow-2xl">
                                <Heart className="text-kenya-red animate-pulse" fill="currentColor" size={32} />
                            </div>
                            <h3 className="text-2xl font-black tracking-tighter">Support the Arts</h3>
                            <p className="text-xs text-muted-foreground max-w-[260px] mx-auto font-medium leading-relaxed">
                                Unlock <span className="text-foreground font-bold">HD Sharing</span> with a small contribution. Forward the pristine original.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {[50, 100, 250, 500].map((amt) => (
                                <button key={amt} onClick={() => setDonationAmount(amt)} className={cn("py-4 rounded-2xl border transition-all text-sm font-black tracking-widest uppercase relative overflow-hidden", donationAmount === amt ? "bg-kenya-green border-kenya-green text-white shadow-xl shadow-kenya-green/20" : "bg-white/5 border-white/10 hover:border-white/20 text-muted-foreground")}>
                                    KES {amt}
                                    {donationAmount === amt && <motion.div layoutId="active" className="absolute inset-0 bg-white/10" />}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <Button onClick={handlePaystackPayment} disabled={isPaying} className="w-full h-16 rounded-[22px] bg-kenya-green hover:bg-kenya-green/90 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-kenya-green/20 active:scale-95 transition-all">
                                {isPaying ? <CEKALoader variant="ios" size="xs" /> : <><Wallet size={16} className="mr-3" />Unlock HD Share</>}
                            </Button>
                            <button onClick={resetToSelection} className="w-full py-4 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.25em] hover:text-kenya-red transition-colors flex items-center justify-center gap-2">
                                <ArrowRight size={12} className="rotate-180" /> Back
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'verifying' && (
                    <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 space-y-8">
                        <CEKALoader variant="ios" size="lg" />
                        <div className="text-center space-y-3">
                            <p className="text-sm font-black uppercase tracking-[0.3em] mb-2">Confirming Payment</p>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50 px-8 leading-relaxed">Verifying with Paystack...</p>
                        </div>
                    </motion.div>
                )}

                {step === 'timeout' && (
                    <motion.div key="timeout" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/10 border border-white/10 flex items-center justify-center"><Clock size={28} className="text-muted-foreground/60" /></div>
                        <div className="space-y-2">
                            <p className="text-base font-black tracking-tight">Still processing</p>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <Button onClick={handleCheckAgain} className="w-full rounded-[18px] bg-foreground text-background font-black text-xs uppercase tracking-widest">
                                <RefreshCw size={14} className="mr-2" /> Check Again
                            </Button>
                            <button onClick={resetToSelection} className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest hover:text-muted-foreground transition-colors">Cancel</button>
                        </div>
                    </motion.div>
                )}

                {step === 'preparing' && (
                    <motion.div key="preparing" className="flex flex-col items-center justify-center py-20 space-y-8">
                        <CEKALoader variant="ios" size="lg" />
                        <div className="text-center space-y-3">
                            <p className="text-sm font-black uppercase tracking-[0.3em] mb-2">Preparing Asset</p>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50 px-8 leading-relaxed">Fetching high-res file for sharing...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <>
            {isDesktop ? (
                <Dialog open={isOpen} onOpenChange={(o) => { if (!o) resetToSelection(); setIsOpen(o); }}>
                    <DialogTrigger asChild>{trigger}</DialogTrigger>
                    <DialogContent className="max-w-md bg-background/60 backdrop-blur-3xl border-white/10 shadow-3xl rounded-[40px] overflow-hidden p-10 ring-1 ring-white/20">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black tracking-tighter text-center">Share Visual</DialogTitle>
                        </DialogHeader>
                        {PortalContent}
                    </DialogContent>
                </Dialog>
            ) : (
                <Drawer.Root open={isOpen} onOpenChange={(o) => { if (!o) resetToSelection(); setIsOpen(o); }}>
                    <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
                    <Drawer.Portal>
                        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[999] transition-opacity" />
                        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[1000] flex flex-col bg-background/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[42px] outline-none h-auto max-h-[96vh] px-8 pb-12 pt-4 shadow-2xl">
                            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/10 mb-8" />
                            <div className="mb-8 px-1">
                                <h3 className="text-2xl font-black tracking-tighter leading-none mb-2">Share Visual</h3>
                            </div>
                            {PortalContent}
                        </Drawer.Content>
                    </Drawer.Portal>
                </Drawer.Root>
            )}
        </>
    );
};

export default SharePortal;
