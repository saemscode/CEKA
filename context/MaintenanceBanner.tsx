import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ─────────────────────────────────────────────────────────────────────────────
   MaintenanceBanner.tsx
   Renders a slim, dismissible top banner on ALL pages that are NOT
   redirected to MaintenancePage (i.e., every page except
   /resources, /legislative-tracker, /bill/*).

   Mount this inside your root Layout component, above everything else.
   It persists dismissal in sessionStorage so it does not reappear
   within the same browser session.

   Design: Kenya green glass strip — index.css standards.
───────────────────────────────────────────────────────────────────────────── */

const INSTAGRAM_URL       = "https://www.instagram.com/civiceducationke";
const SESSION_KEY         = "ceka_maint_banner_dismissed";
const MAINTENANCE_ROUTE   = "/maintenance";

/* ── Chevron right icon ── */
const ChevronRightIcon: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <polyline
      points="6 3 11 8 6 13"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/* ── Close icon ── */
const CloseIcon: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/* ── Pulsing dot ── */
const PulseDot: React.FC = () => (
  <span
    style={{ position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }}
    aria-hidden="true"
  >
    <span
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: "rgba(0, 220, 100, 0.8)",
        opacity: 0.5,
        animation: "ceka-banner-ping 1.8s cubic-bezier(0,0,0.2,1) infinite",
      }}
    />
    <span
      style={{
        position: "relative",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "rgba(0, 220, 100, 0.9)",
        display: "inline-flex",
      }}
    />
  </span>
);

const MaintenanceBanner: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(SESSION_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      /* sessionStorage unavailable — default show */
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes ceka-banner-ping {
          75%, 100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes ceka-banner-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes ceka-banner-slide-up {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(-100%); opacity: 0; }
        }

        .ceka-banner-root {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 3002; /* matches --z-index-toast-notifications */
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 9px 16px;
          background: rgba(0, 60, 20, 0.72);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border-bottom: 1px solid rgba(0, 200, 80, 0.18);
          box-shadow:
            0 2px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(0, 200, 80, 0.1);
          animation: ceka-banner-slide-down 0.4s cubic-bezier(0.23, 1, 0.32, 1) both;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Inner flex row — constrained width */
        .ceka-banner-inner {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 1;
          max-width: 900px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .ceka-banner-text {
          font-size: 12.5px;
          font-weight: 500;
          color: rgba(200, 255, 220, 0.78);
          line-height: 1.45;
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 540px) {
          .ceka-banner-text {
            white-space: normal;
            overflow: visible;
            text-overflow: unset;
          }
        }

        .ceka-banner-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: rgba(0, 220, 100, 0.88);
          text-decoration: none;
          white-space: nowrap;
          padding: 3px 8px 3px 6px;
          border: 1px solid rgba(0, 200, 80, 0.25);
          border-radius: 100px;
          background: rgba(0, 200, 80, 0.08);
          transition: all 0.18s ease;
          flex-shrink: 0;
        }
        .ceka-banner-link:hover {
          background: rgba(0, 200, 80, 0.16);
          border-color: rgba(0, 200, 80, 0.4);
          color: rgba(0, 240, 110, 1);
        }

        .ceka-banner-ig-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(200, 255, 220, 0.6);
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          transition: color 0.18s ease;
        }
        .ceka-banner-ig-link:hover {
          color: rgba(200, 255, 220, 0.9);
        }

        .ceka-banner-sep {
          width: 1px;
          height: 13px;
          background: rgba(255,255,255,0.1);
          flex-shrink: 0;
        }

        .ceka-banner-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: rgba(255,255,255,0.06);
          color: rgba(200,255,220,0.45);
          flex-shrink: 0;
          margin-left: 4px;
          transition: all 0.18s ease;
          padding: 0;
        }
        .ceka-banner-dismiss:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(200,255,220,0.8);
        }
        .ceka-banner-dismiss:active {
          transform: scale(0.92);
        }
      `}</style>

      <div
        className="ceka-banner-root"
        role="banner"
        aria-label="CEKA service update notification"
      >
        <div className="ceka-banner-inner">
          <PulseDot />

          <span className="ceka-banner-text">
            Some services are temporarily offline — not a cyberattack, updates in progress.
          </span>

          <Link
            to={MAINTENANCE_ROUTE}
            className="ceka-banner-link"
            aria-label="Read full service update"
          >
            What's affected
            <ChevronRightIcon />
          </Link>

          <div className="ceka-banner-sep" aria-hidden="true" />

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ceka-banner-ig-link"
            aria-label="Follow CEKA on Instagram for live updates"
          >
            @civiceducationke
          </a>
        </div>

        <button
          className="ceka-banner-dismiss"
          onClick={dismiss}
          aria-label="Dismiss this notification"
          type="button"
        >
          <CloseIcon />
        </button>
      </div>
    </>
  );
};

export default MaintenanceBanner;
