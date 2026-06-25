import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, CheckCircle2, ArrowRight, Home, Zap, Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Map BTCPay payment method identifiers to human-readable labels and icons
const RAIL_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  bitcoin: {
    label: 'Bitcoin',
    color: 'from-orange-400 to-amber-500',
    icon: <Bitcoin className="w-6 h-6 text-white" />,
  },
  lightning: {
    label: 'Lightning',
    color: 'from-yellow-400 to-amber-400',
    icon: <Zap className="w-6 h-6 text-white" />,
  },
  liquid: {
    label: 'Liquid Network',
    color: 'from-teal-400 to-cyan-500',
    icon: <CheckCircle2 className="w-6 h-6 text-white" />,
  },
  paystack: {
    label: 'Card / M-Pesa',
    color: 'from-kenya-green to-emerald-500',
    icon: <Heart className="w-6 h-6 text-white" />,
  },
  mpesa: {
    label: 'M-Pesa',
    color: 'from-emerald-500 to-green-600',
    icon: <Heart className="w-6 h-6 text-white" />,
  },
};

const COUNTDOWN_SECONDS = 8;

const DonationSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const rail = params.get('rail') || 'paystack';
  const invoiceId = params.get('invoiceId') || null;
  const campaignId = params.get('campaignId') || null;

  const meta = RAIL_META[rail.toLowerCase()] ?? RAIL_META['paystack'];

  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          navigate(campaignId ? `/campaign/${campaignId}` : '/');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [campaignId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-kenya-green/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-md w-full"
      >
        {/* Glass card */}
        <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden shadow-2xl shadow-black/40">

          {/* Top gradient accent */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${meta.color}`} />

          <div className="p-8 text-center">

            {/* Animated check ring */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-6 relative"
            >
              <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-2xl`}>
                {meta.icon}
              </div>
              {/* Ping ring */}
              <motion.div
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ delay: 0.4, duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${meta.color} w-24 h-24 mx-auto`}
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-3xl font-black text-white mb-2 tracking-tight"
            >
              Thank you! 🙏
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-slate-400 leading-relaxed mb-2"
            >
              Your{' '}
              <span className="font-bold text-white">{meta.label}</span>{' '}
              donation to CEKA has been received. Every contribution directly funds civic education
              and the defence of Kenyan rights.
            </motion.p>

            {invoiceId && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="text-xs font-mono text-slate-500 mt-1 mb-4 truncate"
              >
                Invoice: {invoiceId}
              </motion.p>
            )}

            {/* Divider */}
            <div className="h-px bg-white/8 my-6" />

            {/* Auto-redirect countdown */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs font-semibold text-slate-500 mb-5"
            >
              Redirecting in{' '}
              <span className="text-white font-black tabular-nums">{seconds}s</span>
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="flex gap-3"
            >
              <Button
                onClick={() => navigate('/')}
                className="flex-1 h-12 rounded-xl font-bold bg-kenya-green hover:bg-[#0ead36] text-white shadow-lg shadow-kenya-green/20 transition-all active:scale-95"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              {campaignId && (
                <Button
                  onClick={() => navigate(`/campaign/${campaignId}`)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-bold border-white/10 text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  Back to Campaign
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </motion.div>
          </div>

          {/* Bottom bevel */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Below-card tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-slate-600 mt-5 font-medium"
        >
          CEKA · Civic Education Kenya — Building a better Kenya, one citizen at a time.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default DonationSuccess;
