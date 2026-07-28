import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { CloseIcon, EyeIcon, EyeOffIcon } from '@/components/ui/CustomIcons';
import { motion, AnimatePresence } from 'framer-motion';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

  // Verify we have a valid recovery session before rendering the form
  useEffect(() => {
    const verifySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid or expired link',
          description: 'Please request a new password reset link.',
        });
        navigate('/auth', { replace: true });
      }
      setChecking(false);
    };
    verifySession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_REGEX.test(password)) {
      toast({
        variant: 'destructive',
        title: 'Password too weak',
        description: 'Min 8 characters, at least 1 letter and 1 number.',
      });
      return;
    }
    if (password !== confirm) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: 'Password updated!',
        description: 'You can now sign in with your new password.',
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Reset failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <CEKALoader />
      </div>
    );
  }

  if (!sessionReady) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[28px] p-8 shadow-2xl"
      >
        {/* Logo */}
        <Link to="/">
          <img src="/logo-white.png" alt="CEKA" className="h-8 w-auto mb-8 opacity-80" />
        </Link>

        <h1 className="text-2xl font-black text-white tracking-tighter mb-1">Set new password</h1>
        <p className="text-xs text-white/40 font-medium mb-6">Must be at least 8 chars with 1 letter and 1 number.</p>

        <form onSubmit={handleReset} className="space-y-4">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-white/60">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="* * * * * * * * *"
                required
                className="w-full h-12 rounded-2xl bg-white/5 border border-white/15 px-4 pr-12 text-[13px] font-semibold text-white placeholder:text-white/40 focus:outline-none focus:border-kenya-green focus:bg-white/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              >
                {showPw ? <EyeIcon className="w-5 h-5" /> : <EyeOffIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-white/60">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="* * * * * * * * *"
                required
                className="w-full h-12 rounded-2xl bg-white/5 border border-white/15 px-4 pr-12 text-[13px] font-semibold text-white placeholder:text-white/40 focus:outline-none focus:border-kenya-green focus:bg-white/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              >
                {showConfirm ? <EyeIcon className="w-5 h-5" /> : <EyeOffIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Strength indicator */}
          {password.length > 0 && (
            <div className="flex gap-1 pt-1">
              {[...Array(4)].map((_, i) => {
                const strength = [
                  password.length >= 8,
                  /[A-Za-z]/.test(password),
                  /\d/.test(password),
                  /[@$!%*#?&]/.test(password),
                ];
                return (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      strength[i]
                        ? i < 2 ? 'bg-yellow-400' : 'bg-kenya-green'
                        : 'bg-white/10'
                    }`}
                  />
                );
              })}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-kenya-green hover:bg-kenya-green/90 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-kenya-green/20 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-white/25 mt-6">
          Remembered it?{' '}
          <Link to="/auth" className="text-kenya-green font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
