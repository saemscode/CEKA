import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useToast } from '@/hooks/use-toast';

const DisabilityIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="-1.5 0 19 19"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
  >
    <path d="M15.215 13.09a.554.554 0 0 1-.554.555h-.924a2.109 2.109 0 1 1-3.782-1.734h-.976a4.141 4.141 0 1 1-5.306-4.802V3.677h-.998a.554.554 0 0 1 0-1.108h1.552a.554.554 0 0 1 .554.554v1.791h4.136a.554.554 0 0 1 0 1.109H4.78v.895a3.76 3.76 0 0 1 .145-.002 4.121 4.121 0 0 1 2.324.713h3.674a1.112 1.112 0 0 1 1.108 1.108v2.065a1.081 1.081 0 0 1-.019.202 2.11 2.11 0 0 1 1.725 1.532h.923a.554.554 0 0 1 .554.555zm-7.256-2.033A3.033 3.033 0 1 0 7.07 13.2a3.012 3.012 0 0 0 .889-2.144zm4.744 2.032a1 1 0 1 0-1 1 1.001 1.001 0 0 0 1-1z" />
  </svg>
);

const IconEye = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M9.75 12C9.75 10.7574 10.7574 9.75 12 9.75C13.2426 9.75 14.25 10.7574 14.25 12C14.25 13.2426 13.2426 14.25 12 14.25C10.7574 14.25 9.75 13.2426 9.75 12Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M2 12C2 13.6394 2.42496 14.1915 3.27489 15.2957C4.97196 17.5004 7.81811 20 12 20C16.1819 20 19.028 17.5004 20.7251 15.2957C21.575 14.1915 22 13.6394 22 12C22 10.3606 21.575 9.80853 20.7251 8.70433C19.028 6.49956 16.1819 4 12 4C7.81811 4 4.97196 6.49956 3.27489 8.70433C2.42496 9.80853 2 10.3606 2 12ZM12 8.25C9.92893 8.25 8.25 9.92893 8.25 12C8.25 14.0711 9.92893 15.75 12 15.75C14.0711 15.75 15.75 14.0711 15.75 12C15.75 9.92893 14.0711 8.25 12 8.25Z" />
  </svg>
);

const IconFontSize = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.5934901,23.257841 L12.5819402,23.2595131 L12.5108777,23.2950439 L12.4918791,23.2987469 L12.4918791,23.2987469 L12.4767152,23.2950439 L12.4056548,23.2595131 C12.3958229,23.2563662 12.3870493,23.2590235 12.3821421,23.2649074 L12.3780323,23.275831 L12.360941,23.7031097 L12.3658947,23.7234994 L12.3769048,23.7357139 L12.4804777,23.8096931 L12.4953491,23.8136134 L12.4953491,23.8136134 L12.5071152,23.8096931 L12.6106902,23.7357139 L12.6232938,23.7196733 L12.6232938,23.7196733 L12.6266527,23.7031097 L12.609561,23.275831 C12.6075724,23.2657013 12.6010112,23.2592993 12.5934901,23.257841 L12.5934901,23.257841 Z M12.8583906,23.1452862 L12.8445485,23.1473072 L12.6598443,23.2396597 L12.6498822,23.2499052 L12.6498822,23.2499052 L12.6471943,23.2611114 L12.6650943,23.6906389 L12.6699349,23.7034178 L12.6699349,23.7034178 L12.678386,23.7104931 L12.8793402,23.8032389 C12.8914285,23.8068999 12.9022333,23.8029875 12.9078286,23.7952264 L12.9118235,23.7811639 L12.8776777,23.1665331 C12.8752882,23.1545897 12.8674102,23.1470016 12.8583906,23.1452862 L12.8583906,23.1452862 Z M12.1430473,23.1473072 C12.1332178,23.1423925 12.1221763,23.1452606 12.1156365,23.1525954 L12.1099173,23.1665331 L12.0757714,23.7811639 C12.0751323,23.7926639 12.0828099,23.8018602 12.0926481,23.8045676 L12.108256,23.8032389 L12.3092106,23.7104931 L12.3186497,23.7024347 L12.3186497,23.7024347 L12.3225043,23.6906389 L12.340401,23.2611114 L12.337245,23.2485176 L12.337245,23.2485176 L12.3277531,23.2396597 L12.1430473,23.1473072 Z" />
    <path d="M21,12 C21.5523,12 22,12.4477 22,13 L22,19 C22,19.5523 21.5523,20 21,20 C20.5946,20 20.2456,19.7588 20.0886,19.4121 C19.4807,19.785 18.7654,20 18,20 C15.7909,20 14,18.2092 14,16 C14,13.7909 15.7909,12 18,12 C18.7654,12 19.4807,12.215 20.0886,12.5879 C20.2456,12.2412 20.5946,12 21,12 Z M8.00003,4 C8.73237,4 9.38095,4.47279 9.60506,5.17 L13.9521,18.694 C14.1211,19.2198 13.8318,19.783 13.306,19.952 C12.7802,20.121 12.217,19.8318 12.048,19.306 L10.6639,15 L5.33612,15 L3.95205,19.306 C3.78305,19.8318 3.21981,20.121 2.69402,19.952 C2.16823,19.783 1.87899,19.2198 2.048,18.694 L6.39499,5.17 C6.6191,4.47279 7.26768,4 8.00003,4 Z M18,14 C16.8954,14 16,14.8955 16,16 C16,17.1046 16.8954,18 18,18 C19.1046,18 20,17.1046 20,16 C20,14.8955 19.1046,14 18,14 Z M8.00003,6.71232 L5.97898,13 L10.0211,13 L8.00003,6.71232 Z" />
  </svg>
);

const IconGlasses = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
    <path d="M15.5 7h-0.5c-0.1 0-0.1 0-0.2 0-0.4-1.2-1.5-2-2.8-2s-2.4 0.9-2.8 2.1c-0.3-0.4-0.7-0.6-1.2-0.6s-0.9 0.2-1.2 0.6c-0.4-1.2-1.5-2.1-2.8-2.1s-2.4 0.9-2.8 2c-0.1 0-0.1 0-0.2 0h-0.5c-0.3 0-0.5 0.2-0.5 0.5s0.2 0.5 0.5 0.5h0.5c0 1.7 1.3 3 3 3 1.5 0 2.7-1.1 3-2.5 0 0 0 0 0 0 0.3 0 0.5-0.2 0.5-0.5s0.2-0.5 0.5-0.5 0.5 0.2 0.5 0.5c0 0.3 0.2 0.5 0.5 0.5 0 0 0 0 0 0 0.2 1.4 1.5 2.5 3 2.5 1.7 0 3-1.3 3-3h0.5c0.3 0 0.5-0.2 0.5-0.5s-0.2-0.5-0.5-0.5zM4 10c-1.1 0-2-0.9-2-2s0.9-2 2-2 2 0.9 2 2-0.9 2-2 2zM12 10c-1.1 0-2-0.9-2-2s0.9-2 2-2 2 0.9 2 2-0.9 2-2 2z" />
  </svg>
);

const IconRectangleTool = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 53 53" fill="currentColor" className={className}>
    <path d="M53,21.941v17c0,0.276-0.224,0.5-0.5,0.5h-52c-0.276,0-0.5-0.224-0.5-0.5v-16.5c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5v16h51v-16H23c-0.276,0-0.5-0.224-0.5-0.5c0-0.276,0.224-0.5,0.5-0.5h29.5C52.776,21.441,53,21.665,53,21.941z M15.552,31.586l4.597-4.536c0.144-0.141,0.358-0.182,0.544-0.105C20.879,27.023,21,27.204,21,27.406v4.535c0,0.276-0.224,0.5-0.5,0.5h-4.597c-0.203,0-0.386-0.123-0.462-0.311C15.363,31.943,15.407,31.727,15.552,31.586z M17.122,31.441H20v-2.839L17.122,31.441z M2.203,18.655c-0.094-0.094-0.146-0.221-0.146-0.354s0.053-0.26,0.146-0.354l4.243-4.242c0.195-0.195,0.512-0.195,0.707,0l1.414,1.414c0.094,0.094,0.146,0.221,0.146,0.354s-0.053,0.26-0.146,0.354l-4.243,4.242c-0.098,0.098-0.226,0.146-0.354,0.146s-0.256-0.049-0.354-0.146L2.203,18.655z M3.263,18.302l0.707,0.707l3.536-3.535l-0.707-0.707L3.263,18.302z M5.03,20.777l4.243-4.243c0.188-0.188,0.52-0.188,0.707,0l9.192,9.192c0.195,0.195,0.195,0.512,0,0.707l-4.243,4.243c-0.098,0.098-0.226,0.146-0.354,0.146s-0.256-0.049-0.354-0.146l-9.192-9.192c-0.094-0.094-0.146-0.221-0.146-0.354S4.937,20.871,5.03,20.777z M6.091,21.131l8.485,8.485l3.536-3.536l-8.485-8.485L6.091,21.131z" />
  </svg>
);

const IconLinkSquare = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 18C5.17157 18 3.75736 18 2.87868 17.1213C2 16.2426 2 14.8284 2 12C2 9.17157 2 7.75736 2.87868 6.87868C3.75736 6 5.17157 6 8 6C10.8284 6 12.2426 6 13.1213 6.87868C14 7.75736 14 9.17157 14 12" />
    <path opacity="0.5" d="M10 12C10 14.8284 10 16.2426 10.8787 17.1213C11.7574 18 13.1716 18 16 18C18.8284 18 20.2426 18 21.1213 17.1213C22 16.2426 22 14.8284 22 12C22 9.17157 22 7.75736 21.1213 6.87868C20.2426 6 18.8284 6 16 6" />
  </svg>
);

const IconImageMissing = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
    <path d="m 4 1 c -1.644531 0 -3 1.355469 -3 3 v 1 h 1 v -1 c 0 -1.109375 0.890625 -2 2 -2 h 1 v -1 z m 2 0 v 1 h 4 v -1 z m 5 0 v 1 h 1 c 1.109375 0 2 0.890625 2 2 v 1 h 1 v -1 c 0 -1.644531 -1.355469 -3 -3 -3 z m -5 4 c -0.550781 0 -1 0.449219 -1 1 s 0.449219 1 1 1 s 1 -0.449219 1 -1 s -0.449219 -1 -1 -1 z m -5 1 v 4 h 1 v -4 z m 13 0 v 4 h 1 v -4 z m -4.5 2 l -2 2 l -1.5 -1 l -2 2 v 0.5 c 0 0.5 0.5 0.5 0.5 0.5 h 7 s 0.472656 -0.035156 0.5 -0.5 v -1 z m -8.5 3 v 1 c 0 1.644531 1.355469 3 3 3 h 1 v -1 h -1 c -1.109375 0 -2 -0.890625 -2 -2 v -1 z m 13 0 v 1 c 0 1.109375 -0.890625 2 -2 2 h -1 v 1 h 1 c 1.644531 0 3 -1.355469 3 -3 v -1 z m -8 3 v 1 h 4 v -1 z m 0 0" />
  </svg>
);

const IconPauseCircle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM8.07612 8.61732C8 8.80109 8 9.03406 8 9.5V14.5C8 14.9659 8 15.1989 8.07612 15.3827C8.17761 15.6277 8.37229 15.8224 8.61732 15.9239C8.80109 16 9.03406 16 9.5 16C9.96594 16 10.1989 16 10.3827 15.9239C10.6277 15.8224 10.8224 15.6277 10.9239 15.3827C11 15.1989 11 14.9659 11 14.5V9.5C11 9.03406 11 8.80109 10.9239 8.61732C10.8224 8.37229 10.6277 8.17761 10.3827 8.07612C10.1989 8 9.96594 8 9.5 8C9.03406 8 8.80109 8 8.61732 8.07612C8.37229 8.17761 8.17761 8.37229 8.07612 8.61732ZM13.0761 8.61732C13 8.80109 13 9.03406 13 9.5V14.5C13 14.9659 13 15.1989 13.0761 15.3827C13.1776 15.6277 13.3723 15.8224 13.6173 15.9239C13.8011 16 14.0341 16 14.5 16C14.9659 16 15.1989 16 15.3827 15.9239C15.6277 15.8224 15.8224 15.6277 15.9239 15.3827C16 15.1989 16 14.9659 16 14.5V9.5C16 9.03406 16 8.80109 15.9239 8.61732C15.8224 8.37229 15.6277 8.17761 15.3827 8.07612C15.1989 8 14.9659 8 14.5 8C14.0341 8 13.8011 8 13.6173 8.07612C13.3723 8.17761 13.1776 8.37229 13.0761 8.61732Z" />
  </svg>
);

import { motion, AnimatePresence } from 'framer-motion';

const MAX_WIDGET_DISPLAY_TIME = 20 * 60 * 1000;

interface AccessibilityWidgetProps {
  onTimedOut?: () => void;
  isHidden?: boolean;
  offsetY?: number;
  onHide?: () => void;
}

const AccessibilityWidget: React.FC<AccessibilityWidgetProps> = ({ onTimedOut, isHidden, offsetY = 268, onHide }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [opacity, setOpacity] = useState(1);

  const {
    highContrast, setHighContrast,
    textScale, setTextScale,
    reducedMotion, setReducedMotion,
    dyslexiaFont, setDyslexiaFont,
    highlightLinks, setHighlightLinks,
    hideImages, setHideImages,
    readingMask, setReadingMask
  } = useAccessibility();

  const { toast } = useToast();

  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    [visibilityTimerRef, timeoutTimerRef, opacityTimerRef].forEach(timerRef => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    });
  };

  useEffect(() => {
    if (isHovering || isExpanded) {
      setOpacity(1);
      if (opacityTimerRef.current) {
        clearTimeout(opacityTimerRef.current);
        opacityTimerRef.current = null;
      }
    } else {
      opacityTimerRef.current = setTimeout(() => {
        setOpacity(0.2);
      }, 5000);
    }

    return () => {
      if (opacityTimerRef.current) {
        clearTimeout(opacityTimerRef.current);
      }
    };
  }, [isHovering, isExpanded]);

  const handleMouseEnter = () => {
    if (!isExpanded) setIsHovering(true);
  };

  const handleMouseLeave = () => {
    if (!isExpanded) setIsHovering(false);
  };

  useEffect(() => {
    if (isHidden !== undefined) {
      setIsVisible(!isHidden);
      return;
    }

    visibilityTimerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 5000);

    timeoutTimerRef.current = setTimeout(() => {
      if (!isExpanded) {
        setIsVisible(false);
        setHasTimedOut(true);
        if (onTimedOut) onTimedOut();
      }
    }, MAX_WIDGET_DISPLAY_TIME);

    return clearTimers;
  }, [isExpanded, onTimedOut, isHidden]);

  const handleExpand = () => setIsExpanded(true);
  const handleCollapse = () => {
    setIsExpanded(false);
    if (onHide) onHide();
  };

  const handleToggleHighContrast = () => {
    setHighContrast(!highContrast);
    toast({ title: `High Contrast ${!highContrast ? 'Enabled' : 'Disabled'}` });
  };

  const handleToggleLargeText = () => {
    const newScale = textScale === 100 ? 120 : 100;
    setTextScale(newScale);
    toast({ title: `Large Text ${newScale === 120 ? 'Enabled' : 'Disabled'}` });
  };

  const handleToggleReduceMotion = () => {
    setReducedMotion(!reducedMotion);
    toast({ title: `Reduced Motion ${!reducedMotion ? 'Enabled' : 'Disabled'}` });
  };

  const handleToggleDyslexiaFont = () => {
    setDyslexiaFont(!dyslexiaFont);
    toast({ title: `Dyslexia Font ${!dyslexiaFont ? 'Enabled' : 'Disabled'}` });
  };
  const handleToggleHighlightLinks = () => {
    setHighlightLinks(!highlightLinks);
    toast({ title: `Highlight Links ${!highlightLinks ? 'Enabled' : 'Disabled'}` });
  };
  const handleToggleHideImages = () => {
    setHideImages(!hideImages);
    toast({ title: `Hide Images ${!hideImages ? 'Enabled' : 'Disabled'}` });
  };
  const handleToggleReadingMask = () => {
    setReadingMask(!readingMask);
    toast({ title: `Reading Mask ${!readingMask ? 'Enabled' : 'Disabled'}` });
  };

  if (hasTimedOut || !isVisible) return null;

  return (
  return (
    <motion.div
      drag={!isExpanded ? "x" : false}
      dragConstraints={{ left: 0, right: 300 }}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        if (!isExpanded && info.offset.x > 80) {
          if (onHide) onHide();
        }
      }}
      className="fixed z-30 transition-all duration-500 ease-out touch-none"
      style={{
        zIndex: 30,
        opacity,
        bottom: `${offsetY}px`,
        ...(isExpanded ? {
          top: '50%',
          bottom: 'auto',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        } : {
          right: '2rem',
        })
      }}
    >
      {!isExpanded ? (
        <div
          className="relative group cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleExpand}
          aria-label="Open Accessibility Menu"
        >
          <div className="relative w-48 h-12 flex items-center">
            <div
              className={`absolute right-12 top-0 h-12 flex items-center transition-all duration-500 ease-out ${isHovering
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-4 pointer-events-none'
                }`}
            >
              <div
                className={`absolute inset-0 rounded-full transition-all duration-500 ease-out ${isHovering
                  ? 'bg-black/20 backdrop-blur-sm scale-100'
                  : 'bg-black/0 backdrop-blur-none scale-75'
                  }`}
              />
              <span
                className={`relative px-4 py-2 text-white font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-out drop-shadow-lg ${isHovering
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-90'
                  }`}
              >
                Accessibility
              </span>
            </div>
            <div
              className={`absolute right-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ease-out shadow-2xl ${isHovering
                ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-blue-500/50 scale-110'
                : 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 shadow-blue-600/40 scale-100'
                }`}
            >
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-blue-300/30 to-transparent" />
              <DisabilityIcon
                className={`relative z-10 transition-all duration-300 ease-out ${isHovering
                  ? 'h-6 w-6 text-white drop-shadow-lg'
                  : 'h-5 w-5 text-white/90'
                  }`}
              />
              <div
                className={`absolute inset-0 rounded-full bg-blue-400 transition-all duration-1000 ease-out ${isHovering
                  ? 'animate-ping opacity-20'
                  : 'opacity-0'
                  }`}
              />
            </div>
          </div>
          {isHovering && (
            <>
              <div className="absolute top-2 right-2 w-1 h-1 bg-blue-300 rounded-full animate-bounce opacity-60" style={{ animationDelay: '0s' }} />
              <div className="absolute top-4 right-6 w-0.5 h-0.5 bg-blue-200 rounded-full animate-bounce opacity-40" style={{ animationDelay: '0.2s' }} />
              <div className="absolute top-6 right-3 w-1 h-1 bg-blue-400 rounded-full animate-bounce opacity-50" style={{ animationDelay: '0.4s' }} />
            </>
          )}
        </div>
      ) : (
        <div className="w-80 bg-white/95 dark:bg-gray-900/10 backdrop-blur-xl border border-gray-200 dark:border-gray-700/20 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-400/10 dark:to-indigo-500/10 p-4 border-b border-gray-200 dark:border-gray-700/10">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center text-gray-900 dark:text-white">
                <div className="relative mr-3">
                  <DisabilityIcon className="h-6 w-6 text-blue-500 dark:text-blue-400 drop-shadow-sm" />
                  <div className="absolute inset-0 bg-blue-400 blur-sm opacity-30 rounded-full" />
                </div>
                Accessibility
              </h3>
              <button
                className="relative group rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800/10 transition-all duration-300 backdrop-blur-sm"
                onClick={handleCollapse}
                aria-label="Close Accessibility Menu"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                <div className="absolute inset-0 rounded-full bg-gray-200/50 dark:bg-white/5 scale-0 group-hover:scale-100 transition-transform duration-300" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-800 dark:text-gray-200 mb-4 leading-relaxed font-medium">
              Adjust display settings to improve readability and visual comfort.
            </p>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <button
                onClick={handleToggleHighContrast}
                aria-pressed={highContrast}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-all duration-300 border border-transparent dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${highContrast ? 'bg-blue-100 dark:bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10 flex-1 min-w-0">
                  <IconEye className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 shrink-0 ${highContrast ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">High Contrast</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">Increase color distinction - unstable & being fixed</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 shrink-0 rounded-full border-2 ml-4 ${highContrast ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>

              <button
                onClick={handleToggleLargeText}
                aria-pressed={textScale > 100}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-all duration-300 border border-transparent dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${textScale > 100 ? 'bg-blue-100 dark:bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10 flex-1 min-w-0">
                  <IconFontSize className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 shrink-0 ${textScale > 100 ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">Large Text</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">Scale typography up</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 shrink-0 rounded-full border-2 ml-4 ${textScale > 100 ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>

              <button
                onClick={handleToggleDyslexiaFont}
                aria-pressed={dyslexiaFont}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-all duration-300 border border-transparent dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${dyslexiaFont ? 'bg-blue-100 dark:bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10 flex-1 min-w-0">
                  <IconGlasses className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 shrink-0 ${dyslexiaFont ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">Dyslexia Font</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">Highly readable typography</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 shrink-0 rounded-full border-2 ml-4 ${dyslexiaFont ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>

              <button
                onClick={handleToggleReadingMask}
                aria-pressed={readingMask}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-all duration-300 border border-transparent dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${readingMask ? 'bg-blue-100 dark:bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10 flex-1 min-w-0">
                  <IconRectangleTool className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 shrink-0 ${readingMask ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">Reading Mask</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">Focus ruler for reading</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 shrink-0 rounded-full border-2 ml-4 ${readingMask ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>

              <button
                onClick={handleToggleHighlightLinks}
                aria-pressed={highlightLinks}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-all duration-300 border border-transparent dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${highlightLinks ? 'bg-blue-100 dark:bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10 flex-1 min-w-0">
                  <IconLinkSquare className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 shrink-0 ${highlightLinks ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">Highlight Links</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">Make interactive elements pop</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 shrink-0 rounded-full border-2 ml-4 ${highlightLinks ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>

              <button
                onClick={handleToggleHideImages}
                aria-pressed={hideImages}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-all duration-300 border border-transparent dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${hideImages ? 'bg-blue-100 dark:bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10 flex-1 min-w-0">
                  <IconImageMissing className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 shrink-0 ${hideImages ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">Hide Images</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">Text-only mode</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 shrink-0 rounded-full border-2 ml-4 ${hideImages ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>

              <button
                onClick={handleToggleReduceMotion}
                aria-pressed={reducedMotion}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-all duration-300 border border-transparent dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${reducedMotion ? 'bg-blue-100 dark:bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10 flex-1 min-w-0">
                  <IconPauseCircle className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 shrink-0 ${reducedMotion ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">Reduce Motion</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">Disable animations</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 shrink-0 rounded-full border-2 ml-4 ${reducedMotion ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AccessibilityWidget;
