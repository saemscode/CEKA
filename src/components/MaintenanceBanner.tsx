import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ledgerService } from "@/services/ledgerService";

/* ─────────────────────────────────────────────────────────────────────────────
   MaintenanceBanner.tsx
   STRICT MODE: iOS Skeuomorphic / Glassmorphic Edition
   Target: KSh 5,500 Recovery Milestone
   Powered by: Isolated Ledger Service (ftswzvqwxdwgkvfbwfpx)
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

/* ── SVG: Wallet Money (from report/context) ── */
const WalletIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M20.4105 9.86058C20.3559 9.8571 20.2964 9.85712 20.2348 9.85715L20.2194 9.85715H17.8015C15.8086 9.85715 14.1033 11.4382 14.1033 13.5C14.1033 15.5618 15.8086 17.1429 17.8015 17.1429H20.2194L20.2348 17.1429C20.2964 17.1429 20.3559 17.1429 20.4105 17.1394C21.22 17.0879 21.9359 16.4495 21.9961 15.5577C22.0001 15.4992 22 15.4362 22 15.3778L22 15.3619V11.6381L22 11.6222C22 11.5638 22.0001 11.5008 21.9961 11.4423C21.9359 10.5506 21.22 9.91209 20.4105 9.86058ZM17.5872 14.4714C18.1002 14.4714 18.5162 14.0365 18.5162 13.5C18.5162 12.9635 18.1002 12.5286 17.5872 12.5286C17.0741 12.5286 16.6581 12.9635 16.6581 13.5C16.6581 14.0365 17.0741 14.4714 17.5872 14.4714Z" fill="currentColor" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="M20.2341 18.6C20.3778 18.5963 20.4866 18.7304 20.4476 18.8699C20.2541 19.562 19.947 20.1518 19.4542 20.6485C18.7329 21.3755 17.8183 21.6981 16.6882 21.8512C15.5902 22 14.1872 22 12.4158 22H10.3794C8.60803 22 7.20501 22 6.10697 21.8512C4.97692 21.6981 4.06227 21.3755 3.34096 20.6485C2.61964 19.9215 2.29953 18.9997 2.1476 17.8608C1.99997 16.7541 1.99999 15.3401 2 13.5548V13.4452C1.99998 11.6599 1.99997 10.2459 2.1476 9.13924C2.29953 8.00031 2.61964 7.07848 3.34096 6.35149C4.06227 5.62451 4.97692 5.30188 6.10697 5.14876C7.205 4.99997 8.60802 4.99999 10.3794 5L12.4158 5C14.1872 4.99998 15.5902 4.99997 16.6882 5.14876C17.8183 5.30188 18.7329 5.62451 19.4542 6.35149C19.947 6.84817 20.2541 7.43804 20.4476 8.13012C20.4866 8.26959 20.3778 8.40376 20.2341 8.4L17.8015 8.40001C15.0673 8.40001 12.6575 10.5769 12.6575 13.5C12.6575 16.4231 15.0673 18.6 17.8015 18.6L20.2341 18.6ZM5.61446 8.88572C5.21522 8.88572 4.89157 9.21191 4.89157 9.61429C4.89157 10.0167 5.21522 10.3429 5.61446 10.3429H9.46988C9.86912 10.3429 10.1928 10.0167 10.1928 9.61429C10.1928 9.21191 9.86912 8.88572 9.46988 8.88572H5.61446Z" fill="currentColor" />
    <path d="M7.77668 4.02439L9.73549 2.58126C10.7874 1.80625 12.2126 1.80625 13.2645 2.58126L15.2336 4.03197C14.4103 3.99995 13.4909 3.99998 12.4829 4H10.3123C9.39123 3.99998 8.5441 3.99996 7.77668 4.02439Z" fill="currentColor" />
  </svg>
);

/* ── SVG: Cancel Close (from icons 3) ── */
const CloseIcon: React.FC = () => (
  <svg fill="currentColor" height="12px" width="12px" viewBox="0 0 492 492" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M300.188,246L484.14,62.04c5.06-5.064,7.852-11.82,7.86-19.024c0-7.208-2.792-13.972-7.86-19.028L468.02,7.872 c-5.068-5.076-11.824-7.856-19.036-7.856c-7.2,0-13.956,2.78-19.024,7.856L246.008,191.82L62.048,7.872 c-5.06-5.076-11.82-7.856-19.028-7.856c-7.2,0-13.96,2.78-19.02,7.856L7.872,23.988c-10.496,10.496-10.496,27.568,0,38.052 L191.828,246L7.872,429.952c-5.064,5.072-7.852,11.828-7.852,19.032c0,7.204,2.788,13.96,7.852,19.028l16.124,16.116 c5.06,5.072,11.824,7.856,19.02,7.856c7.208,0,13.968-2.784,19.028-7.856l183.96-183.952l183.952,183.952 c5.068,5.072,11.824,7.856,19.024,7.856h0.008c7.204,0,13.96-2.784,19.028-7.856l16.12-16.116 c5.06-5.064,7.852-11.824,7.852-19.028c0-7.204-2.792-13.96-7.852-19.028L300.188,246z" />
  </svg>
);

const MaintenanceBanner: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [stats, setStats] = useState<{ total: number; count: number }>({ total: 0, count: 0 });

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(SESSION_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }

    const fetchStats = async () => {
      const data = await ledgerService.getDonationStats();
      setStats(data);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = Math.min(100, (stats.total / RECOVERY_GOAL) * 100);

  const dismiss = () => {
    setVisible(false);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { }
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes ceka-banner-pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        @keyframes shimmer-liquid { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        .ceka-banner-root {
          position: sticky;
          top: 0; left: 0; right: 0;
          z-index: 3002;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          background: rgba(0, 40, 10, 0.75);
          backdrop-filter: blur(32px) saturate(210%);
          -webkit-backdrop-filter: blur(32px) saturate(210%);
          border-bottom: 1px solid rgba(0, 200, 80, 0.15);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        }

        .ceka-banner-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          max-width: 1100px;
        }

        .alert-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(0, 200, 80, 0.12);
          border: 1px solid rgba(0, 200, 80, 0.25);
          border-radius: 100px;
          color: rgba(0, 220, 100, 0.95);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          animation: ceka-banner-pulse 2s infinite;
        }

        .ceka-banner-text {
          font-size: 12.5px;
          font-weight: 500;
          color: rgba(200, 255, 220, 0.7);
          flex: 1;
        }

        /* iOS Skeuomorphic Mini Tracker */
        .banner-tracker-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.25);
          padding: 4px 12px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }

        .mini-track-bg {
          width: 60px;
          height: 5px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 100px;
          overflow: hidden;
          position: relative;
        }

        .mini-track-fill {
          height: 100%;
          background: linear-gradient(90deg, #008c32, #00c850, #008c32);
          background-size: 200% 100%;
          border-radius: 100px;
          width: ${progressPercent}%;
          transition: width 1s ease;
          animation: shimmer-liquid 3s linear infinite;
        }

        .mini-tracker-label {
          font-size: 10.5px;
          font-weight: 800;
          color: rgba(0, 220, 100, 0.9);
          font-variant-numeric: tabular-nums;
        }

        .ceka-banner-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: white;
          text-decoration: none;
          background: rgba(0, 220, 100, 0.15);
          padding: 5px 12px;
          border-radius: 100px;
          border: 1px solid rgba(0, 220, 100, 0.3);
          transition: all 0.2s;
        }
        .ceka-banner-link:hover {
          background: rgba(0, 220, 100, 0.25);
          transform: translateY(-1px);
        }

        .ceka-banner-dismiss {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
          color: rgba(200,255,220,0.4);
          cursor: pointer;
          transition: all 0.2s;
        }
        .ceka-banner-dismiss:hover { background: rgba(255,255,255,0.1); color: white; }

        @media (max-width: 800px) { .ceka-banner-text { display: none; } }
      `}</style>

      <div className="ceka-banner-root" role="banner">
        <div className="ceka-banner-inner">
          <div className="alert-pill">
            <AlertIcon />
            Services Partly Down
          </div>

          <span className="ceka-banner-text">
            Finance Bill Requests Downed Our Database... help us restore the site fully.
          </span>

          <div className="banner-tracker-wrap">
            <span className="mini-tracker-label">{Math.round(progressPercent)}%</span>
            <div className="mini-track-bg">
              <div className="mini-track-fill" />
            </div>
          </div>

          <Link to={MAINTENANCE_ROUTE} className="ceka-banner-link">
            <WalletIcon />
            <span>How to Support {"->"} </span>
          </Link>

          <button className="ceka-banner-dismiss" onClick={dismiss}>
            <CloseIcon />
          </button>
        </div>
      </div>
    </>
  );
};

export default MaintenanceBanner;
