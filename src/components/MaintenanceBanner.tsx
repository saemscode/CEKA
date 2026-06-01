import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   MaintenanceBanner.tsx
   STRICT MODE: iOS "Victory & Support" Edition
   Condition: Infrastructure Restored @ 63%
   Feature: Rotating Milestone Ticker
───────────────────────────────────────────────────────────────────────────── */

const SESSION_KEY = "ceka_maint_banner_dismissed";
const SUPPORT_URL = "https://zenlipa.co.ke/tip/civic-education-kenya";

const AlertIcon: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M21.7605 15.92L15.3605 4.4C14.5005 2.85 13.3105 2 12.0005 2C10.6905 2 9.50047 2.85 8.64047 4.4L2.24047 15.92C1.43047 17.39 1.34047 18.8 1.99047 19.91C2.64047 21.02 3.92047 21.63 5.60047 21.63H18.4005C20.0805 21.63 21.3605 21.02 22.0105 19.91C22.6605 18.8 22.5705 17.38 21.7605 15.92ZM11.2505 9C11.2505 8.59 11.5905 8.25 12.0005 8.25C12.4105 8.25 12.7505 8.59 12.7505 9V14C12.7505 14.41 12.4105 14.75 12.0005 14.75C11.5905 14.75 11.2505 14.41 11.2505 14V9ZM12.7105 17.71C12.6605 17.75 12.6105 17.79 12.5605 17.83C12.5005 17.87 12.4405 17.9 12.3805 17.92C12.3205 17.95 12.2605 17.97 12.1905 17.98C12.1305 17.99 12.0605 18 12.0005 18C11.9405 18 11.8705 17.99 11.8005 17.98C11.7405 17.97 11.6805 17.95 11.6205 17.92C11.5605 17.9 11.5005 17.87 11.4405 17.83C11.3905 17.79 11.3405 17.75 11.2905 17.71C11.1105 17.52 11.0005 17.26 11.0005 17C11.0005 16.74 11.1105 16.48 11.2905 16.29C11.3405 16.25 11.3905 16.21 11.4405 16.17C11.5005 16.13 11.5605 16.1 11.6205 16.08C11.6805 16.05 11.7405 16.03 11.8005 16.02C11.9305 15.99 12.0705 15.99 12.1905 16.02C12.2605 16.03 12.3205 16.05 12.3805 16.08C12.4405 16.1 12.5005 16.13 12.5605 16.17C12.6105 16.21 12.6605 16.25 12.7105 16.29C12.8905 16.48 13.0005 16.74 13.0005 17C13.0005 17.26 12.8905 17.52 12.7105 17.71Z" fill="#32D74B" />
  </svg>
);

const SketchArrowIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 60.707 60.707" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M55.377,24.919c-4.115-3.246-8.23-6.492-12.346-9.738c-0.002-0.002-0.006-0.002-0.008-0.003c-0.027-0.025-0.064-0.05-0.117-0.071c-6.672-2.722-2.856,7.661-4.514,7.908c-6.086,0.909-12.17,1.816-18.257,2.725c-5.814,0.868-11.628,1.735-17.441,2.604C0.936,28.606,0,29.399,0,31.151c0,1.594,2.95,1.537,4.005,1.693c6.749,1.005,13.499,2.009,20.248,3.015c2.339,0.348,14.326,0.482,14.326,3.657c0,1.317-0.851,6.098,1.261,6.463c1.711,0.297,2.764-0.32,4.064-1.347c5.203-4.103,10.408-8.208,15.611-12.311c0.364-0.287,0.613-0.573,0.805-0.858c0.016-0.017,0.025-0.036,0.039-0.054c0.045-0.069,0.098-0.14,0.133-0.208c0.068-0.129,0.123-0.268,0.154-0.411C61.255,28.468,57.145,26.314,55.377,24.919z M2.33,29.856" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg fill="currentColor" height="12px" width="12px" viewBox="0 0 492 492" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M300.188,246L484.14,62.04c5.06-5.064,7.852-11.82,7.86-19.024c0-7.208-2.792-13.972-7.86-19.028L468.02,7.872 c-5.068-5.076-11.824-7.856-19.036-7.856c-7.2,0-13.956,2.78-19.024,7.856L246.008,191.82L62.048,7.872 c-5.06-5.076-11.82-7.856-19.028-7.856c-7.2,0-13.96,2.78-19.02,7.856L7.872,23.988c-10.496,10.496-10.496,27.568,0,38.052 L191.828,246L7.872,429.952c-5.064,5.072-7.852,11.828-7.852,19.032c0,7.204,2.788,13.96,7.852,19.028l16.124,16.116 c5.06,5.072,11.824,7.856,19.02,7.856c7.208,0,13.968-2.784,19.028-7.856l183.96-183.952l183.952,183.952 c5.068,5.072,11.824,7.856,19.024,7.856h0.008c7.204,0,13.96-2.784,19.028-7.856l16.12-16.116 c5.06-5.064,7.852-11.824,7.852-19.028c0-7.204-2.792-13.96-7.852-19.028L300.188,246z" />
  </svg>
);

const MaintenanceBanner = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [msgIndex, setMsgIndex] = useState(0);

  const messages = [
    "Infrastructure BACK ONLINE.",
    "63% of Recovery Goal Reached.",
    "Support to keep us online."
  ];

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(SESSION_KEY);
      if (!dismissed) setVisible(true);
    } catch { setVisible(true); }

    const ticker = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 5000);

    return () => clearInterval(ticker);
  }, [messages.length]);

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { }
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes icon-pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }

        .ceka-banner-root {
          position: relative;
          z-index: 4000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          padding-top: max(env(safe-area-inset-top), 8px);
          background: rgba(0, 40, 10, 0.85);
          backdrop-filter: blur(40px) saturate(210%);
          -webkit-backdrop-filter: blur(40px) saturate(210%);
          border-bottom: 2px solid rgba(0, 200, 80, 0.4);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          height: 64px;
          min-height: 64px;
          overflow: hidden;
          cursor: pointer;
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
          gap: 10px;
          color: #32D74B;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: icon-pulse 3s ease-in-out infinite;
          flex-shrink: 0;
        }

        .banner-ticker-center {
          flex: 1;
          position: relative;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .ticker-message {
          font-family: "SF Pro Display", "Inter", sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.95);
          text-align: center;
          white-space: nowrap;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        .btn-support {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(180deg, #32D74B 0%, #008c32 100%);
          padding: 8px 16px;
          border-radius: 100px;
          text-decoration: none;
          color: white;
          font-size: 12px;
          font-weight: 900;
          box-shadow: 0 4px 15px rgba(0, 200, 80, 0.3), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
          flex-shrink: 0;
        }

        .btn-support:hover { transform: translateY(-1px) scale(1.05); filter: brightness(1.1); }

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
        }

        @media (max-width: 600px) {
          .ceka-banner-root { height: 56px; }
          .badge-left span { display: none; }
          .btn-support span { display: none; }
          .ticker-message { font-size: 12.5px; }
        }
      `}</style>

      <div
        className="ceka-banner-root"
        role="banner"
        ref={ref}
        onClick={() => window.open(SUPPORT_URL, "_blank")}
      >
        <div className="ceka-banner-inner">
          <div className="badge-left">
            <AlertIcon />
            <span>Operational</span>
          </div>

          <div className="banner-ticker-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={msgIndex}
                className="ticker-message"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                {messages[msgIndex]}
              </motion.div>
            </AnimatePresence>
          </div>

          <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="btn-support" onClick={(e) => e.stopPropagation()}>
            <span>Support</span>
            <SketchArrowIcon />
          </a>

          <button className="close-wrapper" onClick={dismiss} type="button">
            <CloseIcon />
          </button>
        </div>
      </div>
    </>
  );
});

export default MaintenanceBanner;
