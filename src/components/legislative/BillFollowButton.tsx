import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Users, X, Bell, FileText, Shield } from 'lucide-react';
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
}

export function BillFollowButton({
  billId,
  variant = 'outline',
  size = 'sm',
  showCount = true,
  className
}: BillFollowButtonProps) {
  const { isFollowing, followCount, loading, toggleFollow } = useBillFollowing(billId);
  const { user } = useAuth();
  const { toast } = useToast();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleFollow = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    try {
      await toggleFollow();
      toast({
        title: isFollowing ? "Unfollowed bill" : "Following bill",
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

  return (
    <>
      <Button
        variant={isFollowing ? 'default' : variant}
        size={size}
        onClick={handleFollow}
        disabled={loading}
        className={cn(
          "flex items-center gap-2",
          isFollowing ? 'bg-kenya-green hover:bg-kenya-green/90' : '',
          className
        )}
      >
        <Heart
          className={`h-4 w-4 ${isFollowing ? 'fill-current' : ''}`}
        />
        {isFollowing ? 'Following' : 'Follow'}
        {showCount && followCount > 0 && (
          <span className="flex items-center gap-1 text-xs">
            <Users className="h-3 w-3" />
            {followCount}
          </span>
        )}
      </Button>

      {/* Auth Modal — shown when unauthenticated user taps Follow */}
      <AnimatePresence>
        {authModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
            onClick={() => setAuthModalOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[40px] shadow-ios-high dark:shadow-ios-high-dark overflow-hidden"
            >
              {/* Top bar */}
              <div className="h-1 w-12 rounded-full bg-slate-200 dark:bg-white/20 mx-auto mt-4" />

              {/* Close */}
              <button
                onClick={() => setAuthModalOpen(false)}
                className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
              >
                <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>

              <div className="p-8 pt-6 space-y-6">
                {/* Icon */}
                <div className="h-16 w-16 rounded-[28px] bg-kenya-green/10 flex items-center justify-center">
                  <Bell className="h-8 w-8 text-kenya-green" />
                </div>

                {/* Headline */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight leading-tight dark:text-white">
                    Stay ahead of the law.
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Sign up to follow this bill and get notified the moment it moves — stage changes, committee reports, presidential assent.
                  </p>
                </div>

                {/* Value props */}
                <div className="space-y-3">
                  {[
                    { icon: Bell, text: "Real-time bill stage notifications" },
                    { icon: FileText, text: "Access to memoranda and committee reports" },
                    { icon: Shield, text: "Your civic footprint, tracked privately" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-2xl bg-kenya-green/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-kenya-green" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</p>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    asChild
                    className="h-12 rounded-2xl bg-kenya-green text-white font-black text-xs uppercase tracking-widest hover:bg-kenya-green/90 shadow-lg shadow-kenya-green/20"
                  >
                    <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}>
                      Sign Up Free
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 rounded-2xl border-black/5 dark:border-white/10 font-bold text-xs uppercase tracking-widest"
                  >
                    <Link to={`/auth?mode=login&redirect=${encodeURIComponent(window.location.pathname)}`}>
                      Log In
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
