import React, { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNavbar from './BottomNavbar';
import DonationWidget from '@/components/donation/DonationWidget';
import GlobalAIAssistant from '@/components/ai/GlobalAIAssistant';
import InAppBrowserBanner from '@/components/ui/InAppBrowserBanner';
import MaintenanceBanner from '@/components/MaintenanceBanner';
import CivicMiniPlayer from '@/components/civic/CivicMiniPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { useMaintenanceScroll } from '@/hooks/useMaintenanceScroll';

interface LayoutProps {
  children: React.ReactNode;
  hideBottomNav?: boolean;
  hideBackButton?: boolean;
}

const Layout = ({ children, hideBottomNav, hideBackButton }: LayoutProps) => {
  // State to track if the donation widget has timed out
  const [donationTimedOut, setDonationTimedOut] = useState(false);
  // State to track if the donation widget is expanded
  const [showDonationWidget, setShowDonationWidget] = useState(false);

  // Shared state for swipe-to-dismiss behavior
  const [isAIHidden, setIsAIHidden] = useState(false);
  const [isDonationHidden, setIsDonationHidden] = useState(false);
  const [isCivicHidden, setIsCivicHidden] = useState(false);

  // PRECISE SCROLL HANDOFF LOGIC
  const { bannerRef, navbarRef, isFixed, navbarHeight } = useMaintenanceScroll();

  // Handle donation widget timeout
  const handleDonationTimeout = () => {
    setDonationTimedOut(true);
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

      <AnimatePresence>
        {(isAIHidden || isDonationHidden || isCivicHidden) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 z-[3000]"
          >
            <motion.button
              drag="x"
              dragConstraints={{ left: -100, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -20) {
                  setIsAIHidden(false);
                  setIsDonationHidden(false);
                }
              }}
              onClick={() => {
                setIsAIHidden(false);
                setIsDonationHidden(false);
                setIsCivicHidden(false);
              }}
              className="w-2.5 sm:w-1.5 h-20 bg-black/50 dark:bg-white/50 sm:bg-black/20 sm:dark:bg-white/20 rounded-full transition-all cursor-pointer group relative border border-black/10 dark:border-white/20 shadow-[0_0_12px_rgba(0,0,0,0.15)]"
              title="Swipe left to restore"
            >
              <div className="absolute inset-y-0 -left-5 -right-5 bg-transparent" />{/* Hitbox */}

              {/* Arrow indicator — always slightly visible on mobile, hover on desktop */}
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

      {/* AI Assistant FAB - positioned above donation widget */}
      <GlobalAIAssistant
        isHidden={isAIHidden}
        onHide={() => setIsAIHidden(true)}
      />

      {/* Conditionally render the donation widget */}
      {(showDonationWidget || !donationTimedOut) && (
        <DonationWidget
          onTimedOut={handleDonationTimeout}
          isHidden={isDonationHidden}
          onHide={() => setIsDonationHidden(true)}
          offsetY={148}
        />
      )}

      {/* Civic Pulse Mini-Player */}
      <CivicMiniPlayer
        isHidden={isCivicHidden}
        onHide={() => setIsCivicHidden(true)}
      />
    </div>
  );
};

export default Layout;
