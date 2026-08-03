import React, { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNavbar from './BottomNavbar';
import DonationWidget from '@/components/donation/DonationWidget';
import GlobalAIAssistant from '@/components/ai/GlobalAIAssistant';
import AccessibilityWidget from '@/components/accessibility/AccessibilityWidget';
import InAppBrowserBanner from '@/components/ui/InAppBrowserBanner';
import MaintenanceBanner from '@/components/MaintenanceBanner';
import CivicMiniPlayer from '@/components/civic/CivicMiniPlayer';
import { SmartAdSidebarWidget } from '@/components/promo/NasakaAd';
import { motion, AnimatePresence } from 'framer-motion';
import { useMaintenanceScroll } from '@/hooks/useMaintenanceScroll';

interface LayoutProps {
  children: React.ReactNode;
  hideBottomNav?: boolean;
  hideBackButton?: boolean;
}

// ── Equal FAB spacing constants ───────────────────────────────────────────────
// All 4 FABs are h-12 (48px tall). Stack from the bottom with 16px gap between.
// Base clears the mobile bottom nav (64px) plus 24px breathing room.
const FAB_BASE = 88;   // px — CivicMiniPlayer sits here
const FAB_STEP = 64;   // px — 48px button height + 16px gap

const Layout = ({ children, hideBottomNav, hideBackButton }: LayoutProps) => {
  const [donationTimedOut, setDonationTimedOut] = useState(false);
  const [showDonationWidget, setShowDonationWidget] = useState(false);

  const [isAIHidden, setIsAIHidden] = useState(false);
  const [isDonationHidden, setIsDonationHidden] = useState(false);
  const [isCivicHidden, setIsCivicHidden] = useState(false);
  const [isA11yHidden, setIsA11yHidden] = useState(false);

  const { bannerRef, navbarRef, isFixed, navbarHeight } = useMaintenanceScroll();

  const handleDonationTimeout = () => setDonationTimedOut(true);

  const restoreAll = () => {
    setIsAIHidden(false);
    setIsDonationHidden(false);
    setIsCivicHidden(false);
    setIsA11yHidden(false);
  };

  return (
    <div className="flex min-h-screen flex-col relative">
      {/* <MaintenanceBanner ref={bannerRef} /> */}
      <Navbar ref={navbarRef} isFixed={isFixed} />
      {isFixed && <div style={{ height: navbarHeight, pointerEvents: 'none' }} />}
      <InAppBrowserBanner />
      <main className="flex-1 lg:pt-0 pb-16 lg:pb-0 w-full overflow-x-hidden">
        {children}
      </main>
      <Footer />
      {!hideBottomNav && <BottomNavbar />}

      {/* Restore-all pill — appears when any FAB is swiped away */}
      <AnimatePresence>
        {(isAIHidden || isDonationHidden || isCivicHidden || isA11yHidden) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 z-[3000]"
          >
            <motion.button
              drag="x"
              dragConstraints={{ left: -100, right: 0 }}
              onDragEnd={(_, info) => { if (info.offset.x < -20) restoreAll(); }}
              onClick={restoreAll}
              className="w-3 sm:w-1.5 h-24 bg-black/80 dark:bg-white/80 sm:bg-black/20 sm:dark:bg-white/20 rounded-l-xl transition-all cursor-pointer group relative border border-black/20 dark:border-white/30 shadow-[0_0_15px_rgba(0,0,0,0.25)]"
              title="Swipe left to restore"
            >
              <div className="absolute inset-y-0 -left-5 -right-5 bg-transparent" />
              <motion.div
                animate={{ x: [-2, 0, -2] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <div className="w-1.5 h-4 bg-black/40 dark:bg-white/40 rounded-full" />
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB Stack (bottom → top, equal 64px spacing) ─────────────────── */}

      {/* 1. Civic Pulse — bottom-most (88px) */}
      <CivicMiniPlayer
        isHidden={isCivicHidden}
        onHide={() => setIsCivicHidden(true)}
        offsetY={FAB_BASE}
      />

      {/* 2. Donation Widget (152px) */}
      {(showDonationWidget || !donationTimedOut) && (
        <DonationWidget
          onTimedOut={handleDonationTimeout}
          isHidden={isDonationHidden}
          onHide={() => setIsDonationHidden(true)}
          offsetY={FAB_BASE + FAB_STEP}
        />
      )}

      {/* 3. AI Assistant (216px) */}
      <GlobalAIAssistant
        isHidden={isAIHidden}
        onHide={() => setIsAIHidden(true)}
        offsetY={FAB_BASE + FAB_STEP * 2}
      />

      {/* 4. Accessibility — top-most (280px) */}
      <AccessibilityWidget
        isHidden={isA11yHidden}
        onHide={() => setIsA11yHidden(true)}
        offsetY={FAB_BASE + FAB_STEP * 3}
      />

      <SmartAdSidebarWidget dwellDelayMs={30000} />
    </div>
  );
};

export default Layout;
