import React, { useState, useEffect, useRef } from 'react';
import { X, Type, Eye, MonitorPlay } from 'lucide-react';
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
    reducedMotion, setReducedMotion
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

  if (hasTimedOut || !isVisible) return null;

  return (
    <div
      className="fixed z-30 transition-all duration-500 ease-out"
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
        <div className="w-80 bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-600/10 dark:from-blue-400/10 dark:to-indigo-500/10 p-4 border-b border-white/10 dark:border-gray-700/10">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center text-gray-900 dark:text-white">
                <div className="relative mr-3">
                  <DisabilityIcon className="h-6 w-6 text-blue-500 dark:text-blue-400 drop-shadow-sm" />
                  <div className="absolute inset-0 bg-blue-400 blur-sm opacity-30 rounded-full" />
                </div>
                Accessibility
              </h3>
              <button
                className="relative group rounded-full p-2 hover:bg-white/10 dark:hover:bg-gray-800/10 transition-all duration-300 backdrop-blur-sm"
                onClick={handleCollapse}
                aria-label="Close Accessibility Menu"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                <div className="absolute inset-0 rounded-full bg-white/5 scale-0 group-hover:scale-100 transition-transform duration-300" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-800 dark:text-gray-200 mb-4 leading-relaxed font-medium">
              Adjust display settings to improve readability and visual comfort.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleToggleHighContrast}
                aria-pressed={highContrast}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-white/10 dark:hover:bg-gray-800/10 transition-all duration-300 border border-white/10 dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${highContrast ? 'bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-white/5 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10">
                  <Eye className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 ${highContrast ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left">
                    <h4 className="font-bold text-gray-900 dark:text-white">High Contrast</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Increase color distinction</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 rounded-full border-2 ${highContrast ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>

              <button
                onClick={handleToggleLargeText}
                aria-pressed={textScale > 100}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-white/10 dark:hover:bg-gray-800/10 transition-all duration-300 border border-white/10 dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${textScale > 100 ? 'bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-white/5 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10">
                  <Type className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 ${textScale > 100 ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left">
                    <h4 className="font-bold text-gray-900 dark:text-white">Large Text</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Scale typography up</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 rounded-full border-2 ${textScale > 100 ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>

              <button
                onClick={handleToggleReduceMotion}
                aria-pressed={reducedMotion}
                className="w-full group relative p-4 rounded-xl flex items-center justify-between hover:bg-white/10 dark:hover:bg-gray-800/10 transition-all duration-300 border border-white/10 dark:border-gray-700/10 backdrop-blur-sm"
              >
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${reducedMotion ? 'bg-blue-500/20 opacity-100' : 'bg-gradient-to-r from-transparent via-white/5 dark:via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100'}`} />
                <div className="flex items-center relative z-10">
                  <MonitorPlay className={`h-6 w-6 mr-4 transition-transform duration-300 group-hover:scale-110 ${reducedMotion ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`} />
                  <div className="text-left">
                    <h4 className="font-bold text-gray-900 dark:text-white">Reduce Motion</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Disable animations</p>
                  </div>
                </div>
                <div className={`relative z-10 w-4 h-4 rounded-full border-2 ${reducedMotion ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityWidget;
