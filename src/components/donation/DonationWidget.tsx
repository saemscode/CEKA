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
import { QRCodeSVG } from 'qrcode.react';

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
  qrPayload?: string;
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

const MaskedMethodItem: React.FC<{ method: DonationMethod, onCopy: (method: DonationMethod) => void }> = ({ method, onCopy }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleTap = () => {
    onCopy(method);
    setIsRevealed(true);
    setTimeout(() => setIsRevealed(false), 3000);
  };

  const payload = method.payload;
  // Fallback if payload isn't long enough
  const prefix = payload.length > 7 ? payload.slice(0, 5) : payload;
  const suffix = payload.length > 7 ? payload.slice(-2) : '';
  const middle = payload.length > 7 ? payload.slice(5, -2) : '';

  return (
    <button
      type="button"
      onClick={handleTap}
      className="group w-full relative rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-[0.98] overflow-hidden text-left"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center min-w-0 flex-1">
          {React.createElement(method.icon, { className: 'w-5 h-5 mr-3 shrink-0 text-slate-900 dark:text-white' })}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">{method.label}</p>
            <div className="flex items-center gap-0.5 text-[11px] font-mono text-slate-700 dark:text-slate-300">
              <span className="font-bold">{prefix}</span>
              <span className={`transition-all duration-500 ease-out select-none font-bold ${isRevealed ? 'blur-0 text-slate-900 dark:text-white' : 'blur-[4px] text-slate-500 dark:text-slate-500'}`}>
                {middle}
              </span>
              <span className="font-bold">{suffix}</span>
            </div>
          </div>
        </div>
        <div className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors ml-3">
          {isRevealed ? (
            <svg className="w-4 h-4 text-kenya-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <CopyDonationIcon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </button>
  );
};

// BTCPay Pay Button — ultra-modern, deep iOS glassmorphism redesign
const BTCPAY_STORE_ID = 'HcRpH25NVLi2fNbRG8ykAUmskk6t9XjtfYAm3M3zV3n';
const BTCPAY_HOST = 'https://btcpay.twentyone.africa';

type CryptoRail = { id: string; label: string; icon: React.ReactNode; hint: string; checkoutDesc: string; disabled?: boolean };
const CRYPTO_RAILS: CryptoRail[] = [
  {
    id: 'onchain',
    label: 'Bitcoin',
    icon: (
      <svg fill="currentColor" viewBox="0 0 529.012 529.013" className="w-4 h-4 drop-shadow-md">
        <path d="M366.817,252.027c19.285-8.727,34.561-21.824,45.826-39.278c11.268-17.46,16.898-36.64,16.898-57.552c0-19.284-4.566-36.689-13.703-52.222c-9.137-15.532-20.551-27.962-34.254-37.301c-13.703-9.339-29.234-15.478-46.592-18.421c-2.826-0.478-5.984-0.906-9.295-1.31V18.36c0-10.141-8.221-18.36-18.361-18.36h-36.719c-10.141,0-18.36,8.219-18.36,18.36v24.48h-38.293V18.36c0-10.141-8.219-18.36-18.36-18.36h-36.72c-10.141,0-18.36,8.219-18.36,18.36v24.48H77.543v446.393h62.993v21.42c0,10.141,8.219,18.36,18.36,18.36h36.72c10.141,0,18.36-8.22,18.36-18.36v-21.42h15.514c8.023-0.055,15.587-0.128,22.779-0.208v21.628c0,10.141,8.219,18.36,18.36,18.36h36.721c10.141,0,18.359-8.22,18.359-18.36V487.14c5.098-0.288,9.303-0.606,12.49-0.949c23.955-2.638,44.102-9.693,60.441-21.162c16.34-11.47,29.229-26.794,38.672-45.979c9.438-19.187,14.156-38.924,14.156-59.224c0-25.783-7.307-48.214-21.922-67.296S394.02,259.947,366.817,252.027z M219.442,117.137c42.43,0,68.109,0.508,77.039,1.523c15.023,1.83,26.34,7.057,33.953,15.68s11.42,19.841,11.42,33.648c0,14.413-4.418,26.034-13.25,34.865c-8.83,8.832-20.961,14.162-36.389,15.986c-8.525,1.016-30.35,1.523-65.466,1.523h-59.07V117.137H219.442z M345.655,393.473c-8.428,9.438-19.334,15.38-32.736,17.815c-8.732,1.83-29.332,2.742-61.812,2.742h-83.434V294.659h72.772c41.004,0,67.651,2.13,79.934,6.396s21.67,11.065,28.164,20.404c6.492,9.339,9.742,20.704,9.742,34.106C358.292,371.392,354.083,384.029,345.655,393.473z" />
      </svg>
    ),
    hint: 'On-chain · slow but final',
    checkoutDesc: 'Support CEKA — On-Chain Bitcoin',
  },
  {
    id: 'lightning',
    label: 'Lightning',
    icon: (
      <svg fill="currentColor" viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-md">
        <path d="M23.901 6.164c0.593-1.664 0.654-3.411 0.245-5.060h-0v0c-0.042 1.519-0.508 3.075-1.385 4.482-2.338 3.755-7.035 5.419-11.348 4.363 0.325-0.144 0.639-0.302 0.938-0.474 2.437-1.404 3.574-3.46 3.389-5.721-0.461 1.361-1.537 2.578-3.134 3.498-2.998 1.727-7.364 1.977-11.698 1.057v2.332c2.561 0.51 5.122 0.597 7.399 0.215 0.261 0.178 0.534 0.347 0.821 0.502l-0.041 0.003 6.591 7.669-5.806 1.273 18.698 10.643-6.822-10.984 3.622-0.933-5.712-7.841c1.285-0.748 2.406-1.772 3.249-3.044 2.523 0.916 5.292 1.244 7.945 1.023v-2.442c-2.3 0.224-4.692 0.048-6.95-0.562z"></path>
      </svg>
    ),
    hint: 'Instant · near-zero fee',
    checkoutDesc: 'Support CEKA — Lightning Network',
  },
  {
    id: 'liquid',
    label: 'Liquid',
    disabled: true,
    icon: (
      <svg viewBox="0 0 512 512" className="w-4 h-4 drop-shadow-md text-blue-100">
        <path fill="currentColor" opacity="0.8" d="M272.431,6.816C268.072,2.458,262.164,0.008,256,0.002c-0.008,0-0.017-0.002-0.026-0.002 c-6.173,0-12.093,2.453-16.455,6.817c-6.613,6.614-161.955,163.854-161.955,326.783C77.563,431.97,157.598,512,255.975,512 c0.008,0,0.017,0,0.025,0c98.392-0.014,178.437-80.038,178.437-178.399C434.437,170.668,279.046,13.428,272.431,6.816z" />
        <path fill="currentColor" d="M255.975,512c0.008,0,0.017,0,0.025,0V0.002c-0.008,0-0.017-0.002-0.026-0.002 c-6.173,0.002-12.093,2.453-16.455,6.817c-6.613,6.614-161.955,163.854-161.955,326.783C77.563,431.97,157.598,512,255.975,512z" />
      </svg>
    ),
    hint: 'Confidential · upgrade pending',
    checkoutDesc: 'Support CEKA — Liquid Network',
  },
];

const CURRENCY_OPTS = [
  { value: 'KES', label: 'KES /=', defaultAmt: 100 },
  { value: 'USD', label: 'USD $', defaultAmt: 5 },
  { value: 'GBP', label: 'GBP £', defaultAmt: 4 },
  { value: 'EUR', label: 'EUR €', defaultAmt: 5 },
  { value: 'BTC', label: 'BTC ₿', defaultAmt: 0.0001 },
];

const STEP: Record<string, number> = { USD: 1, GBP: 1, EUR: 1, KES: 100, BTC: 0.00001 };
const MIN: Record<string, number> = { USD: 1, GBP: 1, EUR: 1, KES: 100, BTC: 0.00001 };
const MAX: Record<string, number> = { USD: 500, GBP: 400, EUR: 450, KES: 50000, BTC: 0.01 };

const BTCPayButton: React.FC = () => {
  const [rail, setRail] = React.useState<string>('lightning');
  const [currency, setCurrency] = React.useState('KES');
  const [amount, setAmount] = React.useState(100);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [showGuide, setShowGuide] = React.useState(false);

  React.useEffect(() => {
    if (document.getElementById('btcpay-modal-js')) return;
    const s = document.createElement('script');
    s.id = 'btcpay-modal-js';
    s.src = `${BTCPAY_HOST}/modal/btcpay.js`;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  const step = STEP[currency] ?? 1;
  const minV = MIN[currency] ?? 1;
  const maxV = MAX[currency] ?? 500;

  const handleCurrencyChange = (c: string) => {
    setCurrency(c);
    setAmount(CURRENCY_OPTS.find(o => o.value === c)?.defaultAmt ?? 5);
    setErr('');
  };

  const dec = () => setAmount(a => parseFloat(Math.max(minV, a - step).toFixed(8)));
  const inc = () => setAmount(a => parseFloat(Math.min(maxV, a + step).toFixed(8)));

  const activeRail = CRYPTO_RAILS.find(r => r.id === rail) ?? CRYPTO_RAILS[1];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('storeId', BTCPAY_STORE_ID);
      form.append('jsonResponse', 'true');
      form.append('checkoutDesc', activeRail.checkoutDesc);
      form.append('price', String(amount));
      form.append('currency', currency);
      form.append('serverIpn', 'https://cajrvemigxghnfmyopiy.supabase.co/functions/v1/btcpay-confirmations');
      form.append('browserRedirect', 'https://civiceducationkenya.com/donation-success');
      form.append('notifyEmail', 'admin@civiceducationkenya.com');

      const res = await fetch(`${BTCPAY_HOST}/api/v1/invoices`, { method: 'POST', body: form });
      const text = await res.text();
      if (!res.ok) { setErr(`BTCPay error ${res.status}. Try USD.`); return; }
      const json = JSON.parse(text);
      const invoiceId = json.invoiceId || json.id;
      if (!invoiceId) { setErr('No invoice returned. Please try again.'); return; }

      if ((window as any).btcpay?.appendInvoiceFrame) {
        (window as any).btcpay.appendInvoiceFrame(invoiceId);
      } else {
        window.open(`${BTCPAY_HOST}/invoice?id=${invoiceId}`, '_blank');
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const amtDisplay = currency === 'BTC' ? amount.toFixed(5) : currency === 'KES' ? amount.toLocaleString() : amount.toFixed(2);

  return (
    <div className="relative w-full">
      {/* ── Tutorial Flip Card Overlay ── */}
      {showGuide && (
        <div className="relative w-full h-full inset-0 z-20 bg-[#06180c]/95 backdrop-blur-2xl rounded-2xl p-5 flex flex-col justify-center shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 animate-in fade-in zoom-in-95 duration-200">
          <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4 text-center drop-shadow-md">3 Steps Using Bitcoin</h4>
          <ul className="space-y-4 text-white/90 text-[11px] font-semibold tracking-wide">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0 text-white font-black text-[10px] shadow-inner">1</span>
              <span>Get a Lightning wallet like <b>Muun</b>, <b>Bull Wallet</b>, or <b>Wallet of Satoshi</b>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0 text-white font-black text-[10px] shadow-inner">2</span>
              <span>Select your amount and tap <b>Donate</b> to generate a unique invoice.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0 text-white font-black text-[10px] shadow-inner">3</span>
              <span>Scan the QR code or tap the invoice to open your wallet and confirm.</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => setShowGuide(false)}
            className="mt-6 w-full py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl border border-white/20 text-white text-[11px] font-black uppercase tracking-widest transition-all"
          >
            Got it
          </button>
        </div>
      )}

      {/* ── Main Form ── */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">

        {/* Header w/ Tutorial Toggle */}
        <div className="flex justify-between items-center px-1">
          <span className="text-[8px] -bottom-1 font-black text-white/50 uppercase tracking-widest">Choose Below</span>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
          >
            <svg className="w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.726 13.02 14 16H9v-1h4.065a.5.5 0 0 0 .416-.777l-.888-1.332A1.995 1.995 0 0 0 10.93 12H3a1 1 0 0 0-1 1v6a2 2 0 0 0 2 2h9.639a3 3 0 0 0 2.258-1.024L22 13l-1.452-.484a2.998 2.998 0 0 0-2.822.504zm1.532-5.63c.451-.465.73-1.108.73-1.818s-.279-1.353-.73-1.818A2.447 2.447 0 0 0 17.494 3S16.25 2.997 15 4.286C13.75 2.997 12.506 3 12.506 3a2.45 2.45 0 0 0-1.764.753c-.451.466-.73 1.108-.73 1.818s.279 1.354.73 1.818L15 12l4.258-4.61z" />
            </svg>
            How to Donate
          </button>
        </div>

        {/* ── iOS Segmented Control ── */}
        <div className="flex p-1 bg-black/40 backdrop-blur-md rounded-xl shadow-[inset_0_1px_4px_rgba(0,0,0,0.6)] relative">
          {CRYPTO_RAILS.map(r => (
            <button
              key={r.id}
              type="button"
              disabled={r.disabled}
              onClick={() => { setRail(r.id); setErr(''); }}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${rail === r.id
                ? 'bg-white/25 text-white shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] scale-[1.02] z-10'
                : r.disabled
                  ? 'opacity-40 grayscale cursor-not-allowed'
                  : 'text-white/50 hover:text-white/90 hover:bg-white/10 active:scale-95 z-0'
                }`}
              aria-pressed={rail === r.id}
            >
              <span className={rail === r.id ? 'text-white' : 'text-white/50'}>{r.icon}</span>
              {r.label}

              {r.disabled && (
                <span className="absolute -bottom-1 bg-blue-500 text-white text-[5px] px-1.5 py-0.5 rounded border border-blue-400/50 tracking-widest font-black shadow-lg">
                  COMING SOON
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-[9px] font-bold text-white/40 tracking-widest uppercase -mt-1.5 h-3">
          {activeRail.hint}
        </p>

        {/* ── Unified iOS Stepper & Currency ── */}
        <div className="flex items-center justify-between p-1.5 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.2)]">

          <button
            type="button"
            onClick={dec}
            className="w-11 h-11 shrink-0 rounded-xl bg-black/20 hover:bg-black/40 border border-white/10 text-white text-2xl font-light flex items-center justify-center active:scale-90 active:bg-black/60 transition-all duration-200 select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            aria-label="Decrease amount"
          >
            <span className="mb-1 text-center justify-center align-center">−</span></button>

          <div className="flex-1 flex flex-col items-center justify-center relative">
            {/* Currency Dropdown integrated into stepper */}
            <div className="absolute -top-1">
              <select
                value={currency}
                onChange={e => handleCurrencyChange(e.target.value)}
                className="appearance-none bg-transparent text-white/50 hover:text-white/80 text-[9px] font-black uppercase tracking-widest cursor-pointer outline-none transition-all text-center pb-1"
              >
                {CURRENCY_OPTS.map(o => (
                  <option key={o.value} value={o.value} style={{ background: '#0a2e19', color: '#fff' }}>
                    {o.label}
                  </option>
                ))}
              </select>
              <svg className="absolute mt-2 -right-3 top-1 pointer-events-none w-2 h-2 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            <input
              type="number"
              value={amount}
              min={minV} max={maxV} step={step}
              onChange={e => setAmount(parseFloat(e.target.value) || minV)}
              className="w-full text-center text-3xl font-black bg-transparent text-white border-none outline-none py-1 mt-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:scale-105 transition-transform"
              aria-label="Donation amount"
            />
          </div>

          <button
            type="button"
            onClick={inc}
            className="w-11 h-11 shrink-0 rounded-xl bg-black/20 hover:bg-black/40 border border-white/10 text-white text-2xl font-light flex items-center justify-center active:scale-90 active:bg-black/60 transition-all duration-200 select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            aria-label="Increase amount"
          >
            <span className="mb-1 text-center justify-center align-center cursor-pointer">+</span></button>
        </div>

        {err && (
          <p className="text-red-200 text-[10px] text-center font-bold px-3 py-1.5 bg-red-500/20 rounded-xl border border-red-400/30 backdrop-blur-md animate-in slide-in-from-top-1">
            {err}
          </p>
        )}

        {/* ── Submit Button (Deep Glass Gradient) ── */}
        <button
          type="submit"
          disabled={busy}
          className="w-full h-[56px] rounded-2xl bg-gradient-to-b from-white to-[#e0e0e0] font-black text-[13px] uppercase tracking-widest text-[#0f3b21] shadow-[0_6px_20px_rgba(0,0,0,0.4),inset_0_-3px_0_rgba(0,0,0,0.1)] hover:brightness-105 active:scale-[0.97] active:shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {busy ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
              Initializing...
            </>
          ) : (
            <>
              <span className="text-[#0f3b21] drop-shadow-sm group-hover:scale-110 transition-transform">{activeRail.icon}</span>
              Donate {currency === 'BTC' ? `₿ ${amtDisplay}` : `${currency} ${amtDisplay}`}
            </>
          )}
        </button>
      </form>
    </div>
  );
};






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
          navigate('/donation-success?rail=paystack', { state: { fromDonation: true } });
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
                      <MaskedMethodItem key={method.id} method={method} onCopy={handleCopy} />
                    ))}
                  </div>

                  {/* ── BTCPay crypto section ── */}
                  <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f3b21] to-[#1a5c35] p-4 shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.726 13.02 14 16H9v-1h4.065a.5.5 0 0 0 .416-.777l-.888-1.332A1.995 1.995 0 0 0 10.93 12H3a1 1 0 0 0-1 1v6a2 2 0 0 0 2 2h9.639a3 3 0 0 0 2.258-1.024L22 13l-1.452-.484a2.998 2.998 0 0 0-2.822.504zm1.532-5.63c.451-.465.73-1.108.73-1.818s-.279-1.353-.73-1.818A2.447 2.447 0 0 0 17.494 3S16.25 2.997 15 4.286C13.75 2.997 12.506 3 12.506 3a2.45 2.45 0 0 0-1.764.753c-.451.466-.73 1.108-.73 1.818s.279 1.354.73 1.818L15 12l4.258-4.61z" />
                      </svg>
                      <span className="text-white text-[10px] font-black uppercase tracking-widest opacity-80">Make Your Donation Easy</span>
                    </div>
                    <BTCPayButton />
                    
                    {/* ── Partner Recognition Footer (Inside Green Box) ── */}
                    <a href="https://btcpayserver.org/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 pt-3 mt-4 border-t border-white/10 cursor-pointer group hover:opacity-100 transition-opacity">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">
                        In Partnership With
                      </span>
                      
                      {/* The Inlined BTCPay SVG Logo */}
                      <svg className="h-3 w-auto opacity-70 grayscale group-hover:grayscale-0 transition-all duration-500 ease-out" viewBox="0 0 105.46 188.47">
                        <path fill="#cedc21" d="M117.24,247.32a11.06,11.06,0,0,1-11-11.06V69.91a11.06,11.06,0,1,1,22.11,0V236.26A11.06,11.06,0,0,1,117.24,247.32Z" transform="translate(-106.19 -58.85)"/>
                        <path fill="#51b13e" d="M117.25,247.32a11.06,11.06,0,0,1-4.75-21l66.66-31.64L110.69,144.2a11.05,11.05,0,1,1,13.11-17.8l83.35,61.41a11,11,0,0,1-1.82,18.88L122,246.25A10.94,10.94,0,0,1,117.25,247.32Z" transform="translate(-106.19 -58.85)"/>
                        <path fill="#cedc21" d="M117.25,181.93a11.05,11.05,0,0,1-6.56-20l68.47-50.45L112.5,79.89a11.05,11.05,0,0,1,9.48-20l83.35,39.56a11.05,11.05,0,0,1,1.82,18.89L123.8,179.78A11,11,0,0,1,117.25,181.93Z" transform="translate(-106.19 -58.85)"/>
                        <polygon fill="#1e7a44" points="22.11 70.86 22.11 117.61 53.82 94.25 22.11 70.86"/>
                        <rect fill="#ffffff" y="51.26" width="22.11" height="53.89"/>
                        <path fill="#cedc21" d="M128.3,69.91a11.06,11.06,0,1,0-22.11,0V209H128.3Z" transform="translate(-106.19 -58.85)"/>
                      </svg>
                      
                      <span className="text-[10px] font-black tracking-tight text-white/60">
                        BTCPay
                      </span>
                    </a>
                  </div>

                  <button
                    className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-150 mt-2"
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