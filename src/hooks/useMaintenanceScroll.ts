import { useEffect, useRef, useState } from 'react';

/**
 * useMaintenanceScroll
 * STRICT MODE: Precise scroll-linked handoff logic.
 * Measures banner and navbar dynamically to eliminate hardcoded offsets.
 */
export const useMaintenanceScroll = () => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const navbarRef = useRef<HTMLElement>(null);
  const [isFixed, setIsFixed] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [navbarHeight, setNavbarHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (bannerRef.current) {
        setBannerHeight(bannerRef.current.offsetHeight);
      }
      if (navbarRef.current) {
        setNavbarHeight(navbarRef.current.offsetHeight);
      }
    };

    // Initial measurement
    measure();

    // Responsive measurement
    const resizeObserver = new ResizeObserver(measure);
    if (bannerRef.current) resizeObserver.observe(bannerRef.current);
    if (navbarRef.current) resizeObserver.observe(navbarRef.current);

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const threshold = bannerRef.current?.offsetHeight || 0;
      
      // Threshold check for handoff
      // FIXED: If threshold is 0 (banner dismissed), it should still allow fixing if scrollY > 0
      if ((threshold > 0 && scrollY >= threshold) || (threshold === 0 && scrollY > 0)) {
        setIsFixed(true);
        // SYNC: Update global offset for sensitized components (Toaster)
        document.documentElement.style.setProperty('--toast-header-offset', `${navbarRef.current?.offsetHeight || 0}px`);
      } else {
        setIsFixed(false);
        // SYNC: Reset offset when header is not fixed at top
        document.documentElement.style.setProperty('--toast-header-offset', '0px');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  return { 
    bannerRef, 
    navbarRef, 
    isFixed, 
    bannerHeight, 
    navbarHeight 
  };
};
