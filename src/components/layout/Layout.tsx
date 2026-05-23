import React, { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNavbar from './BottomNavbar';
import DonationWidget from '@/components/donation/DonationWidget';
import GlobalAIAssistant from '@/components/ai/GlobalAIAssistant';
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
            className="fixed right-4 top-1/2 -translate-y-1/2 z-[60]"
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
              className="w-2.5 h-20 bg-kenya-green shadow-[0_0_15px_rgba(22,163,74,0.5)] hover:bg-kenya-green/80 rounded-full backdrop-blur-md transition-all cursor-pointer group relative z-[70]"
              title="Pull left to restore action buttons"
            >
              <div className="absolute inset-y-0 -left-4 -right-4 bg-transparent" /> {/* Larger Hitbox */}
              <motion.div 
                animate={{ x: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -left-5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                 <div className="w-1 h-1 rounded-full bg-kenya-green" />
                 <div className="w-1.5 h-1.5 rounded-full bg-kenya-green" />
                 <div className="w-1 h-1 rounded-full bg-kenya-green" />
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

