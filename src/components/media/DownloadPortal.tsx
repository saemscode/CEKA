
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Download,
    Heart,
    Smartphone,
    Monitor,
    Lock,
    CheckCircle2,
    ChevronRight,
    Wallet,
    Info,
    ArrowRight,
    Link2,
    FileText,
    Clock,
    RefreshCw,
    X
} from 'lucide-react';
import { useMedia } from 'react-use';
import { Drawer } from 'vaul';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import storageService from '@/services/storageService';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { useAuth } from '@/providers/AuthProvider';
import piecesTransactionService from '@/services/piecesTransactionService';

interface DownloadPortalProps {
    filePath: string;
    pdfPath?: string | null;
    availableQualities: string[];
    title: string;
    contentSlug?: string;
    contentId?: string;
    trigger: React.ReactNode;
}

declare global {
    interface Window { PaystackPop: any; }
}

type Tier = {
    id: string;
    label: string;
    sublabel: string;
    suffix: string;
    requiresDonation: boolean;
    isPdf?: boolean;
};

// 90-second client-side timeout for payment verification polling
const VERIFICATION_TIMEOUT_MS = 90_000;

const DOWNLOAD_TIERS: Tier[] = [
    { id: '320p',  label: 'SD Quality',  sublabel: '320p • Mobile Optimised', suffix: '320p',  requiresDonation: false },
    { id: '720p',  label: 'HD Quality',  sublabel: '720p • Standard High Def', suffix: '720p',  requiresDonation: false },
    { id: '1080p', label: 'Full HD',      sublabel: '1080p • Crystal Sharp',   suffix: '1080p', requiresDonation: true  },
    { id: '4k',    label: 'Ultra HD',     sublabel: '4K • Master Quality',     suffix: '',      requiresDonation: true  },
    { id: 'pdf',   label: 'PDF Document', sublabel: 'Full PDF • Print Ready',  suffix: '',      requiresDonation: true, isPdf: true },
];

const DONATION_AMOUNTS = [
    { label: '50',  value: 50  },
    { label: '100', value: 100 },
    { label: '250', value: 250 },
    { label: '500', value: 500 },
];

const DownloadPortal: React.FC<DownloadPortalProps> = ({
    filePath,
    pdfPath,
    availableQualities,
    title,
    contentSlug = '',
    contentId = '',
    trigger
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
    const [step, setStep] = useState<'selection' | 'donation' | 'verifying' | 'timeout' | 'downloading'>('selection');
    const [donationAmount, setDonationAmount] = useState<number>(100);
    const [isPaying, setIsPaying] = useState(false);
    const [pendingRef, setPendingRef] = useState<string | null>(null);
    const [liveAnnouncement, setLiveAnnouncement] = useState('');
    const { toast } = useToast();
    const { user } = useAuth();
    const isDesktop = useMedia('(min-width: 768px)', false);

    const announce = (message: string) => setLiveAnnouncement(message);

    const unsubscribeRef = useRef<(() => void) | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup realtime + timeout on unmount or close
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

    // Build tiers visible in this portal
    const activeTiers = DOWNLOAD_TIERS.filter(tier => {
        if (tier.isPdf) return !!pdfPath;
        return availableQualities.includes(tier.id) || (tier.id === '4k' && !filePath.includes('_'));
    });

    const getAssetExtension = (path: string): string => {
        if (!path) return 'jpg';
        const cleanPath = path.split('?')[0];
        const parts = cleanPath.split('.');
        if (parts.length < 2) return 'jpg';
        return parts[parts.length - 1].toLowerCase();
    };

    const buildDownloadFilename = (tier: Tier, path: string): string => {
        const ext = getAssetExtension(path);
        return `${title.toLowerCase().replace(/\s+/g, '-')}-${tier.id}.${ext}`;
    };

    /**
     * Blob download — resolves to actual bytes on disk, never a redirect.
     */
    const blobDownload = async (url: string, filename: string) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 200);
    };

    /**
     * Copy a signed link to clipboard with a toast confirming what was copied.
     */
    const copyLink = async (signedUrl: string, tierLabel: string) => {
        await navigator.clipboard.writeText(signedUrl);
        toast({
            title: 'Link copied to clipboard',
            description: `${tierLabel} link copied — valid for 1 hour.`,
        });
    };

    /**
     * Generate a signed URL for the given tier path. Signed URLs have a 1-hour
     * expiry (corrected from the previous 5-minute toast copy which was wrong).
     */
    const getSignedUrl = async (tier: Tier): Promise<string> => {
        let finalPath = tier.isPdf ? (pdfPath || '') : filePath;

        if (!tier.isPdf && !filePath.startsWith('http')) {
            if (tier.suffix) {
                const base = filePath.split('/').pop()?.split('.').shift() || '';
                const folder = filePath.split('/').slice(0, -1).join('/');
                const ext = filePath.split('.').pop();
                finalPath = `${folder}/${base}_${tier.suffix}.${ext}`;
            }
        }

        const signedUrl = await storageService.getAuthorizedUrl(finalPath);
        if (!signedUrl) throw new Error('Authorization failed');
        return signedUrl;
    };

    const initiateDownload = async (tier: Tier) => {
        setStep('downloading');
        announce('Generating secure download link, please wait.');
        try {
            const signedUrl = await getSignedUrl(tier);
            await blobDownload(signedUrl, buildDownloadFilename(tier, tier.isPdf ? (pdfPath || '') : filePath));
            announce('Download started. Saving to your device.');
            toast({ title: 'Download started', description: `${tier.label} — saving to your device.` });
            resetToSelection();
            setIsOpen(false);
        } catch (err) {
            console.error('[Portal] Download error:', err);
            announce('Download failed. Please try again.');
            toast({ title: 'Download failed', description: 'Could not generate a secure link. Please try again.', variant: 'destructive' });
            setStep('selection');
        }
    };

    const initiateCopyLink = async (tier: Tier) => {
        try {
            const signedUrl = await getSignedUrl(tier);
            await copyLink(signedUrl, tier.label);
        } catch (err) {
            console.error('[Portal] CopyLink error:', err);
            toast({ title: 'Could not generate link', description: 'Please try again.', variant: 'destructive' });
        }
    };

    const handleSelectTier = (tier: Tier) => {
        setSelectedTier(tier);
        if (tier.requiresDonation) {
            setStep('donation');
        } else {
            initiateDownload(tier);
        }
    };

    /**
     * Check again after timeout — re-queries transaction row by reference.
     */
    const handleCheckAgain = async () => {
        if (!pendingRef) return;
        setStep('verifying');
        const tx = await piecesTransactionService.getTransactionByReference(pendingRef);
        if (tx?.status === 'verified') {
            // Payment was confirmed, initiate delivery
            if (selectedTier) await initiateDownload(selectedTier);
        } else {
            setStep('timeout');
            toast({ title: 'Still processing', description: 'Your payment is still being confirmed. Check back shortly.' });
        }
    };

    const handlePaystackPayment = async () => {
        if (!window.PaystackPop) {
            toast({ title: 'System busy', description: 'Payment gateway loading. Please try in a moment.', variant: 'destructive' });
            return;
        }
        if (!selectedTier) return;

        const publicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, '');
        const paymentRef = `DL-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const userEmail = user?.email || 'support@civiceducationkenya.com';

        // 1. Write pending transaction row BEFORE opening popup
        await piecesTransactionService.createPendingTransaction({
            reference: paymentRef,
            user_id: user?.id || null,
            user_email: userEmail,
            content_id: contentId || null,
            content_slug: contentSlug,
            asset_path: selectedTier.isPdf ? (pdfPath || '') : filePath,
            tier: selectedTier.id,
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
                        { display_name: 'Quality', variable_name: 'output_quality', value: selectedTier.label },
                        { display_name: 'Asset Path', variable_name: 'asset_path', value: filePath },
                        { display_name: 'Content Slug', variable_name: 'content_slug', value: contentSlug },
                    ]
                },
                callback: () => {
                    setIsPaying(false);
                    // 2. Transition to 'verifying' — subscribe to Realtime for webhook confirmation
                    setStep('verifying');
                    announce('Payment received. Confirming with Paystack, please wait up to 90 seconds.');

                    // Subscribe to Supabase Realtime on this transaction row
                    const unsub = piecesTransactionService.subscribeToVerification(
                        paymentRef,
                        async (tx) => {
                            // Webhook confirmed — initiate delivery
                            unsub();
                            if (timeoutRef.current) clearTimeout(timeoutRef.current);
                            if (selectedTier) await initiateDownload(selectedTier);
                        }
                    );
                    unsubscribeRef.current = unsub;

                    // 3. 90-second timeout fallback
                    timeoutRef.current = setTimeout(() => {
                        unsub();
                        unsubscribeRef.current = null;
                        setStep('timeout');
                    }, VERIFICATION_TIMEOUT_MS);
                },
                onClose: () => {
                    setIsPaying(false);
                    announce('Payment window closed.');
                    // User closed Paystack without paying — stay on donation step
                }
            });
            handler.openIframe();
        } catch (error) {
            setIsPaying(false);
            console.error('[Portal] Paystack error:', error);
            toast({ title: 'Payment failed', description: 'Could not initialise Paystack.', variant: 'destructive' });
        }
    };

    const PortalContent = (
        <div className="flex flex-col gap-6 h-full min-h-[400px]">
            {/* ARIA live region — screen reader announcement for dynamic step changes */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {liveAnnouncement}
            </div>
            <AnimatePresence mode="wait">

                {/* ── SELECTION STEP ── */}
                {step === 'selection' && (
                    <motion.div
                        key="selection"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center gap-2 px-1 mb-4">
                            <Info size={14} className="text-muted-foreground opacity-50" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Select Output Fidelity</p>
                        </div>

                        {activeTiers.map((tier) => (
                            <div key={tier.id} className="flex items-center gap-2">
                                {/* Main tier button */}
                                <button
                                    onClick={() => handleSelectTier(tier)}
                                    aria-label={`Select ${tier.label} — ${tier.sublabel}${tier.requiresDonation ? ', requires donation' : ', free'}`}
                                    className={cn(
                                        "flex-1 flex items-center justify-between p-4 rounded-[22px] transition-all group active:scale-[0.98]",
                                        "bg-muted/5 border border-white/10 hover:border-kenya-red/30 hover:bg-kenya-red/[0.03]",
                                        "glass-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kenya-red focus-visible:ring-offset-2"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-kenya-red/10 transition-colors shadow-inner">
                                            {tier.isPdf
                                                ? <FileText size={18} />
                                                : tier.id === '320p'
                                                    ? <Smartphone size={18} />
                                                    : <Monitor size={18} />
                                            }
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-sm tracking-tight">{tier.label}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{tier.sublabel}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {tier.requiresDonation && (
                                            <Badge variant="outline" className="bg-kenya-red/10 text-kenya-red border-kenya-red/20 text-[8px] font-black tracking-widest uppercase px-1.5 py-0">
                                                Premium
                                            </Badge>
                                        )}
                                        <ChevronRight size={16} className="text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-kenya-red/60 transition-all" />
                                    </div>
                                </button>

                                {/* Copy Link button — side by side for free tiers only */}
                                {!tier.requiresDonation && (
                                    <button
                                        onClick={() => initiateCopyLink(tier)}
                                        title={`Copy ${tier.label} link to clipboard`}
                                        aria-label={`Copy ${tier.label} link to clipboard`}
                                        className="w-11 h-11 rounded-[16px] flex items-center justify-center bg-muted/10 border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all shrink-0"
                                    >
                                        <Link2 size={15} className="text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                        ))}

                        <div className="pt-6 border-t border-white/5 mt-4">
                            <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest opacity-40">
                                Signed Links • 1 Hour Expiry
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ── DONATION STEP ── */}
                {step === 'donation' && (
                    <motion.div
                        key="donation"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6 pt-2 pb-6"
                    >
                        <div className="text-center space-y-3">
                            <div className="mx-auto w-20 h-20 rounded-full bg-kenya-red/5 border border-kenya-red/10 flex items-center justify-center mb-2 shadow-2xl">
                                <Heart className="text-kenya-red animate-pulse" fill="currentColor" size={32} />
                            </div>
                            <h3 className="text-2xl font-black tracking-tighter">Support the Assets</h3>
                            <p className="text-xs text-muted-foreground max-w-[260px] mx-auto font-medium leading-relaxed">
                                Our <span className="text-foreground font-bold">HQ Infrastructure</span> is powered by community tips. Unlock <span className="text-foreground font-bold">{selectedTier?.label}</span> with a small contribution.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {DONATION_AMOUNTS.map((amt) => (
                                <button
                                    key={amt.value}
                                    onClick={() => setDonationAmount(amt.value)}
                                    aria-pressed={donationAmount === amt.value}
                                    aria-label={`Donate KES ${amt.label}`}
                                    className={cn(
                                        "py-4 rounded-2xl border transition-all text-sm font-black tracking-widest uppercase relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kenya-green focus-visible:ring-offset-2",
                                        donationAmount === amt.value
                                            ? "bg-kenya-green border-kenya-green text-white shadow-xl shadow-kenya-green/20"
                                            : "bg-white/5 border-white/10 hover:border-white/20 text-muted-foreground"
                                    )}
                                >
                                    KES {amt.label}
                                    {donationAmount === amt.value && (
                                        <motion.div layoutId="active" className="absolute inset-0 bg-white/10" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={handlePaystackPayment}
                                disabled={isPaying}
                                className="w-full h-16 rounded-[22px] bg-kenya-green hover:bg-kenya-green/90 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-kenya-green/20 active:scale-95 transition-all"
                            >
                                {isPaying ? <CEKALoader variant="ios" size="xs" /> : <><Wallet size={16} className="mr-3" />Support &amp; Unlock</>}
                            </Button>

                            <button
                                onClick={resetToSelection}
                                className="w-full py-4 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.25em] hover:text-kenya-red transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowRight size={12} className="rotate-180" /> Change Quality
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ── VERIFYING STEP ── */}
                {step === 'verifying' && (
                    <motion.div
                        key="verifying"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 space-y-8"
                    >
                        <CEKALoader variant="ios" size="lg" />
                        <div className="text-center space-y-3">
                            <p className="text-sm font-black uppercase tracking-[0.3em] mb-2">Confirming Payment</p>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50 px-8 leading-relaxed">
                                Verifying with Paystack — this can take up to 90 seconds on slow networks...
                            </p>
                        </div>
                        <button
                            onClick={resetToSelection}
                            aria-label="Cancel payment verification"
                            className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground"
                        >
                            <X size={11} aria-hidden="true" /> Cancel
                        </button>
                    </motion.div>
                )}

                {/* ── TIMEOUT STEP ── */}
                {step === 'timeout' && (
                    <motion.div
                        key="timeout"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-16 space-y-6 text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-muted/10 border border-white/10 flex items-center justify-center">
                            <Clock size={28} className="text-muted-foreground/60" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-base font-black tracking-tight">Still processing</p>
                            <p className="text-[11px] text-muted-foreground max-w-[240px] mx-auto font-medium leading-relaxed">
                                We'll have this ready shortly. Check your email for a delivery link, or tap below to check now.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <Button
                                onClick={handleCheckAgain}
                                className="w-full rounded-[18px] bg-foreground text-background font-black text-xs uppercase tracking-widest"
                            >
                                <RefreshCw size={14} className="mr-2" /> Check Again
                            </Button>
                            <button
                                onClick={resetToSelection}
                                className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest hover:text-muted-foreground transition-colors"
                            >
                                Back to Tiers
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ── DOWNLOADING STEP ── */}
                {step === 'downloading' && (
                    <motion.div key="loading" className="flex flex-col items-center justify-center py-20 space-y-8">
                        <CEKALoader variant="ios" size="lg" />
                        <div className="text-center space-y-3">
                            <p className="text-sm font-black uppercase tracking-[0.3em] mb-2">Generating Secure Access</p>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50 px-8 leading-relaxed">
                                Please wait while we apply the ephemeral signature to your request...
                            </p>
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
                            <DialogTitle className="text-2xl font-black tracking-tighter text-center">Download Asset</DialogTitle>
                            <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">{title}</p>
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
                                <h3 className="text-2xl font-black tracking-tighter leading-none mb-2">{title}</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Premium Asset Delivery</p>
                            </div>
                            {PortalContent}
                        </Drawer.Content>
                    </Drawer.Portal>
                </Drawer.Root>
            )}
        </>
    );
};

export default DownloadPortal;
