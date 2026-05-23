import React, { useState, useEffect, useRef } from 'react';
import { Heart, X, Gift, Copy, ExternalLink, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const DONATION_OPTIONS = [
  {
    name: 'Ko-fi',
    url: 'https://ko-fi.com/civiceducationkenya',
    description: 'Support us with a coffee',
    icon: '☕'
  },
  {
    name: 'PayPal',
    url: 'https://www.paypal.com/ncp/payment/5HP7FN968RTH6',
    description: 'Donate via PayPal',
    icon: '💳'
  },
  {
    name: 'M-Pesa',
    number: '+254798903373',
    description: 'Direct Mobile Transfer',
    icon: '📱'
  }
];

const MAX_WIDGET_DISPLAY_TIME = 20 * 60 * 1000;

interface DonationWidgetProps {
  onTimedOut?: () => void;
  isVisible?: boolean;
  offsetY?: number;
  onClose?: () => void;
  // HIDING MECHANICS ONLY
  isHidden?: boolean;
  onHide?: () => void;
}

const DonationWidget: React.FC<DonationWidgetProps> = ({ 
  onTimedOut, 
  isVisible: controlledVisibility, 
  offsetY = 140, 
  onClose,
  isHidden,
  onHide
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [opacity, setOpacity] = useState(1);
  
  // Paystack & Tiered State
  const [amount, setAmount] = useState<number | string>(500);
  const [isCustom, setIsCustom] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  const widgetMountTimeRef = useRef<number>(Date.now());
  const visibilityTimerRef = useRef<any>(null);
  const timeoutTimerRef = useRef<any>(null);
  const hoverInactivityTimerRef = useRef<any>(null);
  const opacityTimerRef = useRef<any>(null);
  const { toast } = useToast();

  const clearTimers = () => {
    [visibilityTimerRef, timeoutTimerRef, hoverInactivityTimerRef, opacityTimerRef].forEach(timerRef => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    });
  };

  useEffect(() => {
    if (isHovering || isExpanded) {
      setOpacity(1);
      if (opacityTimerRef.current) {
        clearTimeout(opacityTimerRef.current);
        opacityTimerRef.current = null;
      }
    } else {
      opacityTimerRef.current = setTimeout(() => {
        setOpacity(0.2);
      }, 5000);
    }

    return () => {
      if (opacityTimerRef.current) {
        clearTimeout(opacityTimerRef.current);
      }
    };
  }, [isHovering, isExpanded]);

  const handleMouseEnter = () => {
    if (!isExpanded) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isExpanded) {
      setIsHovering(false);
    }
  };

  useEffect(() => {
    if (controlledVisibility !== undefined) {
      setIsVisible(controlledVisibility);
      return;
    }

    visibilityTimerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 5000);
    
    timeoutTimerRef.current = setTimeout(() => {
      if (!isExpanded) {
        setIsVisible(false);
        setHasTimedOut(true);
        if (onTimedOut) onTimedOut();
      }
    }, MAX_WIDGET_DISPLAY_TIME);
    
    return clearTimers;
  }, [isExpanded, onTimedOut, controlledVisibility]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    if (onClose) {
      onClose();
    }
  };

  const handleMpesa = () => {
    navigator.clipboard.writeText('+254798903373');
    toast({
      title: "M-Pesa number copied",
      description: "Number copied to clipboard. You can proceed to send your MPesa donation there via 'Send Money'",
      duration: 3000,
    });
  };

  const handlePaystackDonate = () => {
    const finalAmount = Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount.",
        variant: "destructive"
      });
      return;
    }

    const publicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, '');
    
    if (!publicKey) {
      console.error('PAYSTACK_PUBLIC_KEY is not defined in the environment.');
      toast({
        title: "Configuration Error",
        description: "Payment system is not configured. Please try M-Pesa instead.",
        variant: "destructive"
      });
      return;
    }

    setIsPaying(true);
    try {
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: 'support@civiceducationkenya.com',
        amount: Math.round(finalAmount * 100), 
        currency: 'KES',
        ref: 'WIDGET-' + Math.floor((Math.random() * 1000000000) + 1),
        metadata: {
          custom_fields: [
            {
              display_name: "Support Tier",
              variable_name: "support_tier",
              value: isCustom ? `Custom Widget (${amount})` : `Widget Tier: KES ${amount}`
            }
          ]
        },
        callback: function (response: any) {
          setIsPaying(false);
          toast({
            title: "Support Confirmed",
            description: "Thank you for your generous contribution to the mission!",
          });
          handleCollapse();
        },
        onClose: function () {
          setIsPaying(false);
        }
      });
      handler.openIframe();
    } catch (error) {
      console.error('Paystack error:', error);
      setIsPaying(false);
    }
  };

  if (hasTimedOut || !isVisible || isHidden) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag={!isExpanded ? "x" : false}
        dragConstraints={{ left: 0, right: 300 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (!isExpanded && info.offset.x > 80) {
            onHide?.();
          }
        }}
        data-donation-trigger
        className="fixed z-[100]"
        style={{
          zIndex: isExpanded ? 100 : 30,
          opacity,
          touchAction: 'none',
          position: 'fixed' as const,
          top: isExpanded ? '50%' : 'auto',
          left: isExpanded ? '50%' : 'auto',
          bottom: isExpanded ? 'auto' : `${offsetY}px`,
          right: isExpanded ? 'auto' : '2rem',
          transform: isExpanded ? 'translate(-50%, -50%)' : 'none'
        }}
      >
          {!isExpanded ? (
            <div
              className="relative group cursor-pointer"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={handleExpand}
            >
              <div className="relative w-48 h-12 flex items-center">
                <div 
                  className={`absolute right-12 top-0 h-12 flex items-center transition-all duration-500 ease-out ${
                    isHovering 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 translate-x-4 pointer-events-none'
                  }`}
                >
                  <div 
                    className={`absolute inset-0 rounded-full transition-all duration-500 ease-out ${
                      isHovering 
                        ? 'bg-black/20 backdrop-blur-sm scale-100' 
                        : 'bg-black/0 backdrop-blur-none scale-75'
                    }`} 
                  />
                  <span 
                    className={`relative px-4 py-2 text-white font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-out drop-shadow-lg ${
                      isHovering 
                        ? 'opacity-100 scale-100' 
                        : 'opacity-0 scale-90'
                    }`}
                  >
                    Support Us
                  </span>
                </div>
                <div 
                  className={`absolute right-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ease-out shadow-2xl ${
                    isHovering
                      ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-red-500/50 scale-110'
                      : 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-red-600/40 scale-100'
                  }`}
                >
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-red-300/30 to-transparent" />
                  <Heart 
                    className={`relative z-10 transition-all duration-300 ease-out ${
                      isHovering 
                        ? 'h-6 w-6 text-white drop-shadow-lg' 
                        : 'h-5 w-5 text-white/90'
                    }`} 
                  />
                  <div 
                    className={`absolute inset-0 rounded-full bg-red-400 transition-all duration-1000 ease-out ${
                      isHovering 
                        ? 'animate-ping opacity-20' 
                        : 'opacity-0'
                    }`} 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-80 max-h-[90vh] flex flex-col bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl shadow-2xl overflow-hidden glass-card">
              <div className="bg-gradient-to-r from-kenya-green/20 to-kenya-green/10 p-4 border-b border-white/10 dark:border-gray-700/10">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg flex items-center text-gray-900 dark:text-white tracking-tight">
                    <div className="relative mr-3">
                      <Gift className="h-6 w-6 text-kenya-green drop-shadow-sm" />
                      <div className="absolute inset-0 bg-kenya-green/30 blur-sm rounded-full" />
                    </div>
                    Support Mission
                  </h3>
                  <button
                    className="relative group rounded-full p-2 hover:bg-white/10 dark:hover:bg-gray-800/10 transition-all duration-300 backdrop-blur-sm"
                    onClick={handleCollapse}
                  >
                    <X className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-kenya-red transition-colors" />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-4">
                <div className="space-y-4">
                   <div className="flex items-center gap-3 px-3 py-2 bg-kenya-green/5 border border-kenya-green/10 rounded-xl">
                      <img src="/icons/check-box-svgrepo-com.svg" className="w-4 h-4 invert dark:invert-0 opacity-50" alt="" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">100% Secure via Paystack</span>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      {[100, 200, 500, 1000].map(val => (
                        <button
                          key={val}
                          onClick={() => { setAmount(val); setIsCustom(false); }}
                          className={`h-16 rounded-xl border relative overflow-hidden transition-all duration-300 group ${amount === val && !isCustom ? 'border-kenya-green bg-kenya-green/10 shadow-lg' : 'border-white/10 bg-white/5 hover:border-kenya-green/30'}`}
                        >
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <span className={`text-xs font-black transition-all ${amount === val && !isCustom ? 'text-kenya-green' : 'text-slate-500 opacity-60 group-hover:opacity-100'}`}>
                              KES {val}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-tighter opacity-40">Support Tier</span>
                          </div>
                        </button>
                      ))}
                   </div>

                   <button
                      onClick={() => setIsCustom(!isCustom)}
                      className={`w-full py-3 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all ${isCustom ? 'border-kenya-green bg-kenya-green/10 text-kenya-green' : 'border-white/10 bg-white/5 text-slate-500'}`}
                   >
                      {isCustom ? 'Use Fixed Amounts' : 'Custom Support Amount'}
                   </button>

                   {isCustom && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group "
                      >
                        <input
                          type="number"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          className="w-full h-14 px-4 bg-white/5 border border-kenya-green/20 focus:border-kenya-green outline-none rounded-xl text-2xl font-black text-center text-kenya-green transition-all"
                          placeholder="0"
                          autoFocus
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest opacity-20">KES</div>
                      </motion.div>
                   )}

                   <button
                    onClick={handlePaystackDonate}
                    disabled={isPaying}
                    className="w-full py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] bg-kenya-green hover:bg-[#30D158] text-white transition-all shadow-xl shadow-kenya-green/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  >
                    <img src="/icons/wallet-money-svgrepo-com.svg" className="w-5 h-5 invert" alt="" />
                    {isPaying ? 'Processing...' : `Donate KES ${amount}`}
                  </button>
                </div>

                <div className="relative py-4 flex items-center gap-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-30 whitespace-nowrap">Or Direct Transfer</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="space-y-3">
                  {DONATION_OPTIONS.filter(o => o.name === 'M-Pesa').map((option) => (
                    <div 
                      key={option.name}
                      className="group relative p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all duration-300 border border-white/10 backdrop-blur-sm cursor-pointer"
                      onClick={handleMpesa}
                    >
                      <div className="flex items-center relative z-10">
                        <div className="text-2xl mr-4 transition-transform duration-300 group-hover:scale-110">
                          {option.icon}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-gray-900 dark:text-white mb-0.5">{option.name} Manual</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{option.description}</p>
                        </div>
                      </div>
                      <button
                        className="relative z-10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg bg-white/10 hover:bg-white/20 transition-all text-gray-700 dark:text-gray-300"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all"
                  onClick={handleCollapse}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DonationWidget;
