import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const BankIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="32" cy="14" r="3" fill="currentColor"/>
    <path d="M4 25h56c1.794 0 3.368-1.194 3.852-2.922.484-1.728-0.242-3.566-1.775-4.497l-28-17C33.438.193 32.719 0 32 0s-1.438.193-2.076.581l-28 17c-1.533.931-2.26 2.77-1.775 4.497C.632 23.806 2.206 25 4 25zM32 9c2.762 0 5 2.238 5 5s-2.238 5-5 5-5-2.238-5-5 2.238-5 5-5z" fill="currentColor"/>
    <rect x="34" y="27" width="8" height="25" fill="currentColor"/>
    <rect x="46" y="27" width="8" height="25" fill="currentColor"/>
    <rect x="22" y="27" width="8" height="25" fill="currentColor"/>
    <rect x="10" y="27" width="8" height="25" fill="currentColor"/>
    <path d="M4 58h56c0-2.209-1.791-4-4-4H8c-2.209 0-4 1.791-4 4z" fill="currentColor"/>
    <path d="M63.445 60H.555C.211 60.591 0 61.268 0 62v2h64v-2c0-.732-.211-1.409-.555-2z" fill="currentColor"/>
  </svg>
);

export const ShareIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M9 6C9 7.65685 10.3431 9 12 9C13.6569 9 15 7.65685 15 6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6Z" fill="currentColor"/>
    <path d="M2.5 18C2.5 19.6569 3.84315 21 5.5 21C7.15685 21 8.5 19.6569 8.5 18C8.5 16.3431 7.15685 15 5.5 15C3.84315 15 2.5 16.3431 2.5 18Z" fill="currentColor"/>
    <path d="M18.5 21C16.8431 21 15.5 19.6569 15.5 18C15.5 16.3431 16.8431 15 18.5 15C20.1569 15 21.5 16.3431 21.5 18C21.5 19.6569 20.1569 21 18.5 21Z" fill="currentColor"/>
    <path d="M7.20468 7.56231C7.51523 7.28821 7.54478 6.81426 7.27069 6.5037 6.99659 6.19315 6.52264 6.1636 6.21208 6.43769 4.39676 8.03991 3.25 10.3865 3.25 13C3.25 13.4142 3.58579 13.75 4 13.75 4.41421 13.75 4.75 13.4142 4.75 13 4.75 10.8347 5.69828 8.89187 7.20468 7.56231Z" fill="currentColor"/>
    <path d="M17.7879 6.43769C17.4774 6.1636 17.0034 6.19315 16.7293 6.5037 16.4552 6.81426 16.4848 7.28821 16.7953 7.56231C18.3017 8.89187 19.25 10.8347 19.25 13C19.25 13.4142 19.5858 13.75 20 13.75C20.4142 13.75 20.75 13.4142 20.75 13 20.75 10.3865 19.6032 8.03991 17.7879 6.43769Z" fill="currentColor"/>
    <path d="M10.1869 20.0217C9.7858 19.9184 9.37692 20.1599 9.27367 20.561C9.17043 20.9622 9.41192 21.3711 9.81306 21.4743C10.5129 21.6544 11.2458 21.75 12 21.75C12.7542 21.75 13.4871 21.6544 14.1869 21.4743C14.5881 21.3711 14.8296 20.9622 14.7263 20.561C14.6231 20.1599 14.2142 19.9184 13.8131 20.0217C13.2344 20.1706 12.627 20.25 12 20.25C11.373 20.25 10.7656 20.1706 10.1869 20.0217Z" fill="currentColor"/>
  </svg>
);

export const CommentsIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M60 0H16c-2.211 0-4 1.789-4 4v4h38c3.438 0 6 2.656 6 6v22h4c2.211 0 4-1.789 4-4V4c0-2.211-1.789-4-4-4z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M50 10H4c-2.211 0-4 1.789-4 4v30c0 2.211 1.789 4 4 4h7c.553 0 1 .447 1 1v11c0 1.617.973 3.078 2.469 3.695.496.207 1.015.305 1.531.305 1.039 0 2.062-.406 2.828-1.172l14.156-14.156c0 0 .516-.672 1.672-.672S50 48 50 48c2.211 0 4-1.789 4-4V14c0-2.209-1.791-4-4-4zM13 22h13c.553 0 1 .447 1 1s-.447 1-1 1H13c-.553 0-1-.447-1-1s.447-1 1-1zm21 14H13c-.553 0-1-.447-1-1s.447-1 1-1h21c.553 0 1 .447 1 1s-.447 1-1 1zm7-6H13c-.553 0-1-.447-1-1s.447-1 1-1h28c.553 0 1 .447 1 1s-.447 1-1 1z" fill="currentColor"/>
  </svg>
);

export const GlobeIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M256,0C114.615,0,0,114.615,0,256s114.615,256,256,256s256-114.615,256-256S397.385,0,256,0z M256,480 C132.288,480,32,379.712,32,256S132.288,32,256,32s224,100.288,224,224S379.712,480,256,480z M128.5,256 c0,70.415,57.114,127.5,127.5,127.5s127.5-57.085,127.5-127.5S326.415,128.5,256,128.5S128.5,185.585,128.5,256z M256,351.5 c-52.743,0-95.5-42.757-95.5-95.5s42.757-95.5,95.5-95.5s95.5,42.757,95.5,95.5S308.743,351.5,256,351.5z" fill="currentColor"/>
  </svg>
);

export const SearchIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M62.242 53.757L51.578 43.093C54.373 38.736 56 33.56 56 28 56 12.536 43.464 0 28 0S0 12.536 0 28s12.536 28 28 28c5.56 0 10.736-1.627 15.093-4.422l10.664 10.664c2.344 2.344 6.142 2.344 8.485 0s2.344-6.141 0-8.485zM28 54C13.641 54 2 42.359 2 28S13.641 2 28 2s26 11.641 26 26-11.641 26-26 26z" fill="currentColor"/>
    <path d="M28 4C14.745 4 4 14.745 4 28s10.745 24 24 24 24-10.745 24-24S41.255 4 28 4zm16 25c-.553 0-1-.447-1-1 0-8.284-6.716-15-15-15-.553 0-1-.447-1-1s.447-1 1-1c9.389 0 17 7.611 17 17 0 .553-.447 1-1 1z" fill="currentColor"/>
  </svg>
);

export const UsersIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M36.31 176c.674.386 24.255 13.789 43.69 13.789s43.826-13.403 44.524-13.789l9.047 0c14.641.044 26.429 11.859 26.429 26.429l0 101.571c0 17.673-14.327 32-32 32l0 120c0 13.255-10.745 24-24 24l-48 0c-13.255 0-24-10.745-24-24l0-120c-17.673 0-32-14.327-32-32l0-100.738c0-15.028 12.16-27.216 27.262-27.262l9.048 0zm176 0c.674.386 24.256 13.789 43.69 13.789s43.826-13.403 44.524-13.789l9.047 0c14.641.044 26.429 11.859 26.429 26.429l0 101.571c0 17.673-14.327 32-32 32l0 120c0 13.255-10.745 24-24 24l-48 0c-13.255 0-24-10.745-24-24l0-120c-17.673 0-32-14.327-32-32l0-100.738c0-15.028 12.16-27.216 27.262-27.262l9.048 0zm243.69 304l-48 0c-13.255 0-24-10.745-24-24l0-120c-17.673 0-32-14.327-32-32l0-100.738c0-15.056 12.206-27.262 27.262-27.262l9.048 0c0 0 23.978 13.789 43.69 13.789 19.712 0 44.524-13.789 44.524-13.789l9.047 0c14.597 0 26.429 11.832 26.429 26.429l0 101.571c0 17.673-14.327 32-32 32l0 120c0 13.222-10.691 23.946-24 24zm-376-320c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64 64 28.654 64 64 64zm176 0c35.346 0 64-28.654 64-64s-28.654-64-64-64-64 28.654-64 64 28.654 64 64 64zm240-64c0 35.346-28.654 64-64 64s-64-28.654-64-64 28.654-64 64-64 64 28.654 64 64z" fill="currentColor"/>
  </svg>
);

export const ChartIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M21 21H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 7L13 12L10 9L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ThumbIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="7" cy="57" r="1" fill="currentColor"/>
    <path d="M14 26c0-2.212-1.789-4-4-4H4c-2.211 0-4 1.788-4 4v34c0 2.21 1.789 4 4 4h6c2.211 0 4-1.79 4-4V26zM7 60c-1.657 0-3-1.344-3-3s1.343-3 3-3 3 1.342 3 3c0 1.656-1.343 3-3 3z" fill="currentColor"/>
    <path d="M64 28c0-3.314-2.687-6-6-6H41l0 0h-.016H41l2-18c.209-2.188-1.287-4-3.498-4h-4.001C33 0 31.959 1.75 31 4l-8 18c-2.155 5.169-5 6-7 6v30.218c1.203.285 2.714.945 4.21 2.479C23.324 63.894 27.043 64 29 64h23c3.313 0 6-2.688 6-6 0-1.731-.737-3.288-1.91-4.383 1.281-.848 2.91-3.04 2.91-5.617 0-1.731-.737-3.288-1.91-4.383 1.281-.848 2.91-3.04 2.91-5.617 0-1.731-.737-3.288-1.91-4.383 1.281-.848 2.91-3.04 2.91-5.617z" fill="currentColor"/>
  </svg>
);

export const KenyaIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M410.7 119.7v182.1l27.4 25.9-105.9 154.6-73.9-41.8-5.4-39.7L74.66 296.4l36.64-29L62.47 253l50.33-78.4-.8-61.8-47.25-60.96 38.15-19.05 99-3.05S307.1 83.8 310.1 83.09c3.1-.81 91.5-36.58 91.5-36.58l47.9 23.61z" fill="currentColor"/>
  </svg>
);

export const KeyIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M7 11a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-2a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="currentColor"/>
    <path d="M21 2h-6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v2h-1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v2a1 1 0 0 0-1 1v2h-2.14a7 7 0 1 0-1.72 2H21a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" fill="currentColor"/>
  </svg>
);

export const LocationIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
  </svg>
);

export const CommandIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M16 8.00002L19 8.00049C20.6569 8.00075 22.0002 6.65781 22.0005 5.00096C22.0007 3.34411 20.6578 2.00075 19.0009 2.00049C17.3441 2.00023 16.0007 3.34316 16.0005 5.00002L16 8.00002L8.00047 8L8 5.00002C7.99974 3.34316 6.65638 2.00023 4.99953 2.00049C3.34267 2.00075 1.99974 3.34411 2 5.00096C2.00026 6.65781 3.34362 8.00075 5.00047 8.00049L8.00047 8L8 16H16V8.00002Z" fill="currentColor"/>
    <path d="M16 16L19 16.0005C20.6569 16.0002 22.0002 17.3432 22.0005 19C22.0007 20.6569 20.6578 22.0002 19.0009 22.0005C17.3441 22.0007 16.0007 20.6578 16.0005 19.001L16 16Z" fill="currentColor"/>
    <path d="M5.00047 16.0005L8.00047 16.001L8 19.001C7.99974 20.6578 6.65638 22.0007 4.99953 22.0005C3.34267 22.0002 1.99974 20.6569 2 19C2.00026 17.3432 3.34362 16.0002 5.00047 16.0005Z" fill="currentColor"/>
  </svg>
);

export const WidgetIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M13 3h7b1 0 0 1 1 1v7b1 0 0 1-1 1h-7b1 0 0 1-1-1V4b1 0 0 1 1-1zm-9 0h3b1 0 0 1 1 1v3b1 0 0 1-1 1H4b1 0 0 1-1-1V4b1 0 0 1 1-1zm0 9h3b1 0 0 1 1 1v7b1 0 0 1-1 1H4b1 0 0 1-1-1v-7b1 0 0 1 1-1zm9 9h7b1 0 0 1 1-1v-3b1 0 0 1-1-1h-3b1 0 0 1-1 1v3b1 0 0 1 0 1z" fill="currentColor"/>
  </svg>
);

export const ScanIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M14 2.75c1.907 0 3.262.002 4.289.14.906.135 1.486.389 1.909.812.423.423.677 1.003.812 2.009.138 1.027.14 2.382.14 4.289 0 .414.336.75.75.75s.75-.336.75-.75v-.056c0-1.838 0-3.294-.153-4.433-.158-1.172-.49-2.121-1.238-2.87-.749-.748-1.698-1.08-2.871-1.237C17.35 1.25 15.894 1.25 14.056 1.25H14c-.414 0-.75.336-.75.75s.336.75.75.75zM9.944 1.25H10c.414 0 .75.336.75.75s-.336.75-.75.75c-1.907 0-3.262.002-4.289.14-.906.135-1.486.389-1.909.812-.423.423-.677 1.003-.812 2.009C2.852 6.739 2.85 8.093 2.85 10c0 .414-.336.75-.75.75s-.75-.336-.75-.75V9.944c0-1.838 0-3.294.153-4.433.158-1.172.49-2.121 1.238-2.87.749-.748 1.698-1.08 2.871-1.237C7.309 1.25 8.764 1.25 10.603 1.25H9.944z" fill="currentColor"/>
    <rect x="5" y="5" width="6" height="6" rx="1" fill="currentColor"/>
    <rect x="5" y="13" width="6" height="6" rx="1" fill="currentColor"/>
    <rect x="13" y="5" width="6" height="6" rx="1" fill="currentColor"/>
    <rect x="13" y="13" width="6" height="6" rx="1" fill="currentColor"/>
  </svg>
);

export const PathIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M19 8.369V9.8c0 2.451 0 3.677-.82 4.439C17.36 15 16.04 15 13.4 15H12.75V18c0 .048-.005.095-.013.14.508.201.913.604 1.118 1.11h.145H21.25c.414 0 .75.336.75.75s-.336.75-.75.75H14h-.145c-.297.733-1.016 1.25-1.855 1.25-.839 0-1.558-.517-1.855-1.25H10H2.75c-.414 0-.75-.336-.75-.75s.336-.75.75-.75H10h.145c.205-.506.61-.909 1.118-1.11-.008-.045-.013-.092-.013-.14V15H10.6c-2.64 0-3.96 0-4.78-.761C5 13.477 5 12.251 5 9.8V5.217c0-.573 0-.86.049-1.099.213-1.052 1.099-1.875 2.232-2.073C7.538 2 7.847 2 8.465 2c.27 0 .405 0 .535.011.56.049 1.092.254 1.526.588.1.077.196.166.387.344l.385.358c.571.53.857.795 1.199.972.188.097.387.174.594.228.376.1.78.1 1.587.1h.262c1.842 0 2.764 0 3.362.5 1.282 1.1 1.282 2.642 1.282 4.269z" fill="currentColor"/>
  </svg>
);

export const BuildingsIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M21.25 8.5c0-1.404 0-2.107-.337-2.611a2 2 0 0 0-.552-.552C19.851 5.042 19.258 5.005 18.177 5.001c.004.291.004.596.004.91v.089V7.25H19.25c.414 0 .75.336.75.75s-.336.75-.75.75h-1v1.5h1c.414 0 .75.336.75.75s-.336.75-.75.75h-1v1.5h1c.414 0 .75.336.75.75s-.336.75-.75.75h-1V21.25h-1.5V6c0-1.886 0-2.828-.586-3.414S14.636 2 12.75 2h-2c-1.886 0-2.828 0-3.414.586S6.75 4.114 6.75 6v15.25h-1.5V14.75h-1c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h1v-1.5h-1c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h1V8.75h-1c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h1V6l0-.089c0-.314 0-.619.004-.91-1.081.004-1.674.041-2.115.336a2 2 0 0 0-.552.552C2.25 6.393 2.25 7.096 2.25 8.5V21.25h-.5a.75.75 0 0 0 0 1.5h20a.75.75 0 0 0 0-1.5h-.5V8.5zM9 11.75c0-.414.336-.75.75-.75h4c.414 0 .75.336.75.75s-.336.75-.75.75h-4a.75.75 0 0 0-.75-.75zm0 3c0-.414.336-.75.75-.75h4c.414 0 .75.336.75.75s-.336.75-.75.75h-4a.75.75 0 0 0-.75-.75zm2.75 3.5c.414 0 .75.336.75.75v2.25h-1.5V19c0-.414.336-.75.75-.75zM9 6.25c0-.414.336-.75.75-.75h4c.414 0 .75.336.75.75s-.336.75-.75.75h-4a.75.75 0 0 0-.75-.75zm0 3c0-.414.336-.75.75-.75h4c.414 0 .75.336.75.75s-.336.75-.75.75h-4a.75.75 0 0 0-.75-.75z" fill="currentColor"/>
  </svg>
);

export const StarIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" fill="currentColor"/>
  </svg>
);

export const CloseIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ArrowLeftIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
