import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ledgerService } from "@/services/ledgerService";

/* ─────────────────────────────────────────────────────────────────────────────
   MaintenancePage.tsx
   STRICT MODE: Deep iOS Skeuomorphic / Glassmorphic Edition
   Target: KSh 5,500 Recovery Milestone
   Powered by: Isolated Ledger Service (ftswzvqwxdwgkvfbwfpx)
───────────────────────────────────────────────────────────────────────────── */

const INSTAGRAM_URL = "https://www.instagram.com/civiceducationke";
const SUPPORT_URL = "https://zenlipa.co.ke/tip/civic-education-kenya";
const RECOVERY_GOAL = 5500;

/* ── SVG: Danger Alert (from report/context) ── */
const AlertIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.7605 15.92L15.3605 4.4C14.5005 2.85 13.3105 2 12.0005 2C10.6905 2 9.50047 2.85 8.64047 4.4L2.24047 15.92C1.43047 17.39 1.34047 18.8 1.99047 19.91C2.64047 21.02 3.92047 21.63 5.60047 21.63H18.4005C20.0805 21.63 21.3605 21.02 22.0105 19.91C22.6605 18.8 22.5705 17.38 21.7605 15.92ZM11.2505 9C11.2505 8.59 11.5905 8.25 12.0005 8.25C12.4105 8.25 12.7505 8.59 12.7505 9V14C12.7505 14.41 12.4105 14.75 12.0005 14.75C11.5905 14.75 11.2505 14.41 11.2505 14V9ZM12.7105 17.71C12.6605 17.75 12.6105 17.79 12.5605 17.83C12.5005 17.87 12.4405 17.9 12.3805 17.92C12.3205 17.95 12.2605 17.97 12.1905 17.98C12.1305 17.99 12.0605 18 12.0005 18C11.9405 18 11.8705 17.99 11.8005 17.98C11.7405 17.97 11.6805 17.95 11.6205 17.92C11.5605 17.9 11.5005 17.87 11.4405 17.83C11.3905 17.79 11.3405 17.75 11.2905 17.71C11.1105 17.52 11.0005 17.26 11.0005 17C11.0005 16.74 11.1105 16.48 11.2905 16.29C11.3405 16.25 11.3905 16.21 11.4405 16.17C11.5005 16.13 11.5605 16.1 11.6205 16.08C11.6805 16.05 11.7405 16.03 11.8005 16.02C11.9305 15.99 12.0705 15.99 12.1905 16.02C12.2605 16.03 12.3205 16.05 12.3805 16.08C12.4405 16.1 12.5005 16.13 12.5605 16.17C12.6105 16.21 12.6605 16.25 12.7105 16.29C12.8905 16.48 13.0005 16.74 13.0005 17C13.0005 17.26 12.8905 17.52 12.7105 17.71Z" fill="#E9D502" />
  </svg>
);

/* ── SVG: Wallet Money (from report/context) ── */
const WalletIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M20.4105 9.86058C20.3559 9.8571 20.2964 9.85712 20.2348 9.85715L20.2194 9.85715H17.8015C15.8086 9.85715 14.1033 11.4382 14.1033 13.5C14.1033 15.5618 15.8086 17.1429 17.8015 17.1429H20.2194L20.2348 17.1429C20.2964 17.1429 20.3559 17.1429 20.4105 17.1394C21.22 17.0879 21.9359 16.4495 21.9961 15.5577C22.0001 15.4992 22 15.4362 22 15.3778L22 15.3619V11.6381L22 11.6222C22 11.5638 22.0001 11.5008 21.9961 11.4423C21.9359 10.5506 21.22 9.91209 20.4105 9.86058ZM17.5872 14.4714C18.1002 14.4714 18.5162 14.0365 18.5162 13.5C18.5162 12.9635 18.1002 12.5286 17.5872 12.5286C17.0741 12.5286 16.6581 12.9635 16.6581 13.5C16.6581 14.0365 17.0741 14.4714 17.5872 14.4714Z" fill="currentColor" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="M20.2341 18.6C20.3778 18.5963 20.4866 18.7304 20.4476 18.8699C20.2541 19.562 19.947 20.1518 19.4542 20.6485C18.7329 21.3755 17.8183 21.6981 16.6882 21.8512C15.5902 22 14.1872 22 12.4158 22H10.3794C8.60803 22 7.20501 22 6.10697 21.8512C4.97692 21.6981 4.06227 21.3755 3.34096 20.6485C2.61964 19.9215 2.29953 18.9997 2.1476 17.8608C1.99997 16.7541 1.99999 15.3401 2 13.5548V13.4452C1.99998 11.6599 1.99997 10.2459 2.1476 9.13924C2.29953 8.00031 2.61964 7.07848 3.34096 6.35149C4.06227 5.62451 4.97692 5.30188 6.10697 5.14876C7.205 4.99997 8.60802 4.99999 10.3794 5L12.4158 5C14.1872 4.99998 15.5902 4.99997 16.6882 5.14876C17.8183 5.30188 18.7329 5.62451 19.4542 6.35149C19.947 6.84817 20.2541 7.43804 20.4476 8.13012C20.4866 8.26959 20.3778 8.40376 20.2341 8.4L17.8015 8.40001C15.0673 8.40001 12.6575 10.5769 12.6575 13.5C12.6575 16.4231 15.0673 18.6 17.8015 18.6L20.2341 18.6ZM5.61446 8.88572C5.21522 8.88572 4.89157 9.21191 4.89157 9.61429C4.89157 10.0167 5.21522 10.3429 5.61446 10.3429H9.46988C9.86912 10.3429 10.1928 10.0167 10.1928 9.61429C10.1928 9.21191 9.86912 8.88572 9.46988 8.88572H5.61446Z" fill="currentColor" />
    <path d="M7.77668 4.02439L9.73549 2.58126C10.7874 1.80625 12.2126 1.80625 13.2645 2.58126L15.2336 4.03197C14.4103 3.99995 13.4909 3.99998 12.4829 4H10.3123C9.39123 3.99998 8.5441 3.99996 7.77668 4.02439Z" fill="currentColor" />
  </svg>
);

/* ── SVG: Arrow Down Circle (from report/context) ── */
const NextArrowIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16,30 C8.268,30 2,23.73 2,16 C2,8.27 8.268,2 16,2 C23.732,2 30,8.27 30,16 C30,23.73 23.732,30 16,30 L16,30 Z M16,0 C7.163,0 0,7.16 0,16 C0,24.84 7.163,32 16,32 C24.837,32 32,24.84 32,16 C32,7.16 24.837,0 16,0 L16,0 Z M21.121,15.46 L17,19.59 L17,9 C17,8.45 16.553,8 16,8 C15.448,8 15,8.45 15,9 L15,19.59 L10.879,15.46 C10.488,15.07 9.855,15.07 9.465,15.46 C9.074,15.86 9.074,16.49 9.465,16.88 L15.121,22.54 C15.361,22.78 15.689,22.85 16,22.79 C16.311,22.85 16.639,22.78 16.879,22.54 L22.535,16.88 C22.926,16.49 22.926,15.86 22.535,15.46 C22.146,15.07 21.512,15.07 21.121,15.46 L21.121,15.46 Z" fill="currentColor" transform="rotate(-90 16 16)" />
  </svg>
);

/* ── SVG: Chat Round (from icons 3) ── */
const SocialIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.0434 16.4525C3.22094 16.8088 3.27314 17.2136 3.17719 17.5973L2.69852 19.512C2.45041 20.5044 3.49557 21.3575 4.4116 20.9161L6.44474 19.9358C6.81591 19.7567 7.24031 19.7508 7.61482 19.9196C8.98319 20.5372 10.4514 20.8846 12 20.8846V22ZM8 10.6154C8.42398 10.6154 8.76923 10.2701 8.76923 9.84615C8.76923 9.42217 8.42398 9.07692 8 9.07692H16C16.424 9.07692 16.7692 9.42217 16.7692 9.84615C16.7692 10.2701 16.424 10.6154 16 10.6154H8ZM8 14.1538C8.42398 14.1538 8.76923 13.8086 8.76923 13.3846C8.76923 12.9606 8.42398 12.6154 8 12.6154H13C13.424 12.6154 13.7692 12.9606 13.7692 13.3846C13.7692 13.8086 13.424 14.1538 13 14.1538H8Z" fill="currentColor" />
  </svg>
);

const MaintenancePage: React.FC = () => {
  const [stats, setStats] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.title;
    document.title = "Service Update — CEKA";

    const fetchStats = async () => {
      const data = await ledgerService.getDonationStats();
      setStats(data);
      setLoading(false);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => { document.title = prev; clearInterval(interval); };
  }, []);

  const progressPercent = Math.min(100, ((stats.total + 500) / RECOVERY_GOAL) * 100);

  return (
    <>
      <style>{`
        @keyframes ceka-ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes ceka-fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ceka-scale-in { from { opacity: 0; transform: scale(0.94) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes progress-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }

        .ceka-maint-root {
          min-height: 100dvh;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: hsl(220 70% 3%);
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
        }

        /* iOS Skeuomorphic Bezel Card */
        .ceka-maint-card {
          width: 100%;
          max-width: 520px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(50px) saturate(200%);
          -webkit-backdrop-filter: blur(50px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 36px;
          padding: 48px 40px;
          box-shadow: 
            0 40px 80px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          animation: ceka-scale-in 0.7s cubic-bezier(0.23, 1, 0.32, 1) both;
        }

        .ceka-maint-heading {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: white;
          text-align: center;
          margin-bottom: 24px;
        }

        /* THE RECOVERY TRACKER - iOS SKEUOMORPHIC */
        .ceka-recovery-tracker {
          margin: 32px 0;
          padding: 24px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .tracker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .tracker-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(0, 220, 100, 0.8);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .tracker-value {
          font-size: 24px;
          font-weight: 900;
          color: white;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 0 15px rgba(0, 220, 100, 0.3);
        }

        /* THE BEZEL TRACK */
        .tracker-bezel {
          height: 12px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 100px;
          position: relative;
          border: 1.5px solid rgba(255, 255, 255, 0.05);
          box-shadow: 
            inset 0 2px 4px rgba(0, 0, 0, 0.8),
            0 1px 1px rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }

        .tracker-fill {
          height: 100%;
          border-radius: 100px;
          background: linear-gradient(90deg, #b7f0caff, #00c850, #00ff66, #00c850);
          background-size: 300% 100%;
          width: ${progressPercent}%;
          transition: width 1.5s cubic-bezier(0.23, 1, 0.32, 1);
          animation: progress-shimmer 4s linear infinite;
          box-shadow: 0 0 10px rgba(0, 200, 80, 0.4);
        }

        .tracker-gloss {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 50%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.1), transparent);
          border-radius: 100px;
          pointer-events: none;
        }

        .tracker-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
        }

        .ceka-maint-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 18px;
          background: linear-gradient(180deg, #009933 0%, #007722 100%);
          border-radius: 18px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          text-decoration: none;
          box-shadow: 
            0 8px 24px rgba(0, 100, 30, 0.4),
            inset 0 1px 1px rgba(255, 255, 255, 0.2);
          transition: all 0.2s;
        }
        .ceka-maint-btn-primary:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .ceka-status-grid {
          width: 100%;
          margin-top: 24px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
        }

        .status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          font-family: -apple-system, sans-serif;
        }
        .status-row:last-child { border-bottom: none; }

        .status-name {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          position: relative;
        }
        .dot::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: inherit;
          opacity: 0.4;
          animation: status-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes status-pulse { 0% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(2.5); opacity: 0; } 100% { transform: scale(1); opacity: 0; } }

        .dot-red { background: #ff453a; box-shadow: 0 0 10px rgba(255, 69, 58, 0.5); color: #ff453a; }
        .dot-green { background: #32d74b; box-shadow: 0 0 10px rgba(50, 215, 75, 0.5); color: #32d74b; }
        .dot-amber { background: #ffd60a; box-shadow: 0 0 10px rgba(255, 214, 10, 0.5); color: #ffd60a; }

        .transparency-link {
          display: block;
          text-align: center;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.25);
          text-decoration: none;
          margin-top: 24px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .transparency-link:hover { color: rgba(255, 255, 255, 0.6); }
      `}</style>

      <div className="ceka-maint-root">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(0, 200, 80, 0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 10 }}>
          <div className="ceka-maint-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <AlertIcon />
            </div>

            <h1 className="ceka-maint-heading">Help Us Restore CEKA Services</h1>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 8 }}>
              Working to restore critical infrastructure downed by the 2026 Finance Bill surge. All contributions go directly toward server recovery and database fortification.
            </p>

            {/* THE TRACKER */}
            <div className="ceka-recovery-tracker">
              <div className="tracker-header">
                <span className="tracker-label">Amount Raised</span>
                <span className="tracker-value">KES {(stats.total + 500).toLocaleString()}</span>
              </div>

              <div className="tracker-bezel">
                <div className="tracker-fill" />
                <div className="tracker-gloss" />
              </div>

              <div className="tracker-footer">
                <span>{Math.round(progressPercent)}% of Goal</span>
                <span>KSh {RECOVERY_GOAL.toLocaleString()}</span>
              </div>
            </div>

            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="ceka-maint-btn-primary">
              <WalletIcon />
              Donate Any Amount
            </a>

            <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, marginTop: 24, fontWeight: 600 }}>
              <NextArrowIcon />
              Return to Unaffected Pages
            </Link>

            <div className="ceka-status-grid">
              <Link to="/infrastructure" className="status-row hover:bg-white/[0.03] transition-colors cursor-pointer block no-underline">
                <div className="flex items-center justify-between w-full">
                  <span className="status-name">Finance Bill 2026</span>
                  <div className="status-indicator dot-red"><div className="dot" />Offline</div>
                </div>
              </Link>
              <Link to="/infrastructure" className="status-row hover:bg-white/[0.03] transition-colors cursor-pointer block no-underline">
                <div className="flex items-center justify-between w-full">
                  <span className="status-name">Legislative Tracker</span>
                  <div className="status-indicator dot-red"><div className="dot" />Offline</div>
                </div>
              </Link>
              <div className="status-row">
                <span className="status-name">Resource Library</span>
                <div className="status-indicator dot-amber"><div className="dot" />Maintenance</div>
              </div>
              <div className="status-row">
                <span className="status-name">Civic Tools & Apps</span>
                <div className="status-indicator dot-green"><div className="dot" />Operational</div>
              </div>
              <div className="status-row">
                <span className="status-name">Infrastructure / APIs</span>
                <div className="status-indicator dot-green"><div className="dot" />Operational</div>
              </div>
            </div>

            <Link to="/transparency" className="transparency-link">
              Why support our recovery efforts? View our Transparency Manifesto
            </Link>
          </div>
        </main>
      </div>
    </>
  );
};

export default MaintenancePage;
