import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  NavHomeIcon, 
  NavFilesIcon, 
  NavSearchIcon, 
  NavCommentIcon, 
  NavProfileIcon 
} from '@/components/ui/CustomIcons';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/providers/AuthProvider';
import { translate } from '@/lib/utils';

const BottomNavbar = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const { session } = useAuth();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const navItems = [
    {
      name: 'Home',
      path: '/',
      icon: <NavHomeIcon />
    },
    {
      name: 'Resources',
      path: '/resources',
      icon: <NavFilesIcon />
    },
    {
      name: 'Search',
      path: '/search',
      icon: <NavSearchIcon />,
      isCenter: true
    },
    {
      name: 'Community',
      path: '/blog',
      icon: <NavCommentIcon />
    },
    {
      name: session ? 'Profile' : 'Sign In',
      path: session ? '/profile/settings' : '/auth',
      icon: <NavProfileIcon />
    }
  ];
  
  const getTextSize = () => {
    if (windowWidth < 360) return "text-[10px]";
    return "text-[11px]";
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-t border-border/50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] w-full max-w-full overflow-visible pb-safe">
      <nav className="flex justify-around items-end h-16 px-2 relative">
        {navItems.map((item) => {
          const isActive = 
            location.pathname === item.path || 
            (item.path !== '/' && location.pathname.includes(item.path)) ||
            (item.path === '/profile/settings' && location.pathname.startsWith('/profile'));

          if (item.isCenter) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative -top-5 flex flex-col items-center justify-center z-50 transition-transform active:scale-90 duration-200"
              >
                <div className="h-16 w-16 rounded-full bg-slate-900 dark:bg-primary shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:shadow-primary/30 flex items-center justify-center border-[5px] border-white dark:border-[#0F172A]">
                  <NavSearchIcon size={28} className="text-white" />
                </div>
              </Link>
            );
          }
            
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full pb-2 transition-all duration-300",
                isActive 
                  ? "text-primary scale-105" 
                  : "text-muted-foreground/70 hover:text-primary transition-colors"
              )}
            >
              <div className="flex flex-col items-center">
                {React.cloneElement(item.icon as React.ReactElement, { 
                  size: 22,
                  className: cn("transition-all", isActive && "filter drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]")
                })}
                <span className={cn(
                  getTextSize(), 
                  "mt-1 font-medium tracking-tight transition-all",
                  isActive ? "opacity-100" : "opacity-80"
                )}>
                  {translate(item.name, language)}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary animate-pulse" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNavbar;
