import React, { useState, useEffect, useRef } from 'react';
import { X, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PenNewSquareIcon, ThumbIcon } from '@/components/ui/CustomIcons';
import { useNavigate } from 'react-router-dom';
import {
  MpesaDonationIcon,
  CopyDonationIcon,
} from '@/components/ui/CustomIcons';

declare global {
  interface Window {
    PaystackPop: any;
    btcpay: any;
  }
}

type DonationMethod = {
  id: 'mpesa';
  label: string;
  kind: 'manual';
  payload: string;
  helperText?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DONATION_METHODS: DonationMethod[] = [
  {
    id: 'mpesa',
    label: 'M-Pesa',
    kind: 'manual',
    payload: '+254798903373',
    helperText: 'Direct Mobile Transfer',
    icon: MpesaDonationIcon,
  },
];

// BTCPay Pay Button HTML — embedded directly, triggers native BTCPay modal
const BTCPAY_FORM_HTML = `
<style>
  .btcpay-form { display: inline-flex; align-items: center; justify-content: center; width: 100%; }
  .btcpay-form--block { flex-direction: column; gap: 12px; }
  .btcpay-custom-container { text-align: center; width: 100%; }
  .btcpay-custom { display: flex; align-items: center; justify-content: center; gap: 4px; }
  .btcpay-form .plus-minus {
    cursor: pointer; font-size: 20px; line-height: 1;
    background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
    height: 36px; width: 36px; border-radius: 50%; margin: 0 4px;
    display: inline-flex; align-items: center; justify-content: center;
    color: #fff; transition: background 0.2s;
  }
  .btcpay-form .plus-minus:hover { background: rgba(255,255,255,0.25); }
  .btcpay-form select {
    -moz-appearance: none; -webkit-appearance: none; appearance: none;
    background: rgba(255,255,255,0.1); color: #fff;
    border: 1px solid rgba(255,255,255,0.25); border-radius: 8px;
    padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 700;
    letter-spacing: 0.05em;
  }
  .btcpay-form select option { color: #000; background: #fff; }
  .btcpay-input-price {
    -moz-appearance: textfield; border: none;
    background: rgba(255,255,255,0.15); color: #fff;
    text-align: center; font-size: 28px; font-weight: 900;
    width: 3em; border-radius: 10px; padding: 4px;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.2);
  }
  .btcpay-input-price::-webkit-outer-spin-button,
  .btcpay-input-price::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .btcpay-submit {
    min-width: 100%; min-height: 52px; border-radius: 14px; border: none;
    background: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font-size: 13px; font-weight: 900; letter-spacing: 0.08em;
    text-transform: uppercase; color: #0f3b21;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25); transition: transform 0.15s;
  }
  .btcpay-submit:hover { transform: scale(1.02); }
  .btcpay-submit img { height: 28px; border-radius: 6px; }
</style>
<form method="POST" action="https://btcpay.twentyone.africa/api/v1/invoices" class="btcpay-form btcpay-form--block">
  <input type="hidden" name="storeId" value="HcRpH25NVLi2fNbRG8ykAUmskk6t9XjtfYAm3M3zV3n" />
  <input type="hidden" name="jsonResponse" value="true" />
  <input type="hidden" name="checkoutDesc" value="Support CEKA" />
  <input type="hidden" name="serverIpn" value="https://cajrvemigxghnfmyopiy.supabase.co/functions/v1/btcpay-confirmations" />
  <input type="hidden" name="browserRedirect" value="https://civiceducationkenya.com/donation-success" />
  <input type="hidden" name="notifyEmail" value="admin@civiceducationkenya.com" />
  <div class="btcpay-custom-container">
    <div class="btcpay-custom">
      <button class="plus-minus" type="button" data-type="-" data-step="100" data-min="100" data-max="50000">−</button>
      <input class="btcpay-input-price" type="number" name="price" min="100" max="50000" step="100" value="500" data-price="500" />
      <button class="plus-minus" type="button" data-type="+" data-step="100" data-min="100" data-max="50000">+</button>
    </div>
    <select name="currency" style="margin-top:8px">
      <option value="KES" selected>KES</option>
      <option value="USD">USD</option>
      <option value="GBP">GBP</option>
      <option value="EUR">EUR</option>
      <option value="BTC">BTC</option>
    </select>
  </div>
  <button type="submit" class="btcpay-submit" title="Pay with BTCPay Server">
    <img src="https://www.civiceducationkenya.com/favicon.ico" alt="CEKA" />
    Donate with Bitcoin / Lightning
  </button>
</form>
<script>
  (function() {
    if (!window.btcpay) {
      var s = document.createElement('script');
      s.src = 'https://btcpay.twentyone.africa/modal/btcpay.js';
      document.head.appendChild(s);
    }
    function initBtcpay() {
      document.querySelectorAll('.btcpay-form:not([data-init])').forEach(function(form) {
        form.dataset.init = '1';
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          var xhr = new XMLHttpRequest();
          xhr.onreadystatechange = function() {
            if (this.readyState === 4 && this.status === 200 && this.responseText) {
              window.btcpay.appendInvoiceFrame(JSON.parse(this.responseText).invoiceId);
            }
          };
          xhr.open('POST', e.target.action, true);
          xhr.send(new FormData(e.target));
        });
      });
      document.querySelectorAll('.plus-minus:not([data-init])').forEach(function(btn) {
        btn.dataset.init = '1';
        btn.addEventListener('click', function() {
          var root = btn.closest('.btcpay-form');
          var el = root.querySelector('.btcpay-input-price');
          var step = parseInt(btn.dataset.step) || 100;
          var min = parseInt(btn.dataset.min) || 100;
          var max = parseInt(btn.dataset.max) || 50000;
          var v = parseInt(el.value) || min;
          el.value = btn.dataset.type === '-' ? Math.max(min, v - step) : Math.min(max, v + step);
        });
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBtcpay);
    else setTimeout(initBtcpay, 100);
  })();
</script>
`;


const HeartDonationIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M8.10627 18.2468C5.29819 16.0833 2 13.5422 2 9.1371C2 4.27416 7.50016 0.825464 12 5.50063L14 7.49928C14.2929 7.79212 14.7678 7.79203 15.0607 7.49908C15.3535 7.20614 15.3534 6.73127 15.0605 6.43843L13.1285 4.50712C17.3685 1.40309 22 4.67465 22 9.1371C22 13.5422 18.7018 16.0833 15.8937 18.2468C15.6019 18.4717 15.3153 18.6925 15.0383 18.9109C14 19.7294 13 20.5 12 20.5C11 20.5 10 19.7294 8.96173 18.9109C8.68471 18.6925 8.39814 18.4717 8.10627 18.2468Z" fill="currentColor" />
  </svg>
);

const MAX_WIDGET_DISPLAY_TIME = 20 * 60 * 1000;

interface DonationWidgetProps {
  onTimedOut?: () => void;
  isVisible?: boolean;
  offsetY?: number;
  onClose?: () => void;
  isHidden?: boolean;
  onHide?: () => void;
}

// Helper: truncate address with middle ellipsis (e.g., bc1qma9d...gn3at)
const truncateMiddle = (value: string, start = 8, end = 6) => {
  if (value.length <= start + end) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
};

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

  const [amount, setAmount] = useState<number | string>(500);
  const [isCustom, setIsCustom] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // QR modal state
  const [qrMethod, setQrMethod] = useState<DonationMethod | null>(null);

  const widgetMountTimeRef = useRef<number>(Date.now());
  const visibilityTimerRef = useRef<any>(null);
  const timeoutTimerRef = useRef<any>(null);
  const hoverInactivityTimerRef = useRef<any>(null);
  const opacityTimerRef = useRef<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
    }, 1100);

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

  // Listen for programmatic open from anywhere in the app (e.g. CampaignDetail "Support Safely")
  useEffect(() => {
    const handleToggle = () => {
      setIsExpanded(true);
      setIsVisible(true);
      setHasTimedOut(false);
    };
    window.addEventListener('ceka-toggle-donation', handleToggle);
    return () => window.removeEventListener('ceka-toggle-donation', handleToggle);
  }, []);

  const handleCollapse = () => {
    setIsExpanded(false);
    setQrMethod(null); // close any open QR modal
    if (onClose) {
      onClose();
    }
  };

  const handleCopy = (method: DonationMethod) => {
    navigator.clipboard.writeText(method.payload);
    if (method.kind === 'manual') {
      toast({
        title: `${method.label} number copied`,
        description: 'Number copied to clipboard. Open M-Pesa → Send Money and paste the number to complete your donation.',
        duration: 4000,
      });
    } else {
      toast({
        title: `${method.label} address copied`,
        description: 'Address copied to clipboard. Open your wallet and paste it into the send field to complete your donation.',
        duration: 4000,
      });
    }
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
          handleCollapse();
          navigate('/donation-success?rail=paystack');
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

  return (
    <AnimatePresence>
      {/* QR Code Modal */}
      {qrMethod && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setQrMethod(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {React.createElement(qrMethod.icon, { className: 'w-6 h-6' })}
                {qrMethod.label}
              </h3>
              <button
                onClick={() => setQrMethod(null)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <QRCodeSVG value={qrMethod.qrPayload || qrMethod.payload} size={220} level="M" />
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider">Address</p>
              <code className="text-sm text-slate-800 dark:text-slate-200 break-all font-mono">
                {qrMethod.payload}
              </code>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(qrMethod.payload);
                toast({
                  title: 'Address Copied',
                  description: 'You can now paste this into your wallet.',
                  duration: 3000,
                });
              }}
              className="w-full py-3 bg-kenya-green hover:bg-[#0ead36] text-white rounded-xl font-bold uppercase text-sm tracking-wider transition-colors"
            >
              Copy Address
            </button>
          </motion.div>
        </motion.div>
      )}

      {(hasTimedOut || !isVisible || isHidden) ? null : (
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
          className={cn(
            "fixed pointer-events-auto",
            isExpanded ? "inset-0 flex items-center justify-center z-[9999]" : "z-40"
          )}
          style={{
            opacity,
            touchAction: 'none',
            ...(isExpanded ? {
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            } : {
              bottom: `${offsetY}px`,
              right: '2rem'
            })
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
                    Support Us
                  </span>
                </div>
                <div
                  className={`absolute right-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ease-out shadow-2xl ${isHovering
                    ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-red-500/50 scale-110'
                    : 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-red-600/40 scale-100'
                    }`}
                >
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-red-300/30 to-transparent" />
                  <HeartDonationIcon
                    className={`relative z-10 w-6 h-6 transition-all duration-300 ease-out ${isHovering
                      ? 'scale-110 text-white drop-shadow-lg translate-y-[1px]'
                      : 'scale-100 text-white/90 translate-y-[1px]'
                      }`}
                  />
                  <div
                    className={`absolute inset-0 rounded-full bg-red-400 transition-all duration-1000 ease-out ${isHovering
                      ? 'animate-ping opacity-20'
                      : 'opacity-0'
                      }`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Dimming Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCollapse}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[-1]"
              />
              <div className="w-80 max-h-[90vh] flex flex-col bg-white dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200 dark:border-gray-700/20 rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-kenya-green/10 to-kenya-green/5 p-4 border-b border-slate-200 dark:border-gray-700/10">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white tracking-tight">
                      <div className="relative mr-3">
                        <ThumbIcon className="h-6 w-6 text-kenya-green drop-shadow-sm" />
                        <div className="absolute inset-0 bg-kenya-green/30 blur-sm rounded-full" />
                      </div>
                      Support CEKA
                    </h3>
                    <button
                      className="relative group rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300"
                      onClick={handleCollapse}
                    >
                      <X className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </div>

                <div className="p-4 overflow-y-auto space-y-4">
                  <div className="space-y-4">


                    {/* Amount selection grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[100, 200, 500, 1000].map(val => (
                        <button
                          key={val}
                          onClick={() => { setAmount(val); setIsCustom(false); }}
                          className={cn(
                            "h-16 rounded-xl border relative overflow-hidden transition-all duration-150 ease-out",
                            "hover:scale-[1.02] hover:shadow-md",
                            amount === val && !isCustom
                              ? "border-kenya-green bg-kenya-green/10 shadow-lg ring-1 ring-kenya-green/50"
                              : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-kenya-green/30"
                          )}
                        >
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <span className={cn(
                              "text-sm font-black transition-all duration-150",
                              amount === val && !isCustom
                                ? "text-slate-900 dark:text-slate-200"
                                : "text-slate-500 dark:text-slate-400"
                            )}>
                              KES {val}
                            </span>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest transition-all duration-150",
                              amount === val && !isCustom
                                ? "text-kenya-green/90"
                                : "text-slate-400 dark:text-slate-500"
                            )}>
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setIsCustom(!isCustom)}
                      className={`w-full py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all duration-150 flex items-center justify-center gap-2 ${isCustom ? 'border-kenya-green bg-kenya-green/10 text-kenya-green' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                    >
                      <PenNewSquareIcon className="w-4 h-4" />
                      {isCustom ? 'Use Fixed Amounts' : 'Write Your Own Amount'}
                    </button>

                    {isCustom && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                      >
                        <input
                          type="number"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          className="w-full h-14 px-4 bg-white dark:bg-white/5 border border-kenya-green/20 focus:border-kenya-green outline-none rounded-xl text-2xl font-black text-center text-slate-900 dark:text-slate-200 transition-all"
                          placeholder="0"
                          autoFocus
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">KES</div>
                      </motion.div>
                    )}

                    <button
                      onClick={handlePaystackDonate}
                      disabled={isPaying}
                      className="w-full py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] bg-kenya-green hover:bg-[#0ead36] text-white transition-all shadow-xl shadow-kenya-green/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      <img src="/icons/wallet-money-svgrepo-com.svg" className="w-5 h-5 invert" alt="" />
                      {isPaying ? 'Processing...' : `Donate KES ${amount}`}
                    </button>
                  </div>

                  <div className="relative py-4 flex items-center gap-4">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 whitespace-nowrap">Other Methods</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                  </div>

                  {/* ── M-Pesa manual methods ── */}
                  <div className="space-y-3 pb-2">
                    {DONATION_METHODS.map((method) => (
                      <div
                        key={method.id}
                        className="group relative rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors overflow-hidden"
                      >
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center min-w-0 flex-1">
                            {React.createElement(method.icon, { className: 'w-5 h-5 mr-3 shrink-0' })}
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">{method.label}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                                {method.payload}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCopy(method)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors ml-3"
                            title={`Copy M-Pesa number`}
                          >
                            <CopyDonationIcon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── BTCPay crypto section ── */}
                  <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f3b21] to-[#1a5c35] p-4 shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor"><path d="M14.24 10.56C13.93 11.8 12 11.17 11.4 11L12.05 8.38C12.65 8.55 14.56 9.26 14.24 10.56M11.12 12.49C10.75 13.87 8.46 13.12 7.72 12.93L8.45 10.01C9.19 10.2 11.5 11.04 11.12 12.49M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2M13.19 14.97C13.04 15.54 12.6 15.91 12 16.1V17H10.9V16.14C10.43 16.09 9.95 15.96 9.5 15.76L9.86 14.3C10.33 14.5 10.87 14.68 11.4 14.72C11.95 14.77 12.3 14.56 12.38 14.17C12.47 13.74 12.1 13.54 11.31 13.21C10.31 12.82 9.5 12.33 9.71 11.27C9.87 10.65 10.31 10.24 10.9 10.05V9.17H12V10.01C12.4 10.05 12.8 10.15 13.22 10.32L12.87 11.74C12.53 11.6 12.13 11.46 11.72 11.44C11.22 11.41 10.95 11.64 10.89 11.96C10.82 12.33 11.22 12.52 12.01 12.86C13.08 13.31 13.39 13.91 13.19 14.97Z"/></svg>
                      </div>
                      <span className="text-white text-[10px] font-black uppercase tracking-widest opacity-80">Bitcoin · Lightning · Liquid</span>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: BTCPAY_FORM_HTML }} />
                  </div>


                  <button
                    className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-150"
                    onClick={handleCollapse}
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DonationWidget;