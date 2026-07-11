import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, ChevronRight } from 'lucide-react';
import { searchService } from '@/lib/searchService';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { SearchListIcon } from '@/components/ui/CustomIcons';

// ── Inline brand SVG icons (no lucide, no require) ────────────────────────────
const CekaIcon = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 1280 1280" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(-320, 1680) scale(0.15,-0.15)" fill="currentColor">
      <path d="M9380 11004 c-186 -42 -311 -107 -439 -228 -272 -260 -348 -664 -187 -1003 114 -240 306 -401 564 -476 113 -32 343 -31 457 1 208 60 384 189 500 367 67 104 101 184 125 292 66 296 -30 608 -251 819 -113 107 -235 175 -384 215 -104 28 -292 34 -385 13z" />
      <path d="M6170 9584 c-652 -46 -1285 -293 -1795 -701 -128 -102 -349 -320 -454 -446 -651 -786 -882 -1827 -625 -2824 294 -1147 1255 -2061 2424 -2306 379 -80 813 -90 1180 -27 1002 171 1846 797 2311 1712 177 350 296 757 319 1099 21 309 8 698 -31 903 -98 518 -309 981 -636 1394 -99 124 -362 386 -498 495 -462 370 -990 598 -1570 677 -135 18 -503 32 -625 24z m403 -1239 c603 -64 1130 -394 1449 -907 59 -95 159 -299 152 -310 -3 -5 -270 -8 -593 -8 -643 0 -640 0 -712 -59 -19 -16 -48 -53 -64 -82l-30 -54 -3 -486c-3 -471 -2 -488 18 -542 14 -37 36 -69 66 -97 86 -79 47 -75 717 -78 503 -2 597 -5 597 -17 0 -20 -76 -177 -131 -271 -138 -233 -349 -455 -589 -619 -111 -75 -332 -183 -467 -228 -388 -129 -829 -127 -1218 5 -662 223 -1139 763 -1280 1446 -144 699 115 1429 669 1882 296 241 670 393 1056 429 146 13 208 12 363 -4z" />
    </g>
  </svg>
);

const NasakaIcon = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(-180, 1260) scale(0.135,-0.135)" fill="currentColor">
      <path d="M5135 9223 c-559 -49 -1092 -260 -1555 -616 -117 -90 -384 -351 -477 -467 -290 -360 -500 -803 -593 -1250 -72 -351 -79 -741 -19 -1089 104 -604 429 -1261 949 -1922 103 -132 1951 -2309 1959 -2308 7 0 1719 2051 1854 2219 560 701 899 1332 1026 1905 50 227 56 288 56 580 0 294 -7 370 -52 595 -254 1267 -1318 2228 -2601 2350 -98 9 -453 11 -547 3z m575 -638 c250 -35 478 -104 692 -208 249 -122 436 -255 633 -452 356 -355 580 -799 657 -1299 31 -204 31 -519 0 -701 -86 -502 -308 -938 -653 -1284 -439 -438 -1025 -681 -1644 -681 -864 0 -1643 471 -2055 1243 -176 330 -261 685 -261 1092 0 476 126 888 394 1290 116 173 289 364 453 497 427 348 970 536 1514 523 85 -2 207 -11 270 -20z" />
      <path d="M5250 7760 c-597 -83 -1055 -488 -1213 -1070 -30 -112 -31 -122 -31 -330 -1 -172 3 -232 17 -300 125 -583 579 -1025 1157 -1125 126 -22 354 -22 485 0 575 96 1033 540 1161 1125 15 67 19 127 19 280 0 209 -10 279 -61 443l-26 80 -119 -119 -120 -120 16 -88c69 -397 -86 -810 -399 -1065 -134 -109 -267 -175 -450 -224 -69 -18 -108 -21 -266 -21 -159 0 -196 3 -265 21 -164 45 -307 116 -427 212 -214 170 -351 396 -409 673 -30 148 -23 372 16 503 36 121 74 211 125 292 206 327 541 524 920 540 296 12 569 -85 790 -283l63 -56 106 107 106 106 -65 60c-181 166 -432 292 -685 344 -94 19 -352 28 -445 15z" />
      <path d="M6780 7494 c-30 -8 -78 -29 -107 -46 -32 -20 -258 -238 -614 -594 l-563 -564 -196 195 c-170 169 -206 199 -266 227 -66 31 -75 33 -184 33 -105 0 -120 -2 -170 -27 -30 -15 -71 -41 -90 -57 l-35 -30 450 -450 c442 -443 451 -451 490 -451 39 0 49 9 867 827 l827 827 -20 22 c-31 33 -127 80 -187 93 -70 15 -135 13 -202 -5z" />
    </g>
  </svg>
);

const BillsIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0,2)" fill="currentColor">
      <path d="M3.348,4.007 C3.322,4.007 3.29,4.021 3.262,4.024 L3.293,3.994 L0.025,1.965 L0.011,2.562 L1.511,5.022 C1.234,5.363 1.038,5.728 1.038,6.01 L1.038,10.918 L3,10.918 L3,9.263 L5.98,7.929 L8.999,7.929 L9.666,10.918 L10.918,10.918 L10.918,5.328 L9.911,4.008 L3.348,4.008 L3.348,4.007 Z" />
      <path d="M13.752,1.623 L13.336,0.238 L10.681,2.86 L12.01,4.243 L14.82,4.847 L16.012,3.975 L13.752,1.623 Z" />
    </g>
  </svg>
);

const PiecesIcon = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(-2.5, -2) scale(1.2, 1.2)" strokeWidth="1">
      <path d="M4.46814 17.5319C5.62291 19.7154 7.92876 20.5 12 20.5C17.6255 20.5 19.8804 19.002 20.3853 14.3853M4.46814 17.5319C3.77924 16.2292 3.5 14.4288 3.5 12C3.5 5.5 5.5 3.5 12 3.5C18.5 3.5 20.5 5.5 20.5 12C20.5 12.8745 20.4638 13.6676 20.3853 14.3853M4.46814 17.5319L7.58579 14.4142C8.36684 13.6332 9.63317 13.6332 10.4142 14.4142L10.5858 14.5858C11.3668 15.3668 12.6332 15.3668 13.4142 14.5858L15.5858 12.4142C16.3668 11.6332 17.6332 11.6332 18.4142 12.4142L20.3853 14.3853M10.691 8.846C10.691 9.865 9.864 10.692 8.845 10.692C7.827 10.692 7 9.865 7 8.846C7 7.827 7.827 7 8.845 7C9.864 7 10.691 7.827 10.691 8.846Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

const ReportIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 -0.5 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.9,4 L5.3,4 C4.13975,4 3.2,4.895 3.2,6 L3.2,14 C3.2,15.105 4.13975,16 5.3,16 L17.9,16 C19.06025,16 20,15.105 20,14 L20,6 C20,4.895 19.06025,4 17.9,4 M1.1,5 L1.1,19 C1.1,19.552 0.6296,20 0.05,20 C-0.5296,20 -1,19.552 -1,19 L-1,5 C-1,4.448 -0.5296,4 0.05,4 C0.6296,4 1.1,4.448 1.1,5" fill="currentColor" transform="translate(1,0)" />
  </svg>
);

const CampaignExclusiveIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M22,4.28V15.72a2,2,0,0,1-.77,1.58,2.05,2.05,0,0,1-1.23.42,2,2,0,0,1-.48-.06L10,15.28,8.88,15H7a5,5,0,0,1-3.5-1.43A5,5,0,0,1,7,5H8.88L19.52,2.34a2,2,0,0,1,1.71.36A2,2,0,0,1,22,4.28Z" />
    <path d="M10,16.31V20a2,2,0,0,1-2,2H6.82a2,2,0,0,1-2-1.61L3.8,15.08a5.68,5.68,0,0,0,1.74.74A5.9,5.9,0,0,0,7,16H8.76Z" />
  </svg>
);

// ── Tool dock definition ──────────────────────────────────────────────────────
type ToolEntry = {
  name: string;
  href: string;
  isExternal: boolean;
  Icon: React.FC<{ size?: number }>;
  color: string;
};

const TOOLS: ToolEntry[] = [
  { name: 'CEKA', href: '/', isExternal: false, Icon: CekaIcon, color: 'bg-green-600' },
  { name: 'NASAKA', href: 'https://nasakaiebc.civiceducationkenya.com', isExternal: true, Icon: NasakaIcon, color: 'bg-blue-600' },
  { name: 'BILLS', href: '/legislative-tracker', isExternal: false, Icon: BillsIcon, color: 'bg-indigo-600' },
  { name: 'PIECES', href: '/pieces', isExternal: false, Icon: PiecesIcon, color: 'bg-rose-600' },
  { name: 'REPORT', href: 'https://report.civiceducationkenya.com', isExternal: true, Icon: ReportIcon, color: 'bg-amber-600' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const SearchEmptyState = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<{ term: string; count: number }[]>([]);
  const [isTrendingExpanded, setIsTrendingExpanded] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    // Live trending terms from searchService
    searchService.getPopularSearches().then(terms => {
      setPopularSearches(terms.map(t => ({ term: t, count: 0 })));
    });

    // Recent from localStorage — auth-gated
    if (user) {
      const stored = localStorage.getItem('ceka_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 5));
    }

    // Live campaigns carousel + Priority Hybrid Feed
    const fetchFeed = async () => {
      const [billsRes, blogsRes, campaignsRes] = await Promise.all([
        supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('blog_posts').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(5),
        supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      const feedItems: any[] = [];

      // Slot 0: Sponsored Ad
      feedItems.push({
        id: 'ad-nasaka',
        type: 'ad',
        title: 'Nasaka IEBC Verification',
        description: 'Verify your voter status ahead of the upcoming electoral cycle.',
        label: 'SPONSORED',
        targetUrl: 'https://nasakaiebc.civiceducationkenya.com',
        isExternal: true
      });

      // Slot 1: Highest Priority (Newest Campaign)
      if (campaignsRes.data && campaignsRes.data.length > 0) {
        const top = campaignsRes.data[0];
        const dbImg = (top as any).image_url || (top as any).cover_image || (top as any).featured_image || (top as any).thumbnail_url || (top as any).thumbnail || (top as any).banner_image;
        feedItems.push({
          id: top.id,
          type: 'campaign',
          title: top.title,
          description: top.description || '',
          label: 'LIVE CAMPAIGN',
          image_url: dbImg,
          targetUrl: `/campaign/${top.id}`,
          isExternal: false
        });
      } else {
        feedItems.push({
          id: 'fallback-campaign',
          type: 'campaign',
          title: 'The 2026 Finance Bill Analysis',
          description: 'Simplified summary of the newest amendments.',
          label: 'LIVE BREAKDOWN',
          targetUrl: '/pieces',
          isExternal: false
        });
      }

      // Slots 2, 3, 4: Seeded Randomizer Archives
      const today = new Date();
      let seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const seededRandom = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      const archivePool: any[] = [];
      if (billsRes.data) {
        billsRes.data.forEach(b => {
          const dbImg = (b as any).image_url || (b as any).cover_image || (b as any).featured_image || (b as any).thumbnail_url || (b as any).thumbnail;
          archivePool.push({
            id: b.id, type: 'bill', title: b.title, description: b.summary || '',
            label: 'LEGISLATIVE TRACKER', image_url: dbImg, targetUrl: `/bill/${(b as any).slug || b.id}`, isExternal: false
          });
        });
      }
      if (blogsRes.data) {
        blogsRes.data.forEach(p => {
          const dbImg = (p as any).image_url || (p as any).cover_image || (p as any).featured_image || (p as any).thumbnail_url || (p as any).thumbnail;
          archivePool.push({
            id: p.id, type: 'blog', title: p.title, description: p.excerpt || '',
            label: 'PIECES POST', image_url: dbImg, targetUrl: `/blog/${(p as any).slug || p.id}`, isExternal: false
          });
        });
      }
      if (campaignsRes.data && campaignsRes.data.length > 1) {
        campaignsRes.data.slice(1).forEach(c => {
           const dbImg = (c as any).image_url || (c as any).cover_image || (c as any).featured_image || (c as any).thumbnail_url || (c as any).thumbnail || (c as any).banner_image;
           archivePool.push({
             id: c.id, type: 'campaign', title: c.title, description: c.description || '',
             label: 'CAMPAIGN', image_url: dbImg, targetUrl: `/campaign/${c.id}`, isExternal: false
           });
        });
      }

      const shuffled = archivePool.sort(() => seededRandom() - 0.5);
      feedItems.push(...shuffled.slice(0, 3));
      setCampaigns(feedItems);
    };

    fetchFeed();
  }, [user]);

  // Auto-advance carousel
  useEffect(() => {
    if (campaigns.length <= 1) return;
    const t = setInterval(() => setCurrentSlideIndex(p => (p + 1) % campaigns.length), 4500);
    return () => clearInterval(t);
  }, [campaigns]);

  // Ultra-smooth image preloading
  useEffect(() => {
    if (campaigns.length === 0) return;
    const preloadNext = () => {
      const nextIndex = (currentSlideIndex + 1) % campaigns.length;
      const subIndex = (currentSlideIndex + 2) % campaigns.length;
      [campaigns[nextIndex], campaigns[subIndex]].forEach(item => {
        if (item) {
          const targetImage = item.image_url || `https://images.civiceducationkenya.com/og/${item.type}/${item.id}.png`;
          const img = new Image();
          img.src = targetImage;
        }
      });
    };
    const timer = setTimeout(preloadNext, 300);
    return () => clearTimeout(timer);
  }, [currentSlideIndex, campaigns]);

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(t => t !== term);
    setRecentSearches(updated);
    localStorage.setItem('ceka_recent_searches', JSON.stringify(updated));
  };

  const handleTermClick = (term: string) => {
    if (user) {
      const stored = JSON.parse(localStorage.getItem('ceka_recent_searches') || '[]');
      const updated = [term, ...stored.filter((t: string) => t !== term)].slice(0, 5);
      localStorage.setItem('ceka_recent_searches', JSON.stringify(updated));
    }
    navigate(`/search?q=${encodeURIComponent(term)}&t=true`);
  };

  const handleToolClick = (tool: ToolEntry) => {
    if (tool.isExternal) {
      window.open(tool.href, '_blank', 'noopener,noreferrer');
    } else {
      navigate(tool.href);
    }
  };

  const currentCampaign = campaigns[currentSlideIndex];

  const FeaturedItemIcon = ({ item }: { item: any }) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const targetImage = item.image_url || `https://images.civiceducationkenya.com/og/${item.type}/${item.id}.png`;

    useEffect(() => {
      let isMounted = true;
      setImgLoaded(false); // Reset state when target image changes

      const img = new Image();
      img.src = targetImage;
      img.onload = () => {
        if (isMounted) setImgLoaded(true);
      };
      // Errors are silently discarded by the browser, preserving the SVG
      return () => { isMounted = false; };
    }, [targetImage]);

    let SvgBase = <CampaignExclusiveIcon size={24} />;
    if (item.type === 'bill') SvgBase = <BillsIcon size={24} />;
    else if (item.type === 'blog') SvgBase = <PiecesIcon size={24} />;
    else if (item.type === 'ad') SvgBase = <NasakaIcon size={24} />;

    return (
      <>
        {SvgBase}
        {imgLoaded && (
          <img
            src={targetImage}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-300"
          />
        )}
      </>
    );
  };

  const renderFeaturedContent = (item: any) => (
    <>
      <div className="w-12 h-12 rounded-xl bg-emerald-500 overflow-hidden flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0 relative">
        <FeaturedItemIcon item={item} />
      </div>
      <div className="flex-1 min-w-0 ml-4 flex flex-col justify-center text-left">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
            {item.label}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
          {item.title}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-white/50 truncate font-medium mt-0.5">
          {item.description}
        </p>
      </div>
      <ChevronRight size={16} className="text-slate-300 dark:text-white/20 flex-shrink-0 ml-2" />
    </>
  );

  return (
    <div className="w-full space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* 1. Live Breakdown Hero — dynamic featured feed */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="w-full h-24 rounded-2xl overflow-hidden relative group shadow-ios-low border border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10 z-0" />
        <AnimatePresence mode="wait">
          {currentCampaign && (
            <motion.div
              key={currentSlideIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-10 w-full"
            >
              {currentCampaign.isExternal ? (
                <a href={currentCampaign.targetUrl} target="_blank" rel="noopener noreferrer" className="h-full flex items-center p-4 gap-0 w-full cursor-pointer">
                  {renderFeaturedContent(currentCampaign)}
                </a>
              ) : (
                <div onClick={() => navigate(currentCampaign.targetUrl)} className="h-full flex items-center p-4 gap-0 w-full cursor-pointer">
                  {renderFeaturedContent(currentCampaign)}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 2. App Dock — 5 brand tools */}
      <div className="grid grid-cols-5 gap-2 px-1">
        {TOOLS.map(tool => (
          <motion.button
            key={tool.name}
            whileTap={{ scale: 0.88 }}
            onClick={() => handleToolClick(tool)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className={`w-14 h-14 rounded-[1.25rem] ${tool.color} flex items-center justify-center text-white shadow-ios-high group-hover:scale-105 transition-transform duration-300 relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20" />
              <tool.Icon size={32} />
            </div>
            <span className="text-[9px] font-bold text-slate-500 dark:text-white/40 tracking-widest uppercase">{tool.name}</span>
          </motion.button>
        ))}
      </div>

      {/* 3. Unified Spotlight Grouped List */}
      <div className="bg-slate-50/50 dark:bg-[#1C1C1E]/60 backdrop-blur-3xl rounded-[2rem] border border-slate-200/60 dark:border-white/5 overflow-hidden shadow-ios-high">

        {/* Recent Searches — auth-gated */}
        {user && recentSearches.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <div className="px-5 pt-5 pb-2">
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-[0.15em] ml-1">Recent Searches</h4>
            </div>
            {recentSearches.map(term => (
              <div
                key={term}
                onClick={() => handleTermClick(term)}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/20">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-white/90">{term}</span>
                </div>
                <button
                  onClick={e => removeRecentSearch(e, term)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-white/20 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Trending Topics — collapsible, live data */}
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          <button
            onClick={() => setIsTrendingExpanded(v => !v)}
            className="w-full flex items-center justify-between px-5 pt-6 pb-4 cursor-pointer group"
          >
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-[0.15em] ml-1">Trending Topics</h4>
            <ChevronRight
              size={14}
              className={`text-slate-300 dark:text-white/20 transition-transform duration-300 ${isTrendingExpanded ? 'rotate-90' : 'rotate-0'}`}
            />
          </button>

          <AnimatePresence initial={false}>
            {isTrendingExpanded && (
              <motion.div
                key="trending-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                {popularSearches.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {popularSearches.map((topic, idx) => {
                      const palette = ['purple', 'amber', 'blue', 'emerald', 'rose', 'indigo'];
                      const color = palette[idx % palette.length];
                      return (
                        <div
                          key={topic.term}
                          onClick={() => handleTermClick(topic.term)}
                          className="flex items-center justify-between px-5 py-4 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] cursor-pointer group transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 flex items-center justify-center flex-shrink-0`}>
                              <SearchListIcon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-white/90">{topic.term}</span>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 dark:text-white/10 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-10 text-center text-sm text-slate-400 dark:text-white/20 font-medium">
                    Fetching trending topics…
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
};
