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
      if (scrollY >= threshold && threshold > 0) {
        setIsFixed(true);
      } else {
        setIsFixed(false);
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
