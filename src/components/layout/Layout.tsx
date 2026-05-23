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

      {/* Restore Handle - Vertical bar 1rem off the right border */}
      <AnimatePresence>
        {(isAIHidden || isDonationHidden) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999]"
          >
            <motion.button
              drag="x"
              dragConstraints={{ left: -100, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -30) {
                  setIsAIHidden(false);
                  setIsDonationHidden(false);
                }
              }}
              onClick={() => {
                setIsAIHidden(false);
                setIsDonationHidden(false);
              }}
              className="w-4 h-32 bg-kenya-green shadow-[0_0_30px_rgba(22,163,74,0.8)] hover:bg-kenya-green/90 rounded-l-full backdrop-blur-md transition-all cursor-pointer group relative border-l border-y border-white/20"
              title="Pull left or Click to restore assistants"
            >
              <div className="absolute inset-y-0 -left-6 -right-2 bg-transparent" /> {/* Larger Hitbox */}
              <div className="absolute inset-y-4 left-1.5 w-[2px] bg-white/30 rounded-full group-hover:bg-white/50 transition-colors" /> {/* Inner bar detail */}
              <motion.div 
                animate={{ x: [-3, 0, -3] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                 <div className="w-1.5 h-1.5 rounded-full bg-kenya-green shadow-[0_0_8px_rgba(22,163,74,0.5)]" />
                 <div className="w-2 h-2 rounded-full bg-kenya-green shadow-[0_0_8px_rgba(22,163,74,0.5)]" />
                 <div className="w-1.5 h-1.5 rounded-full bg-kenya-green shadow-[0_0_8px_rgba(22,163,74,0.5)]" />
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

