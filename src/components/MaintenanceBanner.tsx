import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ledgerService } from "@/services/ledgerService";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   MaintenanceBanner.tsx
   STRICT MODE: iOS Skeuomorphic / Glassmorphic Control Center
   Target: KSh 5,500 Recovery Milestone
   Feature: Three-card "Recovery Flip" Animation
───────────────────────────────────────────────────────────────────────────── */

const SESSION_KEY = "ceka_maint_banner_dismissed";
const MAINTENANCE_ROUTE = "/maintenance";
const RECOVERY_GOAL = 5500;

/* ── SVG: Danger Alert (from report/context) ── */
const AlertIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M21.7605 15.92L15.3605 4.4C14.5005 2.85 13.3105 2 12.0005 2C10.6905 2 9.50047 2.85 8.64047 4.4L2.24047 15.92C1.43047 17.39 1.34047 18.8 1.99047 19.91C2.64047 21.02 3.92047 21.63 5.60047 21.63H18.4005C20.0805 21.63 21.3605 21.02 22.0105 19.91C22.6605 18.8 22.5705 17.38 21.7605 15.92ZM11.2505 9C11.2505 8.59 11.5905 8.25 12.0005 8.25C12.4105 8.25 12.7505 8.59 12.7505 9V14C12.7505 14.41 12.4105 14.75 12.0005 14.75C11.5905 14.75 11.2505 14.41 11.2505 14V9ZM12.7105 17.71C12.6605 17.75 12.6105 17.79 12.5605 17.83C12.5005 17.87 12.4405 17.9 12.3805 17.92C12.3205 17.95 12.2605 17.97 12.1905 17.98C12.1305 17.99 12.0605 18 12.0005 18C11.9405 18 11.8705 17.99 11.8005 17.98C11.7405 17.97 11.6805 17.95 11.6205 17.92C11.5605 17.9 11.5005 17.87 11.4405 17.83C11.3905 17.79 11.3405 17.75 11.2905 17.71C11.1105 17.52 11.0005 17.26 11.0005 17C11.0005 16.74 11.1105 16.48 11.2905 16.29C11.3405 16.25 11.3905 16.21 11.4405 16.17C11.5005 16.13 11.5605 16.1 11.6205 16.08C11.6805 16.05 11.7405 16.03 11.8005 16.02C11.9305 15.99 12.0705 15.99 12.1905 16.02C12.2605 16.03 12.3205 16.05 12.3805 16.08C12.4405 16.1 12.5005 16.13 12.5605 16.17C12.6105 16.21 12.6605 16.25 12.7105 16.29C12.8905 16.48 13.0005 16.74 13.0005 17C13.0005 17.26 12.8905 17.52 12.7105 17.71Z" fill="currentColor" />
  </svg>
);

/* ── SVG: Hand-Drawn Right Arrow (from icons 3) ── */
const SketchArrowIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 60.707 60.707" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M55.377,24.919c-4.115-3.246-8.23-6.492-12.346-9.738c-0.002-0.002-0.006-0.002-0.008-0.003
      c-0.027-0.025-0.064-0.05-0.117-0.071c-6.672-2.722-2.856,7.661-4.514,7.908c-6.086,0.909-12.17,1.816-18.257,2.725
      c-5.814,0.868-11.628,1.735-17.441,2.604C0.936,28.606,0,29.399,0,31.151c0,1.594,2.95,1.537,4.005,1.693
      c6.749,1.005,13.499,2.009,20.248,3.015c2.339,0.348,14.326,0.482,14.326,3.657c0,1.317-0.851,6.098,1.261,6.463
      c1.711,0.297,2.764-0.32,4.064-1.347c5.203-4.103,10.408-8.208,15.611-12.311c0.364-0.287,0.613-0.573,0.805-0.858
      c0.016-0.017,0.025-0.036,0.039-0.054c0.045-0.069,0.098-0.14,0.133-0.208c0.068-0.129,0.123-0.268,0.154-0.411
      C61.255,28.468,57.145,26.314,55.377,24.919z M2.33,29.856c-0.064,0.153-0.128,0.309-0.19,0.462
      c-0.054,0.131-0.101,0.262-0.139,0.388c-0.019-0.027-0.051-0.046-0.068-0.074c-0.332-0.542-0.01-0.936,0.609-1.229
      C2.47,29.541,2.398,29.691,2.33,29.856z M52.773,25.01c0.104,0.082,0.207,0.164,0.312,0.246c-1.814,3.778-3.71,7.517-5.721,11.197
      c-0.266,0.483-0.328,0.457-0.133-0.061c0.765-2.021,1.59-4.017,2.424-6.004c0.214-0.509,0.619-1.304,0.904-1.776
      C51.294,27.409,52.033,26.209,52.773,25.01z" />
  </svg>
);

/* ── SVG: Cancel Close (from icons 3) ── */
const CloseIcon: React.FC = () => (
  <svg fill="currentColor" height="12px" width="12px" viewBox="0 0 492 492" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M300.188,246L484.14,62.04c5.06-5.064,7.852-11.82,7.86-19.024c0-7.208-2.792-13.972-7.86-19.028L468.02,7.872 c-5.068-5.076-11.824-7.856-19.036-7.856c-7.2,0-13.956,2.78-19.024,7.856L246.008,191.82L62.048,7.872 c-5.06-5.076-11.82-7.856-19.028-7.856c-7.2,0-13.96,2.78-19.02,7.856L7.872,23.988c-10.496,10.496-10.496,27.568,0,38.052 L191.828,246L7.872,429.952c-5.064,5.072-7.852,11.828-7.852,19.032c0,7.204,2.788,13.96,7.852,19.028l16.124,16.116 c5.06,5.072,11.824,7.856,19.02,7.856c7.208,0,13.968-2.784,19.028-7.856l183.96-183.952l183.952,183.952 c5.068,5.072,11.824,7.856,19.024,7.856h0.008c7.204,0,13.96-2.784,19.028-7.856l16.12-16.116 c5.06-5.064,7.852-11.824,7.852-19.028c0-7.204-2.792-13.96-7.852-19.028L300.188,246z"/>
  </svg>
);

const MaintenanceBanner: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [stats, setStats] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(SESSION_KEY);
      if (!dismissed) setVisible(true);
    } catch { setVisible(true); }

    const fetchStats = async () => {
      const data = await ledgerService.getDonationStats();
      setStats(data);
    };
    fetchStats();
    const pollInterval = setInterval(fetchStats, 30000);
    
    // THE RECOVERY FLIP: Cycle through 3 cards every 4 seconds
    const flipInterval = setInterval(() => {
      setCardIndex((prev) => (prev + 1) % 3);
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(flipInterval);
    };
  }, []);

  const progressPercent = Math.min(100, (stats.total / RECOVERY_GOAL) * 100);

  const dismiss = () => {
    setVisible(false);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { }
  };

  if (!visible) return null;

  const cardVariants = {
    initial: { opacity: 0, y: 15, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -15, filter: "blur(4px)" }
  };

  return (
    <>
      <style>{`
        @keyframes shimmer-liquid { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes icon-pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }

        .ceka-banner-root {
          position: sticky;
          top: 0; left: 0; right: 0;
          z-index: 3002;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          background: rgba(0, 40, 10, 0.8);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border-bottom: 1px solid rgba(0, 200, 80, 0.2);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          height: 52px;
          overflow: hidden;
        }

        .ceka-banner-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          max-width: 1100px;
          height: 100%;
        }

        .badge-left {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(0, 200, 80, 0.1);
          border: 1.5px solid rgba(0, 200, 100, 0.3);
          border-radius: 100px;
          color: rgba(0, 255, 120, 1);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          animation: icon-pulse 3s ease-in-out infinite;
          flex-shrink: 0;
        }

        /* THE FLIP CENTER */
        .banner-flip-center {
          flex: 1;
          position: relative;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .flip-card {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Card 1: Original Progress Pill */
        .pill-tracker {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.4);
          padding: 6px 16px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
          width: 100%;
          max-width: 320px;
        }

        .track-bg {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 100px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255,255,255,0.02);
        }

        .track-fill {
          height: 100%;
          background: linear-gradient(90deg, #008c32, #00ff66, #008c32);
          background-size: 200% 100%;
          width: ${progressPercent}%;
          transition: width 1.5s cubic-bezier(0.23, 1, 0.32, 1);
          animation: shimmer-liquid 3s linear infinite;
        }

        .track-label {
          font-size: 12px;
          font-weight: 900;
          color: white;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        /* Card 2 & 3: High Impact Text */
        .flip-text {
          font-size: 13.5px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          text-align: center;
          letter-spacing: -0.01em;
        }

        .highlight-red { color: #ff3b30; text-shadow: 0 0 10px rgba(255, 59, 48, 0.3); }
        .highlight-green { color: #34c759; }

        /* THE SUPPORT BUTTON */
        .btn-right {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(180deg, #00c850 0%, #008c32 100%);
          padding: 6px 14px;
          border-radius: 100px;
          text-decoration: none;
          color: white;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(0, 100, 30, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          flex-shrink: 0;
        }

        .btn-right:hover { transform: translateY(-1px) scale(1.02); filter: brightness(1.1); }
        .btn-right:active { transform: translateY(0) scale(0.98); }

        .close-wrapper {
          margin-left: 4px;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          border: none;
          transition: 0.2s;
        }
        .close-wrapper:hover { background: rgba(255,255,255,0.1); color: white; }

        @media (max-width: 600px) {
          .ceka-banner-root { height: 48px; padding: 0 12px; }
          .badge-left span { display: none; }
          .badge-left { padding: 6px; }
          .btn-right span { display: none; }
          .btn-right { padding: 8px; }
          .flip-text { font-size: 11.5px; }
          .pill-tracker { max-width: 140px; padding: 4px 10px; }
        }
      `}</style>

      <div className="ceka-banner-root" role="banner">
        <div className="ceka-banner-inner">
          {/* LEFT: Pulsing Icon */}
          <div className="badge-left">
            <AlertIcon />
            <span>Operational Update</span>
          </div>

          {/* CENTER: The Animated Flipper */}
          <div className="banner-flip-center">
            <AnimatePresence mode="wait">
              {cardIndex === 0 && (
                <motion.div key="card1" className="flip-card" variants={cardVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}>
                  <div className="pill-tracker">
                    <span className="track-label">{Math.round(progressPercent)}%</span>
                    <div className="track-bg"><div className="track-fill" /></div>
                  </div>
                </motion.div>
              )}
              {cardIndex === 1 && (
                <motion.div key="card2" className="flip-card" variants={cardVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}>
                  <span className="flip-text">DATABASE STATE: <span className="highlight-red">CRITICAL / OFFLINE</span></span>
                </motion.div>
              )}
              {cardIndex === 2 && (
                <motion.div key="card3" className="flip-card" variants={cardVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}>
                  <span className="flip-text">RESTORE CEKA: <span className="highlight-green">WE NEED YOUR HELP</span></span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Sketch Arrow Button */}
          <Link to={MAINTENANCE_ROUTE} className="btn-right">
            <span>How to Support</span>
            <SketchArrowIcon />
          </Link>

          <button className="close-wrapper" onClick={dismiss} type="button">
            <CloseIcon />
          </button>
        </div>
      </div>
    </>
  );
};

export default MaintenanceBanner;
