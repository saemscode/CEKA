
import React, { useState, useEffect } from 'react';
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
    ArrowRight
} from 'lucide-react';
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

interface DownloadPortalProps {
    filePath: string;
    availableQualities: string[];
    title: string;
    trigger: React.ReactNode;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

type Tier = {
    id: string;
    label: string;
    sublabel: string;
    suffix: string;
    requiresDonation: boolean;
};

const DOWNLOAD_TIERS: Tier[] = [
    { id: '320p', label: 'SD Quality', sublabel: '320p • Mobile Optimized', suffix: '320p', requiresDonation: false },
    { id: '720p', label: 'HD Quality', sublabel: '720p • Standard High Def', suffix: '720p', requiresDonation: false },
    { id: '1080p', label: 'Full HD', sublabel: '1080p • Crystal Sharp', suffix: '1080p', requiresDonation: true },
    { id: '4k', label: 'Ultra HD', sublabel: '4K • Master Quality', suffix: '', requiresDonation: true },
];

const DONATION_AMOUNTS = [
    { label: '50', value: 50 },
    { label: '100', value: 100 },
    { label: '250', value: 250 },
    { label: '500', value: 500 },
];

const DownloadPortal: React.FC<DownloadPortalProps> = ({ filePath, availableQualities, title, trigger }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
    const [step, setStep] = useState<'selection' | 'donation' | 'downloading'>('selection');
    const [donationAmount, setDonationAmount] = useState<number>(100);
    const [isPaying, setIsPaying] = useState(false);
    const { toast } = useToast();

    // Filter tiers based on what was actually generated during Churn
    const activeTiers = DOWNLOAD_TIERS.filter(tier => 
        availableQualities.includes(tier.id) || (tier.id === '4k' && !filePath.includes('_'))
    );

    // --- MIME-AWARE EXTENSION HELPERS ---
    // Derives the real file extension from the asset path, never hardcodes .jpg
    const getAssetExtension = (path: string): string => {
        if (!path) return 'jpg';
        const cleanPath = path.split('?')[0]; // strip query params
        const parts = cleanPath.split('.');
        if (parts.length < 2) return 'jpg';
        return parts[parts.length - 1].toLowerCase();
    };

    // Builds the download filename using the real extension (preserves .pdf, .png, .webp, etc.)
    const buildDownloadFilename = (tier: Tier, path: string): string => {
        const ext = getAssetExtension(path);
        return `${title.toLowerCase().replace(/\s+/g, '-')}-${tier.id}.${ext}`;
    };
    // --- END MIME-AWARE EXTENSION HELPERS ---

    const handleSelectTier = (tier: Tier) => {
        setSelectedTier(tier);
        if (tier.requiresDonation) {
            setStep('donation');
        } else {
            setStep('downloading');
            initiateDownload(tier);
        }
    };

    const initiateDownload = async (tier: Tier) => {
        setStep('downloading');
        try {
            // PATH SANITIZER: Construct path before signing to avoid signature corruption
            let finalPath = filePath;
            
            // If it's a full URL (legacy), we can't suffix it reliably
            if (!filePath.startsWith('http')) {
                if (tier.suffix) {
                    const base = filePath.split('/').pop()?.split('.').shift() || '';
                    const folder = filePath.split('/').slice(0, -1).join('/');
                    const ext = filePath.split('.').pop();
                    finalPath = `${folder}/${base}_${tier.suffix}.${ext}`;
                    console.log(`[Portal] Resolved Path: ${finalPath}`);
                }
            }

            const signedUrl = await storageService.getAuthorizedUrl(finalPath);
            
            if (!signedUrl) throw new Error('Authorization failed');

            const link = document.createElement('a');
            link.href = signedUrl;
            // Use MIME-aware filename — preserves .pdf, .png, .jpg, .webp, etc.
            link.download = buildDownloadFilename(tier, finalPath);
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: "Download Started",
                description: `Successfully generated ${tier.label} link (Expires in 5 min).`,
            });
            setStep('selection');
            setIsOpen(false);
        } catch (err) {
            console.error('Portal Download Error:', err);
            toast({
                title: "Download Failed",
                description: "We couldn't generate a secure link. Please try again.",
                variant: "destructive"
            });
            setStep('selection');
        }
    };

    const handlePaystackPayment = () => {
        if (!window.PaystackPop) {
            toast({ title: "System Busy", description: "Payment gateway is loading. Please try again in a moment.", variant: "destructive" });
            return;
        }

        const publicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, '');
        setIsPaying(true);

        try {
            // Generate a trackable reference so the backend webhook can verify this specific transaction
            const paymentRef = `DL-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

            const handler = window.PaystackPop.setup({
                key: publicKey,
                email: 'support@civiceducationkenya.com',
                amount: Math.round(donationAmount * 100),
                currency: 'KES',
                ref: paymentRef,
                metadata: { 
                    custom_fields: [
                        { display_name: "Asset", variable_name: "asset_title", value: title },
                        { display_name: "Quality", variable_name: "output_quality", value: selectedTier?.label },
                        { display_name: "Asset Path", variable_name: "asset_path", value: filePath }
                    ] 
                },
                callback: (response: any) => {
                    setIsPaying(false);
                    // SECURITY: Do NOT initiate the download from the client-side callback.
                    // The Paystack webhook (paystack-webhook Edge Function) verifies the
                    // HMAC SHA-512 signature and records the transaction in `transactions`.
                    // Asset delivery for premium tiers is gated at the backend, not here.
                    console.log(`[Portal] Payment reference ${response.reference} submitted — awaiting backend verification.`);
                    toast({
                        title: "Payment Received!",
                        description: "Your transaction is being verified. Your download link will be ready shortly.",
                    });
                    setStep('selection');
                    setIsOpen(false);
                },
                onClose: () => setIsPaying(false)
            });
            handler.openIframe();
        } catch (error) {
            setIsPaying(false);
            console.error('Paystack Portal Error:', error);
            toast({ title: "Payment Failed", description: "Could not initialize Paystack.", variant: "destructive" });
        }
    };

    const PortalContent = (
        <div className="flex flex-col gap-6 h-full min-h-[400px]">
            <AnimatePresence mode="wait">
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
                            <button
                                key={tier.id}
                                onClick={() => handleSelectTier(tier)}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-[22px] transition-all group active:scale-[0.98]",
                                    "bg-muted/5 border border-white/10 hover:border-kenya-red/30 hover:bg-kenya-red/[0.03]",
                                    "glass-card"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-kenya-red/10 transition-colors shadow-inner">
                                        {tier.id === '320p' ? <Smartphone size={18} /> : <Monitor size={18} />}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm tracking-tight">{tier.label}</p>
                                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{tier.sublabel}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {tier.requiresDonation && (
                                        <Badge variant="outline" className="bg-kenya-red/10 text-kenya-red border-kenya-red/20 text-[8px] font-black tracking-widest uppercase px-1.5 py-0">Premium</Badge>
                                    )}
                                    <ChevronRight size={16} className="text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-kenya-red/60 transition-all" />
                                </div>
                            </button>
                        ))}
                        
                        <div className="pt-6 border-t border-white/5 mt-4">
                            <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest opacity-40">
                                Secure Ephemeral Link System • 5m Expiry
                            </p>
                        </div>
                    </motion.div>
                )}

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
                                Our <span className="text-foreground font-bold">HQ Infrastructure</span> is powered by community tips. Unlock this asset with a small contribution.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {DONATION_AMOUNTS.map((amt) => (
                                <button
                                    key={amt.value}
                                    onClick={() => setDonationAmount(amt.value)}
                                    className={cn(
                                        "py-4 rounded-2xl border transition-all text-sm font-black tracking-widest uppercase relative overflow-hidden",
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
                                onClick={() => setStep('selection')}
                                className="w-full py-4 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.25em] hover:text-kenya-red transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowRight size={12} className="rotate-180" /> Change Quality
                            </button>
                        </div>
                    </motion.div>
                )}

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
            {/* Desktop View: Floating Glassmorphic Modal */}
            <div className="hidden md:block">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>{trigger}</DialogTrigger>
                    <DialogContent className="max-w-md bg-background/60 backdrop-blur-3xl border-white/10 shadow-3xl rounded-[40px] overflow-hidden p-10 ring-1 ring-white/20">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black tracking-tighter text-center">Download Asset</DialogTitle>
                            <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">{title}</p>
                        </DialogHeader>
                        {PortalContent}
                    </DialogContent>
                </Dialog>
            </div>

            {/* Mobile View: High-End iOS Sheet */}
            <div className="md:hidden">
                <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
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
            </div>
        </>
    );
};

export default DownloadPortal;
