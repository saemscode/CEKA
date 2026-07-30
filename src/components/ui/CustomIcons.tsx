// CustomIcons.tsx (full file with new donation icons appended at the end)
import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const BankIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="32" cy="14" r="3" fill="currentColor" />
    <path d="M4 25h56c1.794 0 3.368-1.194 3.852-2.922.484-1.728-0.242-3.566-1.775-4.497l-28-17C33.438.193 32.719 0 32 0s-1.438.193-2.076.581l-28 17c-1.533.931-2.26 2.77-1.775 4.497C.632 23.806 2.206 25 4 25zM32 9c2.762 0 5 2.238 5 5s-2.238 5-5 5-5-2.238-5-5 2.238-5 5-5z" fill="currentColor" />
    <rect x="34" y="27" width="8" height="25" fill="currentColor" />
    <rect x="46" y="27" width="8" height="25" fill="currentColor" />
    <rect x="22" y="27" width="8" height="25" fill="currentColor" />
    <rect x="10" y="27" width="8" height="25" fill="currentColor" />
    <path d="M4 58h56c0-2.209-1.791-4-4-4H8c-2.209 0-4 1.791-4 4z" fill="currentColor" />
    <path d="M63.445 60H.555C.211 60.591 0 61.268 0 62v2h64v-2c0-.732-.211-1.409-.555-2z" fill="currentColor" />
  </svg>
);

export const ShareIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M9 6C9 7.65685 10.3431 9 12 9C13.6569 9 15 7.65685 15 6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6Z" fill="currentColor" />
    <path d="M2.5 18C2.5 19.6569 3.84315 21 5.5 21C7.15685 21 8.5 19.6569 8.5 18C8.5 16.3431 7.15685 15 5.5 15C3.84315 15 2.5 16.3431 2.5 18Z" fill="currentColor" />
    <path d="M18.5 21C16.8431 21 15.5 19.6569 15.5 18C15.5 16.3431 16.8431 15 18.5 15C20.1569 15 21.5 16.3431 21.5 18C21.5 19.6569 20.1569 21 18.5 21Z" fill="currentColor" />
    <path d="M7.20468 7.56231C7.51523 7.28821 7.54478 6.81426 7.27069 6.5037 6.99659 6.19315 6.52264 6.1636 6.21208 6.43769 4.39676 8.03991 3.25 10.3865 3.25 13C3.25 13.4142 3.58579 13.75 4 13.75 4.41421 13.75 4.75 13.4142 4.75 13 4.75 10.8347 5.69828 8.89187 7.20468 7.56231Z" fill="currentColor" />
    <path d="M17.7879 6.43769C17.4774 6.1636 17.0034 6.19315 16.7293 6.5037 16.4552 6.81426 16.4848 7.28821 16.7953 7.56231C18.3017 8.89187 19.25 10.8347 19.25 13C19.25 13.4142 19.5858 13.75 20 13.75C20.4142 13.75 20.75 13.4142 20.75 13 20.75 10.3865 19.6032 8.03991 17.7879 6.43769Z" fill="currentColor" />
    <path d="M10.1869 20.0217C9.7858 19.9184 9.37692 20.1599 9.27367 20.561C9.17043 20.9622 9.41192 21.3711 9.81306 21.4743C10.5129 21.6544 11.2458 21.75 12 21.75C12.7542 21.75 13.4871 21.6544 14.1869 21.4743C14.5881 21.3711 14.8296 20.9622 14.7263 20.561C14.6231 20.1599 14.2142 19.9184 13.8131 20.0217C13.2344 20.1706 12.627 20.25 12 20.25C11.373 20.25 10.7656 20.1706 10.1869 20.0217Z" fill="currentColor" />
  </svg>
);

export const CommentsIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M60 0H16c-2.211 0-4 1.789-4 4v4h38c3.438 0 6 2.656 6 6v22h4c2.211 0 4-1.789 4-4V4c0-2.211-1.789-4-4-4z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M50 10H4c-2.211 0-4 1.789-4 4v30c0 2.211 1.789 4 4 4h7c.553 0 1 .447 1 1v11c0 1.617.973 3.078 2.469 3.695.496.207 1.015.305 1.531.305 1.039 0 2.062-.406 2.828-1.172l14.156-14.156c0 0 .516-.672 1.672-.672S50 48 50 48c2.211 0 4-1.789 4-4V14c0-2.209-1.791-4-4-4zM13 22h13c.553 0 1 .447 1 1s-.447 1-1 1H13c-.553 0-1-.447-1-1s.447-1 1-1zm21 14H13c-.553 0-1-.447-1-1s.447-1 1-1h21c.553 0 1 .447 1 1s-.447 1-1 1zm7-6H13c-.553 0-1-.447-1-1s.447-1 1-1h28c.553 0 1 .447 1 1s-.447 1-1 1z" fill="currentColor" />
  </svg>
);

export const GlobeIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M256,0C114.615,0,0,114.615,0,256s114.615,256,256,256s256-114.615,256-256S397.385,0,256,0z M256,480 C132.288,480,32,379.712,32,256S132.288,32,256,32s224,100.288,224,224S379.712,480,256,480z M128.5,256 c0,70.415,57.114,127.5,127.5,127.5s127.5-57.085,127.5-127.5S326.415,128.5,256,128.5S128.5,185.585,128.5,256z M256,351.5 c-52.743,0-95.5-42.757-95.5-95.5s42.757-95.5,95.5-95.5s95.5,42.757,95.5,95.5S308.743,351.5,256,351.5z" fill="currentColor" />
  </svg>
);

export const SearchIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M62.242 53.757L51.578 43.093C54.373 38.736 56 33.56 56 28 56 12.536 43.464 0 28 0S0 12.536 0 28s12.536 28 28 28c5.56 0 10.736-1.627 15.093-4.422l10.664 10.664c2.344 2.344 6.142 2.344 8.485 0s2.344-6.141 0-8.485zM28 54C13.641 54 2 42.359 2 28S13.641 2 28 2s26 11.641 26 26-11.641 26-26 26z" fill="currentColor" />
    <path d="M28 4C14.745 4 4 14.745 4 28s10.745 24 24 24 24-10.745 24-24S41.255 4 28 4zm16 25c-.553 0-1-.447-1-1 0-8.284-6.716-15-15-15-.553 0-1-.447-1-1s.447-1 1-1c9.389 0 17 7.611 17 17 0 .553-.447 1-1 1z" fill="currentColor" />
  </svg>
);

export const UsersIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M36.31 176c.674.386 24.255 13.789 43.69 13.789s43.826-13.403 44.524-13.789l9.047 0c14.641.044 26.429 11.859 26.429 26.429l0 101.571c0 17.673-14.327 32-32 32l0 120c0 13.255-10.745 24-24 24l-48 0c-13.255 0-24-10.745-24-24l0-120c-17.673 0-32-14.327-32-32l0-100.738c0-15.028 12.16-27.216 27.262-27.262l9.048 0zm176 0c.674.386 24.256 13.789 43.69 13.789s43.826-13.403 44.524-13.789l9.047 0c14.641.044 26.429 11.859 26.429 26.429l0 101.571c0 17.673-14.327 32-32 32l0 120c0 13.255-10.745 24-24 24l-48 0c-13.255 0-24-10.745-24-24l0-120c-17.673 0-32-14.327-32-32l0-100.738c0-15.028 12.16-27.216 27.262-27.262l9.048 0zm243.69 304l-48 0c-13.255 0-24-10.745-24-24l0-120c-17.673 0-32-14.327-32-32l0-100.738c0-15.056 12.206-27.262 27.262-27.262l9.048 0c0 0 23.978 13.789 43.69 13.789 19.712 0 44.524-13.789 44.524-13.789l9.047 0c14.597 0 26.429 11.832 26.429 26.429l0 101.571c0 17.673-14.327 32-32 32l0 120c0 13.222-10.691 23.946-24 24zm-376-320c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64 64 28.654 64 64 64zm176 0c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64 64 28.654 64 64 64zm240-64c0 35.346-28.654 64-64 64s-64-28.654-64-64 28.654-64 64-64 64 28.654 64 64z" fill="currentColor" />
  </svg>
);

export const ChartIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M21 21H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 7L13 12L10 9L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ThumbIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="7" cy="57" r="1" fill="currentColor" />
    <path d="M14 26c0-2.212-1.789-4-4-4H4c-2.211 0-4 1.788-4 4v34c0 2.21 1.789 4 4 4h6c2.211 0 4-1.79 4-4V26zM7 60c-1.657 0-3-1.344-3-3s1.343-3 3-3 3 1.342 3 3c0 1.656-1.343 3-3 3z" fill="currentColor" />
    <path d="M64 28c0-3.314-2.687-6-6-6H41l0 0h-.016H41l2-18c.209-2.188-1.287-4-3.498-4h-4.001C33 0 31.959 1.75 31 4l-8 18c-2.155 5.169-5 6-7 6v30.218c1.203.285 2.714.945 4.21 2.479C23.324 63.894 27.043 64 29 64h23c3.313 0 6-2.688 6-6 0-1.731-.737-3.288-1.91-4.383 1.281-.848 2.91-3.04 2.91-5.617 0-1.731-.737-3.288-1.91-4.383 1.281-.848 2.91-3.04 2.91-5.617 0-1.731-.737-3.288-1.91-4.383 1.281-.848 2.91-3.04 2.91-5.617z" fill="currentColor" />
  </svg>
);

export const KenyaIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M410.7 119.7v182.1l27.4 25.9-105.9 154.6-73.9-41.8-5.4-39.7L74.66 296.4l36.64-29L62.47 253l50.33-78.4-.8-61.8-47.25-60.96 38.15-19.05 99-3.05S307.1 83.8 310.1 83.09c3.1-.81 91.5-36.58 91.5-36.58l47.9 23.61z" fill="currentColor" />
  </svg>
);

export const KeyIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M7 11a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-2a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="currentColor" />
    <path d="M21 2h-6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v2h-1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v2a1 1 0 0 0-1 1v2h-2.14a7 7 0 1 0-1.72 2H21a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" fill="currentColor" />
  </svg>
);

export const LocationIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
  </svg>
);

export const CommandIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M16 8.00002L19 8.00049C20.6569 8.00075 22.0002 6.65781 22.0005 5.00096C22.0007 3.34411 20.6578 2.00075 19.0009 2.00049C17.3441 2.00023 16.0007 3.34316 16.0005 5.00002L16 8.00002L8.00047 8L8 5.00002C7.99974 3.34316 6.65638 2.00023 4.99953 2.00049C3.34267 2.00075 1.99974 3.34411 2 5.00096C2.00026 6.65781 3.34362 8.00075 5.00047 8.00049L8.00047 8L8 16H16V8.00002Z" fill="currentColor" />
    <path d="M16 16L19 16.0005C20.6569 16.0002 22.0002 17.3432 22.0005 19C22.0007 20.6569 20.6578 22.0002 19.0009 22.0005C17.3441 22.0007 16.0007 20.6578 16.0005 19.001L16 16Z" fill="currentColor" />
    <path d="M5.00047 16.0005L8.00047 16.001L8 19.001C7.99974 20.6578 6.65638 22.0007 4.99953 22.0005C3.34267 22.0002 1.99974 20.6569 2 19C2.00026 17.3432 3.34362 16.0002 5.00047 16.0005Z" fill="currentColor" />
  </svg>
);

export const WidgetIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M13 3h7b1 0 0 1 1 1v7b1 0 0 1-1 1h-7b1 0 0 1-1-1V4b1 0 0 1 1-1zm-9 0h3b1 0 0 1 1 1v3b1 0 0 1-1 1H4b1 0 0 1-1-1V4b1 0 0 1 1-1zm0 9h3b1 0 0 1 1 1v7b1 0 0 1-1 1H4b1 0 0 1-1-1v-7b1 0 0 1 1-1zm9 9h7b1 0 0 1 1-1v-3b1 0 0 1-1-1h-3b1 0 0 1-1 1v3b1 0 0 1 0 1z" fill="currentColor" />
  </svg>
);

export const ScanIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M14 2.75c1.907 0 3.262.002 4.289.14.906.135 1.486.389 1.909.812.423.423.677 1.003.812 2.009.138 1.027.14 2.382.14 4.289 0 .414.336.75.75.75s.75-.336.75-.75v-.056c0-1.838 0-3.294-.153-4.433-.158-1.172-.49-2.121-1.238-2.87-.749-.748-1.698-1.08-2.871-1.237C17.35 1.25 15.894 1.25 14.056 1.25H14c-.414 0-.75.336-.75.75s.336.75.75.75zM9.944 1.25H10c.414 0 .75.336.75.75s-.336.75-.75.75c-1.907 0-3.262.002-4.289.14-.906.135-1.486.389-1.909.812-.423.423-.677 1.003-.812 2.009C2.852 6.739 2.85 8.093 2.85 10c0 .414-.336.75-.75.75s-.75-.336-.75-.75V9.944c0-1.838 0-3.294.153-4.433.158-1.172.49-2.121 1.238-2.87.749-.748 1.698-1.08 2.871-1.237C7.309 1.25 8.764 1.25 10.603 1.25H9.944z" fill="currentColor" />
    <rect x="5" y="5" width="6" height="6" rx="1" fill="currentColor" />
    <rect x="5" y="13" width="6" height="6" rx="1" fill="currentColor" />
    <rect x="13" y="5" width="6" height="6" rx="1" fill="currentColor" />
    <rect x="13" y="13" width="6" height="6" rx="1" fill="currentColor" />
  </svg>
);

export const PathIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M19 8.369V9.8c0 2.451 0 3.677-.82 4.439C17.36 15 16.04 15 13.4 15H12.75V18c0 .048-.005.095-.013.14.508.201.913.604 1.118 1.11h.145H21.25c.414 0 .75.336.75.75s-.336.75-.75.75H14h-.145c-.297.733-1.016 1.25-1.855 1.25-.839 0-1.558-.517-1.855-1.25H10H2.75c-.414 0-.75-.336-.75-.75s.336-.75.75-.75H10h.145c.205-.506.61-.909 1.118-1.11-.008-.045-.013-.092-.013-.14V15H10.6c-2.64 0-3.96 0-4.78-.761C5 13.477 5 12.251 5 9.8V5.217c0-.573 0-.86.049-1.099.213-1.052 1.099-1.875 2.232-2.073C7.538 2 7.847 2 8.465 2c.27 0 .405 0 .535.011.56.049 1.092.254 1.526.588.1.077.196.166.387.344l.385.358c.571.53.857.795 1.199.972.188.097.387.174.594.228.376.1.78.1 1.587.1h.262c1.842 0 2.764 0 3.362.5 1.282 1.1 1.282 2.642 1.282 4.269z" fill="currentColor" />
  </svg>
);

export const BuildingsIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M21.25 8.5c0-1.404 0-2.107-.337-2.611a2 2 0 0 0-.552-.552C19.851 5.042 19.258 5.005 18.177 5.001c.004.291.004.596.004.91v.089V7.25H19.25c.414 0 .75.336.75.75s-.336.75-.75.75h-1v1.5h1c.414 0 .75.336.75.75s-.336.75-.75.75h-1v1.5h1c.414 0 .75.336.75.75s-.336.75-.75.75h-1V21.25h-1.5V6c0-1.886 0-2.828-.586-3.414S14.636 2 12.75 2h-2c-1.886 0-2.828 0-3.414.586S6.75 4.114 6.75 6v15.25h-1.5V14.75h-1c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h1v-1.5h-1c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h1V8.75h-1c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h1V6l0-.089c0-.314 0-.619.004-.91-1.081.004-1.674.041-2.115.336a2 2 0 0 0-.552.552C2.25 6.393 2.25 7.096 2.25 8.5V21.25h-.5a.75.75 0 0 0 0 1.5h20a.75.75 0 0 0 0-1.5h-.5V8.5zM9 11.75c0-.414.336-.75.75-.75h4c.414 0 .75.336.75.75s-.336.75-.75.75h-4a.75.75 0 0 0-.75-.75zm0 3c0-.414.336-.75.75-.75h4c.414 0 .75.336.75.75s-.336.75-.75.75h-4a.75.75 0 0 0-.75-.75zm2.75 3.5c.414 0 .75.336.75.75v2.25h-1.5V19c0-.414.336-.75.75-.75zM9 6.25c0-.414.336-.75.75-.75h4c.414 0 .75.336.75.75s-.336.75-.75.75h-4a.75.75 0 0 0-.75-.75zm0 3c0-.414.336-.75.75-.75h4c.414 0 .75.336.75.75s-.336.75-.75.75h-4a.75.75 0 0 0-.75-.75z" fill="currentColor" />
  </svg>
);

export const StarIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" fill="currentColor" />
  </svg>
);

export const CloseIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ScalesIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="58 67 380 380" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <g fill="currentColor">
      <rect x="243.03" y="157.629" width="10.938" height="202.92" />
      <path d="M268.273,386.501c0-46.279-19.353-45.438-19.353-45.438s-19.353-0.842-19.353,45.438
		c0,0,5.049,17.67-78.253,17.67v8.414h195.211v-8.414C263.226,404.171,268.273,386.501,268.273,386.501z"/>
      <path d="M248.5,123.134c-4.628,0-10.813,9.808-10.813,31.73s22.467,21.922,22.467,0
		C260.154,132.941,253.128,123.134,248.5,123.134z"/>
    </g>
    <g fill="currentColor" className="opacity-50">
      <path d="M369.95,191.075c-1.718-0.696-3.685,0.13-4.385,1.853l-45.437,111.909
		c-0.7,1.723,0.129,3.686,1.852,4.385c0.415,0.169,0.843,0.248,1.266,0.248c1.328,0,2.588-0.793,3.119-2.1l45.437-111.91
		C372.502,193.737,371.673,191.774,369.95,191.075z"/>
      <path d="M431.964,304.837l-45.437-111.909c-0.7-1.723-2.667-2.549-4.385-1.853
		c-1.723,0.699-2.552,2.662-1.853,4.385l45.438,111.91c0.53,1.307,1.79,2.1,3.119,2.1c0.422,0,0.851-0.079,1.266-0.248
		C431.834,308.522,432.663,306.559,431.964,304.837z"/>
    </g>
    <path fill="currentColor" className="opacity-90" d="M319.32,304c0,0,0.842,39.967,57.218,39.967c56.375,0,56.375-39.967,56.375-39.967H319.32z" />
    <path fill="currentColor" d="M386.405,170.553c-0.007,0.033-0.02,0.066-0.027,0.101c-1.458-2.901-4.231-5.341-7.836-6.499
	c-6.525-2.098-13.288,0.783-15.104,6.432c-1.816,5.651,2.002,11.932,8.528,14.028c0.158,0.051,0.316,0.086,0.474,0.131
	c-3.192,0.753-6.618,0.694-9.967-0.383c-4.94-1.588-13.398-11.229-31.094-16.917c-14.019-4.506-45.149-5.23-85.212-18.106
	l-4.249,13.218c32.111,10.32,64.651,10.515,78.967,14.627c26.484,7.608,32.891,14.99,39.777,20.148
	c6.885,5.159,23.311,3.092,27.221-9.075C389.844,182.152,389.135,175.831,386.405,170.553z"/>
    <g fill="currentColor" className="opacity-50">
      <path d="M176.031,224.837l-45.437-111.909c-0.7-1.723-2.667-2.549-4.385-1.853
		c-1.723,0.699-2.552,2.662-1.853,4.385l45.438,111.91c0.531,1.307,1.79,2.1,3.119,2.1c0.422,0,0.851-0.079,1.266-0.248
		C175.901,228.522,176.73,226.559,176.031,224.837z"/>
      <path d="M114.018,111.075c-1.718-0.696-3.685,0.13-4.385,1.853L64.196,224.837
		c-0.7,1.723,0.129,3.686,1.852,4.385c0.415,0.169,0.843,0.248,1.266,0.248c1.328,0,2.588-0.793,3.119-2.1l45.437-111.91
		C116.569,113.737,115.74,111.774,114.018,111.075z"/>
    </g>
    <path fill="currentColor" className="opacity-90" d="M63.247,224c0,0,0,39.967,56.375,39.967c56.376,0,57.217-39.967,57.217-39.967H63.247z" />
    <path fill="currentColor" d="M166.358,114.409c-17.696-5.688-30.187-2.778-35.127-4.366c-3.35-1.076-6.168-3.024-8.324-5.496
	c0.155,0.055,0.303,0.119,0.461,0.17c6.524,2.097,13.288-0.782,15.104-6.434c1.816-5.648-2.003-11.93-8.528-14.026
	c-3.605-1.159-7.281-0.793-10.156,0.717c0.014-0.033,0.022-0.067,0.037-0.099c-5.294,2.7-9.554,7.424-11.516,13.529
	c-3.91,12.166,8.236,23.416,16.838,23.234c8.602-0.18,18.109-2.447,44.067,6.8c14.03,4.997,40.591,23.797,72.703,34.118
	l4.249-13.218C206.101,136.462,180.377,118.915,166.358,114.409z"/>
  </svg>
);

export const NasakaSVGIcon = ({ size = 24, className, ...props }: IconProps) => (

  <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
    width="1080.000000pt" height="1080.000000pt" viewBox="0 0 1080.000000 1080.000000"
    preserveAspectRatio="xMidYMid meet">

    <g transform="translate(0.000000,1080.000000) scale(0.100000,-0.100000)"
      fill="currentColor" stroke="none">
      <path d="M5135 9223 c-559 -49 -1092 -260 -1555 -616 -117 -90 -384 -351 -477
        -467 -290 -360 -500 -803 -593 -1250 -72 -351 -79 -741 -19 -1089 104 -604
        429 -1261 949 -1922 103 -132 1951 -2309 1959 -2308 7 0 1719 2051 1854 2219
        560 701 899 1332 1026 1905 50 227 56 288 56 580 0 294 -7 370 -52 595 -254
        1267 -1318 2228 -2601 2350 -98 9 -453 11 -547 3z m575 -638 c250 -35 478
        -104 692 -208 249 -122 436 -255 633 -452 356 -355 580 -799 657 -1299 31
        -204 31 -519 0 -701 -86 -502 -308 -938 -653 -1284 -439 -438 -1025 -681
        -1644 -681 -864 0 -1643 471 -2055 1243 -176 330 -261 685 -261 1092 0 476
        126 888 394 1290 116 173 289 364 453 497 427 348 970 536 1514 523 85 -2 207
        -11 270 -20z"/>
      <path d="M5250 7760 c-597 -83 -1055 -488 -1213 -1070 -30 -112 -31 -122 -31
        -330 -1 -172 3 -232 17 -300 125 -583 579 -1025 1157 -1125 126 -22 354 -22
        485 0 575 96 1033 540 1161 1125 15 67 19 127 19 280 0 209 -10 279 -61 443
        l-26 80 -119 -119 -120 -120 16 -88 c69 -397 -86 -810 -399 -1065 -134 -109
        -267 -175 -450 -224 -69 -18 -108 -21 -266 -21 -159 0 -196 3 -265 21 -164 45
        -307 116 -427 212 -214 170 -351 396 -409 673 -30 148 -23 372 16 503 36 121
        74 211 125 292 206 327 541 524 920 540 296 12 569 -85 790 -283 l63 -56 106
        107 106 106 -65 60 c-181 166 -432 292 -685 344 -94 19 -352 28 -445 15z"/>
      <path d="M6780 7494 c-30 -8 -78 -29 -107 -46 -32 -20 -258 -238 -614 -594
        l-563 -564 -196 195 c-170 169 -206 199 -266 227 -66 31 -75 33 -184 33 -105
        0 -120 -2 -170 -27 -30 -15 -71 -41 -90 -57 l-35 -30 450 -450 c442 -443 451
        -451 490 -451 39 0 49 9 867 827 l827 827 -20 22 c-31 33 -127 80 -187 93 -70
        15 -135 13 -202 -5z"/>
    </g>
  </svg>

);


export const ArrowLeftIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const EyeIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShieldCheckIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const SparklesIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
    <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
  </svg>
);

export const AlertIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const CalendarIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const FileTextIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const ExternalLinkIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export const ClockIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const NewspaperIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" />
    <path d="M15 18h-5" />
    <path d="M10 6h8v4h-8V6Z" />
  </svg>
);

export const TrendingUpIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const TargetIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

// ── Context Icons 2 (SVG Repo sourced) ──────────────────────────────────────

export const DetailsIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M3 9C2.44772 9 2 9.44772 2 10C2 10.5523 2.44772 11 3 11H21C21.5523 11 22 10.5523 22 10C22 9.44772 21.5523 9 21 9H3Z" fill="currentColor" />
    <path d="M3 13C2.44772 13 2 13.4477 2 14C2 14.5523 2.44772 15 3 15H15C15.5523 15 16 14.5523 16 14C16 13.4477 15.5523 13 15 13H3Z" fill="currentColor" />
  </svg>
);

export const LibraryIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path opacity="0.5" d="M19.5617 7C19.7904 5.69523 18.7863 4.5 17.4617 4.5H6.53788C5.21323 4.5 4.20922 5.69523 4.43784 7M17.4999 4.5C17.5283 4.24092 17.5425 4.11135 17.5427 4.00435C17.545 2.98072 16.7739 2.12064 15.7561 2.01142C15.6497 2 15.5194 2 15.2588 2H8.74099C8.48035 2 8.35002 2 8.24362 2.01142C7.22584 2.12064 6.45481 2.98072 6.45704 4.00434C6.45727 4.11135 6.47146 4.2409 6.49983 4.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M15 18H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2.38351 13.793C1.93748 10.6294 1.71447 9.04765 2.66232 8.02383C3.61017 7 5.29758 7 8.67239 7H15.3276C18.7024 7 20.3898 7 21.3377 8.02383C22.2855 9.04765 22.0625 10.6294 21.6165 13.793L21.1935 16.793C20.8437 19.2739 20.6689 20.5143 19.7717 21.2572C18.8745 22 17.5512 22 14.9046 22H9.09536C6.44881 22 5.12553 22 4.22834 21.2572C3.33115 20.5143 3.15626 19.2739 2.80648 16.793L2.38351 13.793Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const PenNewSquareIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M21.1938 2.80624C22.2687 3.88124 22.2687 5.62415 21.1938 6.69914L20.6982 7.19469C20.5539 7.16345 20.3722 7.11589 20.1651 7.04404C19.6108 6.85172 18.8823 6.48827 18.197 5.803C17.5117 5.11774 17.1483 4.38923 16.956 3.8349C16.8841 3.62781 16.8366 3.44609 16.8053 3.30179L17.3009 2.80624C18.3759 1.73125 20.1188 1.73125 21.1938 2.80624Z" fill="currentColor" />
    <path d="M14.5801 13.3128C14.1761 13.7168 13.9741 13.9188 13.7513 14.0926C13.4886 14.2975 13.2043 14.4732 12.9035 14.6166C12.6485 14.7381 12.3775 14.8284 11.8354 15.0091L8.97709 15.9619C8.71035 16.0508 8.41626 15.9814 8.21744 15.7826C8.01862 15.5837 7.9492 15.2897 8.03811 15.0229L8.99089 12.1646C9.17157 11.6225 9.26191 11.3515 9.38344 11.0965C9.52679 10.7957 9.70249 10.5114 9.90743 10.2487C10.0812 10.0259 10.2832 9.82394 10.6872 9.41993L15.6033 4.50385C15.867 5.19804 16.3293 6.05663 17.1363 6.86366C17.9434 7.67069 18.802 8.13296 19.4962 8.39674L14.5801 13.3128Z" fill="currentColor" />
    <path d="M20.5355 20.5355C22 19.0711 22 16.714 22 12C22 10.4517 22 9.15774 21.9481 8.0661L15.586 14.4283C15.2347 14.7797 14.9708 15.0437 14.6738 15.2753C14.3252 15.5473 13.948 15.7804 13.5488 15.9706C13.2088 16.1327 12.8546 16.2506 12.3833 16.4076L9.45143 17.3849C8.64568 17.6535 7.75734 17.4438 7.15678 16.8432C6.55621 16.2427 6.34651 15.3543 6.61509 14.5486L7.59235 11.6167C7.74936 11.1454 7.86732 10.7912 8.02935 10.4512C8.21958 10.052 8.45272 9.6748 8.72466 9.32615C8.9563 9.02918 9.22032 8.76528 9.57173 8.41404L15.9339 2.05188C14.8423 2 13.5483 2 12 2C7.28595 2 4.92893 2 3.46447 3.46447C2 4.92893 2 7.28595 2 12C2 16.714 2 19.0711 3.46447 20.5355C4.92893 22 7.28595 22 12 22C16.714 22 19.0711 22 20.5355 20.5355Z" fill="currentColor" />
  </svg>
);

export const AddRowIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M3 14V15C3 16.1046 3.89543 17 5 17L19 17C20.1046 17 21 16.1046 21 15L21 13C21 11.8954 20.1046 11 19 11H13M10 8H7M7 8H4M7 8V5M7 8V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RemoveRowIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M7 12L17 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MailOpenAltIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M4 19L9 14M20 19L15 14M3.02832 10L10.2246 14.8166C10.8661 15.2443 11.1869 15.4581 11.5336 15.5412C11.8399 15.6146 12.1593 15.6146 12.4657 15.5412C12.8124 15.4581 13.1332 15.2443 13.7747 14.8166L20.971 10M10.2981 4.06879L4.49814 7.71127C3.95121 8.05474 3.67775 8.22648 3.4794 8.45864C3.30385 8.66412 3.17176 8.90305 3.09111 9.161C3 9.45244 3 9.77535 3 10.4212V16.8C3 17.9201 3 18.4802 3.21799 18.908C3.40973 19.2843 3.71569 19.5903 4.09202 19.782C4.51984 20 5.0799 20 6.2 20H17.8C18.9201 20 19.4802 20 19.908 19.782C20.2843 19.5903 20.5903 19.2843 20.782 18.908C21 18.4802 21 17.9201 21 16.8V10.4212C21 9.77535 21 9.45244 20.9089 9.161C20.8282 8.90305 20.6962 8.66412 20.5206 8.45864C20.3223 8.22648 20.0488 8.05474 19.5019 7.71127L13.7019 4.06879C13.0846 3.68116 12.776 3.48735 12.4449 3.4118C12.152 3.34499 11.848 3.34499 11.5551 3.4118C11.224 3.48735 10.9154 3.68116 10.2981 4.06879Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Send2Icon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M16.1391 2.95907L7.10914 5.95907C1.03914 7.98907 1.03914 11.2991 7.10914 13.3191L9.78914 14.2091L10.6791 16.8891C12.6991 22.9591 16.0191 22.9591 18.0391 16.8891L21.0491 7.86907C22.3891 3.81907 20.1891 1.60907 16.1391 2.95907ZM16.4591 8.33907L12.6591 12.1591C12.5091 12.3091 12.3191 12.3791 12.1291 12.3791C11.9391 12.3791 11.7491 12.3091 11.5991 12.1591C11.3091 11.8691 11.3091 11.3891 11.5991 11.0991L15.3991 7.27907C15.6891 6.98907 16.1691 6.98907 16.4591 7.27907C16.7491 7.56907 16.7491 8.04907 16.4591 8.33907Z" fill="currentColor" />
  </svg>
);

export const Share2Icon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M20 13V17.5C20 20.5577 16 20.5 12 20.5C8 20.5 4 20.5577 4 17.5V13M12 3L12 15M12 3L16 7M12 3L8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SaveAddIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path opacity="0.4" d="M16 8.98987V20.3499C16 21.7999 14.96 22.4099 13.69 21.7099L9.76001 19.5199C9.34001 19.2899 8.65999 19.2899 8.23999 19.5199L4.31 21.7099C3.04 22.4099 2 21.7999 2 20.3499V8.98987C2 7.27987 3.39999 5.87988 5.10999 5.87988H12.89C14.6 5.87988 16 7.27987 16 8.98987Z" fill="currentColor" />
    <path d="M22 5.10999V16.47C22 17.92 20.96 18.53 19.69 17.83L16 15.77V8.98999C16 7.27999 14.6 5.88 12.89 5.88H8V5.10999C8 3.39999 9.39999 2 11.11 2H18.89C20.6 2 22 3.39999 22 5.10999Z" fill="currentColor" />
    <path d="M11 11.25H9.75V10C9.75 9.59 9.41 9.25 9 9.25C8.59 9.25 8.25 9.59 8.25 10V11.25H7C6.59 11.25 6.25 11.59 6.25 12C6.25 12.41 6.59 12.75 7 12.75H8.25V14C8.25 14.41 8.59 14.75 9 14.75C9.41 14.75 9.75 14.41 9.75 14V12.75H11C11.41 12.75 11.75 12.41 11.75 12C11.75 11.59 11.41 11.25 11 11.25Z" fill="currentColor" />
  </svg>
);

export const TwitterColorIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 -4 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g transform="translate(-300.000000, -164.000000)" fill="#00AAEC">
        <path d="M348,168.735283 C346.236309,169.538462 344.337383,170.081618 342.345483,170.324305 C344.379644,169.076201 345.940482,167.097147 346.675823,164.739617 C344.771263,165.895269 342.666667,166.736006 340.418384,167.18671 C338.626519,165.224991 336.065504,164 333.231203,164 C327.796443,164 323.387216,168.521488 323.387216,174.097508 C323.387216,174.88913 323.471738,175.657638 323.640782,176.397255 C315.456242,175.975442 308.201444,171.959552 303.341433,165.843265 C302.493397,167.339834 302.008804,169.076201 302.008804,170.925244 C302.008804,174.426869 303.747139,177.518238 306.389857,179.329722 C304.778306,179.280607 303.256911,178.821235 301.9271,178.070061 L301.9271,178.194294 C301.9271,183.08848 305.322064,187.17082 309.8299,188.095341 C309.004402,188.33225 308.133826,188.450704 307.235077,188.450704 C306.601162,188.450704 305.981335,188.390033 305.381229,188.271578 C306.634971,192.28169 310.269414,195.2026 314.580032,195.280607 C311.210424,197.99061 306.961789,199.605634 302.349709,199.605634 C301.555203,199.605634 300.769149,199.559408 300,199.466956 C304.358514,202.327194 309.53689,204 315.095615,204 C333.211481,204 343.114633,188.615385 343.114633,175.270495 C343.114633,174.831347 343.106181,174.392199 343.089276,173.961719 C345.013559,172.537378 346.684275,170.760563 348,168.735283" />
      </g>
    </g>
  </svg>
);

export const Kenya2Icon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#060" d="M36 27a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v18z"></path>
    <path fill="#BB1600" d="M0 13h36v10H0z"></path>
    <path fill="#141414" d="M32 5H4a4 4 0 0 0-4 4v4h36V9a4 4 0 0 0-4-4z"></path>
    <path fill="#EEE" d="M0 13h36v1H0zm0 9h36v1H0z"></path>
    <path fill="#141414" d="M23.054 9.404c-.066-.039-.186.089-.794.764c-.216.24-.486.539-.785.86c-.608.653-1.244 1.461-.783 1.935l-7.265 12.211c-.011.018-.019.047.003.087a.432.432 0 0 0 .294.177h.003c.046 0 .068-.021.079-.039l7.268-12.215c.626.148 1.024-.784 1.305-1.616c.14-.417.274-.796.381-1.1c.302-.856.356-1.027.294-1.064z"></path>
    <path fill="#FFF" d="M22.305 10.208c-.216.24-.486.539-.786.861c-.886.952-1.124 1.528-.769 1.868l.018.016l-7.29 12.252c-.004.008.001.021.005.027a.378.378 0 0 0 .242.145h.002c.01 0 .023-.001.028-.01l7.279-12.234l.012-.02l.022.006c.458.13.846-.355 1.254-1.572c.14-.417.274-.796.381-1.101c.168-.475.314-.889.314-.984c-.082.046-.375.372-.712.746z"></path>
    <path fill="#141414" d="M15.308 12.963c.461-.474-.174-1.282-.783-1.935c-.299-.322-.569-.62-.785-.86c-.608-.674-.728-.803-.794-.764c-.062.038-.008.208.293 1.063c.107.304.241.683.381 1.1c.28.833.678 1.764 1.305 1.616l7.268 12.215c.011.018.033.039.079.039h.003a.432.432 0 0 0 .294-.177c.021-.04.014-.069.003-.087l-7.264-12.21z"></path>
    <path fill="#FFF" d="M15.25 12.937c.355-.34.118-.916-.769-1.868c-.3-.322-.569-.621-.786-.861c-.337-.374-.631-.7-.714-.745c0 .095.146.509.314.984c.107.305.242.684.381 1.101c.409 1.217.796 1.702 1.254 1.572l.022-.006l.012.02l7.279 12.234c.005.009.019.01.028.01h.002a.374.374 0 0 0 .242-.145c.004-.007.009-.02.005-.027l-7.29-12.252l.02-.017z"></path>
    <path fill="#141414" d="M18.018 10.458L18 10.444l-.018.014c-2.492 1.87-3.704 4.331-3.704 7.523s1.211 5.653 3.704 7.524l.018.013l.018-.013c2.492-1.87 3.704-4.331 3.704-7.524s-1.212-5.655-3.704-7.523z"></path>
    <path fill="#BB1600" d="M20.879 14.059c-.603-1.363-1.551-2.54-2.88-3.54c-1.326.999-2.273 2.174-2.877 3.533c.525 1.181.782 2.468.782 3.937c0 1.467-.256 2.751-.779 3.928c.604 1.356 1.55 2.529 2.873 3.527c1.326-.999 2.273-2.174 2.876-3.534c-.521-1.178-.776-2.461-.776-3.921c.002-1.462.258-2.747.781-3.93z"></path>
    <path d="M18 18.927c.306 0 .555-.424.555-.946s-.249-.947-.555-.947c-.306 0-.554.424-.554.947c-.001.522.248.946.554.946zm-.231-2.497c-.502-.739-.746-1.677-.746-2.821c0-1.145.244-2.083.746-2.823v5.644zm.462 0c.501-.739.744-1.677.744-2.821c0-1.145-.243-2.083-.744-2.823v5.644zm-.462 3.1c-.502.738-.746 1.677-.746 2.821c0 1.146.244 2.082.746 2.822V19.53zm.462 0c.501.738.744 1.677.744 2.821c0 1.146-.243 2.082-.744 2.822V19.53z" fill="#FFF"></path>
  </svg>
);

export const WhatsappIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 31C23.732 31 30 24.732 30 17C30 9.26801 23.732 3 16 3C8.26801 3 2 9.26801 2 17C2 19.5109 2.661 21.8674 3.81847 23.905L2 31L9.31486 29.3038C11.3014 30.3854 13.5789 31 16 31ZM16 28.8462C22.5425 28.8462 27.8462 23.5425 27.8462 17C27.8462 10.4576 22.5425 5.15385 16 5.15385C9.45755 5.15385 4.15385 10.4576 4.15385 17C4.15385 19.5261 4.9445 21.8675 6.29184 23.7902L5.23077 27.7692L9.27993 26.7569C11.1894 28.0746 13.5046 28.8462 16 28.8462Z" fill="#BFC8D0" />
    <path d="M28 16C28 22.6274 22.6274 28 16 28C13.4722 28 11.1269 27.2184 9.19266 25.8837L5.09091 26.9091L6.16576 22.8784C4.80092 20.9307 4 18.5589 4 16C4 9.37258 9.37258 4 16 4C22.6274 4 28 9.37258 28 16Z" fill="url(#paint0_linear_87_7264)" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 30C23.732 30 30 23.732 30 16C30 8.26801 23.732 2 16 2C8.26801 2 2 8.26801 2 16C2 18.5109 2.661 20.8674 3.81847 22.905L2 30L9.31486 28.3038C11.3014 29.3854 13.5789 30 16 30ZM16 27.8462C22.5425 27.8462 27.8462 22.5425 27.8462 16C27.8462 9.45755 22.5425 4.15385 16 4.15385C9.45755 4.15385 4.15385 9.45755 4.15385 16C4.15385 18.5261 4.9445 20.8675 6.29184 22.7902L5.23077 26.7692L9.27993 25.7569C11.1894 27.0746 13.5046 27.8462 16 27.8462Z" fill="white" />
    <path d="M12.5 9.49989C12.1672 8.83131 11.6565 8.8905 11.1407 8.8905C10.2188 8.8905 8.78125 9.99478 8.78125 12.05C8.78125 13.7343 9.52345 15.578 12.0244 18.3361C14.438 20.9979 17.6094 22.3748 20.2422 22.3279C22.875 22.2811 23.4167 20.0154 23.4167 19.2503C23.4167 18.9112 23.2062 18.742 23.0613 18.696C22.1641 18.2654 20.5093 17.4631 20.1328 17.3124C19.7563 17.1617 19.5597 17.3656 19.4375 17.4765C19.0961 17.8018 18.4193 18.7608 18.1875 18.9765C17.9558 19.1922 17.6103 19.083 17.4665 19.0015C16.9374 18.7892 15.5029 18.1511 14.3595 17.0426C12.9453 15.6718 12.8623 15.2001 12.5959 14.7803C12.3828 14.4444 12.5392 14.2384 12.6172 14.1483C12.9219 13.7968 13.3426 13.254 13.5313 12.9843C13.7199 12.7145 13.5702 12.305 13.4803 12.05C13.0938 10.953 12.7663 10.0347 12.5 9.49989Z" fill="white" />
    <defs>
      <linearGradient id="paint0_linear_87_7264" x1="26.5" y1="7" x2="4" y2="28" gradientUnits="userSpaceOnUse">
        <stop stop-color="#5BD066" />
        <stop offset="1" stop-color="#27B43E" />
      </linearGradient>
    </defs>
  </svg>
);

export const SecureShieldIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z" fill="currentColor" />
  </svg>
);

export const SecurePCIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fill="currentColor" d="M510.158,392.021l-45.585-57.325V93.613c0-11.662-9.457-21.12-21.119-21.12H68.546c-11.662,0-21.111,9.458-21.111,21.12v241.082L1.841,392.021C0.649,393.516,0,395.366,0,397.285v25.373c0,9.311,7.548,16.849,16.85,16.849H495.15c9.302,0,16.85-7.538,16.85-16.849v-25.373C512,395.366,511.351,393.516,510.158,392.021z M77.226,102.293h357.547v202.604H77.226V102.293z M304.122,419.469h-96.244v-25.478h96.244V419.469z" />
    <path fill="currentColor" d="M291.552,186.314c0-9.786-3.994-18.734-10.417-25.14c-6.406-6.414-15.345-10.416-25.14-10.409c-9.786-0.008-18.734,3.994-25.131,10.409c-6.414,6.407-10.417,15.354-10.417,25.14v12.508h-11.472v43.38c0,12.571,10.193,22.746,22.762,22.746h48.533c12.561,0,22.754-10.175,22.754-22.746v-43.38h-11.472V186.314z M237.703,186.314c0-2.55,0.519-4.937,1.435-7.124c1.384-3.268,3.717-6.086,6.639-8.058c2.931-1.98,6.406-3.112,10.218-3.12c2.55,0,4.936,0.518,7.124,1.435c3.276,1.383,6.086,3.717,8.058,6.648c1.97,2.913,3.112,6.388,3.12,10.218v12.508h-36.594V186.314z" />
  </svg>
);

export const MailSendIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M9.00977 21.39H19.0098C20.0706 21.39 21.0881 20.9685 21.8382 20.2184C22.5883 19.4682 23.0098 18.4509 23.0098 17.39V7.39001C23.0098 6.32915 22.5883 5.31167 21.8382 4.56152C21.0881 3.81138 20.0706 3.39001 19.0098 3.39001H7.00977C5.9489 3.39001 4.93148 3.81138 4.18134 4.56152C3.43119 5.31167 3.00977 6.32915 3.00977 7.39001V12.39" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.00977 18.39H11.0098" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.00977 15.39H5.00977" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22.209 5.41992C16.599 16.0599 9.39906 16.0499 3.78906 5.41992" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IOSLoadingIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M12,3V6M5.64,5.64,7.76,7.76M3,12H6m-.36,6.36,2.12-2.12M12,18v3m6.36-2.64-2.12-2.12M21,12H18m.36-6.36L16.24,7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IOSTickIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MailBulkIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 -32 576 576" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M160 448c-25.6 0-51.2-22.4-64-32-64-44.8-83.2-60.8-96-70.4V480c0 17.67 14.33 32 32 32h256c17.67 0 32-14.33 32-32V345.6c-12.8 9.6-32 25.6-96 70.4-12.8 9.6-38.4 32-64 32zm128-192H32c-17.67 0-32 14.33-32 32v16c25.6 19.2 22.4 19.2 115.2 86.4 9.6 6.4 28.8 25.6 44.8 25.6s35.2-19.2 44.8-22.4c92.8-67.2 89.6-67.2 115.2-86.4V288c0-17.67-14.33-32-32-32zm256-96H224c-17.67 0-32 14.33-32 32v32h96c33.21 0 60.59 25.42 63.71 57.82l.29-.22V416h192c17.67 0 32-14.33 32-32V192c0-17.67-14.33-32-32-32zm-32 128h-64v-64h64v64zm-352-96c0-35.29 28.71-64 64-64h224V32c0-17.67-14.33-32-32-32H96C78.33 0 64 14.33 64 32v192h96v-32z" />
  </svg>
);

export const UserIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0 15c-2.33 0-4.39-1.15-5.63-2.91.03-1.86 3.75-2.84 5.63-2.84s5.6 0.98 5.63 2.84A9.95 9.95 0 0112 20z" fill="currentColor" />
  </svg>
);

export const TagIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" fill="currentColor" />
  </svg>
);

export const ClipboardIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="currentColor" />
  </svg>
);

export const DownloadIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckCircleIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CircleIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InfoIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LockIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const XCircleIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronDownIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronUpIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <polyline points="18 15 12 9 6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MessageSquareIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const SaveIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

export const CancelCloseIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 492 492" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M300.188,246L484.14,62.04c5.06-5.064,7.852-11.82,7.86-19.024c0-7.208-2.792-13.972-7.86-19.028L468.02,7.872 c-5.068-5.076-11.824-7.856-19.036-7.856c-7.2,0-13.956,2.78-19.024,7.856L246.008,191.82L62.048,7.872 c-5.06-5.076-11.82-7.856-19.028-7.856c-7.2,0-13.96,2.78-19.02,7.856L7.872,23.988c-10.496,10.496-10.496,27.568,0,38.052 L191.828,246L7.872,429.952c-5.064,5.072-7.852,11.828-7.852,19.032c0,7.204,2.788,13.96,7.852,19.028l16.124,16.116 c5.06,5.072,11.824,7.856,19.02,7.856c7.208,0,13.968-2.784,19.028-7.856l183.96-183.952l183.952,183.952 c5.068,5.072,11.824,7.856,19.024,7.856h0.008c7.204,0,13.96-2.784,19.028-7.856l16.12-16.116 c5.06-5.064,7.852-11.824,7.852-19.028c0-7.204-2.792-13.96-7.852-19.028L300.188,246z" />
  </svg>
);

export const HourglassIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M 16.5156 49.5742 L 39.2734 49.5742 C 41.6640 49.5742 43.0937 48.2617 43.0937 45.7305 L 43.0937 45.1211 C 43.1172 38.6523 36.2266 33.4023 33.2031 30.5430 C 32.3593 29.7461 31.9140 29.0196 31.9140 27.9649 C 31.9140 26.9102 32.3593 26.2071 33.2031 25.3867 C 36.2031 22.4805 43.0937 17.5586 43.0937 10.8320 L 43.0937 10.2696 C 43.0937 7.7383 41.6640 6.4258 39.2734 6.4258 L 16.5156 6.4258 C 14.1718 6.4258 12.8828 7.7383 12.8828 10.0586 L 12.8828 10.8320 C 12.8828 17.5586 19.7734 22.4805 22.7969 25.3867 C 23.6406 26.2071 24.0859 26.9102 24.0859 27.9649 C 24.0859 29.0196 23.6406 29.7461 22.7969 30.5430 C 19.7734 33.4023 12.8828 38.6523 12.8828 45.1211 L 12.8828 45.9414 C 12.8828 48.2617 14.1718 49.5742 16.5156 49.5742 Z M 18.9531 46.3633 C 17.8281 46.3633 17.4766 45.1211 18.5781 44.3008 L 26.5937 38.3242 C 26.8515 38.1133 26.9922 37.9727 26.9922 37.6211 L 26.9922 26.3477 C 26.9922 25.0820 26.7344 24.4492 25.8437 23.6992 C 24.5078 22.5742 21.9766 20.7930 20.8281 19.1758 C 20.3593 18.5196 20.4062 17.9805 20.9922 17.9805 L 34.9844 17.9805 C 35.5703 17.9805 35.6172 18.5196 35.1484 19.1758 C 34.0000 20.7930 31.4922 22.5742 30.1328 23.6992 C 29.2422 24.4492 28.9844 25.0820 28.9844 26.3477 L 28.9844 37.6211 C 28.9844 37.9727 29.125 38.1133 29.3828 38.3242 L 37.4218 44.3008 C 38.5234 45.1211 38.1484 46.3633 37.0469 46.3633 Z" />
  </svg>
);

export const PreciseTickIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NavHomeIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="8" y="13" width="8" height="9" fill="currentColor" fillOpacity="0.2" />
    <path d="M21.71,12.71a1,1,0,0,1-1.42,0L20,12.42V20.3A1.77,1.77,0,0,1,18.17,22H16a1,1,0,0,1-1-1V15.1a1,1,0,0,0-1-1H10a1,1,0,0,0-1-1H10a1,1,0,0,0-1,1V21a1,1,0,0,1-1,1H5.83A1.77,1.77,0,0,1,4,20.3V12.42l-.29.29a1,1,0,0,1-1.42,0,1,1,0,0,1,0-1.42l9-9a1,1,0,0,1,1.42,0l9,9A1,1,0,0,1,21.71,12.71Z" fill="currentColor" />
  </svg>
);

export const NavFilesIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M11 0H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2 2 2 0 0 0 2-2V4a2 2 0 0 0-2-2 2 2 0 0 0-2-2zm2 3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1V3zM2 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2z" fill="currentColor" />
  </svg>
);

export const NavSearchIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C11.8487 18 13.551 17.3729 14.9056 16.3199L20.2929 21.7071C20.6834 22.0976 21.3166 22.0976 21.7071 21.7071C22.0976 21.3166 22.0976 20.6834 21.7071 20.2929L16.3199 14.9056C17.3729 13.551 18 11.8487 18 10C18 5.58172 14.4183 2 10 2Z" fill="currentColor" />
  </svg>
);

export const NavCommentIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M11.9862 0.763672C6.07454 0.763672 1.23621 5.36133 1.23621 11.1034C1.23621 13.5057 2.10188 15.7237 3.55066 17.4735C5.46882 19.8566 8.48271 21.3843 11.8522 21.4238L11.8878 21.4367C11.9902 21.4735 12.1385 21.5265 12.3236 21.5916C12.6936 21.7216 13.2115 21.9001 13.8035 22.0941C14.9799 22.4797 16.4767 22.9358 17.6892 23.1894C18.303 23.3178 18.9306 23.1718 19.4096 22.8608C19.8872 22.5507 20.3019 22.0126 20.3019 21.3173C20.3019 20.9046 20.1354 20.4987 19.9732 20.1857C19.8007 19.8529 19.5794 19.5251 19.371 19.2448C19.2691 19.1076 19.1676 18.9782 19.0724 18.8609C21.3193 16.9815 22.7362 14.2061 22.7362 11.1034C22.7362 7.55126 20.8865 4.4319 18.073 2.58609C16.3321 1.4227 14.2426 0.763672 11.9862 0.763672ZM18.3637 6.03728C18.1546 5.67972 17.6953 5.55937 17.3377 5.76847C16.9801 5.97757 16.8598 6.43694 17.0689 6.7945C17.8131 8.0671 18.2362 9.53599 18.2362 11.1034C18.2362 12.6662 17.8138 14.1316 17.0693 15.4016C16.8598 15.7589 16.9797 16.2184 17.337 16.4279C17.6943 16.6374 18.1538 16.5175 18.3633 16.1602C19.2385 14.6673 19.7362 12.941 19.7362 11.1034C19.7362 9.26158 19.238 7.53236 18.3637 6.03728Z" fill="currentColor" />
  </svg>
);

export const NavProfileIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M12.0001 11.2C13.8778 11.2 15.4001 9.67771 15.4001 7.80005C15.4001 5.92238 13.8778 4.40005 12.0001 4.40005C10.1224 4.40005 8.6001 5.92238 8.6001 7.80005C8.6001 9.67771 10.1224 11.2 12.0001 11.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 14.6C8.21 14.6 5.14 17.14 5 20.4C5 20.73 5.27 21 5.6 21H18.4C18.73 21 19 20.73 19 20.4C18.86 17.14 15.79 14.6 12 14.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NavPiecesIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M4.46814 17.5319C5.62291 19.7154 7.92876 20.5 12 20.5C17.6255 20.5 19.8804 19.002 20.3853 14.3853M4.46814 17.5319C3.77924 16.2292 3.5 14.4288 3.5 12C3.5 5.5 5.5 3.5 12 3.5C18.5 3.5 20.5 5.5 20.5 12C20.5 12.8745 20.4638 13.6676 20.3853 14.3853M4.46814 17.5319L7.58579 14.4142C8.36684 13.6332 9.63317 13.6332 10.4142 14.4142L10.5858 14.5858C11.3668 15.3668 12.6332 15.3668 13.4142 14.5858L15.5858 12.4142C16.3668 11.6332 17.6332 11.6332 18.4142 12.4142L20.3853 14.3853M10.691 8.846C10.691 9.865 9.864 10.692 8.845 10.692C7.827 10.692 7 9.865 7 8.846C7 7.827 7.827 7 8.845 7C9.864 7 10.691 7.827 10.691 8.846Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Bill Icon (from icons 6/bill.svg) ────────────────────────────────────────
export const SearchSquareIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M7 3C5.89543 3 5 3.89543 5 5V17.2C5 18.0566 5.00078 18.6389 5.03755 19.089C5.07337 19.5274 5.1383 19.7516 5.21799 19.908C5.40973 20.2843 5.7157 20.5903 6.09202 20.782C6.24842 20.8617 6.47262 20.9266 6.91104 20.9624C7.36113 20.9992 7.94342 21 8.8 21H15.2C16.0566 21 16.6389 20.9992 17.089 20.9624C17.5274 20.9266 17.7516 20.8617 17.908 20.782C18.2843 20.5903 18.5903 20.2843 18.782 19.908C18.8617 19.7516 18.9266 19.5274 18.9624 19.089C18.9992 18.6389 19 18.0566 19 17.2V13C19 10.7909 17.2091 9 15 9H14.25C12.4551 9 11 7.54493 11 5.75C11 4.23122 9.76878 3 8.25 3H7ZM10 1C16.0751 1 21 5.92487 21 12V17.2413C21 18.0463 21 18.7106 20.9558 19.2518C20.9099 19.8139 20.8113 20.3306 20.564 20.816C20.1805 21.5686 19.5686 22.1805 18.816 22.564C18.3306 22.8113 17.8139 22.9099 17.2518 22.9558C16.7106 23 16.0463 23 15.2413 23H8.75868C7.95372 23 7.28936 23 6.74817 22.9558C6.18608 22.9099 5.66937 22.8113 5.18404 22.564C4.43139 22.1805 3.81947 21.5686 3.43597 20.816C3.18868 20.3306 3.09012 19.8139 3.04419 19.2518C2.99998 18.7106 2.99999 18.0463 3 17.2413L3 5C3 2.79086 4.79086 1 7 1H10ZM17.9474 7.77263C16.7867 5.59506 14.7572 3.95074 12.3216 3.30229C12.7523 4.01713 13 4.85463 13 5.75C13 6.44036 13.5596 7 14.25 7H15C16.0712 7 17.0769 7.28073 17.9474 7.77263Z" fill="currentColor" />
  </svg>
);

export const EmailNewsletterIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fill="currentColor" d="M511.531,221.228c-0.171-1.6-0.448-3.115-1.003-4.672c-0.427-1.259-1.024-2.411-1.707-3.563
			c-0.427-0.768-0.555-1.6-1.088-2.325c-0.448-0.576-1.088-0.853-1.579-1.387c-0.427-0.491-0.64-1.131-1.131-1.579l-78.357-71.232
			V95.489c0-11.797-9.536-21.333-21.333-21.333h-47.211l-44.757-40.683c-32.704-29.739-82.027-29.717-114.731,0l-44.757,40.683
			h-47.211c-11.797,0-21.333,9.536-21.333,21.333v40.981L6.976,207.703c-0.491,0.448-0.704,1.088-1.152,1.579
			c-0.469,0.533-1.109,0.811-1.557,1.387c-0.533,0.725-0.661,1.557-1.088,2.325c-0.683,1.152-1.28,2.304-1.707,3.563
			c-0.555,1.557-0.832,3.072-1.003,4.672C0.384,221.996,0,222.7,0,223.489v235.328c0,23.168,18.837,42.005,42.005,42.005h427.989
			c23.168,0,42.005-18.837,42.005-42.005V223.489C512,222.7,511.616,221.996,511.531,221.228z M426.667,194.135l30.549,27.776
			l-30.549,22.912V194.135z M227.328,65.047c16.341-14.869,41.003-14.869,57.344,0l10.005,9.109h-77.355L227.328,65.047z
			 M198.251,208.385c8.341-8.32,21.824-8.32,30.165,0l25.28,25.28l49.237-65.664c7.061-9.387,20.437-11.328,29.867-4.245
			c9.429,7.061,11.349,20.437,4.267,29.867l-64,85.333c-3.712,4.949-9.387,8.043-15.552,8.469c-0.512,0.043-1.024,0.064-1.515,0.064
			c-5.653,0-11.072-2.24-15.083-6.251l-42.667-42.667C189.909,230.231,189.909,216.727,198.251,208.385z M85.333,194.135v50.688
			l-30.549-22.912L85.333,194.135z M42.667,266.135l113.216,84.928L42.667,431.937V266.135z M78.507,458.775l120.341-85.952h114.304
			l119.552,85.376L78.507,458.775z M356.117,351.063l113.323-85.013l0.491,166.293L356.117,351.063z" />
  </svg>
);

export const EmailIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" id="OBJECT" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <title />
    <rect className="opacity-40" fill="currentColor" height="22" rx="3" ry="3" width="30" x="1" y="5" />
    <path className="opacity-40" fill="currentColor" d="M18.12,12.71a3,3,0,0,0-4.24,0L1.3,25.29A3,3,0,0,0,4,27H28a3,3,0,0,0,2.7-1.71Z" />
    <path fill="currentColor" d="M28,5H4A3,3,0,0,0,1.3,6.71L13.88,19.29a3,3,0,0,0,4.24,0L30.7,6.71A3,3,0,0,0,28,5Z" />
  </svg>
);

// ── Blog Icon (from icons 6/blog.svg) ────────────────────────────────────────
export const SearchListIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M13.1739 3.5968C13.8662 3.2047 14.686 3.10369 15.4528 3.31598C15.7928 3.41011 16.0833 3.57409 16.3571 3.7593C16.6172 3.9352 16.9155 4.16808 17.2613 4.43799L17.3117 4.47737C17.6575 4.74728 17.9559 4.98016 18.1897 5.18977C18.4358 5.41046 18.6654 5.65248 18.8393 5.95945C19.2314 6.65177 19.3324 7.47151 19.1201 8.23831C19.026 8.5783 18.862 8.86883 18.6768 9.14267C18.5009 9.40276 18.268 9.70112 17.998 10.0469L10.8953 19.1462C10.8773 19.1692 10.8596 19.1919 10.8421 19.2144C10.5087 19.6419 10.2566 19.9651 9.9445 20.2306C9.68036 20.4553 9.38811 20.6447 9.07512 20.794C8.70535 20.9704 8.30733 21.0685 7.78084 21.1983C7.75324 21.2051 7.72528 21.212 7.69696 21.219L5.57214 21.7435C5.42499 21.7799 5.25702 21.8215 5.10885 21.8442C4.94367 21.8696 4.68789 21.8926 4.40539 21.8022C4.06579 21.6934 3.77603 21.4672 3.58809 21.1642C3.43175 20.9121 3.39197 20.6584 3.3765 20.492C3.36262 20.3427 3.36213 20.1697 3.3617 20.0181C3.36167 20.0087 3.36165 19.9994 3.36162 19.9902L3.35475 17.8295C3.35465 17.8003 3.35455 17.7715 3.35445 17.7431C3.3525 17.2009 3.35103 16.7909 3.4324 16.3894C3.50128 16.0495 3.61406 15.72 3.76791 15.4093C3.94967 15.0421 4.20204 14.7191 4.53586 14.2918C4.55336 14.2694 4.57109 14.2467 4.58905 14.2237L11.6918 5.12435C11.9617 4.77856 12.1946 4.48019 12.4042 4.2464C12.6249 4.00025 12.8669 3.77065 13.1739 3.5968ZM14.9191 5.24347C14.6635 5.17271 14.3903 5.20638 14.1595 5.33708C14.1203 5.35928 14.0459 5.41135 13.8934 5.5815C13.7348 5.75836 13.5438 6.00211 13.2487 6.38018L16.4018 8.84145C16.697 8.46338 16.887 8.21896 17.0201 8.02221C17.1482 7.83291 17.1806 7.74808 17.1926 7.70467C17.2634 7.44907 17.2297 7.17583 17.099 6.94505C17.0768 6.90586 17.0247 6.83145 16.8546 6.6789C16.6777 6.52033 16.434 6.32938 16.0559 6.03426C15.6778 5.73914 15.4334 5.54904 15.2367 5.41597C15.0474 5.28794 14.9625 5.25549 14.9191 5.24347ZM15.1712 10.418L12.0181 7.95674L6.16561 15.4543C5.75585 15.9792 5.6403 16.135 5.56031 16.2966C5.48339 16.452 5.42699 16.6167 5.39256 16.7866C5.35675 16.9633 5.35262 17.1572 5.35474 17.8231L5.36082 19.7357L7.2176 19.2773C7.86411 19.1177 8.05119 19.0666 8.21391 18.9889C8.37041 18.9143 8.51653 18.8196 8.64861 18.7072C8.78593 18.5904 8.90897 18.4405 9.31872 17.9156L15.1712 10.418ZM12 21C12 20.4477 12.4477 20 13 20H20C20.5523 20 21 20.4477 21 21C21 21.5523 20.5523 22 20 22H13C12.4477 22 12 21.5523 12 21Z" fill="currentColor" />
  </svg>
);

// ── Discussion Icon (from icons 6/discussion.svg) ─────────────────────────────
export const SearchLayerIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M6.84572 18.6204C6.74782 18.0072 6.4668 17.4522 6.05816 17.0088C4.18319 15.5427 3 13.3942 3 11C3 6.58173 7.02944 3 12 3C16.9706 3 21 6.58173 21 11C21 15.4183 16.9706 19 12 19C11.1546 19 10.3365 18.8964 9.56074 18.7027C9.45389 18.676 9.34187 18.72 9.28125 18.8119C9.15858 18.998 9.02331 19.1851 8.87719 19.3674C8.64734 19.6542 8.39065 19.9289 8.11392 20.1685C7.59543 20.6174 7.00662 20.943 6.39232 20.9932C6.37166 20.9949 6.35097 20.9963 6.33025 20.9974C6.28866 20.9995 6.26498 20.9519 6.28953 20.9182C6.30109 20.9024 6.3125 20.8865 6.32376 20.8704C6.67743 20.3664 6.88397 19.7586 6.88397 19.1044C6.88397 19.0915 6.88389 19.0786 6.88373 19.0658C6.88185 18.9146 6.86893 18.7659 6.84572 18.6204ZM4.66223 18.4535C2.45613 16.6579 1 14.0103 1 11C1 5.26221 6.15283 1 12 1C17.8472 1 23 5.26221 23 11C23 16.7378 17.8472 21 12 21C11.3978 21 10.8057 20.9559 10.2276 20.8709C9.93606 21.2084 9.60764 21.5363 9.24519 21.8294C8.55521 22.3873 7.59485 22.9353 6.43241 22.9948L6.43238 22.9948C4.55136 23.0909 3.75168 21.003 4.67402 19.7392C4.81033 19.5524 4.88397 19.3363 4.88397 19.1044C4.88397 18.8684 4.80711 18.6449 4.66223 18.4535Z" fill="currentColor" />
  </svg>
);

// ── Resource Icon (from icons 6/resource.svg) ─────────────────────────────────
export const SearchFileIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M2 6C2 4.34315 3.34315 3 5 3H7.75093C8.82997 3 9.86325 3.43595 10.6162 4.20888L11.7227 5.34484C11.911 5.53807 12.1693 5.64706 12.4391 5.64706H16.4386C18.5513 5.64706 20.281 7.28495 20.4284 9.35939C21.7878 9.88545 22.5642 11.4588 21.977 12.927L20.1542 17.4853C19.5468 19.0041 18.0759 20 16.4402 20H6C4.88522 20 3.87543 19.5427 3.15116 18.8079C2.44035 18.0867 2 17.0938 2 16V6ZM18.3829 9.17647C18.1713 8.29912 17.3812 7.64706 16.4386 7.64706H12.4391C11.6298 7.64706 10.8548 7.3201 10.2901 6.7404L9.18356 5.60444C8.80709 5.21798 8.29045 5 7.75093 5H5C4.44772 5 4 5.44772 4 6V14.4471L5.03813 11.25C5.43958 10.0136 6.59158 9.17647 7.89147 9.17647H18.3829ZM5.03034 17.7499L6.94036 11.8676C7.07417 11.4555 7.45817 11.1765 7.89147 11.1765H19.4376C19.9575 11.1765 20.3131 11.7016 20.12 12.1844L18.2972 16.7426C17.9935 17.502 17.258 18 16.4402 18H6C5.64785 18 5.31756 17.9095 5.03034 17.7499Z" fill="currentColor" />
  </svg>
);

// ── Campaign Icon (from icons 6/campaign.svg) ─────────────────────────────────
export const CampaignIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M10.1631 2.7372C10.8572 1.12528 13.1427 1.12528 13.8369 2.7372L15.4229 6.42011C15.5677 6.75629 15.8846 6.98651 16.249 7.02031L20.2418 7.39063C21.9893 7.55271 22.6956 9.72633 21.377 10.8846L18.3645 13.5311C18.0895 13.7727 17.9685 14.1452 18.049 14.5023L18.9306 18.414C19.3165 20.1261 17.4675 21.4695 15.9584 20.5734L12.5105 18.5262C12.1958 18.3393 11.8041 18.3393 11.4894 18.5262L8.04154 20.5734C6.53248 21.4695 4.68348 20.1261 5.06936 18.414L5.95099 14.5023C6.03147 14.1452 5.91044 13.7727 5.63545 13.5311L2.62291 10.8846C1.30438 9.72633 2.01063 7.55271 3.75818 7.39063L7.75094 7.02031C8.1154 6.98651 8.43227 6.75629 8.57704 6.42011L10.1631 2.7372ZM13.586 7.21117L12 3.52826L10.4139 7.21117C9.97963 8.21969 9.02902 8.91036 7.93564 9.01176L3.94288 9.38208L6.95542 12.0286C7.78038 12.7533 8.14348 13.8708 7.90205 14.942L7.02042 18.8538L10.4683 16.8065C11.4125 16.2458 12.5875 16.2458 13.5317 16.8065L16.9795 18.8538L16.0979 14.942C15.8565 13.8708 16.2196 12.7533 17.0445 12.0286L20.0571 9.38208L16.0643 9.01176C14.9709 8.91036 14.0203 8.21969 13.586 7.21117Z" fill="currentColor" />
  </svg>
);

// ── Constitution Chapter Icon (from icons 6/constitution_chapter.svg) ─────────
export const ConstitutionChapterIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M 13.5039 50.9570 L 26.3476 50.9570 C 25.1055 49.9023 24.0508 48.6367 23.2773 47.1836 L 13.7148 47.1836 C 11.3008 47.1836 10.0117 45.9414 10.0117 43.5976 L 10.0117 8.1367 C 10.0117 5.8164 11.2773 4.4805 13.7148 4.4805 L 38.2070 4.4805 C 40.5508 4.4805 41.8867 5.7930 41.8867 8.1367 L 41.8867 28.5742 C 43.3398 29.3476 44.6055 30.3789 45.6602 31.6211 L 45.6602 8.0664 C 45.6602 3.1679 43.2461 .7070 38.3945 .7070 L 13.5039 .7070 C 8.6758 .7070 6.2383 3.1914 6.2383 8.0664 L 6.2383 43.6211 C 6.2383 48.5195 8.6758 50.9570 13.5039 50.9570 Z M 17.0898 14.0430 L 34.8555 14.0430 C 35.6758 14.0430 36.3086 13.3867 36.3086 12.5664 C 36.3086 11.7695 35.6758 11.1601 34.8555 11.1601 L 17.0898 11.1601 C 16.2227 11.1601 15.6133 11.7695 15.6133 12.5664 C 15.6133 13.3867 16.2227 14.0430 17.0898 14.0430 Z M 17.0898 22.2226 L 34.8555 22.2226 C 35.6758 22.2226 36.3086 21.5664 36.3086 20.7461 C 36.3086 19.9492 35.6758 19.3398 34.8555 19.3398 L 17.0898 19.3398 C 16.2227 19.3398 15.6133 19.9492 15.6133 20.7461 C 15.6133 21.5664 16.2227 22.2226 17.0898 22.2226 Z M 35.1367 50.9570 C 37.2461 50.9570 39.2383 50.3476 40.8789 49.2461 L 46.1524 54.5430 C 46.7148 55.0820 47.2305 55.2930 47.8633 55.2930 C 48.9414 55.2930 49.7617 54.4492 49.7617 53.2539 C 49.7617 52.7383 49.5040 52.2226 49.1056 51.8242 L 43.7617 46.4805 C 44.9570 44.7695 45.6602 42.6836 45.6602 40.4336 C 45.6602 34.5976 40.9492 29.8867 35.1367 29.8867 C 29.3242 29.8867 24.5664 34.6445 24.5664 40.4336 C 24.5664 46.2461 29.3242 50.9570 35.1367 50.9570 Z M 35.1367 47.6054 C 31.1524 47.6054 27.9180 44.3945 27.9180 40.4336 C 27.9180 36.5195 31.1524 33.2617 35.1367 33.2617 C 39.0508 33.2617 42.2851 36.5195 42.2851 40.4336 C 42.2851 44.3945 39.0742 47.6054 35.1367 47.6054 Z" />
  </svg>
);

// ── Constitution Section Icon (from icons 6/constitution_section.svg) ─────────
export const ConstitutionSectionIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M 15.5547 53.125 L 40.4453 53.125 C 45.2969 53.125 47.7109 50.6640 47.7109 45.7890 L 47.7109 24.5078 C 47.7109 21.4844 47.3828 20.1718 45.5078 18.2500 L 32.5703 5.1015 C 30.7891 3.2734 29.3359 2.8750 26.6875 2.8750 L 15.5547 2.8750 C 10.7266 2.8750 8.2891 5.3594 8.2891 10.2344 L 8.2891 45.7890 C 8.2891 50.6875 10.7266 53.125 15.5547 53.125 Z M 15.7422 49.3515 C 13.3281 49.3515 12.0625 48.0625 12.0625 45.7187 L 12.0625 10.3047 C 12.0625 7.9844 13.3281 6.6484 15.7656 6.6484 L 26.1718 6.6484 L 26.1718 20.2656 C 26.1718 23.2187 27.6718 24.6718 30.5781 24.6718 L 43.9375 24.6718 L 43.9375 45.7187 C 43.9375 48.0625 42.6953 49.3515 40.2578 49.3515 Z M 31.0000 21.1328 C 30.0859 21.1328 29.7109 20.7578 29.7109 19.8203 L 29.7109 7.3750 L 43.2109 21.1328 Z M 36.6250 31.1172 L 18.8359 31.1172 C 17.9922 31.1172 17.3828 31.7500 17.3828 32.5469 C 17.3828 33.3672 17.9922 34.0000 18.8359 34.0000 L 36.6250 34.0000 C 37.4453 34.0000 38.0781 33.3672 38.0781 32.5469 C 38.0781 31.7500 37.4453 31.1172 36.6250 31.1172 Z M 36.6250 39.2969 L 18.8359 39.2969 C 17.9922 39.2969 17.3828 39.9531 17.3828 40.7734 C 17.3828 41.5703 17.9922 42.1797 18.8359 42.1797 L 36.6250 42.1797 C 37.4453 42.1797 38.0781 41.5703 38.0781 40.7734 C 38.0781 39.9531 37.4453 39.2969 36.6250 39.2969 Z" />
  </svg>
);

// ── Civic Glossary Icon (from icons 6/civic_glossary.svg) ─────────────────────
export const CivicGlossaryIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M 16.2929 29.7695 C 22.8320 29.7695 28.1992 24.4023 28.1992 17.8399 C 28.1992 11.3242 22.8320 5.9336 16.2929 5.9336 C 9.7773 5.9336 4.3867 11.3242 4.3867 17.8399 C 4.3867 24.4023 9.7773 29.7695 16.2929 29.7695 Z M 33.8008 13.2461 L 49.8085 13.2461 C 50.8165 13.2461 51.6133 12.4726 51.6133 11.4648 C 51.6133 10.4805 50.8165 9.7070 49.8085 9.7070 L 33.8008 9.7070 C 32.7929 9.7070 32.0195 10.4805 32.0195 11.4648 C 32.0195 12.4726 32.7929 13.2461 33.8008 13.2461 Z M 14.8867 24.8242 C 14.5117 24.8242 14.0429 24.6601 13.7382 24.3320 L 9.2382 19.4101 C 9.0742 19.2226 8.9570 18.8008 8.9570 18.4961 C 8.9570 17.6758 9.5898 17.0430 10.3867 17.0430 C 10.8789 17.0430 11.2304 17.2773 11.4882 17.5352 L 14.8164 21.1679 L 21.0273 12.5430 C 21.2851 12.1679 21.7070 11.9101 22.2226 11.9101 C 22.9960 11.9101 23.6757 12.5195 23.6757 13.3399 C 23.6757 13.5742 23.5586 13.9023 23.3476 14.1836 L 16.0820 24.2852 C 15.8476 24.6133 15.3789 24.8242 14.8867 24.8242 Z M 33.8008 25.5273 L 49.8085 25.5273 C 50.8165 25.5273 51.6133 24.7539 51.6133 23.7461 C 51.6133 22.7617 50.8165 21.9883 49.8085 21.9883 L 33.8008 21.9883 C 32.7929 21.9883 32.0195 22.7617 32.0195 23.7461 C 32.0195 24.7539 32.7929 25.5273 33.8008 25.5273 Z M 6.1679 37.8086 L 49.8085 37.8086 C 50.8165 37.8086 51.6133 37.0117 51.6133 36.0273 C 51.6133 35.0430 50.8165 34.2695 49.8085 34.2695 L 6.1679 34.2695 C 5.1601 34.2695 4.3867 35.0430 4.3867 36.0273 C 4.3867 37.0117 5.1601 37.8086 6.1679 37.8086 Z M 6.1679 50.0664 L 49.8085 50.0664 C 50.8165 50.0664 51.6133 49.2930 51.6133 48.3086 C 51.6133 47.3242 50.8165 46.5273 49.8085 46.5273 L 6.1679 46.5273 C 5.1601 46.5273 4.3867 47.3242 4.3867 48.3086 C 4.3867 49.2930 5.1601 50.0664 6.1679 50.0664 Z" />
  </svg>
);

// ── Carousel Slide Icon (from icons 6/carousel_slide.svg) ─────────────────────
export const CarouselSlideIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M 6.6505 42.2994 L 10.5900 42.2994 L 10.5900 45.9424 C 10.5900 50.3055 12.7927 52.5082 17.2405 52.5082 L 49.3495 52.5082 C 53.7548 52.5082 56 50.3055 56 45.9424 L 56 23.4281 C 56 19.0861 53.7548 16.8834 49.3495 16.8834 L 45.4100 16.8834 L 45.4100 13.4523 C 45.4100 9.0892 43.1861 6.8865 38.7803 6.8865 L 6.6505 6.8865 C 2.2239 6.8865 0 9.0892 0 13.4523 L 0 35.7548 C 0 40.1179 2.2239 42.2994 6.6505 42.2994 Z M 6.7141 38.8894 C 4.5961 38.8894 3.4100 37.7669 3.4100 35.5642 L 3.4100 13.6429 C 3.4100 11.4402 4.5961 10.2964 6.7141 10.2964 L 38.7170 10.2964 C 40.8138 10.2964 41.9998 11.4402 41.9998 13.6429 L 41.9998 16.8834 L 17.2405 16.8834 C 12.7927 16.8834 10.5900 19.0650 10.5900 23.4281 L 10.5900 38.8894 Z M 14.0000 23.6187 C 14.0000 21.4160 15.1649 20.2934 17.2829 20.2934 L 49.2857 20.2934 C 51.3826 20.2934 52.5897 21.4160 52.5897 23.6187 L 52.5897 41.3040 L 44.8166 33.9757 C 43.9062 33.1073 42.7836 32.6837 41.6397 32.6837 C 40.4538 32.6837 39.4371 33.0861 38.4416 33.9545 L 28.9319 42.3841 L 25.1407 38.9530 C 24.2511 38.1693 23.2768 37.7457 22.2601 37.7457 C 21.3282 37.7457 20.4598 38.1270 19.5491 38.9318 L 14.0000 43.7608 Z M 25.4795 34.5052 C 28.2117 34.5052 30.4568 32.2601 30.4568 29.4855 C 30.4568 26.7745 28.2117 24.4871 25.4795 24.4871 C 22.7261 24.4871 20.4811 26.7745 20.4811 29.4855 C 20.4811 32.2601 22.7261 34.5052 25.4795 34.5052 Z" />
  </svg>
);

export const FilterIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const ChevronRightIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const SettingsIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const NotificationIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const ShieldIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const MoonIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const SunIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export const LogoutIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const CameraIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const ScaleIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <line x1="12" y1="3" x2="12" y2="21" />
    <polyline points="1 14 12 3 23 14" />
    <path d="M5 14c0 2.5-2 4-4 4" />
    <path d="M19 14c0 2.5 2 4 4 4" />
    <path d="M1 18h6" />
    <path d="M17 18h6" />
  </svg>
);

// ── Plus Icon (from icons 6/plus.svg) ────────────────────────────────────────
export const PlusIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fill="currentColor" fillRule="evenodd" d="M9 17a1 1 0 102 0v-6h6a1 1 0 100-2h-6V3a1 1 0 10-2 0v6H3a1 1 0 000 2h6v6z" />
  </svg>
);

// ── Discovery Layer Icon (from search-layer-svgrepo-com.svg) — replaces TrendingUpIcon ──
export const DiscoveryLayerIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M28.135 0a3.5 3.5 0 0 0-2.668 1.234L.832 30.25a3.5 3.5 0 0 0 2.67 5.766l35.062-.024c5.116-7.573 13.964-12.447 23.1-12.71a29.763 29.763 0 0 1 9.52 1.234c6.36 1.837 11.933 6.014 15.683 11.441l9.635-.006a3.5 3.5 0 0 0 2.666-5.765L74.59 1.234A3.5 3.5 0 0 0 71.922 0H28.135zm61.5 40.955c.306.714.594 1.437.84 2.176c1.6 4.645 1.909 9.677 1.046 14.5l4.981-.004a3.5 3.5 0 0 0 2.666-5.766L89.91 40.955h-.275zm-70.348.049l-9.187.008L.832 51.926a3.5 3.5 0 0 0 2.67 5.765l30.383-.021a29.476 29.476 0 0 1-.358-7l-22.459.016l8.22-9.682zm59.01 9.637l-31.125.02a15.46 15.46 0 0 0 .369 5.804c.1.404.221.802.355 1.195l29.676-.02a16.084 16.084 0 0 0 .725-7zm-59.01 11.957l-9.187.007L.832 73.52a3.5 3.5 0 0 0 2.67 5.765l47.207-.033c-3.646-1.63-6.93-4.042-9.623-6.992l-30.018.02l8.22-9.682zm70.828.193a28.658 28.658 0 0 1-3.527 6.662l2.355 2.774h-1.158c1.811 2.319 3.6 4.654 5.383 6.996l3.334-.002a3.5 3.5 0 0 0 2.666-5.766l-9.053-10.664z" fill="currentColor" />
    <path d="M66.129 27.495c-6.422-.87-13.175.702-18.72 4.925c-11.09 8.444-13.247 24.366-4.802 35.456c7.905 10.38 22.34 12.883 33.25 6.237l2.083 2.736a2.69 4.051 52.712 0 0 .106 2.494l15.12 19.855a2.69 4.051 52.712 0 0 4.852-.314a2.69 4.051 52.712 0 0 1.594-4.595l-15.12-19.855a2.69 4.051 52.712 0 0-2.376-.765l-2.084-2.737c9.31-8.75 10.737-23.33 2.833-33.71c-4.223-5.546-10.314-8.857-16.736-9.727zm-.75 5.537a19.617 19.617 0 0 1 13.013 7.596a19.635 19.635 0 0 1-3.735 27.577a19.635 19.635 0 0 1-27.576-3.735a19.635 19.635 0 0 1 3.734-27.576a19.614 19.614 0 0 1 14.564-3.862z" fill="currentColor" />
  </svg>
);

// ── Perfect Match Icon (from check-square-svgrepo-com.svg) — replaces TargetIcon ──
export const PerfectMatchIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M7.25007 2.38782C8.54878 2.0992 10.1243 2 12 2C13.8757 2 15.4512 2.0992 16.7499 2.38782C18.06 2.67897 19.1488 3.176 19.9864 4.01358C20.824 4.85116 21.321 5.94002 21.6122 7.25007C21.9008 8.54878 22 10.1243 22 12C22 13.8757 21.9008 15.4512 21.6122 16.7499C21.321 18.06 20.824 19.1488 19.9864 19.9864C19.1488 20.824 18.06 21.321 16.7499 21.6122C15.4512 21.9008 13.8757 22 12 22C10.1243 22 8.54878 21.9008 7.25007 21.6122C5.94002 21.321 4.85116 20.824 4.01358 19.9864C3.176 19.1488 2.67897 18.06 2.38782 16.7499C2.0992 15.4512 2 13.8757 2 12C2 10.1243 2.0992 8.54878 2.38782 7.25007C2.67897 5.94002 3.176 4.85116 4.01358 4.01358C4.85116 3.176 5.94002 2.67897 7.25007 2.38782ZM15.7071 9.29289C16.0976 9.68342 16.0976 10.3166 15.7071 10.7071L12.0243 14.3899C11.4586 14.9556 10.5414 14.9556 9.97568 14.3899L8.29289 12.7071C7.90237 12.3166 7.90237 11.6834 8.29289 11.2929C8.68342 10.9024 9.31658 10.9024 9.70711 11.2929L11 12.5858L14.2929 9.29289C14.6834 8.90237 15.3166 8.90237 15.7071 9.29289Z" fill="currentColor" />
  </svg>
);

// ── More Horizontal Icon (inline — replaces Lucide MoreHorizontal in InAppBrowserBanner) ──
export const MoreHorizontalIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="5" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="19" cy="12" r="2" fill="currentColor" />
  </svg>
);

// ── Page Route Icon (from page-route.svg) ────────────────────────────────────
export const PageRouteIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M6.14214 6.14214C8.90356 3.38071 10.2843 2 12 2C13.7157 2 15.0964 3.38071 17.8579 6.14214C20.6193 8.90356 22 10.2843 22 12C22 13.7157 20.6193 15.0964 17.8579 17.8579C15.0964 20.6193 13.7157 22 12 22C10.2843 22 8.90356 20.6193 6.14214 17.8579C3.38071 15.0964 2 13.7157 2 12C2 10.2843 3.38071 8.90356 6.14214 6.14214ZM13.8463 8.45285C13.5441 8.16955 13.0695 8.18486 12.7862 8.48704C12.5029 8.78923 12.5182 9.26386 12.8204 9.54715L14.1034 10.75H10.6667C10.1116 10.75 9.28861 10.9003 8.5804 11.3784C7.83208 11.8835 7.25 12.7345 7.25 14C7.25 14.4142 7.58579 14.75 8 14.75C8.41421 14.75 8.75 14.4142 8.75 14C8.75 13.2655 9.05681 12.8665 9.41961 12.6216C9.8225 12.3497 10.3329 12.25 10.6667 12.25H14.1034L12.8204 13.4528C12.5182 13.7361 12.5029 14.2108 12.7862 14.513C13.0695 14.8151 13.5441 14.8305 13.8463 14.5472L16.513 12.0472C16.6642 11.9054 16.75 11.7073 16.75 11.5C16.75 11.2927 16.6642 11.0946 16.513 10.9528L13.8463 8.45285Z" fill="currentColor" />
  </svg>
);

// ── Legislative Tracker Icon (from legislative-tracker.svg) ──────────────────
export const LegislativeTrackerIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <g transform="translate(0, 2)" fill="currentColor">
      <path d="M3.348,4.007 C3.322,4.007 3.29,4.021 3.262,4.024 L3.293,3.994 L0.025,1.965 L0.011,2.562 L1.511,5.022 C1.234,5.363 1.038,5.728 1.038,6.01 L1.038,10.918 L3,10.918 L3,9.263 L5.98,7.929 L8.999,7.929 L9.666,10.918 L10.918,10.918 L10.918,5.328 L9.911,4.008 L3.348,4.008 L3.348,4.007 Z" />
      <path d="M13.752,1.623 L13.336,0.238 L10.681,2.86 L12.01,4.243 L14.82,4.847 L16.012,3.975 L13.752,1.623 Z" />
    </g>
  </svg>
);

export const LanguagesIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="796 796 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <g fill="currentColor">
      <path d="M973.166,818.5H818.833c-12.591,0-22.833,10.243-22.833,22.833v109.333c0,12.59,10.243,22.833,22.833,22.833h154.333
        c12.59,0,22.834-10.243,22.834-22.833V841.333C996,828.743,985.756,818.5,973.166,818.5z M896,961.5h-77.167
        c-5.973,0-10.833-4.859-10.833-10.833V841.333c0-5.974,4.86-10.833,10.833-10.833H896V961.5z M978.58,872.129
        c-0.547,9.145-5.668,27.261-20.869,39.845c4.615,1.022,9.629,1.573,14.92,1.573v12c-10.551,0-20.238-1.919-28.469-5.325
        c-7.689,3.301-16.969,5.325-28.125,5.325v-12c5.132,0,9.924-0.501,14.366-1.498c-8.412-7.016-13.382-16.311-13.382-26.78h11.999
        c0,8.857,5.66,16.517,14.884,21.623c4.641-2.66,8.702-6.112,12.164-10.351c5.628-6.886,8.502-14.521,9.754-20.042h-49.785v-12
        h22.297v-11.986h12V864.5h21.055c1.986,0,3.902,0.831,5.258,2.28C977.986,868.199,978.697,870.155,978.58,872.129z"/>
      <g>
        <path d="M839.035,914.262l-4.45,11.258h-15.971l26.355-61.09h15.971l25.746,61.09h-16.583l-4.363-11.258H839.035z
           M852.475,879.876l-8.902,22.604h17.629L852.475,879.876z"/>
      </g>
    </g>
  </svg>
);

export const InstagramIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="2" y="2" width="28" height="28" rx="6" fill="url(#paint0_radial_87_7153)" />
    <rect x="2" y="2" width="28" height="28" rx="6" fill="url(#paint1_radial_87_7153)" />
    <rect x="2" y="2" width="28" height="28" rx="6" fill="url(#paint2_radial_87_7153)" />
    <path d="M23 10.5C23 11.3284 22.3284 12 21.5 12C20.6716 12 20 11.3284 20 10.5C20 9.67157 20.6716 9 21.5 9C22.3284 9 23 9.67157 23 10.5Z" fill="white" />
    <path fillRule="evenodd" clipRule="evenodd" d="M16 21C18.7614 21 21 18.7614 21 16C21 13.2386 18.7614 11 16 11C13.2386 11 11 13.2386 11 16C11 18.7614 13.2386 21 16 21ZM16 19C17.6569 19 19 17.6569 19 16C19 14.3431 17.6569 13 16 13C14.3431 13 13 14.3431 13 16C13 17.6569 14.3431 19 16 19Z" fill="white" />
    <path fillRule="evenodd" clipRule="evenodd" d="M6 15.6C6 12.2397 6 10.5595 6.65396 9.27606C7.2292 8.14708 8.14708 7.2292 9.27606 6.65396C10.5595 6 12.2397 6 15.6 6H16.4C19.7603 6 21.4405 6 22.7239 6.65396C23.8529 7.2292 24.7708 8.14708 25.346 9.27606C26 10.5595 26 12.2397 26 15.6V16.4C26 19.7603 26 21.4405 25.346 22.7239C24.7708 23.8529 23.8529 24.7708 22.7239 25.346C21.4405 26 19.7603 26 16.4 26H15.6C12.2397 26 10.5595 26 9.27606 25.346C8.14708 24.7708 7.2292 23.8529 6.65396 22.7239C6 21.4405 6 19.7603 6 16.4V15.6ZM15.6 8H16.4C18.1132 8 19.2777 8.00156 20.1779 8.0751C21.0548 8.14674 21.5032 8.27659 21.816 8.43597C22.5686 8.81947 23.1805 9.43139 23.564 10.184C23.7234 10.4968 23.8533 10.9452 23.9249 11.8221C23.9984 12.7223 24 13.8868 24 15.6V16.4C24 18.1132 23.9984 19.2777 23.9249 20.1779C23.8533 21.0548 23.7234 21.5032 23.564 21.816C23.1805 22.5686 22.5686 23.1805 21.816 23.564C21.5032 23.7234 21.0548 23.8533 20.1779 23.9249C19.2777 23.9984 18.1132 24 16.4 24H15.6C13.8868 24 12.7223 23.9984 11.8221 23.9249C10.9452 23.8533 10.4968 23.7234 10.184 23.564C9.43139 23.1805 8.81947 22.5686 8.43597 21.816C8.27659 21.5032 8.14674 21.0548 8.0751 20.1779C8.00156 19.2777 8 18.1132 8 16.4V15.6C8 13.8868 8.00156 12.7223 8.0751 11.8221C8.14674 10.9452 8.27659 10.4968 8.43597 10.184C8.81947 9.43139 9.43139 8.81947 10.184 8.43597C10.4968 8.27659 10.9452 8.14674 11.8221 8.0751C12.7223 8.00156 13.8868 8 15.6 8Z" fill="white" />
    <defs>
      <radialGradient id="paint0_radial_87_7153" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 23) rotate(-55.3758) scale(25.5196)">
        <stop stopColor="#B13589" />
        <stop offset="0.79309" stopColor="#C62F94" />
        <stop offset="1" stopColor="#8A3AC8" />
      </radialGradient>
      <radialGradient id="paint1_radial_87_7153" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(11 31) rotate(-65.1363) scale(22.5942)">
        <stop stopColor="#E0E8B7" />
        <stop offset="0.444662" stopColor="#FB8A2E" />
        <stop offset="0.71474" stopColor="#E2425C" />
        <stop offset="1" stopColor="#E2425C" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="paint2_radial_87_7153" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0.500002 3) rotate(-8.1301) scale(38.8909 8.31836)">
        <stop offset="0.156701" stopColor="#406ADC" />
        <stop offset="0.467799" stopColor="#6A45BE" />
        <stop offset="1" stopColor="#6A45BE" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

export const RedditIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M16 2C8.27812 2 2 8.27812 2 16C2 23.7219 8.27812 30 16 30C23.7219 30 30 23.7219 30 16C30 8.27812 23.7219 2 16 2Z" fill="#FC471E" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="M20.0193 8.90951C20.0066 8.98984 20 9.07226 20 9.15626C20 10.0043 20.6716 10.6918 21.5 10.6918C22.3284 10.6918 23 10.0043 23 9.15626C23 8.30819 22.3284 7.6207 21.5 7.6207C21.1309 7.6207 20.7929 7.7572 20.5315 7.98359L16.6362 7L15.2283 12.7651C13.3554 12.8913 11.671 13.4719 10.4003 14.3485C10.0395 13.9863 9.54524 13.7629 9 13.7629C7.89543 13.7629 7 14.6796 7 15.8103C7 16.5973 7.43366 17.2805 8.06967 17.6232C8.02372 17.8674 8 18.1166 8 18.3696C8 21.4792 11.5817 24 16 24C20.4183 24 24 21.4792 24 18.3696C24 18.1166 23.9763 17.8674 23.9303 17.6232C24.5663 17.2805 25 16.5973 25 15.8103C25 14.6796 24.1046 13.7629 23 13.7629C22.4548 13.7629 21.9605 13.9863 21.5997 14.3485C20.2153 13.3935 18.3399 12.7897 16.2647 12.7423L17.3638 8.24143L20.0193 8.90951ZM12.5 18.8815C13.3284 18.8815 14 18.194 14 17.3459C14 16.4978 13.3284 15.8103 12.5 15.8103C11.6716 15.8103 11 16.4978 11 17.3459C11 18.194 11.6716 18.8815 12.5 18.8815ZM19.5 18.8815C20.3284 18.8815 21 18.194 21 17.3459C21 16.4978 20.3284 15.8103 19.5 15.8103C18.6716 15.8103 18 16.4978 18 17.3459C18 18.194 18.6716 18.8815 19.5 18.8815ZM12.7773 20.503C12.5476 20.3462 12.2372 20.4097 12.084 20.6449C11.9308 20.8802 11.9929 21.198 12.2226 21.3548C13.3107 22.0973 14.6554 22.4686 16 22.4686C17.3446 22.4686 18.6893 22.0973 19.7773 21.3548C20.0071 21.198 20.0692 20.8802 19.916 20.6449C19.7628 20.4097 19.4524 20.3462 19.2226 20.503C18.3025 21.1309 17.1513 21.4449 16 21.4449C15.3173 21.4449 14.6345 21.3345 14 21.1137C13.5646 20.9621 13.1518 20.7585 12.7773 20.503Z" fill="white" />
  </svg>
);

export const TwitterIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="24" cy="24" r="20" fill="#1DA1F2" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="M36 16.3086C35.1177 16.7006 34.1681 16.9646 33.1722 17.0838C34.1889 16.4742 34.9697 15.5095 35.3368 14.36C34.3865 14.9247 33.3314 15.3335 32.2107 15.5551C31.3123 14.5984 30.0316 14 28.6165 14C25.8975 14 23.6928 16.2047 23.6928 18.9237C23.6928 19.3092 23.7368 19.6852 23.8208 20.046C19.7283 19.8412 16.1005 17.8805 13.6719 14.9015C13.2479 15.6287 13.0055 16.4742 13.0055 17.3766C13.0055 19.0845 13.8735 20.5916 15.1958 21.4747C14.3878 21.4491 13.6295 21.2275 12.9647 20.8587V20.9203C12.9647 23.3066 14.663 25.296 16.9141 25.7496C16.5013 25.8616 16.0661 25.9224 15.6174 25.9224C15.2998 25.9224 14.991 25.8912 14.6902 25.8336C15.3166 27.7895 17.1357 29.2134 19.2899 29.2534C17.6052 30.5733 15.4822 31.3612 13.1751 31.3612C12.7767 31.3612 12.3848 31.338 12 31.2916C14.1791 32.6884 16.7669 33.5043 19.5475 33.5043C28.6037 33.5043 33.5562 26.0016 33.5562 19.4956C33.5562 19.282 33.5522 19.0693 33.5418 18.8589C34.5049 18.1629 35.34 17.2958 36 16.3086Z" fill="white" />
  </svg>
);

export const TiktokIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M8.45095 19.7926C8.60723 18.4987 9.1379 17.7743 10.1379 17.0317C11.5688 16.0259 13.3561 16.5948 13.3561 16.5948V13.2197C13.7907 13.2085 14.2254 13.2343 14.6551 13.2966V17.6401C14.6551 17.6401 12.8683 17.0712 11.4375 18.0775C10.438 18.8196 9.90623 19.5446 9.7505 20.8385C9.74562 21.5411 9.87747 22.4595 10.4847 23.2536C10.3345 23.1766 10.1815 23.0889 10.0256 22.9905C8.68807 22.0923 8.44444 20.7449 8.45095 19.7926ZM22.0352 6.97898C21.0509 5.90039 20.6786 4.81139 20.5441 4.04639H21.7823C21.7823 4.04639 21.5354 6.05224 23.3347 8.02482L23.3597 8.05134C22.8747 7.7463 22.43 7.38624 22.0352 6.97898ZM28 10.0369V14.293C28 14.293 26.42 14.2312 25.2507 13.9337C23.6179 13.5176 22.5685 12.8795 22.5685 12.8795C22.5685 12.8795 21.8436 12.4245 21.785 12.3928V21.1817C21.785 21.6711 21.651 22.8932 21.2424 23.9125C20.709 25.246 19.8859 26.1212 19.7345 26.3001C19.7345 26.3001 18.7334 27.4832 16.9672 28.28C15.3752 28.9987 13.9774 28.9805 13.5596 28.9987C13.5596 28.9987 11.1434 29.0944 8.96915 27.6814C8.49898 27.3699 8.06011 27.0172 7.6582 26.6277L7.66906 26.6355C9.84383 28.0485 12.2595 27.9528 12.2595 27.9528C12.6779 27.9346 14.0756 27.9528 15.6671 27.2341C17.4317 26.4374 18.4344 25.2543 18.4344 25.2543C18.5842 25.0754 19.4111 24.2001 19.9423 22.8662C20.3498 21.8474 20.4849 20.6247 20.4849 20.1354V11.3475C20.5435 11.3797 21.2679 11.8347 21.2679 11.8347C21.2679 11.8347 22.3179 12.4734 23.9506 12.8889C25.1204 13.1864 26.7 13.2483 26.7 13.2483V9.91314C27.2404 10.0343 27.7011 10.0671 28 10.0369Z" fill="#EE1D52" />
    <path d="M26.7009 9.91314V13.2472C26.7009 13.2472 25.1213 13.1853 23.9515 12.8879C22.3188 12.4718 21.2688 11.8337 21.2688 11.8337C21.2688 11.8337 20.5444 11.3787 20.4858 11.3464V20.1364C20.4858 20.6258 20.3518 21.8484 19.9432 22.8672C19.4098 24.2012 18.5867 25.0764 18.4353 25.2553C18.4353 25.2553 17.4337 26.4384 15.668 27.2352C14.0765 27.9539 12.6788 27.9357 12.2604 27.9539C12.2604 27.9539 9.84473 28.0496 7.66995 26.6366L7.6591 26.6288C7.42949 26.4064 7.21336 26.1717 7.01177 25.9257C6.31777 25.0795 5.89237 24.0789 5.78547 23.7934C5.78529 23.7922 5.78529 23.791 5.78547 23.7898C5.61347 23.2937 5.25209 22.1022 5.30147 20.9482C5.38883 18.9122 6.10507 17.6625 6.29444 17.3494C6.79597 16.4957 7.44828 15.7318 8.22233 15.0919C8.90538 14.5396 9.6796 14.1002 10.5132 13.7917C11.4144 13.4295 12.3794 13.2353 13.3565 13.2197V16.5948C13.3565 16.5948 11.5691 16.028 10.1388 17.0317C9.13879 17.7743 8.60812 18.4987 8.45185 19.7926C8.44534 20.7449 8.68897 22.0923 10.0254 22.991C10.1813 23.0898 10.3343 23.1775 10.4845 23.2541C10.7179 23.5576 11.0021 23.8221 11.3255 24.0368C12.631 24.8632 13.7249 24.9209 15.1238 24.3842C16.0565 24.0254 16.7586 23.2167 17.0842 22.3206C17.2888 21.7611 17.2861 21.1978 17.2861 20.6154V4.04639H20.5417C20.6763 4.81139 21.0485 5.90039 22.0328 6.97898C22.4276 7.38624 22.8724 7.7463 23.3573 8.05134C23.5006 8.19955 24.2331 8.93231 25.1734 9.38216C25.6596 9.61469 26.1722 9.79285 26.7009 9.91314Z" fill="#000000" />
    <path d="M4.48926 22.7568V22.7594L4.57004 22.9784C4.56076 22.9529 4.53074 22.8754 4.48926 22.7568Z" fill="#69C9D0" />
    <path d="M10.5128 13.7916C9.67919 14.1002 8.90498 14.5396 8.22192 15.0918C7.44763 15.7332 6.79548 16.4987 6.29458 17.354C6.10521 17.6661 5.38897 18.9168 5.30161 20.9528C5.25223 22.1068 5.61361 23.2983 5.78561 23.7944C5.78543 23.7956 5.78543 23.7968 5.78561 23.798C5.89413 24.081 6.31791 25.0815 7.01191 25.9303C7.2135 26.1763 7.42963 26.4111 7.65924 26.6334C6.92357 26.1457 6.26746 25.5562 5.71236 24.8839C5.02433 24.0451 4.60001 23.0549 4.48932 22.7626C4.48919 22.7605 4.48919 22.7584 4.48932 22.7564V22.7527C4.31677 22.2571 3.95431 21.0651 4.00477 19.9096C4.09213 17.8736 4.80838 16.6239 4.99775 16.3108C5.4985 15.4553 6.15067 14.6898 6.92509 14.0486C7.608 13.4961 8.38225 13.0567 9.21598 12.7484C9.73602 12.5416 10.2778 12.3891 10.8319 12.2934C11.6669 12.1537 12.5198 12.1415 13.3588 12.2575V13.2196C12.3808 13.2349 11.4148 13.4291 10.5128 13.7916Z" fill="#69C9D0" />
    <path d="M20.5438 4.04635H17.2881V20.6159C17.2881 21.1983 17.2881 21.76 17.0863 22.3211C16.7575 23.2167 16.058 24.0253 15.1258 24.3842C13.7265 24.923 12.6326 24.8632 11.3276 24.0368C11.0036 23.823 10.7187 23.5594 10.4844 23.2567C11.5962 23.8251 12.5913 23.8152 13.8241 23.341C14.7558 22.9821 15.4563 22.1734 15.784 21.2774C15.9891 20.7178 15.9864 20.1546 15.9864 19.5726V3H20.4819C20.4819 3 20.4315 3.41188 20.5438 4.04635ZM26.7002 8.99104V9.9131C26.1725 9.79263 25.6609 9.61447 25.1755 9.38213C24.2352 8.93228 23.5026 8.19952 23.3594 8.0513C23.5256 8.1559 23.6981 8.25106 23.8759 8.33629C25.0192 8.88339 26.1451 9.04669 26.7002 8.99104Z" fill="#69C9D0" />
  </svg>
);

export const BookIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M5 17H10C11.1046 17 12 17.8954 12 19V10C12 7.17157 12 5.75736 11.1213 4.87868C10.2426 4 8.82843 4 6 4H5C4.05719 4 3.58579 4 3.29289 4.29289C3 4.58579 3 5.05719 3 6V15C3 15.9428 3 16.4142 3.29289 16.7071C3.58579 17 4.05719 17 5 17Z" fill="currentColor" />
    <path d="M19 17H14C12.8954 17 12 17.8954 12 19V10C12 7.17157 12 5.75736 12.8787 4.87868C13.7574 4 15.1716 4 18 4H19C19.9428 4 20.4142 4 20.7071 4.29289C21 4.58579 21 5.05719 21 6V15C21 15.9428 21 16.4142 20.7071 16.7071C20.4142 17 19.9428 17 19 17Z" fill="currentColor" />
  </svg>
);

export const TrophyIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="-4 0 20 20" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <g transform="translate(-6 -2)">
      <path fill="currentColor" d="M16,3,8,6,9,17h6Z" />
      <path d="M15,17H9L8,6l8-3Zm2,1a1,1,0,0,0-1-1H8a1,1,0,0,0-1,1v3H17Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </g>
  </svg>
);

export const ShareExportIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M9 6L12 3M12 3L15 6M12 3V13M7.00023 10C6.06835 10 5.60241 10 5.23486 10.1522C4.74481 10.3552 4.35523 10.7448 4.15224 11.2349C4 11.6024 4 12.0681 4 13V17.8C4 18.9201 4 19.4798 4.21799 19.9076C4.40973 20.2839 4.71547 20.5905 5.0918 20.7822C5.5192 21 6.07899 21 7.19691 21H16.8036C17.9215 21 18.4805 21 18.9079 20.7822C19.2842 20.5905 19.5905 20.2839 19.7822 19.9076C20 19.4802 20 18.921 20 17.8031V13C20 12.0681 19.9999 11.6024 19.8477 11.2349C19.6447 10.7448 19.2554 10.3552 18.7654 10.1522C18.3978 10 17.9319 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DocumentIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512.001 512.001" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <g fill="currentColor">
      <path d="M463.996,126.864L340.192,3.061C338.231,1.101,335.574,0,332.803,0H95.726C67.724,0,44.944,22.782,44.944,50.784v410.434
        c0,28.001,22.781,50.783,50.783,50.783h320.547c28.002,0,50.783-22.781,50.783-50.783V134.253
        C467.056,131.482,465.955,128.824,463.996,126.864z M343.255,35.679l88.127,88.126H373.14c-7.984,0-15.49-3.109-21.134-8.753
        c-5.643-5.643-8.752-13.148-8.751-21.131V35.679z M446.158,461.217c0,16.479-13.406,29.885-29.884,29.885H95.726
        c-16.479,0-29.885-13.406-29.885-29.885V50.784c0.001-16.479,13.407-29.886,29.885-29.886h226.631v73.021
        c-0.002,13.565,5.28,26.318,14.871,35.909c9.592,9.592,22.345,14.874,35.911,14.874h73.018V461.217z"/>
      <path d="M275.092,351.492h-4.678c-5.77,0-10.449,4.678-10.449,10.449s4.679,10.449,10.449,10.449h4.678
        c5.77,0,10.449-4.678,10.449-10.449S280.862,351.492,275.092,351.492z"/>
      <path d="M236.61,351.492H135.118c-5.77,0-10.449,4.678-10.449,10.449s4.679,10.449,10.449,10.449H236.61
        c5.77,0,10.449-4.678,10.449-10.449S242.381,351.492,236.61,351.492z"/>
      <path d="M376.882,303.747H135.119c-5.77,0-10.449,4.678-10.449,10.449c0,5.771,4.679,10.449,10.449,10.449h241.763
        c5.77,0,10.449-4.678,10.449-10.449C387.331,308.425,382.652,303.747,376.882,303.747z"/>
      <path d="M376.882,256H135.119c-5.77,0-10.449,4.678-10.449,10.449c0,5.771,4.679,10.449,10.449,10.449h241.763
        c5.77,0,10.449-4.678,10.449-10.449C387.331,260.678,382.652,256,376.882,256z"/>
      <path d="M376.882,208.255H135.119c-5.77,0-10.449,4.678-10.449,10.449c0,5.771,4.679,10.449,10.449,10.449h241.763
        c5.77,0,10.449-4.678,10.449-10.449S382.652,208.255,376.882,208.255z"/>
    </g>
  </svg>
);

export const AskCekaAiIcon = ({ size = 24, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M7.45648 3.08984C4.21754 4.74468 2 8.1136 2 12.0004C2 13.6001 2.37562 15.1121 3.04346 16.4529C3.22094 16.8092 3.28001 17.2165 3.17712 17.6011L2.58151 19.8271C2.32295 20.7934 3.20701 21.6775 4.17335 21.4189L6.39939 20.8233C6.78393 20.7204 7.19121 20.7795 7.54753 20.957C8.88836 21.6248 10.4003 22.0005 12 22.0005C16.8853 22.0005 20.9524 18.4973 21.8263 13.866C20.1758 15.7851 17.7298 17.0004 15 17.0004C10.0294 17.0004 6 12.971 6 8.00045C6 6.18869 6.53534 4.50197 7.45648 3.08984Z" fill="currentColor" />
    <path opacity="0.5" d="M21.8263 13.8655C21.9403 13.2611 22 12.6375 22 12C22 6.47715 17.5228 2 12 2C10.4467 2 8.97611 2.35415 7.66459 2.98611C7.59476 3.01975 7.52539 3.05419 7.45648 3.08939C6.53534 4.50152 6 6.18824 6 8C6 12.9706 10.0294 17 15 17C17.7298 17 20.1758 15.7847 21.8263 13.8655Z" fill="currentColor" />
  </svg>
);

export const FollowButton2Icon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5z" fill="currentColor" />
  </svg>
);

export const FollowedIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M15.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L12.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z" fill="currentColor" />
    <path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="currentColor" />
  </svg>
);

export const DeepIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path opacity="0.5" d="M3 10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H13C16.7712 2 18.6569 2 19.8284 3.17157C21 4.34315 21 6.22876 21 10V14C21 17.7712 21 19.6569 19.8284 20.8284C18.6569 22 16.7712 22 13 22H11C7.22876 22 5.34315 22 4.17157 20.8284C3 19.6569 3 17.7712 3 14V10Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M12 5.25C12.4142 5.25 12.75 5.58579 12.75 6V7.25H14C14.4142 7.25 14.75 7.58579 14.75 8C14.75 8.41421 14.4142 8.75 14 8.75L12.75 8.75L12.75 10C12.75 10.4142 12.4142 10.75 12 10.75C11.5858 10.75 11.25 10.4142 11.25 10L11.25 8.75H9.99997C9.58575 8.75 9.24997 8.41421 9.24997 8C9.24997 7.58579 9.58575 7.25 9.99997 7.25H11.25L11.25 6C11.25 5.58579 11.5858 5.25 12 5.25ZM7.25 14C7.25 13.5858 7.58579 13.25 8 13.25H16C16.4142 13.25 16.75 13.5858 16.75 14C16.75 14.4142 16.4142 14.75 16 14.75H8C7.58579 14.75 7.25 14.4142 7.25 14ZM8.25 18C8.25 17.5858 8.58579 17.25 9 17.25H15C15.4142 17.25 15.75 17.5858 15.75 18C15.75 18.4142 15.4142 18.75 15 18.75H9C8.58579 18.75 8.25 18.4142 8.25 18Z" fill="currentColor" />
  </svg>
);

export const Deep2Icon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M475.619,295.498l-41.406-87.766c0.109-2.625,0.203-5.266,0.203-7.906c0-110.359-89.469-199.828-199.828-199.828S34.744,89.467,34.744,199.826c0,62.063,28.297,117.5,72.672,154.156v70.641c0,6.891,4.125,13.125,10.453,15.797l165.516,70.219c5.281,2.25,11.359,1.688,16.172-1.484c4.797-3.188,7.688-8.563,7.688-14.313v-59.844c0-9.484,7.688-17.172,17.172-17.172h84.75c9.484,0,17.156-7.703,17.156-17.172v-51.609c0-6.563,3.766-12.563,9.672-15.438l31.594-15.344C476.041,314.154,479.619,303.998,475.619,295.498z M234.588,335.717c-75.047,0-135.891-60.828-135.891-135.891c0-75.047,60.844-135.875,135.891-135.875s135.875,60.828,135.875,135.875C370.463,274.889,309.635,335.717,234.588,335.717z" fill="currentColor" />
    <path d="M330.432,216.623c3.672-0.281,6.484-3.328,6.484-7.016v-16.766c0-3.688-2.813-6.734-6.484-7.031l-22.234-1.734c-1.391-0.094-2.625-0.984-3.156-2.297l-7.328-17.656c-0.531-1.297-0.297-2.797,0.609-3.875l14.5-16.953c2.391-2.781,2.234-6.938-0.375-9.531l-11.859-11.875c-2.609-2.594-6.766-2.75-9.547-0.375l-16.953,14.5c-1.063,0.906-2.578,1.156-3.859,0.625l-17.656-7.328c-1.313-0.531-2.203-1.766-2.313-3.172l-1.719-22.219c-0.297-3.688-3.359-6.5-7.031-6.5h-16.781c-3.672,0-6.734,2.813-7.016,6.5l-1.719,22.219c-0.109,1.406-1.016,2.641-2.328,3.172l-17.641,7.328c-1.313,0.531-2.797,0.281-3.875-0.625l-16.953-14.5c-2.797-2.375-6.953-2.219-9.547,0.375l-11.859,11.875c-2.594,2.594-2.766,6.75-0.375,9.531l14.5,16.953c0.906,1.078,1.156,2.578,0.609,3.875l-7.313,17.656c-0.531,1.313-1.781,2.203-3.188,2.297l-22.234,1.734c-3.656,0.297-6.469,3.344-6.469,7.031v16.766c0,3.688,2.813,6.734,6.469,7.016l22.234,1.734c1.406,0.109,2.656,1,3.188,2.313l7.313,17.656c0.547,1.281,0.297,2.797-0.609,3.859l-14.5,16.969c-2.391,2.781-2.219,6.938,0.375,9.531l11.859,11.859c2.594,2.609,6.75,2.766,9.547,0.391l16.953-14.516c1.078-0.891,2.563-1.141,3.875-0.594l17.641,7.313c1.313,0.531,2.219,1.766,2.328,3.156l1.719,22.25c0.281,3.656,3.344,6.484,7.016,6.484h16.781c3.672,0,6.734-2.828,7.031-6.484l1.719-22.25c0.109-1.391,1-2.625,2.313-3.156l17.656-7.313c1.281-0.547,2.797-0.297,3.859,0.594l16.953,14.516c2.781,2.375,6.938,2.219,9.547-0.391l11.859-11.859c2.609-2.594,2.766-6.75,0.375-9.531l-14.5-16.969c-0.906-1.063-1.141-2.578-0.609-3.859l7.328-17.656c0.531-1.313,1.766-2.203,3.156-2.313L330.432,216.623z M233.119,236.311c-9.375,0-18.188-3.656-24.813-10.281s-10.266-15.438-10.266-24.797c0-9.375,3.641-18.188,10.266-24.813c6.625-6.641,15.438-10.281,24.813-10.281s18.188,3.641,24.813,10.281c6.625,6.625,10.266,15.438,10.266,24.813c0,9.359-3.641,18.172-10.266,24.797S242.494,236.311,233.119,236.311z" fill="currentColor" />
  </svg>
);

export const SummaryIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M11.7086 1.53214C10.9786 1.05676 10.078 0.917375 9.27255 1.04467C8.46803 1.17183 7.62325 1.5904 7.12591 2.39445C6.9332 2.70601 6.81024 3.04646 6.7559 3.40767C5.97312 3.35525 5.18086 3.59264 4.58547 4.08919C3.98255 4.59201 3.59741 5.34432 3.59741 6.25684C3.59741 6.55614 3.63851 6.86315 3.72008 7.17654C3.42298 7.23942 3.13697 7.34918 2.86932 7.50027C1.98542 7.99927 1.36438 8.90663 1.11913 9.88841C0.869371 10.8882 0.989124 12.0467 1.70052 13.0391C2.0609 13.5419 2.54903 13.9691 3.1623 14.305C3.01053 14.5081 2.88229 14.7271 2.77811 14.9565C2.35249 15.8935 2.32044 17.0038 2.64559 17.98C2.97535 18.9701 3.69756 19.8871 4.83624 20.3254C5.57833 20.6111 6.42615 20.6665 7.35551 20.4749C7.39798 20.9494 7.52745 21.3806 7.74983 21.7577C8.22598 22.5651 9.0236 22.9458 9.80541 22.9947C10.5523 23.0414 11.3758 22.778 12 22.2458C12.6242 22.778 13.4477 23.0414 14.1946 22.9947C14.9764 22.9458 15.774 22.5651 16.2502 21.7577C16.4725 21.3806 16.602 20.9494 16.6445 20.4749C17.5738 20.6665 18.4217 20.6111 19.1638 20.3254C20.3024 19.8871 21.0246 18.9701 21.3544 17.98C21.6796 17.0038 21.6475 15.8935 21.2219 14.9565C21.1177 14.7271 20.9895 14.5081 20.8377 14.305C21.451 13.9691 21.9391 13.5419 22.2995 13.0391C23.0109 12.0467 23.1306 10.8882 22.8809 9.88841C22.6356 8.90663 22.0146 7.99927 21.1307 7.50027C20.863 7.34918 20.577 7.23942 20.2799 7.17654C20.3615 6.86315 20.4026 6.55614 20.4026 6.25684C20.4026 5.34432 20.0175 4.59201 19.4145 4.08919C18.8191 3.59264 18.0269 3.35525 17.2441 3.40767C17.1898 3.04646 17.0668 2.70601 16.8741 2.39445C16.3767 1.5904 15.532 1.17183 14.7274 1.04467C13.922 0.917375 13.0214 1.05676 12.2914 1.53214C11.9861 1.73097 12.0139 1.73097 11.7086 1.53214ZM13.0033 20.0518L13.0033 17.5288C13.0045 17.0494 13.1133 16.3457 13.3939 15.7998C13.6573 15.2872 13.9946 15.0268 14.5082 15.0268C15.0623 15.0268 15.5115 14.5773 15.5115 14.0227C15.5115 13.4682 15.0623 13.0186 14.5082 13.0186C13.9202 13.0186 13.4216 13.16 13.0033 13.3894V12.5084C13.0045 12.029 13.1133 11.3254 13.3939 10.7794C13.6573 10.2668 13.9946 10.0064 14.5082 10.0064C15.0623 10.0064 15.5115 9.55688 15.5115 9.00234C15.5115 8.4478 15.0623 7.99826 14.5082 7.99826C13.9202 7.99826 13.4216 8.13957 13.0033 8.36902L13.0033 3.97532C13.005 3.57853 13.1671 3.35779 13.3859 3.21528C13.6436 3.04746 14.0284 2.96723 14.4144 3.02824C14.8013 3.08939 15.0539 3.26704 15.1679 3.45142C15.2603 3.60078 15.3726 3.9329 15.091 4.59054C14.9015 5.03294 15.0524 5.54766 15.4507 5.8175C15.849 6.08734 16.3825 6.03639 16.7226 5.69604C17.0903 5.32811 17.7563 5.32032 18.1299 5.63189C18.2795 5.75662 18.396 5.94564 18.396 6.25684C18.396 6.59422 18.2548 7.14633 17.705 7.91672C17.4235 8.31116 17.4637 8.85055 17.8006 9.19878C18.1375 9.54701 18.6749 9.60465 19.0779 9.33577C19.5101 9.04741 19.8566 9.08664 20.1448 9.24934C20.4837 9.44063 20.8032 9.85112 20.9342 10.3755C21.0607 10.8818 20.9923 11.4176 20.669 11.8686C20.3466 12.3184 19.6765 12.8121 18.3565 13.0323C17.8683 13.1137 17.5124 13.5392 17.5182 14.0344C17.5239 14.5296 17.8896 14.9467 18.3795 15.0167C18.8812 15.0884 19.207 15.3732 19.3952 15.7874C19.5966 16.231 19.6273 16.8151 19.4508 17.345C19.2789 17.861 18.9351 18.2619 18.4434 18.4511C17.9498 18.6411 17.1399 18.6809 15.9267 18.129C15.5761 17.9695 15.1653 18.025 14.8694 18.2716C14.5735 18.5183 14.4448 18.9127 14.5382 19.2866C14.6621 19.7827 14.8668 20.9406 14.0694 20.9905C13.5184 21.0249 13.0062 20.6055 13.0033 20.0518ZM10.9967 3.97532C10.995 3.57853 10.8329 3.35779 10.6141 3.21528C10.3564 3.04746 9.97157 2.96723 9.58558 3.02824C9.19869 3.08939 8.94611 3.26704 8.83207 3.45142C8.73968 3.60078 8.62739 3.9329 8.90901 4.59054C9.09846 5.03294 8.94757 5.54766 8.54931 5.8175C8.15105 6.08734 7.61747 6.03639 7.27739 5.69604C6.90975 5.32811 6.24365 5.32032 5.87006 5.63189C5.72051 5.75662 5.604 5.94564 5.604 6.25684C5.604 6.59422 5.74515 7.14633 6.29501 7.91672C6.57653 8.31116 6.53629 8.85055 6.19937 9.19878C5.86246 9.54701 5.32505 9.60465 4.92206 9.33577C4.48987 9.04741 4.1434 9.08664 3.8552 9.24934C3.51634 9.44063 3.19679 9.85112 3.06581 10.3755C2.93933 10.8818 3.0077 11.4176 3.33095 11.8686C3.65342 12.3184 4.32349 12.8121 5.64353 13.0323C6.13166 13.1137 6.48757 13.5392 6.48182 14.0344C6.47607 14.5296 6.11037 14.9467 5.62048 15.0167C5.1188 15.0884 4.793 15.3732 4.60484 15.7874C4.40339 16.231 4.37273 16.8151 4.54922 17.345C4.7211 17.861 5.06489 18.2619 5.55656 18.4511C6.05021 18.6411 6.86015 18.6809 8.0733 18.129C8.42388 17.9695 8.83474 18.025 9.13063 18.2716C9.42652 18.5183 9.5552 18.9127 9.4618 19.2866C9.33788 19.7827 9.13324 20.9406 9.93058 20.9905C10.4816 21.0249 10.9938 20.6055 10.9967 20.0518L10.9967 20.0472V17.5292C10.9955 17.0498 10.8868 16.3459 10.6061 15.7998C10.3427 15.2872 10.0054 15.0268 9.49176 15.0268C8.93765 15.0268 8.48846 14.5773 8.48846 14.0227C8.48846 13.4682 8.93765 13.0186 9.49176 13.0186C10.0798 13.0186 10.5784 13.16 10.9967 13.3894V12.5088C10.9955 12.0294 10.8868 11.3255 10.6061 10.7794C10.3427 10.2668 10.0054 10.0064 9.49176 10.0064C8.93765 10.0064 8.48846 9.55688 8.48846 10.0064C8.48846 8.4478 8.93765 7.99826 9.49176 7.99826C10.0798 7.99826 10.5784 8.13957 10.9967 8.36902L10.9967 3.97532Z" fill="currentColor" />
  </svg>
);

export const Summary2Icon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M11.7086 1.53214C10.9786 1.05676 10.078 0.917375 9.27255 1.04467C8.46803 1.17183 7.62325 1.5904 7.12591 2.39445C6.9332 2.70601 6.81024 3.04646 6.7559 3.40767C5.97312 3.35525 5.18086 3.59264 4.58547 4.08919C3.98255 4.59201 3.59741 5.34432 3.59741 6.25684C3.59741 6.55614 3.63851 6.86315 3.72008 7.17654C3.42298 7.23942 3.13697 7.34918 2.86932 7.50027C1.98542 7.99927 1.36438 8.90663 1.11913 9.88841C0.869371 10.8882 0.989124 12.0467 1.70052 13.0391C2.0609 13.5419 2.54903 13.9691 3.1623 14.305C3.01053 14.5081 2.88229 14.7271 2.77811 14.9565C2.35249 15.8935 2.32044 17.0038 2.64559 17.98C2.97535 18.9701 3.69756 19.8871 4.83624 20.3254C5.57833 20.6111 6.42615 20.6665 7.35551 20.4749C7.39798 20.9494 7.52745 21.3806 7.74983 21.7577C8.22598 22.5651 9.0236 22.9458 9.80541 22.9947C10.5523 23.0414 11.3758 22.778 12 22.2458C12.6242 22.778 13.4477 23.0414 14.1946 22.9947C14.9764 22.9458 15.774 22.5651 16.2502 21.7577C16.4725 21.3806 16.602 20.9494 16.6445 20.4749C17.5738 20.6665 18.4217 20.6111 19.1638 20.3254C20.3024 19.8871 21.0246 18.9701 21.3544 17.98C21.6796 17.0038 21.6475 15.8935 21.2219 14.9565C21.1177 14.7271 20.9895 14.5081 20.8377 14.305C21.451 13.9691 21.9391 13.5419 22.2995 13.0391C23.0109 12.0467 23.1306 10.8882 22.8809 9.88841C22.6356 8.90663 22.0146 7.99927 21.1307 7.50027C20.863 7.34918 20.577 7.23942 20.2799 7.17654C20.3615 6.86315 20.4026 6.55614 20.4026 6.25684C20.4026 5.34432 20.0175 4.59201 19.4145 4.08919C18.8191 3.59264 18.0269 3.35525 17.2441 3.40767C17.1898 3.04646 17.0668 2.70601 16.8741 2.39445C16.3767 1.5904 15.532 1.17183 14.7274 1.04467C13.922 0.917375 13.0214 1.05676 12.2914 1.53214C11.9861 1.73097 12.0139 1.73097 11.7086 1.53214ZM13.0033 20.0518L13.0033 17.5288C13.0045 17.0494 13.1133 16.3457 13.3939 15.7998C13.6573 15.2872 13.9946 15.0268 14.5082 15.0268C15.0623 15.0268 15.5115 14.5773 15.5115 14.0227C15.5115 13.4682 15.0623 13.0186 14.5082 13.0186C13.9202 13.0186 13.4216 13.16 13.0033 13.3894V12.5084C13.0045 12.029 13.1133 11.3254 13.3939 10.7794C13.6573 10.2668 13.9946 10.0064 14.5082 10.0064C15.0623 10.0064 15.5115 9.55688 15.5115 9.00234C15.5115 8.4478 15.0623 7.99826 14.5082 7.99826C13.9202 7.99826 13.4216 8.13957 13.0033 8.36902L13.0033 3.97532C13.005 3.57853 13.1671 3.35779 13.3859 3.21528C13.6436 3.04746 14.0284 2.96723 14.4144 3.02824C14.8013 3.08939 15.0539 3.26704 15.1679 3.45142C15.2603 3.60078 15.3726 3.9329 15.091 4.59054C14.9015 5.03294 15.0524 5.54766 15.4507 5.8175C15.849 6.08734 16.3825 6.03639 16.7226 5.69604C17.0903 5.32811 17.7563 5.32032 18.1299 5.63189C18.2795 5.75662 18.396 5.94564 18.396 6.25684C18.396 6.59422 18.2548 7.14633 17.705 7.91672C17.4235 8.31116 17.4637 8.85055 17.8006 9.19878C18.1375 9.54701 18.6749 9.60465 19.0779 9.33577C19.5101 9.04741 19.8566 9.08664 20.1448 9.24934C20.4837 9.44063 20.8032 9.85112 20.9342 10.3755C21.0607 10.8818 20.9923 11.4176 20.669 11.8686C20.3466 12.3184 19.6765 12.8121 18.3565 13.0323C17.8683 13.1137 17.5124 13.5392 17.5182 14.0344C17.5239 14.5296 17.8896 14.9467 18.3795 15.0167C18.8812 15.0884 19.207 15.3732 19.3952 15.7874C19.5966 16.231 19.6273 16.8151 19.4508 17.345C19.2789 17.861 18.9351 18.2619 18.4434 18.4511C17.9498 18.6411 17.1399 18.6809 15.9267 18.129C15.5761 17.9695 15.1653 18.025 14.8694 18.2716C14.5735 18.5183 14.4448 18.9127 14.5382 19.2866C14.6621 19.7827 14.8668 20.9406 14.0694 20.9905C13.5184 21.0249 13.0062 20.6055 13.0033 20.0518ZM10.9967 3.97532C10.995 3.57853 10.8329 3.35779 10.6141 3.21528C10.3564 3.04746 9.97157 2.96723 9.58558 3.02824C9.19869 3.08939 8.94611 3.26704 8.83207 3.45142C8.73968 3.60078 8.62739 3.9329 8.90901 4.59054C9.09846 5.03294 8.94757 5.54766 8.54931 5.8175C8.15105 6.08734 7.61747 6.03639 7.27739 5.69604C6.90975 5.32811 6.24365 5.32032 5.87006 5.63189C5.72051 5.75662 5.604 5.94564 5.604 6.25684C5.604 6.59422 5.74515 7.14633 6.29501 7.91672C6.57653 8.31116 6.53629 8.85055 6.19937 9.19878C5.86246 9.54701 5.32505 9.60465 4.92206 9.33577C4.48987 9.04741 4.1434 9.08664 3.8552 9.24934C3.51634 9.44063 3.19679 9.85112 3.06581 10.3755C2.93933 10.8818 3.0077 11.4176 3.33095 11.8686C3.65342 12.3184 4.32349 12.8121 5.64353 13.0323C6.13166 13.1137 6.48757 13.5392 6.48182 14.0344C6.47607 14.5296 6.11037 14.9467 5.62048 15.0167C5.1188 15.0884 4.793 15.3732 4.60484 15.7874C4.40339 16.231 4.37273 16.8151 4.54922 17.345C4.7211 17.861 5.06489 18.2619 5.55656 18.4511C6.05021 18.6411 6.86015 18.6809 8.0733 18.129C8.42388 17.9695 8.83474 18.025 9.13063 18.2716C9.42652 18.5183 9.5552 18.9127 9.4618 19.2866C9.33788 19.7827 9.13324 20.9406 9.93058 20.9905C10.4816 21.0249 10.9938 20.6055 10.9967 20.0518L10.9967 20.0472V17.5292C10.9955 17.0498 10.8868 16.3459 10.6061 15.7998C10.3427 15.2872 10.0054 15.0268 9.49176 15.0268C8.93765 15.0268 8.48846 14.5773 8.48846 14.0227C8.48846 13.4682 8.93765 13.0186 9.49176 13.0186C10.0798 13.0186 10.5784 13.16 10.9967 13.3894V12.5088C10.9955 12.0294 10.8868 11.3255 10.6061 10.7794C10.3427 10.2668 10.0054 10.0064 9.49176 10.0064C8.93765 10.0064 8.48846 9.55688 8.48846 10.0064C8.48846 8.4478 8.93765 7.99826 9.49176 7.99826C10.0798 7.99826 10.5784 8.13957 10.9967 8.36902L10.9967 3.97532Z" fill="currentColor" />
  </svg>
);

export const WriteIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M19.186 2.09c.521.25 1.136.612 1.625 1.101.49.49.852 1.104 1.1 1.625.313.654.11 1.408-.401 1.92l-7.214 7.213c-.31.31-.688.541-1.105.675l-4.222 1.353a.75.75 0 0 1-.943-.944l1.353-4.221a2.75 2.75 0 0 1 .674-1.105l7.214-7.214c.512-.512 1.266-.714 1.92-.402zm.211 2.516a3.608 3.608 0 0 0-.828-.586l-6.994 6.994a1.002 1.002 0 0 0-.178.241L9.9 14.102l2.846-1.496c.09-.047.171-.107.242-.178l6.994-6.994a3.61 3.61 0 0 0-.586-.828zM4.999 5.5A.5.5 0 0 1 5.47 5l5.53.005a1 1 0 0 0 0-2L5.5 3A2.5 2.5 0 0 0 3 5.5v12.577c0 .76.082 1.185.319 1.627.224.419.558.754.977.978.442.236.866.318 1.627.318h12.154c.76 0 1.185-.082 1.627-.318.42-.224.754-.559.978-.978.236-.442.318-.866.318-1.627V13a1 1 0 1 0-2 0v5.077c0 .459-.021.571-.082.684a.364.364 0 0 1-.157.157c-.113.06-.225.082-.684.082H5.923c-.459 0-.57-.022-.684-.082a.363.363 0 0 1-.157-.157c-.06-.113-.082-.225-.082-.684V5.5z" fill="currentColor" />
  </svg>
);

export const PositionManIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M63.848 73.354l-1.383 1.71c1.87.226 3.68.491 5.375.812l-5.479 1.623l7.313 1.945l5.451-1.719c3.348 1.123 7.984 2.496 9.52 4.057h-10.93l1.086 3.176h11.342c-.034 1.79-3.234 3.244-6.29 4.422l-7.751-1.676l-7.303 2.617l7.8 1.78c-4.554 1.24-12.2 1.994-18.53 2.341l-.266-3.64h-7.606l-.267 3.64c-6.33-.347-13.975-1.1-18.53-2.34l7.801-1.781l-7.303-2.617l-7.752 1.676c-3.012-.915-6.255-2.632-6.289-4.422H25.2l1.086-3.176h-10.93c1.536-1.561 6.172-2.934 9.52-4.057l5.451 1.719l7.313-1.945l-5.479-1.623a82.552 82.552 0 0 1 5.336-.807l-1.363-1.713c-14.785 1.537-27.073 4.81-30.295 9.979C.7 91.573 19.658 99.86 49.37 99.989c.442.022.878.006 1.29 0c29.695-.136 48.636-8.42 43.501-16.654c-3.224-5.171-15.52-8.445-30.314-9.981z" fill="currentColor"></path><path d="M49.855 0A10.5 10.5 0 0 0 39.5 10.5A10.5 10.5 0 0 0 50 21a10.5 10.5 0 0 0 10.5-10.5A10.5 10.5 0 0 0 50 0a10.5 10.5 0 0 0-.145 0zm-.057 23.592c-7.834.002-15.596 3.368-14.78 10.096l2 14.625c.351 2.573 2.09 6.687 4.687 6.687h.185l2.127 24.531c.092 1.105.892 2 2 2h8c1.108 0 1.908-.895 2-2l2.127-24.53h.186c2.597 0 4.335-4.115 4.687-6.688l2-14.625c.524-6.734-7.384-10.097-15.219-10.096z" fill="currentColor"></path>
  </svg>
);

export const AddProfileIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M2,21h8a1,1,0,0,0,0-2H3.071A7.011,7.011,0,0,1,10,13a5.044,5.044,0,1,0-3.377-1.337A9.01,9.01,0,0,0,1,20,1,1,0,0,0,2,21ZM10,5A3,3,0,1,1,7,8,3,3,0,0,1,10,5ZM23,16a1,1,0,0,1-1,1H19v3a1,1,0,0,1-2,0V17H14a1,1,0,0,1,0-2h3V12a1,1,0,0,1,2,0v3h3A1,1,0,0,1,23,16Z" fill="currentColor" />
  </svg>
);

// ── Donation Method Icons ─────────────────────────────────────────────────
export const MpesaDonationIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 273" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="m361 184c-6.68-1.88-14.8-5.54-19.9-8.94-1.52-1.02-1.18-2.66 1.73-8.42l3.62-7.15 9.09 4.74c15.9 8.33 29 7.71 29-1.4 0-4.39-3.64-6.71-16.4-10.4-17.5-5.12-25.4-13.2-24.1-24.4 1.71-14 12.7-21.4 31.2-21.3 10.9 0.114 26.2 4.19 28.2 7.54 0.754 1.22-4.68 15.5-5.89 15.5-0.323 0-2.95-1.18-5.82-2.62-13.7-6.88-27.1-6.75-27.1 0.259 0 4.67 3.4 7.15 14.8 10.8 14.8 4.79 20 8.11 23.4 15.1 3.36 6.94 2.86 14-1.48 21.2-5.65 9.29-25.2 13.9-40.6 9.62zm-351-38.1v-38.8h21.2l11.3 22.6c6.22 12.4 11.6 22.6 12 22.6s5.77-10.2 12-22.6l11.3-22.6h21.2v77.6h-16.9v-24c0-13.2-0.486-24-1.08-24-0.595 0-5.3 8.88-10.5 19.7l-9.38 19.7h-13.1l-20.3-41.6-0.77 50.1h-16.9zm188-0.203v-38.9l21.7 0.73c18.6 0.626 22.7 1.18 28.2 3.85 9.45 4.57 12.7 9.93 13.3 21.9 0.942 19.9-8.5 28.6-32.1 30l-12.7 0.725v20.7h-18.3zm41.7-0.948c3.02-2.59 3.79-4.5 3.79-9.29 0-9.26-3.54-11.9-16.6-12.6l-10.6-0.533v25.7h9.79c8.21 0 10.4-0.53 13.6-3.27zm31.6 1.15v-38.8h59.2v15.5h-40.9v15.5h38.1v15.5h-38.1v15.5h42.3v15.5h-60.6zm142 30.7c1.93-4.5 9.38-21.9 16.5-38.5l13-30.3 19.7-0.805 15.1 36.4c8.32 20 15.5 37.5 16.1 38.9 0.83 2.31 0.0141 2.5-9.31 2.12l-10.2-0.417-4.68-12.7h-34.8l-4.95 12.7-20 0.828zm49.6-21.9c-6.36-17.3-10.1-26.4-10.8-26.4-0.478 7e-3 -3.09 5.84-5.81 13-2.71 7.12-5.15 13.5-5.4 14.1-0.258 0.625 4.72 1.14 11.1 1.14 8.64 0 11.4-0.443 10.9-1.76z" fill="#39b54a" stroke="#39b54a" strokeWidth="2" />
    <path d="m172 80.6v9.36c-15.2 0.0524-30.2 0.0158-45.3 0.0158-12.9 0-14.4 6.09-14.4 15.7v131c0 7.81 6.44 14.1 14.4 14.1h43.1c7.99 0 14.4-6.29 14.4-14.1v-157c0-1.97-1.59-5.95-5.39-5.77-4.27 0.237-6.78 3.37-6.91 5.77zm-37.1 27.1h27.6c11.6 0 13.2 7.25 13.2 15.1v46.7c0 5.8-5.03 14.9-13.2 14.9h-27.6c-9.97 0-15.2-8.6-15.2-14.9v-46.7c0-7.81 4.13-15.1 15.2-15.1z" fill="#d8e3d2" fillRule="evenodd" strokeWidth=".998" style={{ paintOrder: "stroke fill markers" }} />
    <path d="m104 155c9.07-0.942 17.2-5.6 26.4-17.6 10.4 15.8 24.7 15.2 39.2 16.8-15.6 0.163-13.6 5.52-34.8 4.03-6.77-0.473-17.9-0.936-30.7-3.19z" fill="#9d4c44" fillRule="evenodd" strokeWidth=".998" style={{ paintOrder: "stroke fill markers" }} />
    <path d="m161 122 33.8 16.4c-24.1 26.9-58.5 25.1-90.2 16.8 17.5-0.0728 33 6.4 56.3-33.1z" fill="#ed1c24" fillRule="evenodd" strokeWidth=".998" style={{ paintOrder: "stroke fill markers" }} />
  </svg>
);

export const BitcoinDonationIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 529.012 529.013" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <g>
      <g>
        <path d="M366.817,252.027c19.285-8.727,34.561-21.824,45.826-39.278c11.268-17.46,16.898-36.64,16.898-57.552
          c0-19.284-4.566-36.689-13.703-52.222c-9.137-15.532-20.551-27.962-34.254-37.301c-13.703-9.339-29.234-15.478-46.592-18.421
          c-2.826-0.478-5.984-0.906-9.295-1.31V18.36c0-10.141-8.221-18.36-18.361-18.36h-36.719c-10.141,0-18.36,8.219-18.36,18.36v24.48
          h-38.293V18.36c0-10.141-8.219-18.36-18.36-18.36h-36.72c-10.141,0-18.36,8.219-18.36,18.36v24.48H77.543v446.393h62.993v21.42
          c0,10.141,8.219,18.36,18.36,18.36h36.72c10.141,0,18.36-8.22,18.36-18.36v-21.42h15.514c8.023-0.055,15.587-0.128,22.779-0.208
          v21.628c0,10.141,8.219,18.36,18.36,18.36h36.721c10.141,0,18.359-8.22,18.359-18.36V487.14c5.098-0.288,9.303-0.606,12.49-0.949
          c23.955-2.638,44.102-9.693,60.441-21.162c16.34-11.47,29.229-26.794,38.672-45.979c9.438-19.187,14.156-38.924,14.156-59.224
          c0-25.783-7.307-48.214-21.922-67.296S394.02,259.947,366.817,252.027z M219.442,117.137c42.43,0,68.109,0.508,77.039,1.523
          c15.023,1.83,26.34,7.057,33.953,15.68s11.42,19.841,11.42,33.648c0,14.413-4.418,26.034-13.25,34.865
          c-8.83,8.832-20.961,14.162-36.389,15.986c-8.525,1.016-30.35,1.523-65.466,1.523h-59.07V117.137H219.442z M345.655,393.473
          c-8.428,9.438-19.334,15.38-32.736,17.815c-8.732,1.83-29.332,2.742-61.812,2.742h-83.434V294.659h72.772
          c41.004,0,67.651,2.13,79.934,6.396s21.67,11.065,28.164,20.404c6.492,9.339,9.742,20.704,9.742,34.106
          C358.292,371.392,354.083,384.029,345.655,393.473z" fill="currentColor" />
      </g>
    </g>
  </svg>
);

export const LiquidDonationIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path style={{ fill: '#C4D9FD' }} d="M272.431,6.816C268.072,2.458,262.164,0.008,256,0.002c-0.008,0-0.017-0.002-0.026-0.002
      c-6.173,0-12.093,2.453-16.455,6.817c-6.613,6.614-161.955,163.854-161.955,326.783C77.563,431.97,157.598,512,255.975,512
      c0.008,0,0.017,0,0.025,0c98.392-0.014,178.437-80.038,178.437-178.399C434.437,170.668,279.046,13.428,272.431,6.816z"/>
    <path style={{ fill: '#A7C7FC' }} d="M255.975,512c0.008,0,0.017,0,0.025,0V0.002c-0.008,0-0.017-0.002-0.026-0.002
      c-6.173,0.002-12.093,2.453-16.455,6.817c-6.613,6.614-161.955,163.854-161.955,326.783C77.563,431.97,157.598,512,255.975,512z"/>
  </svg>
);

export const LightningDonationIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <title>lightning-storm</title>
    <path d="M23.901 6.164c0.593-1.664 0.654-3.411 0.245-5.060h-0v0c-0.042 1.519-0.508 3.075-1.385 4.482-2.338 3.755-7.035 5.419-11.348 4.363 0.325-0.144 0.639-0.302 0.938-0.474 2.437-1.404 3.574-3.46 3.389-5.721-0.461 1.361-1.537 2.578-3.134 3.498-2.998 1.727-7.364 1.977-11.698 1.057v2.332c2.561 0.51 5.122 0.597 7.399 0.215 0.261 0.178 0.534 0.347 0.821 0.502l-0.041 0.003 6.591 7.669-5.806 1.273 18.698 10.643-6.822-10.984 3.622-0.933-5.712-7.841c1.285-0.748 2.406-1.772 3.249-3.044 2.523 0.916 5.292 1.244 7.945 1.023v-2.442c-2.3 0.224-4.692 0.048-6.95-0.562z" fill="currentColor"></path>
  </svg>
);

export const CopyDonationIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const QrDonationIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <polygon fill="currentColor" points="48 48 176 48 176 16 16 16 16 176 48 176 48 48" />
    <path fill="currentColor" d="M176,176V80H80v96h96Zm-64-64h32v32H112Z" />
    <polygon fill="currentColor" points="328 48 464 48 464 176 496 176 496 16 328 16 328 48" />
    <path fill="currentColor" d="M432,176V80H336v96h96Zm-64-64h32v32H368Z" />
    <polygon fill="currentColor" points="176 464 48 464 48 336 16 336 16 496 176 496 176 464" />
    <path fill="currentColor" d="M176,336H80v96h96V336Zm-32,64H112V368h32Z" />
    <polygon fill="currentColor" points="464 464 328 464 328 496 496 496 496 336 464 336 464 464" />
    <polygon fill="currentColor" points="272 304 400 304 400 368 432 368 432 272 272 272 272 304" />
    <polygon fill="currentColor" points="432 432 432 400 240 400 240 272 80 272 80 304 208 304 208 432 432 432" />
    <rect width="32" height="96" x="208" y="80" fill="currentColor" />
    <polygon fill="currentColor" points="80 240 304 240 304 80 272 80 272 208 80 208 80 240" />
    <rect width="96" height="32" x="336" y="208" fill="currentColor" />
    <rect width="32" height="32" x="336" y="336" fill="currentColor" />
    <rect width="32" height="32" x="272" y="336" fill="currentColor" />
  </svg>
);

export const EyeOffIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchStatusIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path opacity="0.4" d="M11.0002 20.01C15.9763 20.01 20.0102 15.9761 20.0102 11C20.0102 6.0239 15.9763 1.98999 11.0002 1.98999C6.02415 1.98999 1.99023 6.0239 1.99023 11C1.99023 15.9761 6.02415 20.01 11.0002 20.01Z" fill="currentColor" />
    <path d="M14 10.25H8C7.59 10.25 7.25 9.91 7.25 9.5C7.25 9.09 7.59 8.75 8 8.75H14C14.41 8.75 14.75 9.09 14.75 9.5C14.75 9.91 14.41 10.25 14 10.25Z" className="fill-[#013001] dark:fill-[#bcf5bc]" />
    <path d="M11 13.25H8C7.59 13.25 7.25 12.91 7.25 12.5C7.25 12.09 7.59 11.75 8 11.75H11C11.41 11.75 11.75 12.09 11.75 12.5C11.75 12.91 11.41 13.25 11 13.25Z" className="fill-[#013001] dark:fill-[#bcf5bc]" />
    <path d="M21.9901 18.95C21.6601 18.34 20.9601 18 20.0201 18C19.3101 18 18.7001 18.29 18.3401 18.79C17.9801 19.29 17.9001 19.96 18.1201 20.63C18.5501 21.93 19.3001 22.22 19.7101 22.27C19.7701 22.28 19.8301 22.28 19.9001 22.28C20.3401 22.28 21.0201 22.09 21.6801 21.1C22.2101 20.33 22.3101 19.56 21.9901 18.95Z" className="fill-[#013001] dark:fill-[#bcf5bc]" />
  </svg>
);