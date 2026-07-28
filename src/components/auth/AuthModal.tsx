import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import RotatingText from '@/components/ui/RotatingText';
import { CloseIcon, EyeIcon, EyeOffIcon, Kenya2Icon, UsersIcon } from '@/components/ui/CustomIcons';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Inline SVGs to avoid any asset loading or external dependency failures
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const GithubIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// Custom SVGs for cascading responsive tab headers
const SignInTabIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="512" cy="512" r="512" fill="currentColor" opacity="0.2" />
    <path d="m458.15 617.7 18.8-107.3a56.94 56.94 0 0 1 35.2-101.9V289.4h-145.2a56.33 56.33 0 0 0-56.3 56.3v275.8a33.94 33.94 0 0 0 3.4 15c12.2 24.6 60.2 103.7 197.9 164.5V622.1a313.29 313.29 0 0 1-53.8-4.4zM656.85 289h-144.9v119.1a56.86 56.86 0 0 1 35.7 101.4l18.8 107.8A320.58 320.58 0 0 1 512 622v178.6c137.5-60.5 185.7-139.9 197.9-164.5a33.94 33.94 0 0 0 3.4-15V345.5a56 56 0 0 0-16.4-40 56.76 56.76 0 0 0-40.05-16.5z" fill="currentColor" />
  </svg>
);

const SignUpTabIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} className={`${className} rotate-180`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.1633 4.09295L15.0612 2.17072C14.1429 1.86721 13.2245 1.96838 12.5102 2.47423C12.2041 2.67657 12 2.87891 11.7959 3.08125H7.91837C6.38776 3.08125 5.06122 4.39646 5.06122 5.91401V6.9257C5.06122 7.33038 5.36735 7.73506 5.87755 7.73506C6.38776 7.73506 6.69388 7.33038 6.69388 6.9257V5.91401C6.69388 5.20582 7.30612 4.69997 7.91837 4.69997H11.2857V19.3696H7.91837C7.20408 19.3696 6.69388 18.7626 6.69388 18.1555V17.1439C6.69388 16.7392 6.38776 16.3345 5.87755 16.3345C5.36735 16.3345 5.06122 16.638 5.06122 17.0427V18.0544C5.06122 19.5719 6.28572 20.8871 7.91837 20.8871H11.7959C12 21.0895 12.2041 21.393 12.4082 21.4942C12.9184 21.7977 13.4286 22 14.0408 22C14.3469 22 14.7551 21.8988 15.0612 21.7977L20.1633 19.8754C21.2857 19.4708 22 18.4591 22 17.245V6.62219C22 5.50933 21.1837 4.39646 20.1633 4.09295Z" fill="currentColor" />
    <path d="M6.38776 13.5017C6.08163 13.8052 6.08163 14.3111 6.38776 14.6146C6.4898 14.7158 6.69388 14.8169 6.89796 14.8169C7.10204 14.8169 7.30612 14.7158 7.40816 14.6146L9.44898 12.5912C9.55102 12.49 9.55102 12.3889 9.65306 12.3889C9.65306 12.2877 9.7551 12.1865 9.7551 12.0854C9.7551 11.9842 9.7551 11.883 9.65306 11.7819C9.65306 11.6807 9.55102 11.5795 9.44898 11.5795L7.40816 9.55612C7.10204 9.25261 6.59184 9.25261 6.28571 9.55612C5.97959 9.85963 5.97959 10.3655 6.28571 10.669L7 11.3772H2.81633C2.40816 11.3772 2 11.6807 2 12.1865C2 12.6924 2.30612 12.9959 2.81633 12.9959H7.10204L6.38776 13.5017Z" fill="currentColor" />
  </svg>
);

// Clean, high-contrast iOS-style text input
const IosInput = ({
  label, id, type = 'text', value, onChange, placeholder, autoComplete, optional = false,
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string; optional?: boolean;
}) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-[0.15em] text-white/60">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={!optional}
          className="w-full h-12 rounded-2xl bg-white/5 border border-white/15 px-4 pr-12 text-[13px] font-semibold text-white placeholder:text-white/40 focus:outline-none focus:border-kenya-green focus:bg-white/10 transition-all duration-200"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors focus:outline-none"
          >
            <div className="relative px-5 w-5 h-5 flex items-center justify-center overflow-hidden">
              <AnimatePresence initial={false}>
                {show ? (
                  <motion.svg
                    key="eye-open"
                    initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 20 }}
                    transition={{ type: "spring", stiffness: 700, damping: 28 }}
                    viewBox="0 0 24 24"
                    fill="none"
                    className="absolute w-5 h-5 text-white/50 hover:text-white"
                  >
                    <path d="M9.75 12C9.75 10.7574 10.7574 9.75 12 9.75C13.2426 9.75 14.25 10.7574 14.25 12C14.25 13.2426 13.2426 14.25 12 14.25C10.7574 14.25 9.75 13.2426 9.75 12Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M2 12C2 13.6394 2.42496 14.1915 3.27489 15.2957C4.97196 17.5004 7.81811 20 12 20C16.1819 20 19.028 17.5004 20.7251 15.2957C21.575 14.1915 22 13.6394 22 12C22 10.3606 21.575 9.80853 20.7251 8.70433C19.028 6.49956 16.1819 4 12 4C7.81811 4 4.97196 6.49956 3.27489 8.70433C2.42496 9.80853 2 10.3606 2 12ZM12 8.25C9.92893 8.25 8.25 9.92893 8.25 12C8.25 14.0711 9.92893 15.75 12 15.75C14.0711 15.75 15.75 14.0711 15.75 12C15.75 9.92893 14.0711 8.25 12 8.25Z" fill="currentColor" />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="eye-closed"
                    initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 20 }}
                    transition={{ type: "spring", stiffness: 700, damping: 28 }}
                    viewBox="0 0 24 24"
                    fill="none"
                    className="absolute w-5 h-5 text-white/30 hover:text-white/60"
                  >
                    <path fillRule="evenodd" clipRule="evenodd" d="M15.5778 13.6334C16.2396 12.1831 15.9738 10.4133 14.7803 9.21976C13.5868 8.02628 11.817 7.76042 10.3667 8.4222L11.5537 9.60918C12.315 9.46778 13.1307 9.69153 13.7196 10.2804C14.3085 10.8693 14.5323 11.6851 14.3909 12.4464L15.5778 13.6334Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M5.86339 7.80781C5.60443 8.02054 5.35893 8.23562 5.12798 8.44832C4.28009 9.22922 3.59623 10.0078 3.1244 10.5906C2.88801 10.8825 2.70365 11.1268 2.57733 11.2997C2.51414 11.3862 2.46539 11.4549 2.43184 11.5029C2.41506 11.5269 2.40207 11.5457 2.39297 11.559L2.38224 11.5747L2.37908 11.5794L2.37806 11.5809L2.09656 12L2.37741 12.4181L2.37806 12.4191L2.37908 12.4206L2.38224 12.4253L2.39297 12.441C2.40207 12.4543 2.41506 12.4731 2.43184 12.4971C2.46539 12.5451 2.51414 12.6138 2.57733 12.7003C2.70365 12.8732 2.88801 13.1175 3.1244 13.4094C3.59623 13.9922 4.28009 14.7708 5.12798 15.5517C6.79696 17.0888 9.22583 18.75 12 18.75C13.3694 18.75 14.6547 18.3452 15.806 17.7504L14.6832 16.6277C13.8289 17.0123 12.9256 17.25 12 17.25C9.80366 17.25 7.73254 15.9112 6.14416 14.4483C5.36337 13.7292 4.72921 13.0078 4.29019 12.4656C4.14681 12.2885 4.02475 12.1311 3.92572 12C4.02475 11.8689 4.14681 11.7115 4.29019 11.5344C4.72921 10.9922 5.36337 10.2708 6.14416 9.55168C6.39447 9.32114 6.65677 9.09369 6.92965 8.87408L5.86339 7.80781ZM17.0705 15.1258C17.3434 14.9063 17.6056 14.6788 17.8559 14.4483C18.6367 13.7292 19.2708 13.0078 19.7099 12.4656C19.8532 12.2885 19.9753 12.1311 20.0743 12C19.9753 11.8689 19.8532 11.7115 19.7099 11.5344C19.2708 10.9922 18.6367 10.2708 17.8559 9.55168C16.2675 8.08879 14.1964 6.75 12 6.75C11.0745 6.75 10.1712 6.98772 9.31694 7.37228L8.1942 6.24954C9.34544 5.65475 10.6307 5.25 12 5.25C14.7742 5.25 17.2031 6.91121 18.8721 8.44832C19.72 9.22922 20.4038 10.0078 20.8757 10.5906C21.112 10.8825 21.2964 11.1268 21.4227 11.2997C21.4859 11.3862 21.5347 11.4549 21.5682 11.5029C21.585 11.5269 21.598 11.5457 21.6071 11.559L21.6178 11.5747L21.621 11.5794L21.622 11.5809L21.9035 12L21.6224 12.4186L21.621 12.4206L21.6178 12.4253L21.6071 12.441C21.598 12.4543 21.585 12.4731 21.5682 12.4971C21.5347 12.5451 21.4859 12.6138 21.4227 12.7003C21.2964 12.8732 21.112 13.1175 20.8757 13.4094C20.4038 13.9922 19.72 14.7708 18.8721 15.5517C18.6412 15.7644 18.3957 15.9794 18.1368 16.1921L17.0705 15.1258Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M18.75 19.8107L3.75 4.81066L4.81066 3.75L19.8107 18.75L18.75 19.8107Z" fill="currentColor" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

// Focus area pills for Partner sign-up
const CEKA_FOCUS_AREAS = [
  'Constitutional Rights', 'Electoral Education', 'Public Participation',
  'Governance & Accountability', 'Youth Civic Engagement', 'Legal Literacy',
  'Budget Oversight', 'Human Rights',
];

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();

  type Tab = 'signin' | 'signup' | 'partner' | 'forgot';
  const [tab, setTab] = useState<Tab>('signin');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // Partner-specific
  const [orgName, setOrgName] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgRegNo, setOrgRegNo] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [partnerSubmitted, setPartnerSubmitted] = useState(false);

  // Password strength regex: min 8 chars, at least 1 letter and 1 number
  const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

  // Freeze/lock background page scrolling while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (session && open) onOpenChange(false);
  }, [session, open, onOpenChange]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPartnerSubmitted(false);
    setForgotSent(false);
    setForgotEmail('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign in failed', description: error.message });
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to send reset email', description: error.message });
    } finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    // Password strength guard
    const PASSWORD_REGEX_LOCAL = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!PASSWORD_REGEX_LOCAL.test(password)) {
      toast({
        variant: 'destructive',
        title: 'Password too weak',
        description: 'Password must be at least 8 characters and include at least one letter and one number.',
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, username } },
      });
      if (error) throw error;
      toast({ title: 'Check your email!', description: 'We sent you a confirmation link.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign up failed', description: error.message });
    } finally { setLoading(false); }
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgEmail || !password) return;

    // Password strength guard
    if (!PASSWORD_REGEX.test(password)) {
      toast({
        variant: 'destructive',
        title: 'Password too weak',
        description: 'Password must be at least 8 characters and include at least one letter and one number.',
      });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create the auth account.
      // Because email confirmations are enabled, the user will NOT be auto-logged in.
      // We do NOT attempt any DB writes here — that is handled entirely by the
      // service-role edge function below, which bypasses all RLS.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: orgEmail,
        password,
        options: {
          data: {
            full_name: orgName,
            username: orgName.toLowerCase().replace(/\s+/g, '_'),
          },
        },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Auth account creation did not return a user ID.');

      // Step 2: Call the ingest-partner-application edge function (service role).
      // This guarantees DB ingestion regardless of RLS state.
      // It also dispatches:
      //   - Receipt confirmation email to the applicant
      //   - Admin alert email to admin@civiceducationkenya.com
      const { error: fnError } = await supabase.functions.invoke('ingest-partner-application', {
        body: {
          auth_user_id: userId,
          org_name: orgName,
          org_email: orgEmail,
          org_website: orgWebsite || undefined,
          org_reg_no: orgRegNo || undefined,
          focus_areas: selectedAreas,
        },
      });

      // Edge function errors are logged but do NOT block the success UI.
      // Data ingestion is the edge function's responsibility — if it errored
      // after DB write but before email, the data is still safe.
      if (fnError) {
        console.error('[handlePartnerSubmit] ingest-partner-application error:', fnError);
      }

      // Step 3: Always show success state.
      // The partner is guaranteed registered; they simply await admin review.
      setPartnerSubmitted(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Application failed', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Google sign-in failed', description: error.message });
    }
  };

  const handleGithubSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'GitHub sign-in failed', description: error.message });
    }
  };

  const handleTwitterSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Twitter sign-in failed', description: error.message });
    }
  };

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  if (!open) return null;

  // Determine illustration and text dynamically to fit brand context perfectly
  let panelIllustration = '/images/login.svg';
  let panelTitle = 'Karibu Tena';
  let panelSubtitle = 'Catch up on the latest Bills, gain CEKA points, and contribute to keeping CEKA on the airwaves.';

  if (tab === 'signup') {
    panelIllustration = '/images/undraw_group-selfie_uih0.svg';
    panelTitle = 'Join CEKA Today';
    panelSubtitle = 'Join our growing network of active citizens making real societal impact.';
  } else if (tab === 'partner') {
    panelIllustration = partnerSubmitted
      ? '/images/undraw_message-sent_iyz6.svg'
      : '/images/partners.svg';
    panelTitle = partnerSubmitted ? 'Application Sent!' : 'CEKA Partner';
    panelSubtitle = partnerSubmitted
      ? "Your application is submitted. We'll be in touch."
      : 'Partner with Kenya\'s leading civic education platform. Let\'s get work done... together.';
  }

  const isMobileText = windowWidth < 768;
  const prefixText = tab === 'signup' ? 'Jiunge.' : (isMobileText ? 'Get ' : 'Get Back.');
  const rotatingTexts = isMobileText
    ? ["Engaged.", "Empowered.", "Amplified.", "Educated."]
    : (tab === 'signup'
      ? ["Kuwa Organised.", "Kuwa Informed.", "Kutetea Haki.", "Kuinject."]
      : ["Hold Accountable.", "Speak Up.", "Engage With Us.", "Empower Others."]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
        >
          <style>{`
            .auth-modal-wrapper {
              display: flex;
              flex-direction: column;
              width: 100%;
              max-width: 950px;
              margin: 16px;
              border-radius: 32px;
              overflow: hidden;
              background-color: #0a0a0a;
              box-shadow: 0 32px 80px rgba(0,0,0,0.85);
              max-height: 90vh;
            }
            @media (min-width: 992px) {
              .auth-modal-wrapper {
                flex-direction: row;
                min-height: 580px;
              }
            }

            .auth-hero-panel {
              position: relative;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 32px;
              overflow: hidden;
              transition: all 0.5s ease;
              border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            @media (min-width: 992px) {
              .auth-hero-panel {
                width: 42%;
                flex-shrink: 0;
                border-bottom: none;
                border-right: 1px solid rgba(255,255,255,0.1);
                padding: 48px;
              }
            }

            .auth-hero-logo {
              position: absolute;
              top: 32px;
              left: 32px;
              z-index: 20;
              transition: opacity 0.2s ease;
            }
            @media (max-width: 991px) {
              .auth-hero-logo {
                display: none !important;
              }
            }

            .auth-hero-illustration-wrapper {
              position: relative;
              width: 100%;
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-top: 48px;
              margin-bottom: 24px;
              min-height: 200px;
            }
            @media (min-width: 992px) {
              .auth-hero-illustration-wrapper {
                min-height: 250px;
              }
            }

            .auth-hero-illustration {
              width: 100%;
              height: 100%;
              object-fit: contain;
              transition: all 0.5s ease;
            }

            .auth-hero-text-wrapper {
              position: relative;
              z-index: 10;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }
            @media (min-width: 992px) {
              .auth-hero-text-wrapper {
                align-items: flex-start;
                text-align: left;
              }
            }

            .auth-hero-tag-label {
              font-size: 10px;
              padding: 0 4px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              color: rgba(255,255,255,0.5);
              margin-bottom: 4px;
            }

            .auth-hero-subtitle {
              color: rgba(255,255,255,0.6);
              font-size: 12px;
              line-height: 1.6;
              font-weight: 500;
              max-width: 320px;
            }

            /* Viewport < 368px: fully hide hero panel, show compact header only */
            @media (max-width: 367px) {
              .auth-hero-panel {
                display: none !important;
              }
              .auth-modal-compact-header {
                display: flex !important;
              }
            }
            .auth-modal-compact-header {
              display: none;
            }

            /* Viewport 368px–479px adjustments */
            @media (min-width: 368px) and (max-width: 479px) {
              .auth-hero-illustration-wrapper {
                max-height: 130px !important;
                min-height: unset !important;
                margin-top: 12px !important;
                margin-bottom: 16px !important;
              }
              .auth-hero-illustration {
                max-height: 130px !important;
              }
              .auth-hero-subtitle {
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
              }
            }

            /* Viewport 480px–991px: horizontal split layout inside the hero panel */
            @media (min-width: 480px) and (max-width: 991px) {
              .auth-hero-panel {
                flex-direction: row !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 24px !important;
                padding: 32px !important;
              }
              .auth-hero-illustration-wrapper {
                width: 45% !important;
                max-height: 140px !important;
                min-height: unset !important;
                margin: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .auth-hero-illustration {
                max-height: 140px !important;
              }
              .auth-hero-text-wrapper {
                width: 50% !important;
                margin: 0 !important;
                align-items: flex-start !important;
                text-align: left !important;
              }
            }
          `}</style>

          {/* Backdrop Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

          {/* Opaque, High-Contrast Split-Screen Container Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="auth-modal-wrapper"
          >
            {/* ── RIGHT PANEL ── */}
            <div
              className={`auth-hero-panel ${tab === 'partner' ? 'bg-[#0b2447]' : 'bg-[#004d00]'}`}
            >
              {/* Ambient visual overlay elements */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-black/20 rounded-full blur-3xl pointer-events-none" />

              {/* Logo / Wordmark Image */}
              <Link
                to="/"
                onClick={() => onOpenChange(false)}
                className="auth-hero-logo hover:opacity-80 z-20"
              >
                <img src="/logo-white.png" className="h-10 w-auto" alt="CEKA Logo" />
              </Link>

              {/* Centrally placed illustration */}
              <div className="auth-hero-illustration-wrapper">
                <img
                  src={panelIllustration}
                  alt="CEKA Illustration"
                  className="auth-hero-illustration"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              {/* Texts at the bottom of the hero panel */}
              <div className="auth-hero-text-wrapper">
                <p className="auth-hero-tag-label">
                  {tab === 'partner' ? 'Join Us as a' : panelTitle}
                </p>

                {tab === 'partner' ? (
                  <div className="text-3xl md:text-4xl font-[900] leading-[1.1] text-white tracking-tighter mb-3">
                    {panelTitle}
                  </div>
                ) : (
                  <div className="text-3xl md:text-4xl font-[900] leading-[1.1] text-white tracking-tighter mb-3 flex flex-wrap items-center justify-center md:justify-start gap-x-2">
                    <span>{prefixText}</span>
                    <RotatingText
                      texts={rotatingTexts}
                      durations={[3000, 3000, 3500, 3000]}
                      staggerFrom="last"
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "-120%" }}
                      staggerDuration={0.025}
                      splitLevelClassName="overflow-hidden pb-1"
                      transition={{ type: "spring", damping: 30, stiffness: 400 }}
                      mainClassName="text-kenya-green pt-1 font-[900]"
                      fixedHeight="1.15em"
                    />
                  </div>
                )}

                <p className="auth-hero-subtitle">
                  {panelSubtitle}
                </p>
              </div>
            </div>

            {/* ── LEFT / FORM PANEL ── */}
            <div className="relative flex-1 bg-[#0a0a0a] p-8 md:p-12 flex flex-col overflow-hidden max-h-[90vh] md:max-h-none">

              {/* Compact header for ultra-narrow screens (< 368px) — only rendered by CSS show/hide */}
              <div className="auth-modal-compact-header items-center justify-between mb-5 pb-4 border-b border-white/10">
                <img src="/logo-white.png" alt="CEKA" className="h-7 w-auto opacity-80" />
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  aria-label="Close"
                >
                  <CloseIcon size={12} />
                </button>
              </div>

              {/* Request 2: Exit Button (Still backdrop on hover, only X animates) */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-0 right-0 w-20 h-20 group z-20 overflow-hidden"
                aria-label="Close"
              >
                <svg
                  className="absolute top-0 right-0 w-full h-full text-kenya-red fill-current"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path d="M 0 0 C 35 15, 65 65, 100 100 L 100 0 Z" />
                </svg>
                <div className="absolute top-4 right-4 text-white transition-all duration-300 group-hover:rotate-90 group-hover:scale-125 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  <CloseIcon size={16} />
                </div>
              </button>

              {/* Request 1: Shared Layout animations (pinch, glide, unpinch) ONLY on active tab indicators */}
              <div className="flex bg-white/5 rounded-2xl p-1 mb-8 gap-1 mr-14 relative">
                {([
                  { key: 'signin', label: 'Log In' },
                  { key: 'signup', label: 'Sign Up' },
                  { key: 'partner', label: 'Partners' },
                ] as { key: Tab; label: string }[]).map((t) => {
                  const isActive = tab === t.key;
                  const colorClass = isActive ? 'text-white' : 'text-white/30';

                  return (
                    <button
                      key={t.key}
                      onClick={() => handleTabChange(t.key)}
                      className="relative flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors duration-300 z-10"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabBackground"
                          className={`absolute inset-0 rounded-xl -z-10 ${t.key === 'partner'
                            ? 'bg-[#0f3b7c] shadow-lg shadow-[#0f3b7c]/20'
                            : 'bg-kenya-green shadow-lg shadow-kenya-green/20'
                            }`}
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 26,
                          }}
                        />
                      )}

                      {windowWidth >= 480 ? (
                        <>
                          {t.key === 'partner' && <UsersIcon size={12} className={colorClass} />}
                          <span className={colorClass}>{t.label}</span>
                        </>
                      ) : windowWidth >= 370 ? (
                        <span className={colorClass}>{t.label}</span>
                      ) : (
                        <>
                          {t.key === 'signin' && <SignInTabIcon className={colorClass} />}
                          {t.key === 'signup' && <SignUpTabIcon className={colorClass} />}
                          {t.key === 'partner' && <UsersIcon size={14} className={colorClass} />}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Form Content container (simple layout opacity fade to prevent layout projection bleed/scrollbar scroll triggers) */}
              <div className="flex-1 overflow-y-auto pr-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab + (tab === 'partner' && partnerSubmitted ? '-submitted' : '')}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col justify-center gap-6 min-h-full"
                  >
                    {/* ── LOG IN ── */}
                    {tab === 'signin' && (
                      <div className="flex flex-col gap-6">
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tighter mb-1">Welcome back.</h2>
                          <p className="text-[12px] text-white/40 font-medium">Log in to your CEKA account.</p>
                        </div>

                        <form onSubmit={handleSignIn} className="space-y-4">
                          <IosInput label="Email" id="signin-email" type="email" value={email} onChange={setEmail} placeholder="e.g. contact@civiceducationkenya.com" autoComplete="username" />
                          <IosInput label="Password" id="signin-password" type="password" value={password} onChange={setPassword} placeholder="* * * * * * * * *" autoComplete="current-password" />
                          <div className="flex justify-end -mt-1">
                            <button
                              type="button"
                              onClick={() => handleTabChange('forgot')}
                              className="text-[11px] font-semibold text-white/40 hover:text-kenya-green transition-colors"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-2xl bg-kenya-green hover:bg-kenya-green/90 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-kenya-green/20 flex items-center justify-center gap-2"
                          >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Log In <ArrowRightIcon /></>}
                          </button>
                        </form>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-white/10" />
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">or</span>
                          <div className="flex-1 h-px bg-white/10" />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={handleGoogleSignIn}
                            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                            title="Continue with Google"
                          >
                            <GoogleIcon />
                          </button>
                          <button
                            onClick={handleGithubSignIn}
                            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                            title="Continue with GitHub"
                          >
                            <GithubIcon />
                          </button>
                          <button
                            onClick={handleTwitterSignIn}
                            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                            title="Continue with Twitter"
                          >
                            <TwitterIcon />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── SIGN UP ── */}
                    {tab === 'signup' && (
                      <div className="flex flex-col gap-5">
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tighter mb-1">Join the movement.</h2>
                          <p className="text-[12px] text-white/40 font-medium">Create your free CEKA account.</p>
                        </div>

                        <form onSubmit={handleSignUp} className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <IosInput label="Full Name" id="signup-name" value={fullName} onChange={setFullName} autoComplete="name" />
                            <IosInput label="Username" id="signup-username" value={username} onChange={setUsername} autoComplete="username" />
                          </div>
                          <IosInput label="Email" id="signup-email" type="email" value={email} onChange={setEmail} placeholder="e.g. contact@civiceducationkenya.com" autoComplete="username" />
                          <IosInput label="Password" id="signup-password" type="password" value={password} onChange={setPassword} placeholder="* * * * * * * * *" autoComplete="new-password" />
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-2xl bg-kenya-green hover:bg-kenya-green/90 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-kenya-green/20 flex items-center justify-center gap-2"
                          >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRightIcon /></>}
                          </button>
                        </form>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-white/10" />
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">or</span>
                          <div className="flex-1 h-px bg-white/10" />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={handleGoogleSignIn}
                            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                            title="Continue with Google"
                          >
                            <GoogleIcon />
                          </button>
                          <button
                            onClick={handleGithubSignIn}
                            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                            title="Continue with GitHub"
                          >
                            <GithubIcon />
                          </button>
                          <button
                            onClick={handleTwitterSignIn}
                            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                            title="Continue with Twitter"
                          >
                            <TwitterIcon />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── PARTNERS PROGRAM ── */}
                    {tab === 'partner' && !partnerSubmitted && (
                      <div className="flex flex-col gap-5 overflow-y-auto pb-2">
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tighter mb-1">Become a CEKA Partner.</h2>
                          <p className="text-[12px] text-white/40 font-medium">Gain access to unique perks enjoyed by our partners.</p>
                        </div>

                        <form onSubmit={handlePartnerSubmit} className="space-y-4">
                          <IosInput label="Organisation Name" id="partner-org" value={orgName} onChange={setOrgName} placeholder="e.g. Civic Education Kenya (CEKA)" autoComplete="organization" />
                          <IosInput label="Organisation Email" id="partner-email" type="email" value={orgEmail} onChange={setOrgEmail} placeholder="e.g. contact@civiceducationkenya.com" autoComplete="username" />
                          <IosInput label="Registration No. (optional)" id="partner-reg" value={orgRegNo} onChange={setOrgRegNo} placeholder="e.g. OP.218/051/5980/11528" optional />
                          <IosInput label="Website (optional)" id="partner-web" value={orgWebsite} onChange={setOrgWebsite} placeholder="e.g. https://civiceducationkenya.com" autoComplete="url" optional />
                          <IosInput label="Password" id="partner-password" type="password" value={password} onChange={setPassword} placeholder="Min. 8 chars, 1 letter + 1 number" autoComplete="new-password" />

                          <button
                            type="submit"
                            disabled={loading || !orgName || !orgEmail || !password}
                            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#0b2447] to-[#0f3b7c] hover:opacity-90 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-2 disabled:opacity-40"
                          >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Submit Application <ArrowRightIcon /></>}
                          </button>

                          <p className="text-[10px] text-white/25 text-center leading-relaxed">
                            Submission Policy: By submitting, your organisation requests review for the CEKA Partnership Program. Applications are reviewed under the Data Protection Act (2019). Admission is not automatic; official status is pending review, verification, and co-signing of the CEKA Partnership MOU Agreement.
                          </p>
                        </form>
                      </div>
                    )}

                    {/* ── PARTNER SUBMITTED CONFIRMATION ── */}
                    {tab === 'partner' && partnerSubmitted && (
                      <div className="flex flex-col items-center justify-center text-center gap-6 py-6">
                        <div className="relative w-full flex items-center justify-center max-h-[140px]">
                          <img
                            src="/images/undraw_message-sent_iyz6.svg"
                            alt="Application sent"
                            className="w-32 opacity-95 drop-shadow-lg"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white tracking-tighter mb-2">Application Received!</h3>
                          <p className="text-[12px] text-white/55 max-w-[260px] mx-auto leading-relaxed font-medium">
                            We'll review your application and reach out within 48 hours. In the meantime, check your email to confirm your account.
                          </p>
                        </div>
                        <a
                          href={`https://wa.me/254000000000?text=${encodeURIComponent(`Hi CEKA, I just applied to become a Partner. My org is ${orgName}. Looking forward to connecting!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] font-black text-[10px] uppercase tracking-widest hover:bg-[#25D366]/20 transition-all"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                          <span>Follow up via WhatsApp</span>
                        </a>
                      </div>
                    )}
                    {/* ── FORGOT PASSWORD ── */}
                    {tab === 'forgot' && (
                      <div className="flex flex-col gap-6">
                        <div>
                          <button
                            type="button"
                            onClick={() => handleTabChange('signin')}
                            className="flex items-center gap-2 text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors mb-4"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            Back to Log In
                          </button>
                          <h2 className="text-2xl font-black text-white tracking-tighter mb-1">Reset password.</h2>
                          <p className="text-[12px] text-white/40 font-medium">We'll send a secure reset link to your email.</p>
                        </div>

                        {forgotSent ? (
                          <div className="flex flex-col items-center gap-4 py-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-kenya-green/10 border border-kenya-green/20 flex items-center justify-center">
                              <svg className="w-7 h-7 text-kenya-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <p className="text-[13px] text-white/70 font-semibold max-w-[240px] leading-relaxed">
                              Reset link sent to <span className="text-white font-black">{forgotEmail}</span>. Check your inbox.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleTabChange('signin')}
                              className="text-[11px] font-semibold text-kenya-green hover:underline mt-2"
                            >
                              Back to Log In
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleForgotPassword} className="space-y-4">
                            <IosInput
                              label="Email Address"
                              id="forgot-email"
                              type="email"
                              value={forgotEmail}
                              onChange={setForgotEmail}
                              placeholder="e.g. contact@civiceducationkenya.com"
                              autoComplete="username"
                            />
                            <button
                              type="submit"
                              disabled={loading || !forgotEmail}
                              className="w-full h-12 rounded-2xl bg-kenya-green hover:bg-kenya-green/90 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-kenya-green/20 flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Send Reset Link <ArrowRightIcon /></>}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
