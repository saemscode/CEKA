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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

export const EyeIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ShieldCheckIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

export const SparklesIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z"/>
    <path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>
  </svg>
);

export const AlertIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export const CalendarIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export const FileTextIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

export const ExternalLinkIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

export const ClockIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

export const NewspaperIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
    <path d="M18 14h-8"/>
    <path d="M15 18h-5"/>
    <path d="M10 6h8v4h-8V6Z"/>
  </svg>
);

export const TrendingUpIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

export const TargetIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

// ── Context Icons 2 (SVG Repo sourced) ──────────────────────────────────────

export const DetailsIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M3 9C2.44772 9 2 9.44772 2 10C2 10.5523 2.44772 11 3 11H21C21.5523 11 22 10.5523 22 10C22 9.44772 21.5523 9 21 9H3Z" fill="currentColor"/>
    <path d="M3 13C2.44772 13 2 13.4477 2 14C2 14.5523 2.44772 15 3 15H15C15.5523 15 16 14.5523 16 14C16 13.4477 15.5523 13 15 13H3Z" fill="currentColor"/>
  </svg>
);

export const LibraryIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path opacity="0.5" d="M19.5617 7C19.7904 5.69523 18.7863 4.5 17.4617 4.5H6.53788C5.21323 4.5 4.20922 5.69523 4.43784 7M17.4999 4.5C17.5283 4.24092 17.5425 4.11135 17.5427 4.00435C17.545 2.98072 16.7739 2.12064 15.7561 2.01142C15.6497 2 15.5194 2 15.2588 2H8.74099C8.48035 2 8.35002 2 8.24362 2.01142C7.22584 2.12064 6.45481 2.98072 6.45704 4.00434C6.45727 4.11135 6.47146 4.2409 6.49983 4.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M15 18H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M2.38351 13.793C1.93748 10.6294 1.71447 9.04765 2.66232 8.02383C3.61017 7 5.29758 7 8.67239 7H15.3276C18.7024 7 20.3898 7 21.3377 8.02383C22.2855 9.04765 22.0625 10.6294 21.6165 13.793L21.1935 16.793C20.8437 19.2739 20.6689 20.5143 19.7717 21.2572C18.8745 22 17.5512 22 14.9046 22H9.09536C6.44881 22 5.12553 22 4.22834 21.2572C3.33115 20.5143 3.15626 19.2739 2.80648 16.793L2.38351 13.793Z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const PenNewSquareIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M21.1938 2.80624C22.2687 3.88124 22.2687 5.62415 21.1938 6.69914L20.6982 7.19469C20.5539 7.16345 20.3722 7.11589 20.1651 7.04404C19.6108 6.85172 18.8823 6.48827 18.197 5.803C17.5117 5.11774 17.1483 4.38923 16.956 3.8349C16.8841 3.62781 16.8366 3.44609 16.8053 3.30179L17.3009 2.80624C18.3759 1.73125 20.1188 1.73125 21.1938 2.80624Z" fill="currentColor"/>
    <path d="M14.5801 13.3128C14.1761 13.7168 13.9741 13.9188 13.7513 14.0926C13.4886 14.2975 13.2043 14.4732 12.9035 14.6166C12.6485 14.7381 12.3775 14.8284 11.8354 15.0091L8.97709 15.9619C8.71035 16.0508 8.41626 15.9814 8.21744 15.7826C8.01862 15.5837 7.9492 15.2897 8.03811 15.0229L8.99089 12.1646C9.17157 11.6225 9.26191 11.3515 9.38344 11.0965C9.52679 10.7957 9.70249 10.5114 9.90743 10.2487C10.0812 10.0259 10.2832 9.82394 10.6872 9.41993L15.6033 4.50385C15.867 5.19804 16.3293 6.05663 17.1363 6.86366C17.9434 7.67069 18.802 8.13296 19.4962 8.39674L14.5801 13.3128Z" fill="currentColor"/>
    <path d="M20.5355 20.5355C22 19.0711 22 16.714 22 12C22 10.4517 22 9.15774 21.9481 8.0661L15.586 14.4283C15.2347 14.7797 14.9708 15.0437 14.6738 15.2753C14.3252 15.5473 13.948 15.7804 13.5488 15.9706C13.2088 16.1327 12.8546 16.2506 12.3833 16.4076L9.45143 17.3849C8.64568 17.6535 7.75734 17.4438 7.15678 16.8432C6.55621 16.2427 6.34651 15.3543 6.61509 14.5486L7.59235 11.6167C7.74936 11.1454 7.86732 10.7912 8.02935 10.4512C8.21958 10.052 8.45272 9.6748 8.72466 9.32615C8.9563 9.02918 9.22032 8.76528 9.57173 8.41404L15.9339 2.05188C14.8423 2 13.5483 2 12 2C7.28595 2 4.92893 2 3.46447 3.46447C2 4.92893 2 7.28595 2 12C2 16.714 2 19.0711 3.46447 20.5355C4.92893 22 7.28595 22 12 22C16.714 22 19.0711 22 20.5355 20.5355Z" fill="currentColor"/>
  </svg>
);

export const AddRowIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M3 14V15C3 16.1046 3.89543 17 5 17L19 17C20.1046 17 21 16.1046 21 15L21 13C21 11.8954 20.1046 11 19 11H13M10 8H7M7 8H4M7 8V5M7 8V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RemoveRowIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M7 12L17 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MailOpenAltIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M4 19L9 14M20 19L15 14M3.02832 10L10.2246 14.8166C10.8661 15.2443 11.1869 15.4581 11.5336 15.5412C11.8399 15.6146 12.1593 15.6146 12.4657 15.5412C12.8124 15.4581 13.1332 15.2443 13.7747 14.8166L20.971 10M10.2981 4.06879L4.49814 7.71127C3.95121 8.05474 3.67775 8.22648 3.4794 8.45864C3.30385 8.66412 3.17176 8.90305 3.09111 9.161C3 9.45244 3 9.77535 3 10.4212V16.8C3 17.9201 3 18.4802 3.21799 18.908C3.40973 19.2843 3.71569 19.5903 4.09202 19.782C4.51984 20 5.0799 20 6.2 20H17.8C18.9201 20 19.4802 20 19.908 19.782C20.2843 19.5903 20.5903 19.2843 20.782 18.908C21 18.4802 21 17.9201 21 16.8V10.4212C21 9.77535 21 9.45244 20.9089 9.161C20.8282 8.90305 20.6962 8.66412 20.5206 8.45864C20.3223 8.22648 20.0488 8.05474 19.5019 7.71127L13.7019 4.06879C13.0846 3.68116 12.776 3.48735 12.4449 3.4118C12.152 3.34499 11.848 3.34499 11.5551 3.4118C11.224 3.48735 10.9154 3.68116 10.2981 4.06879Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const Send2Icon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M16.1391 2.95907L7.10914 5.95907C1.03914 7.98907 1.03914 11.2991 7.10914 13.3191L9.78914 14.2091L10.6791 16.8891C12.6991 22.9591 16.0191 22.9591 18.0391 16.8891L21.0491 7.86907C22.3891 3.81907 20.1891 1.60907 16.1391 2.95907ZM16.4591 8.33907L12.6591 12.1591C12.5091 12.3091 12.3191 12.3791 12.1291 12.3791C11.9391 12.3791 11.7491 12.3091 11.5991 12.1591C11.3091 11.8691 11.3091 11.3891 11.5991 11.0991L15.3991 7.27907C15.6891 6.98907 16.1691 6.98907 16.4591 7.27907C16.7491 7.56907 16.7491 8.04907 16.4591 8.33907Z" fill="currentColor"/>
  </svg>
);

export const Share2Icon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M20 13V17.5C20 20.5577 16 20.5 12 20.5C8 20.5 4 20.5577 4 17.5V13M12 3L12 15M12 3L16 7M12 3L8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const SaveAddIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path opacity="0.4" d="M16 8.98987V20.3499C16 21.7999 14.96 22.4099 13.69 21.7099L9.76001 19.5199C9.34001 19.2899 8.65999 19.2899 8.23999 19.5199L4.31 21.7099C3.04 22.4099 2 21.7999 2 20.3499V8.98987C2 7.27987 3.39999 5.87988 5.10999 5.87988H12.89C14.6 5.87988 16 7.27987 16 8.98987Z" fill="currentColor"/>
    <path d="M22 5.10999V16.47C22 17.92 20.96 18.53 19.69 17.83L16 15.77V8.98999C16 7.27999 14.6 5.88 12.89 5.88H8V5.10999C8 3.39999 9.39999 2 11.11 2H18.89C20.6 2 22 3.39999 22 5.10999Z" fill="currentColor"/>
    <path d="M11 11.25H9.75V10C9.75 9.59 9.41 9.25 9 9.25C8.59 9.25 8.25 9.59 8.25 10V11.25H7C6.59 11.25 6.25 11.59 6.25 12C6.25 12.41 6.59 12.75 7 12.75H8.25V14C8.25 14.41 8.59 14.75 9 14.75C9.41 14.75 9.75 14.41 9.75 14V12.75H11C11.41 12.75 11.75 12.41 11.75 12C11.75 11.59 11.41 11.25 11 11.25Z" fill="currentColor"/>
  </svg>
);

export const TwitterColorIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 -4 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g transform="translate(-300.000000, -164.000000)" fill="#00AAEC">
        <path d="M348,168.735283 C346.236309,169.538462 344.337383,170.081618 342.345483,170.324305 C344.379644,169.076201 345.940482,167.097147 346.675823,164.739617 C344.771263,165.895269 342.666667,166.736006 340.418384,167.18671 C338.626519,165.224991 336.065504,164 333.231203,164 C327.796443,164 323.387216,168.521488 323.387216,174.097508 C323.387216,174.88913 323.471738,175.657638 323.640782,176.397255 C315.456242,175.975442 308.201444,171.959552 303.341433,165.843265 C302.493397,167.339834 302.008804,169.076201 302.008804,170.925244 C302.008804,174.426869 303.747139,177.518238 306.389857,179.329722 C304.778306,179.280607 303.256911,178.821235 301.9271,178.070061 L301.9271,178.194294 C301.9271,183.08848 305.322064,187.17082 309.8299,188.095341 C309.004402,188.33225 308.133826,188.450704 307.235077,188.450704 C306.601162,188.450704 305.981335,188.390033 305.381229,188.271578 C306.634971,192.28169 310.269414,195.2026 314.580032,195.280607 C311.210424,197.99061 306.961789,199.605634 302.349709,199.605634 C301.555203,199.605634 300.769149,199.559408 300,199.466956 C304.358514,202.327194 309.53689,204 315.095615,204 C333.211481,204 343.114633,188.615385 343.114633,175.270495 C343.114633,174.831347 343.106181,174.392199 343.089276,173.961719 C345.013559,172.537378 346.684275,170.760563 348,168.735283"/>
      </g>
    </g>
  </svg>
);

export const SecureShieldIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z" fill="currentColor"/>
  </svg>
);

export const SecurePCIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path fill="currentColor" d="M510.158,392.021l-45.585-57.325V93.613c0-11.662-9.457-21.12-21.119-21.12H68.546c-11.662,0-21.111,9.458-21.111,21.12v241.082L1.841,392.021C0.649,393.516,0,395.366,0,397.285v25.373c0,9.311,7.548,16.849,16.85,16.849H495.15c9.302,0,16.85-7.538,16.85-16.849v-25.373C512,395.366,511.351,393.516,510.158,392.021z M77.226,102.293h357.547v202.604H77.226V102.293z M304.122,419.469h-96.244v-25.478h96.244V419.469z"/>
    <path fill="currentColor" d="M291.552,186.314c0-9.786-3.994-18.734-10.417-25.14c-6.406-6.414-15.345-10.416-25.14-10.409c-9.786-0.008-18.734,3.994-25.131,10.409c-6.414,6.407-10.417,15.354-10.417,25.14v12.508h-11.472v43.38c0,12.571,10.193,22.746,22.762,22.746h48.533c12.561,0,22.754-10.175,22.754-22.746v-43.38h-11.472V186.314z M237.703,186.314c0-2.55,0.519-4.937,1.435-7.124c1.384-3.268,3.717-6.086,6.639-8.058c2.931-1.98,6.406-3.112,10.218-3.12c2.55,0,4.936,0.518,7.124,1.435c3.276,1.383,6.086,3.717,8.058,6.648c1.97,2.913,3.112,6.388,3.12,10.218v12.508h-36.594V186.314z"/>
  </svg>
);

export const MailSendIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M9.00977 21.39H19.0098C20.0706 21.39 21.0881 20.9685 21.8382 20.2184C22.5883 19.4682 23.0098 18.4509 23.0098 17.39V7.39001C23.0098 6.32915 22.5883 5.31167 21.8382 4.56152C21.0881 3.81138 20.0706 3.39001 19.0098 3.39001H7.00977C5.9489 3.39001 4.93148 3.81138 4.18134 4.56152C3.43119 5.31167 3.00977 6.32915 3.00977 7.39001V12.39" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1.00977 18.39H11.0098" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1.00977 15.39H5.00977" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.209 5.41992C16.599 16.0599 9.39906 16.0499 3.78906 5.41992" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IOSLoadingIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M12,3V6M5.64,5.64,7.76,7.76M3,12H6m-.36,6.36,2.12-2.12M12,18v3m6.36-2.64-2.12-2.12M21,12H18m.36-6.36L16.24,7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IOSTickIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MailBulkIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M7 13.5L10 16.5L16 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.5 12H5M19 12H21.5M12 2.5V5M12 19V21.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
  </svg>
);

export const UserIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0 15c-2.33 0-4.39-1.15-5.63-2.91.03-1.86 3.75-2.84 5.63-2.84s5.6 0.98 5.63 2.84A9.95 9.95 0 0112 20z" fill="currentColor"/>
  </svg>
);

export const TagIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" fill="currentColor"/>
  </svg>
);

export const ClipboardIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="currentColor"/>
  </svg>
);

export const DownloadIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CheckCircleIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CircleIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const InfoIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const LockIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const XCircleIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ChevronDownIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ChevronUpIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <polyline points="18 15 12 9 6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CheckIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MessageSquareIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export const SaveIcon = ({ size = 24, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

export const CancelCloseIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 492 492" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M300.188,246L484.14,62.04c5.06-5.064,7.852-11.82,7.86-19.024c0-7.208-2.792-13.972-7.86-19.028L468.02,7.872 c-5.068-5.076-11.824-7.856-19.036-7.856c-7.2,0-13.956,2.78-19.024,7.856L246.008,191.82L62.048,7.872 c-5.06-5.076-11.82-7.856-19.028-7.856c-7.2,0-13.96,2.78-19.02,7.856L7.872,23.988c-10.496,10.496-10.496,27.568,0,38.052 L191.828,246L7.872,429.952c-5.064,5.072-7.852,11.828-7.852,19.032c0,7.204,2.788,13.96,7.852,19.028l16.124,16.116 c5.06,5.072,11.824,7.856,19.02,7.856c7.208,0,13.968-2.784,19.028-7.856l183.96-183.952l183.952,183.952 c5.068,5.072,11.824,7.856,19.024,7.856h0.008c7.204,0,13.96-2.784,19.028-7.856l16.12-16.116 c5.06-5.064,7.852-11.824,7.852-19.028c0-7.204-2.792-13.96-7.852-19.028L300.188,246z"/>
  </svg>
);

export const HourglassIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M 16.5156 49.5742 L 39.2734 49.5742 C 41.6640 49.5742 43.0937 48.2617 43.0937 45.7305 L 43.0937 45.1211 C 43.1172 38.6523 36.2266 33.4023 33.2031 30.5430 C 32.3593 29.7461 31.9140 29.0196 31.9140 27.9649 C 31.9140 26.9102 32.3593 26.2071 33.2031 25.3867 C 36.2031 22.4805 43.0937 17.5586 43.0937 10.8320 L 43.0937 10.2696 C 43.0937 7.7383 41.6640 6.4258 39.2734 6.4258 L 16.5156 6.4258 C 14.1718 6.4258 12.8828 7.7383 12.8828 10.0586 L 12.8828 10.8320 C 12.8828 17.5586 19.7734 22.4805 22.7969 25.3867 C 23.6406 26.2071 24.0859 26.9102 24.0859 27.9649 C 24.0859 29.0196 23.6406 29.7461 22.7969 30.5430 C 19.7734 33.4023 12.8828 38.6523 12.8828 45.1211 L 12.8828 45.9414 C 12.8828 48.2617 14.1718 49.5742 16.5156 49.5742 Z M 18.9531 46.3633 C 17.8281 46.3633 17.4766 45.1211 18.5781 44.3008 L 26.5937 38.3242 C 26.8515 38.1133 26.9922 37.9727 26.9922 37.6211 L 26.9922 26.3477 C 26.9922 25.0820 26.7344 24.4492 25.8437 23.6992 C 24.5078 22.5742 21.9766 20.7930 20.8281 19.1758 C 20.3593 18.5196 20.4062 17.9805 20.9922 17.9805 L 34.9844 17.9805 C 35.5703 17.9805 35.6172 18.5196 35.1484 19.1758 C 34.0000 20.7930 31.4922 22.5742 30.1328 23.6992 C 29.2422 24.4492 28.9844 25.0820 28.9844 26.3477 L 28.9844 37.6211 C 28.9844 37.9727 29.125 38.1133 29.3828 38.3242 L 37.4218 44.3008 C 38.5234 45.1211 38.1484 46.3633 37.0469 46.3633 Z"/>
  </svg>
);

export const PreciseTickIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
