import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, Bell, FileText, Shield, Plus } from 'lucide-react';
import { useBillFollowing } from '@/hooks/useBillFollowing';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

interface BillFollowButtonProps {
  billId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showCount?: boolean;
  className?: string;
  showLabelOnMobile?: boolean;
}

export function BillFollowButton({
  billId,
  variant = 'outline',
  size = 'sm',
  showCount = true,
  className,
  showLabelOnMobile = true
}: BillFollowButtonProps) {
  const { isFollowing, followCount, loading, toggleFollow } = useBillFollowing(billId);
  const { user } = useAuth();
  const { toast } = useToast();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    try {
      await toggleFollow();
      toast({
        title: isFollowing ? "Stopped Following" : "Now Following",
        description: isFollowing
          ? "You will no longer receive updates about this bill."
          : "You will receive notifications when this bill is updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const ModalPortal = ({ children }: { children: React.ReactNode }) => {
    if (!mounted) return null;
    return createPortal(children, document.body);
  };

  return (
    <>
      <Button
        variant={isFollowing ? 'default' : variant}
        size={size}
        onClick={handleFollow}
        disabled={loading}
        className={cn(
          "relative flex items-center justify-center gap-1.5 transition-all duration-300 min-w-[44px]",
          isFollowing ? 'bg-kenya-green hover:bg-kenya-green/90 text-white shadow-md' : 'hover:border-kenya-green/40',
          className
        )}
      >
        {/* The Cascading Icon Container */}
        {/* 1. Visible on Web/Tablet (sm:flex) for [Follow + Icon] */}
        {/* 2. Hidden on mobile (xs:hidden) for [Follow Only] */}
        {/* 3. Re-appears on ultra-thin defaults (flex) for [Icon Only] */}
        <div className={cn(
          "relative shrink-0 transition-transform flex xs:hidden sm:flex",
          isFollowing && "scale-110"
        )}>
          <img 
            src="/context/icons 3/person-2-svgrepo-com.svg" 
            className="h-4 w-4 dark:invert"
            alt="Follow"
          />
          {!isFollowing && (
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-kenya-green rounded-full border border-white dark:border-slate-900 flex items-center justify-center">
              <Plus className="h-1.5 w-1.5 text-white" />
            </div>
          )}
        </div>
        
        {/* The Cascading Label Container */}
        {/* Visible on Mobile/Tablet/Web, hidden ONLY on ultra-thin (<xs) */}
        <span className={cn(
          "font-bold truncate mt-0.5 hidden xs:inline",
        )}>
          {isFollowing ? 'Following' : 'Follow'}
        </span>

        {/* Count - Desktop Only */}
        {showCount && followCount > 0 && (
          <span className="hidden lg:flex items-center gap-1 text-[10px] opacity-80 border-l border-current/20 pl-1.5 ml-0.5 font-black">
            {followCount}
          </span>
        )}
      </Button>

      {/* Auth Modal \u2014 Portalized to break out of Carousel Stacking Context */}
      <ModalPortal>
        <AnimatePresence>
          {authModalOpen && (
            <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={() => setAuthModalOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden border border-white/10"
              >
                {/* Pull handle for mobile */}
                <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-white/20 mx-auto mt-4 mb-2" />

                {/* Close Button */}
                <button
                  onClick={() => setAuthModalOpen(false)}
                  className="absolute top-6 right-6 h-10 w-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-all z-10"
                >
                  <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </button>

                <div className="p-8 pt-4 space-y-6">
                  <div className="h-20 w-20 rounded-[32px] bg-kenya-green/10 flex items-center justify-center">
                    <Bell className="h-10 w-10 text-kenya-green" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-3xl font-black tracking-tight leading-[1.1] dark:text-white">
                      Stay ahead <br/>of the law.
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Following this bill unlocks real-time notifications for stage changes, committee reports, and presidential movements.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {[
                      { icon: Bell, text: "Real-time stage notifications" },
                      { icon: FileText, text: "Direct access to memoranda" },
                      { icon: Shield, text: "Private civic participation" },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-kenya-green/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-kenya-green" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-4">
                    <Button
                      asChild
                      className="h-14 rounded-2xl bg-kenya-green text-white font-black text-sm uppercase tracking-widest hover:bg-kenya-green/90 shadow-xl shadow-kenya-green/20"
                    >
                      <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}>
                        Join the Movement \u2014 Free
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="h-12 rounded-2xl font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Link to={`/auth?mode=login&redirect=${encodeURIComponent(window.location.pathname)}`}>
                        Already a member? Log In
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </>
  );
}
