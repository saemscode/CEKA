/**
 * NasakaAd.tsx
 * CEKA High-Fidelity Promo System — Multi-Ad Extension
 *
 * Placements:
 *   - NasakaFeedBanner / BitcoinDonationFeedBanner / LegislativeTrackerFeedBanner
 *   - NasakaSidebarWidget / BitcoinDonationSidebarWidget / LegislativeTrackerSidebarWidget
 *   - NasakaToolsCard / BitcoinDonationToolsCard / LegislativeTrackerToolsCard
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BitcoinDonationIcon, LegislativeTrackerIcon, ShieldCheckIcon } from '@/components/ui/CustomIcons';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG & PERSISTENCE (existing)
// ─────────────────────────────────────────────────────────────────────────────

const NASAKA_KEY = "nasaka_ad_dismissed_at";
const AD_REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 Minute Reset
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.nasaka.app&hl=en";

const shouldShowAd = (): boolean => {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(NASAKA_KEY);
  if (!stored) return true;
  return Date.now() - parseInt(stored, 10) > AD_REFRESH_INTERVAL_MS;
};

const dismissAd = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem(NASAKA_KEY, Date.now().toString());
};

// ─────────────────────────────────────────────────────────────────────────────
// BRAND ASSETS (existing) — Nasaka logo and decorations, plus generic icons
// ─────────────────────────────────────────────────────────────────────────────

/** Official Nasaka IEBC Logo Component */
const NasakaLogo = ({ size = 48, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 1080 1080"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
  >
    <g transform="translate(0,1080) scale(0.1,-0.1)" fill="white">
      <path d="M5135 9223 c-559 -49 -1092 -260 -1555 -616 -117 -90 -384 -351 -477 -467 -290 -360 -500 -803 -593 -1250 -72 -351 -79 -741 -19 -1089 104 -604 429 -1261 949 -1922 103 -132 1951 -2309 1959 -2308 7 0 1719 2051 1854 2219 560 701 899 1332 1026 1905 50 227 56 288 56 580 0 294 -7 370 -52 595 -254 1267 -1318 2228 -2601 2350 -98 9 -453 11 -547 3z m575 -638 c250 -35 478 -104 692 -208 249 -122 436 -255 633 -452 356 -355 580 -799 657 -1299 31 -204 31 -519 0 -701 -86 -502 -308 -938 -653 -1284 -439 -438 -1025 -681 -1644 -681 -864 0 -1643 471 -2055 1243 -176 330 -261 685 -261 1092 0 476 126 888 394 1290 116 173 289 364 453 497 427 348 970 536 1514 523 85 -2 207 -11 270 -20z" />
      <path d="M5250 7760 c-597 -83 -1055 -488 -1213 -1070 -30 -112 -31 -122 -31 -330 -1 -172 3 -232 17 -300 125 -583 579 -1025 1157 -1125 126 -22 354 -22 485 0 575 96 1033 540 1161 1125 15 67 19 127 19 280 0 209 -10 279 -61 443 l-26 80 -119 -119 -120 -120 16 -88 c69 -397 -86 -810 -399 -1065 -134 -109 -267 -175 -450 -224 -69 -18 -108 -21 -266 -21 -159 0 -196 3 -265 21 -164 45 -307 116 -427 212 -214 170 -351 396 -409 673 -30 148 -23 372 16 503 36 121 74 211 125 292 206 327 541 524 920 540 296 12 569 -85 790 -283 l63 -56 106 107 106 106 -65 60 c-181 166 -432 292 -685 344 -94 19 -352 28 -445 15z" />
      <path d="M6780 7494 c-30 -8 -78 -29 -107 -46 -32 -20 -258 -238 -614 -594 l-563 -564 -196 195 c-170 169 -206 199 -266 227 -66 31 -75 33 -184 33 -105 0 -120 -2 -170 -27 -30 -15 -71 -41 -90 -57 l-35 -30 450 -450 c442 -443 451 -451 490 -451 39 0 49 9 867 827 l827 827 -20 22 c-31 33 -127 80 -187 93 -70 15 -135 13 -202 -5z" />
    </g>
  </svg>
);

/** Nasaka-themed background lattice — sourced from context/icons 7 */
const NasakaBackgroundLattice = ({ className }: { className?: string }) => (
  <div className={cn("absolute inset-0 overflow-hidden opacity-10 pointer-events-none", className)}>
    <svg viewBox="0 0 24 24" fill="none" className="absolute -top-8 -right-8 w-64 h-64 text-blue-500">
      <path d="M15.94 7.62L11.06 9.62C10.725 9.752 10.421 9.952 10.166 10.206C9.912 10.461 9.712 10.765 9.58 11.1L7.58 15.98C7.547 16.064 7.549 16.157 7.584 16.239C7.62 16.322 7.687 16.387 7.77 16.42C7.851 16.45 7.939 16.45 8.02 16.42L12.9 14.42C13.235 14.288 13.539 14.088 13.794 13.834C14.048 13.579 14.248 13.275 14.38 12.94L16.38 8.06C16.413 7.976 16.411 7.883 16.376 7.801C16.34 7.718 16.273 7.653 16.19 7.62C16.109 7.59 16.021 7.59 15.94 7.62ZM12 13C11.802 13 11.609 12.941 11.444 12.832C11.28 12.722 11.152 12.565 11.076 12.383C11 12.2 10.981 11.999 11.019 11.805C11.058 11.611 11.153 11.433 11.293 11.293C11.433 11.153 11.611 11.058 11.805 11.019C11.999 10.981 12.2 11 12.383 11.076C12.565 11.152 12.722 11.28 12.832 11.444C12.941 11.609 13 11.802 13 12C13 12.265 12.895 12.52 12.707 12.707C12.52 12.895 12.265 13 12 13Z" fill="currentColor" />
      <path d="M12 21C10.22 21 8.48 20.472 6.999 19.483C5.52 18.494 4.366 17.089 3.685 15.444C3.004 13.8 2.826 11.99 3.173 10.244C3.52 8.498 4.377 6.895 5.636 5.636C6.895 4.377 8.498 3.52 10.244 3.173C11.99 2.826 13.8 3.004 15.444 3.685C17.089 4.366 18.494 5.52 19.483 6.999C20.472 8.48 21 10.22 21 12C21 14.387 20.052 16.676 18.364 18.364C16.676 20.052 14.387 21 12 21ZM12 4.5C10.517 4.5 9.067 4.94 7.833 5.764C6.6 6.588 5.639 7.759 5.071 9.13C4.503 10.5 4.355 12.008 4.644 13.463C4.934 14.918 5.648 16.254 6.697 17.303C7.746 18.352 9.082 19.067 10.537 19.356C11.992 19.645 13.5 19.497 14.87 18.929C16.241 18.361 17.412 17.4 18.236 16.167C19.06 14.933 19.5 13.483 19.5 12C19.5 10.011 18.71 8.103 17.303 6.697C15.897 5.29 13.989 4.5 12 4.5Z" fill="currentColor" />
    </svg>
    <svg viewBox="0 0 56 56" className="absolute -bottom-6 -left-4 w-36 h-36 text-[#1A6BFF]">
      <path d="M28.012 52.82C28.949 52.82 30.168 49.07 30.168 42.133L30.168 20.57C33.988 19.609 36.8 16.14 36.8 12.015C36.8 7.164 32.886 3.18 28.012 3.18C23.113 3.18 19.199 7.164 19.199 12.015C19.199 16.117 22.012 19.586 25.809 20.57L25.809 42.133C25.809 49.047 27.051 52.82 28.012 52.82Z M25.48 12.508C23.887 12.508 22.48 11.102 22.48 9.461C22.48 7.844 23.887 6.461 25.48 6.461C27.145 6.461 28.48 7.844 28.48 9.461C28.48 11.102 27.145 12.508 25.48 12.508Z" fill="currentColor" />
    </svg>
    <svg viewBox="0 0 24 24" fill="none" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 text-blue-300 rotate-[-15deg]">
      <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M16.219 4.838L19.183 7.805C21.195 9.819 22.201 10.826 21.967 11.912C21.732 12.997 20.4 13.497 17.736 14.498L15.892 15.191C15.179 15.459 14.822 15.593 14.547 15.831C14.426 15.936 14.318 16.054 14.225 16.184C14.013 16.48 13.912 16.847 13.71 17.582C13.249 19.255 13.019 20.091 12.471 20.404C12.24 20.536 11.979 20.605 11.713 20.605C11.083 20.604 10.47 19.99 9.244 18.764L7.778 17.296L6.699 16.216L5.285 14.8C4.067 13.581 3.458 12.972 3.454 12.345C3.452 12.074 3.523 11.807 3.658 11.572C3.971 11.029 4.801 10.8 6.461 10.342C7.198 10.139 7.566 10.038 7.863 9.825C7.995 9.729 8.116 9.618 8.222 9.493C8.459 9.215 8.591 8.856 8.854 8.138L9.522 6.315C10.509 3.622 11.002 2.275 12.09 2.035C13.179 1.795 14.192 2.809 16.219 4.838Z" fill="currentColor" />
      <path d="M3.302 21.776L7.778 17.296L6.699 16.216L2.224 20.697C1.926 20.995 1.926 21.478 2.224 21.776C2.521 22.075 3.004 22.075 3.302 21.776Z" fill="currentColor" />
    </svg>
  </div>
);

const IconX = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M8.46445 15.5354L15.5355 8.46436" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.46446 8.46458L15.5355 15.5356" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconDownload = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M9.163 2.819C9 3.139 9 3.559 9 4.4V11H7.803c-.883 0-1.325 0-1.534.176a.75.75 0 0 0-.266.62c.017.274.322.593.931 1.232l4.198 4.401c.302.318.453.476.63.535a.749.749 0 0 0 .476 0c.177-.059.328-.217.63-.535l4.198-4.4c.61-.64.914-.96.93-1.233a.75.75 0 0 0-.265-.62C17.522 11 17.081 11 16.197 11H15V4.4c0-.84 0-1.26-.164-1.581a1.5 1.5 0 0 0-.655-.656C13.861 2 13.441 2 12.6 2h-1.2c-.84 0-1.26 0-1.581.163a1.5 1.5 0 0 0-.656.656zM5 21a1 1 0 0 0 1 1h12a1 1 0 1 0 0-2H6a1 1 0 0 0-1 1z" fill="currentColor" />
  </svg>
);

const IconHand = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 305.301 305.301" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="currentColor">
      <path d="M122.582,89.702V67.625c-3.082-5.201-4.86-11.262-4.86-17.734c0-19.239,15.652-34.892,34.892-34.892
        c19.24,0,34.893,15.652,34.893,34.892c0,6.288-1.68,12.186-4.602,17.287v13.449c2.673,0.186,5.25,0.727,7.688,1.567
        c7.421-8.712,11.914-19.99,11.914-32.303C202.507,22.381,180.125,0,152.614,0s-49.892,22.381-49.892,49.892
        C102.723,66.135,110.529,80.586,122.582,89.702z"/>
      <path d="M68.248,155.474c0-19.239,15.652-34.892,34.892-34.892c7.193,0,13.883,2.188,19.443,5.933v-16.988
        c-5.978-2.539-12.549-3.945-19.443-3.945c-27.511,0-49.892,22.381-49.892,49.892c0,27.511,22.381,49.892,49.892,49.892
        c1.242,0,2.47-0.061,3.69-0.151L94.379,189.25C79.367,185.354,68.248,171.688,68.248,155.474z"/>
      <path d="M242.769,261.926h-90.64c-5.126,0-9.282,4.156-9.282,9.282v24.81c0,5.126,4.156,9.282,9.282,9.282h90.64
        c5.126,0,9.282-4.156,9.282-9.282v-24.81C252.051,266.082,247.895,261.926,242.769,261.926z"/>
      <path d="M144.34,228.918c7.44,11.082,19.893,17.745,33.191,17.745h29.677c24.135,0,44.131-19.28,44.811-43.582c0,0,0-0.007,0-0.01
        c0.046-1.117,0.032,2.909,0.032-20.832v-47.266c0-8.373-6.788-15.161-15.161-15.161c-5.337,0-10.171,2.815-12.888,7.205v-4.93
        c0-8.304-6.704-15.16-15.194-15.16c-5.214,0.011-10.082,2.727-12.851,7.198c0,0-0.002,0.003-0.003,0.004
        c0,0.001-0.001,0.001-0.001,0.001l0-3.414c0-8.373-6.788-15.161-15.161-15.161c-0.011,0-0.022,0.001-0.033,0.001
        c-5.151,0.011-10.051,2.679-12.85,7.195c-0.001,0.002-0.003,0.004-0.004,0.007c0-9.585,0-35.975,0-45.865
        c0-8.373-6.788-15.161-15.161-15.161c-8.373,0-15.161,6.788-15.161,15.161v114.056v0l-17.001-21.798
        c-4.966-6.363-14.362-7.939-21.279-2.631c-6.608,5.154-7.776,14.684-2.631,21.279c6.207,7.959,42.405,54.371,47.666,61.117
        L144.34,228.918z"/>
    </g>
  </svg>
);

const IconGlobe = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M50 0C22.404 0 0 22.404 0 50s22.404 50 50 50c27.546 0 49.911-22.324 49.992-49.852A1.5 1.5 0 0 0 100 50a1.5 1.5 0 0 0-.006-.133C99.922 22.332 77.552 0 50 0zm0 3c2.776 0 5.49.254 8.133.715c.638 1.396 4.103 1.696.43 1.451c-1.416 2.02-7.019-2.123-10.75.047c-1.119 1.576-8.2 3.272-5.54 5.828c3.787-.687-.417-.067-.304 1.813c-1.936.67-4.686 3.87-4.647.595c-.48-2.398 2.162-4.607-2.115-2.81c-.235 1.306-6.674 3.82-3.453 4.398c3.387-1.7-1.353 2.698 2.59.963c-2.691 1.22-.65 2.551-1.885 5.24c-4.353-2.035-6.359 1.822-7.27 5.52c1.032.097 1.382.636 1.282 1.28c.522.051 1.26.123 1.593.153c2.183-.167 4.193-1.598 5.235-3.683c2.483-1.893 4.515-2.98 7.523-2.838c-1.443-.245-3.368 6.082-.443 3.687c-1.258-5.365 5.58.518 4.082.551c-2.513.372-3.32 1.016-1.156 2.83c1.507 1.147 2.433-4.392 4.275-3.427c-.245-1.055-4.553-4.45-3.916-4.272c.147.041.557.274 1.342.768c3.546 1.116 2.965 5.69 6.185 7.298c2.24 2.913 5.706-1.689 8.155-.293c.084 1.922 2.252 1.727 2.168-.332c2.445 1.872-.26 6.487-3.655 4.641c-3.224 1.858-7.833-4.413-9.785.344c-.87 2.244-3.849-1.737-5.082-1.822c-4.305.477-.172-4.208-3.154-4.71c-3.843-.033-7.797 1.58-11.498 1.34c-2.013.619-3.276 1.445-4.479 2.188c-1.155 1.724-3.425 2.954-5.76 6.254c-.428.66-1.172 1.478-2.058 2.47c-1.212 4.123-2.697 8.25-2.463 12.54c2.643 2.788 3.263 9.522 8.455 8.988c3.43 1.772 6.028-1.288 9.244-.26c.593 3.341 6.865 1.95 5.174 5.295c-1.765 3.996 3.393 5.923 4.236 9.56c2.202 3.636-3.322 7.426 1.114 10.555c2.456 4.07 5.302 10.253 11.18 7.848c4.573-.293 7.37-4.15 10.226-6.781c-.259-4.826 8.459-4.3 6.508-10.436c-1.15-.724.072-3.625-.56-4.652c.654-1.345 2.958-5.176 5.187-7.051c3.417-2.65 4.85-6.796 5.978-10.807c-.698-3.373-2.29-.072-4.318-.215c-5.396 2.001.127-2.32 2.158-3.55c2.866-1.689 5.654-4.57 6.285-7.64c2.656-2.87-6.413-5.658-.715-4.72c3.603-.703 5.451-1.131 6.373 2.319c3.53 1.396 3.249 7.793 5.237 11.277c1.03-1.27.618-.283 1.056 1.244c1.15-3.297-1.273-8.61-.52-12.896A47.197 47.197 0 0 1 97 50c0 25.975-21.025 47-47 47S3 75.975 3 50C3 29.806 15.71 12.61 33.57 5.953c1.734-.496 3.47-.987 5.168-1.588A47.152 47.152 0 0 1 50 3zm10.293 1.143c.499.11 1 .218 1.492.345c-.114.755-.748.287-1.492-.345zM35.168 6.219c-1.148.021-2.457.447-2.117 1.511c.63.232 1.285.06 1.902-.091c2.902-.808 1.691-1.448.215-1.42zm14.113 3.758c1.528-.225.085 4.183-2.281 3.046c-3.878.401.584-.245.725-2.025c.694-.67 1.204-.97 1.556-1.021zm21.49 8.728c.29.035.378.388-.023 1.229c-.327 1.078 4.93 4.569 4.604 6.793c-4.668 1.225-1.75-3.326-4.79-4.252c-3.337-1.105-.66-3.873.21-3.77zm-13.539.873c1.734 2.323 4.44.501 6.967 2.387c3.092 3.12-4.874-.41-6.258 1.389c-4.131 1.271-2.103-2.51-.709-3.776zM16.836 33.754c-.294-.044-.535.16-.748.99c.71.037 1.24.117 1.621.238l.232-.718c-.443-.16-.803-.465-1.105-.51zm58.379.508c.68 2.359 5.965 1.985 4.685 4.195l-.603.426c-1.032-.675-5.325-3.52-4.082-4.621zM62.678 37.29c2.438 1.663 4.185 5.07 5.744 7.74c2.142 1.524 2.21 3.973 3.6 5.899c-.568.72-1.678-.593-1.905-1.06c-1.857-1.299-3.39-4.6-4.703-7.237c-.825-1.828-2.838-3.495-2.736-5.342zm14.586 38.904c-.222-.015-.56.245-1.037.899c-3.443 2.537-6.176 5.556-6.38 9.91c2.385 1.084 4.406-3.285 5.688-4.81c1.469-.711 2.689-5.934 1.729-5.999z" fill="currentColor" />
  </svg>
);

const IconTick = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM16.78 9.7L11.11 15.37C10.97 15.51 10.78 15.59 10.58 15.59C10.38 15.59 10.19 15.51 10.05 15.37L7.22 12.54C6.93 12.25 6.93 11.77 7.22 11.48C7.51 11.19 7.99 11.19 8.28 11.48L10.58 13.78L15.72 8.64C16.01 8.35 16.49 8.35 16.78 8.64Z" fill="currentColor" />
  </svg>
);

const IconArrowLocation = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M5.36328 12.0523C4.01081 11.5711 3.33457 11.3304 3.13309 10.9655C2.95849 10.6492 2.95032 10.2673 3.11124 9.94388C3.29694 9.57063 3.96228 9.30132 5.29295 8.76272L17.8356 3.68594C19.1461 3.15547 19.8014 2.89024 20.2154 3.02623C20.5747 3.14427 20.8565 3.42608 20.9746 3.7854C21.1106 4.19937 20.8453 4.85465 20.3149 6.16521L15.2381 18.7078C14.6995 20.0385 14.4302 20.7039 14.0569 20.8896C13.7335 21.0505 13.3516 21.0423 13.0353 20.8677C12.6704 20.6662 12.4297 19.99 11.9485 18.6375L10.4751 14.4967C10.3815 14.2336 10.3347 14.102 10.2582 13.9922C10.1905 13.8948 10.106 13.8103 10.0086 13.7426C9.89876 13.6661 9.76719 13.6193 9.50407 13.5257L5.36328 12.0523Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconArrowRight = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M14.1427 15.9621L4.49746 20.835C2.19099 18.6331L5.34302 12.7294Z" fill="currentColor" />
    <path opacity="0.5" d="M15.5332 15.3904L21.0066 13.4728L11.458 7.24008L15.5332 15.3904Z" fill="currentColor" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING COMPONENTS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

/** Illustrative App Screenshot Frame */
const MockupFrame = ({ title, type }: { title: string; type: 'map' | 'search' | 'list' }) => (
  <div className="flex-1 min-w-[80px] aspect-[9/16] bg-slate-950 rounded-lg border border-white/10 overflow-hidden flex flex-col relative group">
    <div className="h-1 bg-white/20 w-1/3 mx-auto mt-1 rounded-full" />
    <div className="flex-1 p-1.5 space-y-1.5">
      {type === 'map' && (
        <div className="h-full w-full bg-blue-500/10 rounded flex items-center justify-center relative overflow-hidden">
          <IconGlobe className="w-8 h-8 text-blue-500/20" />
          <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />
        </div>
      )}
      {type === 'search' && (
        <div className="space-y-1.5 pt-2">
          <div className="h-2 w-full bg-white/10 rounded" />
          <div className="h-6 w-full bg-blue-500/10 rounded border border-blue-500/20" />
          <div className="h-2 w-2/3 bg-white/5 rounded" />
        </div>
      )}
      {type === 'list' && (
        <div className="space-y-1.5 pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 w-full bg-white/5 rounded border border-white/5 flex items-center px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
            </div>
          ))}
        </div>
      )}
    </div>
    <div className="absolute inset-x-0 bottom-0 py-1 bg-black/80 backdrop-blur-sm text-[8px] text-center font-bold text-white/40 uppercase tracking-widest">
      {title}
    </div>
  </div>
);

/** PLACEMENT 1: Feed Banner Card */
export const NasakaFeedBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(shouldShowAd());
  }, []);

  const handleDismiss = () => {
    dismissAd();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full overflow-hidden rounded-[32px] border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-slate-950/40 p-6 shadow-ios-high backdrop-blur-3xl"
    >
      {/* Nasaka-themed background decorations */}
      <NasakaBackgroundLattice className="opacity-[0.25]" />

      <div className="relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
        {/* Ad Info */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#1A6BFF]">
              CEKA
            </span>
            <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20" />
            <span className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest z-10">Official Partner</span>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-[#1A6BFF] p-2.5 shadow-lg ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-105">
              <NasakaLogo className="h-full w-full text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Find your <span className="text-[#1A6BFF]">IEBC Office</span> in seconds
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                Fast, simple, and hassle-free access to all 290 constituencies and 47 county offices.
                Works offline, tailored for Kenyan citizens.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 py-2">
            {[
              { icon: IconArrowLocation, label: "290 Offices" },
              { icon: IconGlobe, label: "47 Counties" },
              { icon: IconTick, label: "Free Forever" }
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-3 py-1.5 backdrop-blur-sm">
                <stat.icon className="w-3.5 h-3.5 text-[#1A6BFF]" />
                <span className="text-xs font-black text-slate-600 dark:text-white/70 uppercase tracking-tight">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-2">
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download Nasaka IEBC Office Finder on Google Play Store (opens in new tab)"
              className="group relative flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#1A6BFF]/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
            >
              <IconDownload className="w-4 h-4" aria-hidden="true" />
              Download on Play Store
            </a>
          </div>
        </div>

        {/* Hero Screenshot — single wide image, responsive */}
        <div className="hidden lg:flex shrink-0 w-80 xl:w-96 h-52 xl:h-60 rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10">
          <img
            src="/nasaka-app-hero.png"
            alt="Nasaka IEBC Office Finder app screenshot"
            className="w-full h-full object-cover object-left-top"
            loading="lazy"
          />
        </div>
        {/* Tablet: narrower image below text */}
        <div className="lg:hidden w-full max-w-sm mx-auto h-36 rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/10 sm:block hidden">
          <img
            src="/nasaka-app-hero.png"
            alt="Nasaka IEBC Office Finder app screenshot"
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss Nasaka IEBC advertisement"
        className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
      >
        <IconX className="w-4 h-4 z-20" aria-hidden="true" />
      </button>
    </motion.div>
  );
};

/** PLACEMENT 2: Sidebar Floating Widget */
export const NasakaSidebarWidget: React.FC<{ dwellDelayMs?: number }> = ({ dwellDelayMs = 30000 }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowAd()) return;

    const timer = setTimeout(() => {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 100);
    }, dwellDelayMs);

    return () => clearTimeout(timer);
  }, [dwellDelayMs]);

  const handleDismiss = () => {
    dismissAd();
    setIsVisible(false);
    setTimeout(() => setShouldRender(false), 500);
  };

  if (!shouldRender) return null;

  return (
    <div className={cn(
      "fixed bottom-24 left-8 z-[5000] w-64 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
      isVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
    )}>
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 p-5 shadow-ios-high backdrop-blur-3xl">
        <NasakaBackgroundLattice className="opacity-[0.05]" />

        <button
          onClick={handleDismiss}
          aria-label="Dismiss Nasaka IEBC advertisement"
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-white/30 transition-all border border-slate-200 dark:border-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
        >
          <IconX className="w-3 h-3" aria-hidden="true" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#1A6BFF] shadow-lg ring-1 ring-white/10">
              <NasakaLogo size={24} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#1A6BFF]">Download Today</p>
              <h4 className="font-bold text-slate-900 dark:text-white tracking-tight leading-none">Nasaka IEBC</h4>
            </div>
          </div>

          <p className="text-[11px] font-bold leading-relaxed text-slate-600 dark:text-slate-400">
            Never get lost finding an office. Get all official contact details in one app.
          </p>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Install Nasaka IEBC on Google Play Store (opens in new tab)"
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#1A6BFF] py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#1A6BFF]/90 shadow-lg shadow-blue-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
          >
            <IconHand className="w-5 h-5" aria-hidden="true" />
            Install Nasaka
          </a>
        </div>
      </div>
    </div>
  );
};

/** PLACEMENT 3: Tools Directory Card */
export const NasakaToolsCard: React.FC = () => (
  <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/20 p-5 transition-all hover:border-blue-500/30">
    <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-500" aria-hidden="true" />

    <div className="flex items-center gap-5">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#1A6BFF] p-2 transition-transform group-hover:scale-105" aria-hidden="true">
        <NasakaLogo className="h-full w-full" />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 px-1.5 py-0.5 bg-blue-500/10 rounded">CEKA Tool</span>
        </div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
          Nasaka — IEBC Office Finder
        </h4>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
          Locate and contact voter registration centres across Kenya. Offline support.
        </p>
      </div>

      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get Nasaka IEBC Office Finder on Google Play Store (opens in new tab)"
        className="flex h-10 items-center gap-2 rounded-xl bg-blue-600/10 border border-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-[#1A6BFF] transition-all hover:bg-[#1A6BFF] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
      >
        <IconArrowRight className="w-3 h-3" aria-hidden="true" />
        Get It
      </a>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MULTI‑AD EXTENSION (new code appended below — no pre‑existing code modified)
// ─────────────────────────────────────────────────────────────────────────────

/** ──────── Ad Content Type & Persistence Helpers ──────── */
type AdContent = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  cta: { label: string; url: string };
  brandIcon: React.ComponentType<{ className?: string }>;
  backgroundColor?: string;
  backgroundDecor?: React.ComponentType<{ className?: string }>;
  stats?: { icon: React.ComponentType<{ className?: string }>; label: string }[];
  image?: string;
};

const AD_PREFIX = "ceka_ad_dismissed_";

const shouldShowAdById = (id: string): boolean => {
  if (typeof window === "undefined") return false;
  const key = AD_PREFIX + id;
  const stored = localStorage.getItem(key);
  if (!stored) return true;
  return Date.now() - parseInt(stored, 10) > AD_REFRESH_INTERVAL_MS;
};

const dismissAdById = (id: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(AD_PREFIX + id, Date.now().toString());
};

const trackAdEvent = async (adId: string, eventType: 'impression' | 'click') => {
  if (typeof window === 'undefined') return;
  // Only track real DB ads with UUIDs
  const isDbUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adId);
  if (!isDbUUID) return;

  const sessionKey = 'ceka_session_id';
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem(sessionKey, sessionId);
  }
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    await (supabase as any).from('ad_analytics').insert({
      ad_id: adId,
      event_type: eventType,
      session_id: sessionId
    });
  } catch (e) {
    // Ignore analytics errors silently
  }
};

/** ──────── New Background Decorations ──────── */
const BitcoinBackground = ({ className }: { className?: string }) => (
  <div className={cn("absolute inset-0 overflow-hidden opacity-10 pointer-events-none", className)}>
    <svg viewBox="0 0 529.012 529.013" className="absolute -top-10 -right-10 w-48 h-48 text-orange-500">
      <path fill="currentColor" d="M366.817,252.027c19.285-8.727,34.561-21.824,45.826-39.278c11.268-17.46,16.898-36.64,16.898-57.552 c0-19.284-4.566-36.689-13.703-52.222c-9.137-15.532-20.551-27.962-34.254-37.301c-13.703-9.339-29.234-15.478-46.592-18.421 c-2.826-0.478-5.984-0.906-9.295-1.31V18.36c0-10.141-8.221-18.36-18.361-18.36h-36.719c-10.141,0-18.36,8.219-18.36,18.36v24.48 h-38.293V18.36c0-10.141-8.219-18.36-18.36-18.36h-36.72c-10.141,0-18.36,8.219-18.36,18.36v24.48H77.543v446.393h62.993v21.42 c0,10.141,8.219,18.36,18.36,18.36h36.72c10.141,0,18.36-8.22,18.36-18.36v-21.42h15.514c8.023-0.055,15.587-0.128,22.779-0.208 v21.628c0,10.141,8.219,18.36,18.36,18.36h36.721c10.141,0,18.359-8.22,18.359-18.36V487.14c5.098-0.288,9.303-0.606,12.49-0.949 c23.955-2.638,44.102-9.693,60.441-21.162c16.34-11.47,29.229-26.794,38.672-45.979c9.438-19.187,14.156-38.924,14.156-59.224 c0-25.783-7.307-48.214-21.922-67.296S394.02,259.947,366.817,252.027z M219.442,117.137c42.43,0,68.109,0.508,77.039,1.523 c15.023,1.83,26.34,7.057,33.953,15.68s11.42,19.841,11.42,33.648c0,14.413-4.418,26.034-13.25,34.865 c-8.83,8.832-20.961,14.162-36.389,15.986c-8.525,1.016-30.35,1.523-65.466,1.523h-59.07V117.137H219.442z M345.655,393.473 c-8.428,9.438-19.334,15.38-32.736,17.815c-8.732,1.83-29.332,2.742-61.812,2.742h-83.434V294.659h72.772 c41.004,0,67.651,2.13,79.934,6.396s21.67,11.065,28.164,20.404c6.492,9.339,9.742,20.704,9.742,34.106 C358.292,371.392,354.083,384.029,345.655,393.473z" />
    </svg>
    <svg viewBox="0 0 512 512" className="absolute bottom-0 left-0 w-32 h-32 text-orange-400/50">
      <path fill="currentColor" d="M272.431,6.816C268.072,2.458,262.164,0.008,256,0.002c-0.008,0-0.017-0.002-0.026-0.002 c-6.173,0-12.093,2.453-16.455,6.817c-6.613,6.614-161.955,163.854-161.955,326.783C77.563,431.97,157.598,512,255.975,512 c0.008,0,0.017,0,0.025,0c98.392-0.014,178.437-80.038,178.437-178.399C434.437,170.668,279.046,13.428,272.431,6.816z" />
    </svg>
  </div>
);

const LegislativeBackground = ({ className }: { className?: string }) => (
  <div className={cn("absolute inset-0 overflow-hidden opacity-10 pointer-events-none", className)}>
    <svg viewBox="0 0 56 56" className="absolute -top-6 -right-6 w-36 h-36 text-emerald-600">
      <path fill="currentColor" d="M 15.5547 53.125 L 40.4453 53.125 C 45.2969 53.125 47.7109 50.6640 47.7109 45.7890 L 47.7109 24.5078 C 47.7109 21.4844 47.3828 20.1718 45.5078 18.2500 L 32.5703 5.1015 C 30.7891 3.2734 29.3359 2.8750 26.6875 2.8750 L 15.5547 2.8750 C 10.7266 2.8750 8.2891 5.3594 8.2891 10.2344 L 8.2891 45.7890 C 8.2891 50.6875 10.7266 53.125 15.5547 53.125 Z M 15.7422 49.3515 C 13.3281 49.3515 12.0625 48.0625 12.0625 45.7187 L 12.0625 10.3047 C 12.0625 7.9844 13.3281 6.6484 15.7656 6.6484 L 26.1718 6.6484 L 26.1718 20.2656 C 26.1718 23.2187 27.6718 24.6718 30.5781 24.6718 L 43.9375 24.6718 L 43.9375 45.7187 C 43.9375 48.0625 42.6953 49.3515 40.2578 49.3515 Z M 31.0000 21.1328 C 30.0859 21.1328 29.7109 20.7578 29.7109 19.8203 L 29.7109 7.3750 L 43.2109 21.1328 Z M 36.6250 31.1172 L 18.8359 31.1172 C 17.9922 31.1172 17.3828 31.7500 17.3828 32.5469 C 17.3828 33.3672 17.9922 34.0000 18.8359 34.0000 L 36.6250 34.0000 C 37.4453 34.0000 38.0781 33.3672 38.0781 32.5469 C 38.0781 31.7500 37.4453 31.1172 36.6250 31.1172 Z M 36.6250 39.2969 L 18.8359 39.2969 C 17.9922 39.2969 17.3828 39.9531 17.3828 40.7734 C 17.3828 41.5703 17.9922 42.1797 18.8359 42.1797 L 36.6250 42.1797 C 37.4453 42.1797 38.0781 41.5703 38.0781 40.7734 C 38.0781 39.9531 37.4453 39.2969 36.6250 39.2969 Z" />
    </svg>
    <svg viewBox="0 0 24 24" className="absolute bottom-4 left-4 w-24 h-24 text-emerald-500/70">
      <path fill="currentColor" d="M20 13V17.5C20 20.5577 16 20.5 12 20.5C8 20.5 4 20.5577 4 17.5V13M12 3L12 15M12 3L16 7M12 3L8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

/** ──────── Ad Content Definitions ──────── */
const BITCOIN_AD: AdContent = {
  id: 'bitcoin-donation',
  title: 'Now Supporting Bitcoin Donations',
  subtitle: 'CEKA',
  description: 'Support civic education with Bitcoin, Lightning, or Liquid. Fast, borderless, secure.',
  cta: { label: 'Donate Bitcoin', url: '/donate' },
  brandIcon: BitcoinDonationIcon,
  backgroundColor: '#F7931A',
  backgroundDecor: BitcoinBackground,
  stats: [
    { icon: IconGlobe, label: 'On‑Chain & Lightning' },
    { icon: ShieldCheckIcon, label: 'Secure' },
    { icon: IconTick, label: 'Instant' }
  ],
};

const LEGISLATIVE_AD: AdContent = {
  id: 'legislative-tracker',
  title: 'Legislative Tracker',
  subtitle: 'New Tool',
  description: 'Stay up‑to‑date with the latest Bills and legislative action across Kenya.',
  cta: { label: 'Open Tracker', url: '/legislative-tracker' },
  brandIcon: LegislativeTrackerIcon,
  backgroundColor: '#10B981',
  backgroundDecor: LegislativeBackground,
  stats: [
    { icon: IconArrowLocation, label: 'Live Bills' },
    { icon: IconGlobe, label: 'All Parliaments' },
    { icon: IconTick, label: 'Free' }
  ],
};

/** ──────── Generic Ad Components (re‑use the same structure as Nasaka) ──────── */
const AdFeedBanner: React.FC<{ ad: AdContent }> = ({ ad }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    setIsVisible(shouldShowAdById(ad.id));
  }, [ad.id]);

  const handleDismiss = () => {
    dismissAdById(ad.id);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const BackgroundDecor = ad.backgroundDecor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onViewportEnter={() => {
        if (!tracked) {
          trackAdEvent(ad.id, 'impression');
          setTracked(true);
        }
      }}
      className="relative w-full overflow-hidden rounded-[32px] border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-slate-950/40 p-6 shadow-ios-high backdrop-blur-3xl"
    >
      {BackgroundDecor && <BackgroundDecor className="opacity-[0.25]" />}

      <div className="relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-center gap-2">
            {ad.subtitle?.includes('Sponsored') ? (
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                SPONSORED
              </span>
            ) : (
              <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#1A6BFF]">
                CEKA
              </span>
            )}
            <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20" />
            <span className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest z-10">{ad.subtitle || "CEKA"}</span>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 rounded-2xl shadow-lg ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-105" style={{ backgroundColor: ad.backgroundColor || '#1A6BFF' }}>
              <ad.brandIcon className="h-full w-full text-white p-2.5" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {ad.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                {ad.description}
              </p>
            </div>
          </div>

          {ad.stats && (
            <div className="flex flex-wrap gap-3 py-2">
              {ad.stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-3 py-1.5 backdrop-blur-sm">
                  <span style={{ color: ad.backgroundColor || '#1A6BFF' }}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-black text-slate-600 dark:text-white/70 uppercase tracking-tight">{stat.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <a
              href={ad.cta.url}
              target="_blank"
              rel="noopener"
              onClick={() => trackAdEvent(ad.id, 'click')}
              className="group relative flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{ backgroundColor: ad.backgroundColor || '#1A6BFF', boxShadow: `0 8px 20px ${ad.backgroundColor}30` }}
            >
              <IconDownload className="w-4 h-4" />
              {ad.cta.label}
            </a>
          </div>
        </div>

        {/* Image or fallback brand icon */}
        {ad.image ? (
          <div className="hidden lg:flex shrink-0 w-80 xl:w-96 h-52 xl:h-60 rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10">
            <img src={ad.image} alt={ad.title} className="w-full h-full object-cover object-left-top" loading="lazy" />
          </div>
        ) : (
          <div className="hidden lg:flex shrink-0 w-80 xl:w-96 h-52 xl:h-60 rounded-2xl shadow-xl ring-1 ring-white/10 items-center justify-center" style={{ backgroundColor: ad.backgroundColor + '15' }}>
            <ad.brandIcon className="w-20 h-20 text-white/30" />
          </div>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label={`Dismiss ${ad.title} advertisement`}
        className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white transition-all shadow-sm z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <IconX className="w-4 h-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
};

const AdSidebarWidget: React.FC<{ ad: AdContent; dwellDelayMs?: number }> = ({ ad, dwellDelayMs = 30000 }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowAdById(ad.id)) return;

    const timer = setTimeout(() => {
      setShouldRender(true);
      setTimeout(() => {
        setIsVisible(true);
        trackAdEvent(ad.id, 'impression');
      }, 100);
    }, dwellDelayMs);

    return () => clearTimeout(timer);
  }, [ad.id, dwellDelayMs]);

  const handleDismiss = () => {
    dismissAdById(ad.id);
    setIsVisible(false);
    setTimeout(() => setShouldRender(false), 500);
  };

  if (!shouldRender) return null;

  const BackgroundDecor = ad.backgroundDecor;

  return (
    <div className={cn(
      "fixed bottom-24 left-8 z-[5000] w-64 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
      isVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
    )}>
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 p-5 shadow-ios-high backdrop-blur-3xl">
        {BackgroundDecor && <BackgroundDecor className="opacity-[0.05]" />}

        <button
          onClick={handleDismiss}
          aria-label={`Dismiss ${ad.title} advertisement`}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-white/30 transition-all border border-slate-200 dark:border-white/5 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <IconX className="w-3 h-3" aria-hidden="true" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl shadow-lg ring-1 ring-white/10" style={{ backgroundColor: ad.backgroundColor || '#1A6BFF' }}>
              <ad.brandIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              {ad.subtitle?.includes('Sponsored') ? (
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">SPONSORED PARTNER</p>
              ) : (
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: ad.backgroundColor || '#1A6BFF' }}>{ad.subtitle || "CEKA"}</p>
              )}
              <h4 className="font-bold text-slate-900 dark:text-white tracking-tight leading-none">{ad.title}</h4>
            </div>
          </div>

          <p className="text-[11px] font-bold leading-relaxed text-slate-600 dark:text-slate-400">
            {ad.description}
          </p>

          <a
            href={ad.cta.url}
            target="_blank"
            rel="noopener"
            onClick={() => trackAdEvent(ad.id, 'click')}
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg"
            style={{ backgroundColor: ad.backgroundColor || '#1A6BFF', boxShadow: `0 4px 12px ${ad.backgroundColor}40` }}
          >
            <IconHand className="w-5 h-5" />
            {ad.cta.label}
          </a>
        </div>
      </div>
    </div>
  );
};

const AdToolsCard: React.FC<{ ad: AdContent }> = ({ ad }) => {
  useEffect(() => { trackAdEvent(ad.id, 'impression'); }, [ad.id]);
  return (
  <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/20 p-5 transition-all hover:border-blue-500/30">
    <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: ad.backgroundColor || '#3B82F6' }} />

    <div className="flex items-center gap-5">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl p-2 transition-transform group-hover:scale-105" style={{ backgroundColor: ad.backgroundColor || '#1A6BFF' }}>
        <ad.brandIcon className="h-full w-full text-white" />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: ad.backgroundColor || '#1A6BFF', backgroundColor: `${ad.backgroundColor}20` }}>
            CEKA Tool
          </span>
        </div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
          {ad.title}
        </h4>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
          {ad.description}
        </p>
      </div>

      <a
        href={ad.cta.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${ad.cta.label} (opens in new tab)`}
        onClick={() => trackAdEvent(ad.id, 'click')}
        className="flex h-10 items-center gap-2 rounded-xl border border-white/5 px-4 text-[10px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          backgroundColor: `${ad.backgroundColor}15`,
          color: ad.backgroundColor || '#1A6BFF',
          borderColor: `${ad.backgroundColor}30`
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.backgroundColor = ad.backgroundColor || '#1A6BFF';
          el.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.backgroundColor = `${ad.backgroundColor}15`;
          el.style.color = ad.backgroundColor || '#1A6BFF';
        }}
      >
        <IconArrowRight className="w-3 h-3" aria-hidden="true" />
        Get It
      </a>
    </div>
  </div>
);
}

/** ──────── New Exported Ad Placements ──────── */

// Bitcoin Donation
export const BitcoinDonationFeedBanner: React.FC = () => <AdFeedBanner ad={BITCOIN_AD} />;
export const BitcoinDonationSidebarWidget: React.FC<{ dwellDelayMs?: number }> = (props) => <AdSidebarWidget ad={BITCOIN_AD} {...props} />;
export const BitcoinDonationToolsCard: React.FC = () => <AdToolsCard ad={BITCOIN_AD} />;

// Legislative Tracker
export const LegislativeTrackerFeedBanner: React.FC = () => <AdFeedBanner ad={LEGISLATIVE_AD} />;
export const LegislativeTrackerSidebarWidget: React.FC<{ dwellDelayMs?: number }> = (props) => <AdSidebarWidget ad={LEGISLATIVE_AD} {...props} />;
export const LegislativeTrackerToolsCard: React.FC = () => <AdToolsCard ad={LEGISLATIVE_AD} />;

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE-DRIVEN AD SYSTEM
// Fetches from `public.promo_ads` table. Supports tiers, campaign links, collab.
// ─────────────────────────────────────────────────────────────────────────────

// Table shape (subset of what we read):
// promo_ads { id, title, subtitle, description, cta_label, cta_url, background_color,
//             image_url, logo_url, tier, campaign_id, is_collab, is_active, external }

import { supabase } from '@/integrations/supabase/client';

type DbAd = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  cta_label: string;
  cta_url: string;
  background_color?: string;
  image_url?: string;
  logo_url?: string;
  priority_weight?: number;
  ad_category?: string;
  start_at?: string;
  end_at?: string;
  tier?: 'standard' | 'premium' | 'collab';
  campaign_id?: string;
  campaign?: { title: string; slug?: string };
  is_collab?: boolean;
  external?: boolean;
};

const MAX_SESSION_ADS = 3;
const getSessionAdCount = () => {
  if (typeof window === 'undefined') return 0;
  return parseInt(sessionStorage.getItem('ceka_session_ad_count') || '0', 10);
};

const incrementSessionAdCount = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('ceka_session_ad_count', (getSessionAdCount() + 1).toString());
};

const getShownCategories = (): string[] => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(sessionStorage.getItem('ceka_shown_categories') || '[]');
};

const markCategoryShown = (category?: string) => {
  if (typeof window === 'undefined' || !category) return;
  const shown = getShownCategories();
  if (!shown.includes(category)) {
    shown.push(category);
    sessionStorage.setItem('ceka_shown_categories', JSON.stringify(shown));
  }
};

const getCachedAdForSlot = (slotCategory: string): DbAd | null => {
  if (typeof window === 'undefined') return null;
  const cached = sessionStorage.getItem(`ceka_ad_slot_${slotCategory}`);
  return cached ? JSON.parse(cached) : null;
};

const cacheAdForSlot = (slotCategory: string, ad: DbAd) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`ceka_ad_slot_${slotCategory}`, JSON.stringify(ad));
};

function useDbAds(categoryFilter?: string): { ads: DbAd[]; loading: boolean } {
  const [ads, setAds] = React.useState<DbAd[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const slotKey = categoryFilter || 'general';
    const cachedAd = getCachedAdForSlot(slotKey);
    if (cachedAd && shouldShowAdById(cachedAd.id)) {
      setAds([cachedAd]);
      setLoading(false);
      return;
    }

    if (getSessionAdCount() >= MAX_SESSION_ADS) {
      setLoading(false);
      return;
    }

    const now = new Date().toISOString();

    let q = (supabase as any)
      .from('promo_ads')
      .select('*, campaign:campaigns(title, slug)')
      .eq('is_active', true);

    q.then(({ data, error }: { data: DbAd[] | null; error: any }) => {
      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      const shownCats = getShownCategories();

      // Filter by scheduling, dismissal, and cross-category stacking
      const validAds = data.filter(a => {
        // JS natively handles NULLs properly here. If start_at is null, this evaluates to false, which means it passes the filter.
        if (a.start_at && a.start_at > now) return false;
        if (a.end_at && a.end_at < now) return false;
        if (categoryFilter && a.ad_category && a.ad_category !== categoryFilter) return false;
        // Block if we've already shown an ad from this category during this session, unless we specifically asked for it.
        if (!categoryFilter && a.ad_category && shownCats.includes(a.ad_category)) return false;
        if (!shouldShowAdById(a.id)) return false;
        return true;
      });

      if (validAds.length === 0) {
        setLoading(false);
        return;
      }

      // Weighted Lottery Rotation
      const totalWeight = validAds.reduce((sum, a) => sum + (a.priority_weight || 1), 0);
      let randomVal = Math.random() * totalWeight;
      let selectedAd = validAds[0];
      
      for (const a of validAds) {
        randomVal -= (a.priority_weight || 1);
        if (randomVal <= 0) {
          selectedAd = a;
          break;
        }
      }

      cacheAdForSlot(slotKey, selectedAd);
      markCategoryShown(selectedAd.ad_category);
      incrementSessionAdCount();

      setAds([selectedAd]);
      setLoading(false);
    });
  }, [categoryFilter]);

  return { ads, loading };
}

/** Generic DB ad → AdContent mapper */
function dbAdToContent(ad: DbAd): AdContent {
  const campaignUrl = ad.campaign?.slug
    ? `/campaign/${ad.campaign.slug}`
    : (ad.campaign_id ? `/campaign/${ad.campaign_id}` : ad.cta_url);

  const FallbackIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z" />
    </svg>
  );

  const LogoIcon: React.FC<{ className?: string }> = ({ className }) =>
    ad.logo_url
      ? <img src={ad.logo_url} alt={ad.title} className={className} style={{ objectFit: 'contain' }} />
      : <FallbackIcon className={className} />;

  return {
    id: ad.id,
    title: ad.title,
    subtitle: ad.subtitle || (ad.ad_category === 'partner' ? 'Sponsored Partner' : ad.is_collab ? 'CEKA Collab' : 'CEKA Tool'),
    description: ad.description,
    cta: { label: ad.cta_label, url: ad.campaign_id ? campaignUrl : ad.cta_url },
    brandIcon: LogoIcon,
    backgroundColor: ad.background_color || '#1A6BFF',
    image: ad.image_url,
  };
}

/**
 * DbAdFeedBanner — renders the rotated active DB ad as a feed banner.
 * Falls back to the static Nasaka ad if no DB ads are available.
 */
export const DbAdFeedBanner: React.FC<{ category?: string }> = ({ category }) => {
  const { ads, loading } = useDbAds(category);
  if (loading) return null;
  if (!ads.length) return <NasakaFeedBanner />;
  return <AdFeedBanner ad={dbAdToContent(ads[0])} />;
};

/**
 * DbAdSidebarWidget — delays, then shows the rotated DB ad as a floating sidebar widget.
 */
export const DbAdSidebarWidget: React.FC<{ category?: string; dwellDelayMs?: number }> = ({ category, dwellDelayMs }) => {
  const { ads, loading } = useDbAds(category);
  if (loading) return null;
  if (!ads.length) return <NasakaSidebarWidget dwellDelayMs={dwellDelayMs} />;
  return <AdSidebarWidget ad={dbAdToContent(ads[0])} dwellDelayMs={dwellDelayMs} />;
};

/**
 * DbAdToolsCard — renders the rotated DB ad as a tools card.
 */
export const DbAdToolsCard: React.FC<{ category?: string }> = ({ category }) => {
  const { ads, loading } = useDbAds(category);
  if (loading) return null;
  if (!ads.length) return <NasakaToolsCard />;
  return <AdToolsCard ad={dbAdToContent(ads[0])} />;
};

/**
 * CampaignCollabBanner — specifically renders collab campaign ads (is_collab=true).
 */
export const CampaignCollabBanner: React.FC = () => {
  const [ad, setAd] = React.useState<DbAd | null>(null);

  React.useEffect(() => {
    (supabase as any)
      .from('promo_ads')
      .select('*, campaign:campaigns(title, slug)')
      .eq('is_active', true)
      .eq('is_collab', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }: { data: DbAd | null }) => setAd(data));
  }, []);

  if (!ad) return null;
  return <AdFeedBanner ad={dbAdToContent(ad)} />;
};

export const SmartAdFeedBanner = DbAdFeedBanner;
export const SmartAdSidebarWidget = DbAdSidebarWidget;
export const SmartAdToolsCard = DbAdToolsCard;