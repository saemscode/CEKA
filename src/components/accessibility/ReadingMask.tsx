import React, { useState, useEffect, useCallback, useRef } from 'react';

// Detect if the device is touch-only (no fine pointer / mouse)
const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const BAND_HEIGHT = 120;

const ReadingMask: React.FC = () => {
  const [posY, setPosY] = useState(
    typeof window !== 'undefined' ? window.innerHeight / 2 : 300
  );
  const [touchMode] = useState(isTouchDevice);
  // For mobile: show a draggable handle the user can pull
  const isDragging = useRef(false);
  const lastTouchY = useRef(0);

  // ── Desktop: follow mouse ────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    setPosY(e.clientY);
  }, []);

  // ── Mobile: drag the reading band via touch ──────────────────────────────────
  const onTouchStart = useCallback((e: TouchEvent) => {
    isDragging.current = true;
    lastTouchY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    const touch = e.touches[0];
    const delta = touch.clientY - lastTouchY.current;
    lastTouchY.current = touch.clientY;
    setPosY(prev => Math.max(0, Math.min(window.innerHeight, prev + delta)));
    e.preventDefault(); // prevent page scroll while dragging the mask
  }, []);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (!touchMode) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      return () => window.removeEventListener('mousemove', onMouseMove);
    } else {
      // On touch devices, listen on the mask overlay itself (pointer-events-auto)
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      return () => {
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };
    }
  }, [touchMode, onMouseMove, onTouchStart, onTouchMove, onTouchEnd]);

  const topHeight = Math.max(0, posY - BAND_HEIGHT / 2);

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 99998, pointerEvents: 'none', transition: 'opacity 0.2s ease-in-out' }}
      aria-hidden="true"
    >
      {/* Top dark area */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: `${topHeight}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          pointerEvents: 'none',
        }}
      />

      {/* Clear focus band — on mobile this is the drag handle */}
      <div
        style={{
          position: 'absolute',
          top: `${topHeight}px`,
          left: 0, right: 0,
          height: `${BAND_HEIGHT}px`,
          backgroundColor: 'transparent',
          borderTop: '2px solid rgba(255, 200, 0, 0.5)',
          borderBottom: '2px solid rgba(255, 200, 0, 0.5)',
          pointerEvents: 'none',
          cursor: touchMode ? 'grab' : 'none',
          touchAction: touchMode ? 'none' : 'auto',
        }}
      >
        {/* Drag hint — only visible on touch devices */}
        {touchMode && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: 32, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,200,0,0.8)' }} />
            <div style={{ fontSize: 9, color: 'rgba(255,200,0,0.8)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              drag
            </div>
            <div style={{ width: 32, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,200,0,0.8)' }} />
          </div>
        )}
      </div>

      {/* Bottom dark area */}
      <div
        style={{
          position: 'absolute',
          top: `${topHeight + BAND_HEIGHT}px`,
          left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default ReadingMask;
