import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthModalStore } from '@/stores/useAuthModalStore';

const ModalPortal = ({ children, mounted }: { children: React.ReactNode, mounted: boolean }) => {
  if (!mounted) return null;
  return createPortal(children, document.body);
};

export function GlobalActionModal() {
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  const { isOpen, closeModal, heroIconSrc, title, description, features } = useAuthModalStore();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Use the current URL as the redirect point after successful login
  const returnUrl = encodeURIComponent(location.pathname + location.search);

  return (
    <ModalPortal mounted={mounted}>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={closeModal}
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
                onClick={closeModal}
                className="absolute top-6 right-6 h-10 w-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-all z-10"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>

              <div className="p-8 pt-4 space-y-6">
                <div className="h-20 w-20 rounded-[32px] bg-kenya-green/10 flex items-center justify-center">
                  <div 
                    className="h-10 w-10 bg-kenya-green transition-all"
                    style={{
                      maskImage: `url("${heroIconSrc}")`,
                      WebkitMaskImage: `url("${heroIconSrc}")`,
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskPosition: "center"
                    }}
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-3xl font-black tracking-tight leading-[1.1] dark:text-white" dangerouslySetInnerHTML={{ __html: title }} />
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {description}
                  </p>
                </div>

                {features.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {features.map(({ iconSrc, text }) => (
                      <div key={text} className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-kenya-green/10 flex items-center justify-center shrink-0">
                          <div 
                            className="h-5 w-5 bg-kenya-green"
                            style={{
                              maskImage: `url("${iconSrc}")`,
                              WebkitMaskImage: `url("${iconSrc}")`,
                              maskSize: "contain",
                              WebkitMaskSize: "contain",
                              maskRepeat: "no-repeat",
                              WebkitMaskRepeat: "no-repeat",
                              maskPosition: "center",
                              WebkitMaskPosition: "center"
                            }}
                          />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 pt-4">
                  <Button
                    className="rounded-2xl min-h-14 w-full bg-kenya-green text-white font-black text-sm uppercase tracking-widest hover:bg-kenya-green/90 shadow-xl shadow-kenya-green/20"
                    onClick={(e) => {
                      e.preventDefault();
                      closeModal();
                      window.dispatchEvent(new Event('ceka:open-auth-modal'));
                    }}
                  >
                    Join CEKA today
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-12 w-full rounded-2xl font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      closeModal();
                      window.dispatchEvent(new Event('ceka:open-auth-modal'));
                    }}
                  >
                    Already a member? Log In
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
