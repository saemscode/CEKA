import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/* ─────────────────────────────────────────────────────────────────────────────
   MaintenancePage.tsx
   Route target for: /maintenance
   Redirected from: /resources  |  /legislative-tracker  |  /bill/*
   Purpose: Recovery fundraising + status communication page.
   Design: Deep iOS / glassmorphism / Kenya green midnight — index.css standards.
───────────────────────────────────────────────────────────────────────────── */

const INSTAGRAM_URL = "https://www.instagram.com/civiceducationke";
const SUPPORT_URL   = "https://ko-fi.com/civiceducationke"; // update with live donation URL if changed

/* ── SVG: CEKA circular logo mark (matches nav) ── */
const CekaLogoMark: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="16" cy="16" r="15" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" fill="none" />
    <circle cx="16" cy="16" r="10" stroke="rgba(255,255,255,0.5)" strokeWidth="0.75" fill="none" />
    <circle cx="16" cy="16" r="3.5" fill="rgba(255,255,255,0.95)" />
    <line x1="16" y1="1" x2="16" y2="6"   stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="16" y1="26" x2="16" y2="31"  stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="1"  y1="16" x2="6"  y2="16"  stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="26" y1="16" x2="31" y2="16"  stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/* ── SVG: Instagram icon ── */
const InstagramIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" />
  </svg>
);

/* ── SVG: Heart / support icon ── */
const SupportIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/* ── SVG: Arrow left ── */
const ArrowLeftIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <polyline points="12 19 5 12 12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/* ── SVG: Signal / wifi off indicator ── */
const ServicePartialIcon: React.FC = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="28" cy="28" r="26" stroke="rgba(0,180,80,0.18)" strokeWidth="1.5" fill="none" />
    <circle cx="28" cy="28" r="18" stroke="rgba(0,180,80,0.12)" strokeWidth="1" fill="none" />
    {/* DB stack icon */}
    <ellipse cx="28" cy="20" rx="11" ry="4.5"
      stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
    <line x1="17" y1="20" x2="17" y2="30"
      stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="39" y1="20" x2="39" y2="30"
      stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" />
    <ellipse cx="28" cy="30" rx="11" ry="4.5"
      stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
    {/* Pause indicator over DB */}
    <rect x="24" y="23" width="3" height="8" rx="1.5"
      fill="rgba(0,200,100,0.7)" />
    <rect x="29" y="23" width="3" height="8" rx="1.5"
      fill="rgba(0,200,100,0.7)" />
  </svg>
);

/* ── Animated grid dot canvas background ── */
const GridBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let tick = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      tick += 0.004;

      const spacing = 44;
      const cols = Math.ceil(canvas.width  / spacing) + 1;
      const rows = Math.ceil(canvas.height / spacing) + 1;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * spacing;
          const y = r * spacing;
          /* radial fade from center */
          const dx  = x - canvas.width  / 2;
          const dy  = y - canvas.height / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt((canvas.width / 2) ** 2 + (canvas.height / 2) ** 2);
          const radialAlpha = Math.max(0, 1 - dist / maxDist) * 0.45;
          /* subtle wave ripple */
          const wave = (Math.sin(tick + c * 0.35) * Math.cos(tick + r * 0.35) + 1) / 2;
          const alpha = radialAlpha * (0.25 + wave * 0.15);

          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 200, 80, ${alpha})`;
          ctx.fill();
        }
      }
      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.65,
      }}
      aria-hidden="true"
    />
  );
};

/* ── Ambient radial glow orb ── */
const AmbientGlow: React.FC = () => (
  <div
    aria-hidden="true"
    style={{
      position: "fixed",
      top: "-15vh",
      left: "50%",
      transform: "translateX(-50%)",
      width: "70vw",
      height: "70vw",
      maxWidth: 900,
      maxHeight: 900,
      borderRadius: "50%",
      background:
        "radial-gradient(ellipse at center, rgba(0, 160, 60, 0.13) 0%, rgba(0, 100, 40, 0.07) 40%, transparent 70%)",
      pointerEvents: "none",
      zIndex: 0,
      filter: "blur(2px)",
    }}
  />
);

/* ── Pulsing status dot ── */
const LiveDot: React.FC<{ color?: string }> = ({ color = "#00c850" }) => (
  <span
    style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}
    aria-hidden="true"
  >
    <span
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: color,
        opacity: 0.4,
        animation: "ceka-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite",
      }}
    />
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
      }}
    />
  </span>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const MaintenancePage: React.FC = () => {
  useEffect(() => {
    const prev = document.title;
    document.title = "Service Update — CEKA";
    return () => { document.title = prev; };
  }, []);

  return (
    <>
      {/* ── Keyframe injection ── */}
      <style>{`
        @keyframes ceka-ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes ceka-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes ceka-scale-in {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes ceka-float {
          0%, 100% { transform: translateY(0px);   }
          50%       { transform: translateY(-8px);  }
        }
        @keyframes ceka-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .ceka-maint-root {
          min-height: 100dvh;
          width: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          background: hsl(220 70% 5%);
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Top-bar */
        .ceka-maint-topbar {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          animation: ceka-fade-up 0.55s ease-out 0.1s both;
        }

        .ceka-maint-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          opacity: 0.92;
          transition: opacity 0.2s ease;
        }
        .ceka-maint-logo:hover { opacity: 1; }

        .ceka-maint-logo-wordmark {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.92);
          text-transform: uppercase;
        }

        .ceka-maint-status-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 13px;
          background: rgba(0, 200, 80, 0.09);
          border: 1px solid rgba(0, 200, 80, 0.22);
          border-radius: 100px;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: rgba(0, 220, 100, 0.9);
          text-transform: uppercase;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* Main content centering */
        .ceka-maint-center {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 20px 48px;
        }

        /* Glass card */
        .ceka-maint-card {
          width: 100%;
          max-width: 520px;
          background: rgba(255, 255, 255, 0.045);
          backdrop-filter: blur(48px) saturate(180%);
          -webkit-backdrop-filter: blur(48px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          padding: 48px 40px 40px;
          box-shadow:
            0 40px 80px rgba(0, 0, 0, 0.5),
            0 16px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1);
          animation: ceka-scale-in 0.6s cubic-bezier(0.23, 1, 0.32, 1) 0.2s both;
        }

        @media (max-width: 600px) {
          .ceka-maint-card {
            padding: 36px 24px 32px;
            border-radius: 24px;
          }
        }

        /* Icon area */
        .ceka-maint-icon-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 28px;
          animation: ceka-float 4s ease-in-out infinite;
        }

        /* Heading */
        .ceka-maint-heading {
          font-size: clamp(22px, 4vw, 28px);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.25;
          color: rgba(255, 255, 255, 0.96);
          text-align: center;
          margin: 0 0 14px;
        }

        /* Highlight span shimmer */
        .ceka-maint-heading-em {
          background: linear-gradient(
            90deg,
            rgba(0, 220, 100, 0.9) 0%,
            rgba(0, 255, 130, 1)   40%,
            rgba(0, 220, 100, 0.9) 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: ceka-shimmer 3.5s linear infinite;
        }

        /* Body text */
        .ceka-maint-body {
          font-size: 14.5px;
          line-height: 1.7;
          color: rgba(235, 235, 245, 0.6);
          text-align: center;
          margin: 0 0 10px;
        }

        /* Notice row */
        .ceka-maint-notice {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          background: rgba(0, 200, 80, 0.06);
          border: 1px solid rgba(0, 200, 80, 0.14);
          border-radius: 14px;
          padding: 12px 15px;
          margin: 18px 0 28px;
          font-size: 13px;
          color: rgba(200, 255, 220, 0.75);
          line-height: 1.6;
          text-align: left;
        }

        .ceka-maint-notice-icon {
          flex-shrink: 0;
          margin-top: 1px;
          color: rgba(0, 220, 100, 0.75);
        }

        /* Divider */
        .ceka-maint-divider {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.07) 40%,
            rgba(255,255,255,0.07) 60%,
            transparent
          );
          margin: 0 0 28px;
        }

        /* CTA buttons */
        .ceka-maint-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          padding: 15px 24px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          text-decoration: none;
          transition: all 0.22s cubic-bezier(0.23, 1, 0.32, 1);
          /* Kenya green gradient */
          background: linear-gradient(
            135deg,
            hsl(120 100% 27%) 0%,
            hsl(120 100% 22%) 50%,
            hsl(120 100% 18%) 100%
          );
          color: rgba(255,255,255,0.97);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -2px 4px rgba(0,0,0,0.15),
            0 8px 24px rgba(0, 140, 50, 0.35),
            0 2px 6px rgba(0,0,0,0.2);
        }
        .ceka-maint-btn-primary:hover {
          background: linear-gradient(
            135deg,
            hsl(120 100% 30%) 0%,
            hsl(120 100% 25%) 50%,
            hsl(120 100% 21%) 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.22),
            inset 0 -2px 4px rgba(0,0,0,0.15),
            0 12px 32px rgba(0, 160, 60, 0.45),
            0 4px 10px rgba(0,0,0,0.2);
          transform: translateY(-1px);
        }
        .ceka-maint-btn-primary:active {
          transform: scale(0.97) translateY(0);
          box-shadow:
            inset 0 2px 4px rgba(0,0,0,0.2),
            0 4px 12px rgba(0, 120, 40, 0.25);
        }

        .ceka-maint-btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          padding: 14px 24px;
          margin-top: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: 0.01em;
          text-decoration: none;
          transition: all 0.22s cubic-bezier(0.23, 1, 0.32, 1);
          background: rgba(255,255,255,0.06);
          color: rgba(235, 235, 245, 0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 4px 12px rgba(0,0,0,0.15);
        }
        .ceka-maint-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.16);
          color: rgba(235, 235, 245, 0.92);
          transform: translateY(-1px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.09),
            0 6px 16px rgba(0,0,0,0.2);
        }
        .ceka-maint-btn-secondary:active {
          transform: scale(0.97);
        }

        /* Footer */
        .ceka-maint-footer {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 0 20px 28px;
          animation: ceka-fade-up 0.55s ease-out 0.5s both;
        }

        .ceka-maint-footer-text {
          font-size: 12px;
          color: rgba(235,235,245,0.28);
          line-height: 1.6;
        }

        .ceka-maint-footer-link {
          color: rgba(0, 200, 80, 0.55);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .ceka-maint-footer-link:hover {
          color: rgba(0, 220, 100, 0.85);
        }

        /* Back link */
        .ceka-maint-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          color: rgba(235,235,245,0.4);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .ceka-maint-back:hover {
          color: rgba(235,235,245,0.75);
        }

        /* Partition line in notice row */
        .ceka-maint-dot-sep {
          display: inline-block;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.4;
          vertical-align: middle;
          margin: 0 6px;
        }
      `}</style>

      <div className="ceka-maint-root">
        {/* Ambient layers */}
        <AmbientGlow />
        <GridBackground />

        {/* ── Top bar ── */}
        <header className="ceka-maint-topbar">
          <Link to="/" className="ceka-maint-logo" aria-label="CEKA Home">
            <CekaLogoMark size={28} />
            <span className="ceka-maint-logo-wordmark">CEKA</span>
          </Link>

          <div className="ceka-maint-status-badge" role="status" aria-live="polite">
            <LiveDot />
            <span>Partial Service</span>
          </div>
        </header>

        {/* ── Main card ── */}
        <main className="ceka-maint-center">
          <div className="ceka-maint-card" role="main">

            {/* Icon */}
            <div className="ceka-maint-icon-wrap" aria-hidden="true">
              <ServicePartialIcon />
            </div>

            {/* Heading */}
            <h1 className="ceka-maint-heading">
              We're{" "}
              <span className="ceka-maint-heading-em">temporarily paused</span>
              {" "}on some services.
            </h1>

            {/* Body */}
            <p className="ceka-maint-body">
              Our database layer is undergoing recovery and updates. This is{" "}
              <strong style={{ color: "rgba(235,235,245,0.82)", fontWeight: 600 }}>
                not a cyberattack
              </strong>
              {" "}— the platform remains operational for most services as we continue rolling out improvements.
            </p>

            {/* Notice block */}
            <div className="ceka-maint-notice" role="note" aria-label="What is affected">
              <span className="ceka-maint-notice-icon" aria-hidden="true">
                {/* Info icon */}
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <line x1="10" y1="9" x2="10" y2="14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <circle cx="10" cy="6.5" r="1" fill="currentColor" />
                </svg>
              </span>
              <span>
                <strong style={{ color: "rgba(200,255,220,0.88)", fontWeight: 700 }}>
                  Affected:
                </strong>{" "}
                Legislative Tracker
                <span className="ceka-maint-dot-sep" aria-hidden="true" />
                Resources
                <span className="ceka-maint-dot-sep" aria-hidden="true" />
                Bill Pages
                <br />
                <span style={{ opacity: 0.7 }}>
                  All other sections — forums, quizzes, civic tools — continue to run normally.
                  We're working on a full recovery. Your support makes this possible.
                </span>
              </span>
            </div>

            <div className="ceka-maint-divider" aria-hidden="true" />

            {/* CTA: Instagram for updates */}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ceka-maint-btn-primary"
              aria-label="Follow CEKA on Instagram for live recovery updates"
            >
              <InstagramIcon />
              Follow Updates on Instagram
            </a>

            {/* CTA: Support / donate */}
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ceka-maint-btn-secondary"
              aria-label="Support CEKA's recovery and operational costs"
            >
              <SupportIcon />
              Support the Recovery
            </a>
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="ceka-maint-footer">
          <p className="ceka-maint-footer-text">
            Serving Kenyans since day one — we'll be back at full strength.
            <br />
            Updates via{" "}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ceka-maint-footer-link"
              aria-label="CEKA Instagram stories and highlights"
            >
              @civiceducationke
            </a>
            {" "}stories &amp; highlights.
            <span className="ceka-maint-dot-sep" aria-hidden="true" />
            <Link to="/" className="ceka-maint-footer-link">
              civiceducationkenya.com
            </Link>
          </p>
        </footer>
      </div>
    </>
  );
};

export default MaintenancePage;
