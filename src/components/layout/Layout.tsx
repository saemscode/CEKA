import React, { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNavbar from './BottomNavbar';
import DonationWidget from '@/components/donation/DonationWidget';
import GlobalAIAssistant from '@/components/ai/GlobalAIAssistant';
import InAppBrowserBanner from '@/components/ui/InAppBrowserBanner';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Handle donation widget timeout
  const handleDonationTimeout = () => {
    setDonationTimedOut(true);
  };

  return (
    <div className="flex min-h-screen flex-col relative overflow-x-hidden">
      <Navbar />
      <InAppBrowserBanner />
      <main className="flex-1 pt-16 lg:pt-0 pb-16 lg:pb-0 w-full overflow-x-hidden">{children}</main>
      <Footer />
      {!hideBottomNav && <BottomNavbar />}

      {/* Restore Handle - Minimalist iOS-inspired bar 2rem off the right border */}
      <AnimatePresence>
        {(isAIHidden || isDonationHidden) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-8 top-1/2 -translate-y-1/2 z-[3000]"
          >
            <motion.button
              drag="x"
              dragConstraints={{ left: -100, right: 0 }}
              onDragEnd={(_, info) => {
                // Swipe left restores both
                if (info.offset.x < -20) {
                  setIsAIHidden(false);
                  setIsDonationHidden(false);
                }
              }}
              onClick={() => {
                setIsAIHidden(false);
                setIsDonationHidden(false);
              }}
              className="w-1.5 h-24 bg-black/20 dark:bg-white/20 backdrop-blur-3xl rounded-full transition-all cursor-pointer group relative border border-white/10 dark:border-white/5"
              title="Swipe left to restore"
            >
              <div className="absolute inset-y-0 -left-6 -right-6 bg-transparent" /> {/* Hitbox */}
              
              {/* Subtle Indicator */}
              <motion.div 
                animate={{ x: [-2, 0, -2] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="w-1 h-3 bg-black/20 dark:bg-white/20 rounded-full" />
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
        />
      )}
    </div>
  );
};

export default Layout;
