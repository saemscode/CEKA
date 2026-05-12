import React, { useState, useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Mail, ArrowRight, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SubmissionVerificationProps {
  email: string;
  onVerify: (code: string) => Promise<boolean>;
  onResend: () => void;
  onCancel: () => void;
}

export const SubmissionVerification: React.FC<SubmissionVerificationProps> = ({
  email,
  onVerify,
  onResend,
  onCancel
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (code.every(c => c !== '')) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(false);
    const success = await onVerify(code.join(''));
    if (!success) {
      setError(true);
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
    setIsVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-[3005] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-3xl"
        onClick={onCancel}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-white/10 dark:bg-black/40 backdrop-blur-3xl rounded-[40px] border border-white/20 shadow-ios-high overflow-hidden"
      >
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-start">
            <div className="h-14 w-14 rounded-2xl bg-kenya-green flex items-center justify-center shadow-xl shadow-kenya-green/30">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <button 
              onClick={onCancel}
              className="h-10 w-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X size={18} className="text-white/60" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-[1000] tracking-tighter text-white">Verification</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              We sent a 6-digit code to <span className="text-white font-bold">{email}</span>. Enter the code to confirm your signature.
            </p>
          </div>

          <div className="flex justify-between gap-2">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={cn(
                  "w-12 h-16 rounded-2xl bg-white/5 border-2 text-center text-2xl font-black text-white focus:outline-none transition-all",
                  error ? "border-red-500 animate-shake" : "border-white/10 focus:border-kenya-green focus:bg-white/10"
                )}
              />
            ))}
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleVerify}
              disabled={isVerifying || code.some(c => c === '')}
              className="w-full h-14 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              {isVerifying ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>Verify <ArrowRight className="ml-2" size={16} /></>
              )}
            </Button>

            <div className="flex flex-col items-center gap-3">
              <button 
                onClick={onResend}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
              >
                Resend Code
              </button>
              <p className="text-[10px] flex items-center gap-2 text-white/30 uppercase tracking-widest font-black">
                <Mail size={10} /> Powered by CEKA
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
