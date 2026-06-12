import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useBillFollowing } from '@/hooks/useBillFollowing';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useAuthModalStore } from '@/stores/useAuthModalStore';

interface BillFollowButtonProps {
  billId: string;
  billTitle?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showCount?: boolean;
  className?: string;
  showLabelOnMobile?: boolean;
}


export function BillFollowButton({
  billId,
  billTitle,
  variant = 'outline',
  size = 'sm',
  showCount = true,
  className,
  showLabelOnMobile = true
}: BillFollowButtonProps) {
  const { isFollowing, followCount, loading, toggleFollow } = useBillFollowing(billId);
  const { user } = useAuth();
  const { toast } = useToast();
  const openModal = useAuthModalStore((state) => state.openModal);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openModal({
        heroIconSrc: "/context/icons 6/bell.svg",
        title: "Stay ahead <br />of the law.",
        description: `Join CEKA today to receive real-time updates on ${billTitle ? `the ${billTitle}` : "this bill"} and many more.`,
        features: [
          { iconSrc: "/context/icons 6/bell.svg", text: "Real-time Bill updates" },
          { iconSrc: "/context/icons 6/doc.svg", text: "Submit your views to Parliament" },
          { iconSrc: "/context/icons 6/secure.svg", text: "Follow the Bill privately" },
        ]
      });
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
          <div 
            className={cn(
              "h-4 w-4 transition-all duration-300",
              isFollowing ? "bg-kenya-green drop-shadow-sm" : "bg-slate-900 dark:bg-white"
            )}
            style={{
              maskImage: `url("${isFollowing ? '/context/icons 6/followed.svg' : '/context/icons 6/follow-button2.svg'}")`,
              WebkitMaskImage: `url("${isFollowing ? '/context/icons 6/followed.svg' : '/context/icons 6/follow-button2.svg'}")`,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center"
            }}
            role="img"
            aria-label={isFollowing ? "Following" : "Follow"}
          />
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


    </>
  );
}
