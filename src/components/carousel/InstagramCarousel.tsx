
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { mediaService, type MediaContent, type MediaItem } from '@/services/mediaService';
import storageService from '@/services/storageService';
import DownloadPortal from '@/components/media/DownloadPortal';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import piecesSocialService from '@/services/piecesSocialService';
import {
  LikeOutlineIcon,
  LikeFilledIcon,
  BookmarkOutlineIcon,
  BookmarkFilledIcon,
  SendIcon,
  DownloadArrowIcon,
} from '@/components/media/PiecesIcons';

// ── Lottie animation data (public path, loaded at runtime)
const LOTTIE_LIKE_URL = '/lottie-like.json';

interface InstagramCarouselProps {
  content: MediaContent;
  className?: string;
  initialLiked?: boolean;
  initialSaved?: boolean;
  initialLikeCount?: number;
  targetSlug?: string | null;
  coPartner?: { org_name: string; org_logo_url: string | null } | null;
  coPartners?: { org_name: string; org_logo_url: string | null }[];
}

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 500;
const HD_UPGRADE_DELAY_MS = 600;
// localStorage key for tracking whether Lottie has already played for a given content
const LOTTIE_SEEN_PREFIX = 'ceka_like_lottie_seen_';

const buildCloudinaryVariant = (url: string, width: number, quality: string): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${width},q_${quality},f_webp/`);
};

const buildLQIP = (url: string): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/w_50,e_blur:800,q_1,f_webp/');
};

const InstagramCarousel: React.FC<InstagramCarouselProps> = ({
  content,
  className,
  initialLiked = false,
  initialSaved = false,
  initialLikeCount = 0,
  targetSlug,
  coPartner,
  coPartners = [],
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageHD, setImageHD] = useState(false);
  const [masterRatio, setMasterRatio] = useState<string | null>(null);
  const [hydratedItems, setHydratedItems] = useState<MediaItem[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);
  const [lottieData, setLottieData] = useState<object | null>(null);

  // Social state — optimistic
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  // Lottie overlay: show on first like; never again for this piece (persisted via localStorage)
  const [showLottieOverlay, setShowLottieOverlay] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const hdUpgradeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchCache = useRef<Set<string>>(new Set());
  // FIX #5: track double-tap timer for Instagram-style double-tap-to-like
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<number>(0);

  const { user } = useAuth();
  const { toast } = useToast();

  // Sync social state when props change (batch fetch in MediaFeed passes down)
  useEffect(() => { setLiked(initialLiked); }, [initialLiked]);
  useEffect(() => { setSaved(initialSaved); }, [initialSaved]);
  useEffect(() => { setLikeCount(initialLikeCount); }, [initialLikeCount]);

  // Load Lottie animation data lazily (only when needed)
  useEffect(() => {
    fetch(LOTTIE_LIKE_URL)
      .then(r => r.json())
      .then(data => setLottieData(data))
      .catch(() => {}); // Gracefully skip if fetch fails
  }, []);

  // Hydrate media URLs — PRESERVED
  useEffect(() => {
    const hydrateMedia = async () => {
      setIsHydrating(true);
      const rawItems = content.items || [];
      try {
        const hydrated = await Promise.all(rawItems.map(async (item) => {
          if (item.file_url) {
            const authorizedUrl = await storageService.getAuthorizedUrl(item.file_url);
            return { ...item, file_url: authorizedUrl || item.file_url };
          }
          return item;
        }));
        setHydratedItems(hydrated);
      } catch (err) {
        console.error('[Carousel] Hydration failed:', err);
        setHydratedItems(rawItems);
      } finally {
        setIsHydrating(false);
        setImageLoading(true);
        setImageHD(false);
        setCurrentIndex(0);
        setDirection(0);
        setMasterRatio(null);
      }
    };
    hydrateMedia();
  }, [content.id, content.slug]);

  // Prefetch N±1 swipe-tier slides silently
  const prefetchAdjacentSlides = useCallback((idx: number, itemsList: MediaItem[]) => {
    [idx - 1, idx + 1].filter(i => i >= 0 && i < itemsList.length).forEach(i => {
      const url = itemsList[i]?.file_url;
      if (!url || prefetchCache.current.has(url)) return;
      prefetchCache.current.add(url);
      const img = new Image();
      img.src = buildCloudinaryVariant(url, 640, 'auto:eco') || url;
    });
  }, []);

  useEffect(() => {
    if (!isHydrating && hydratedItems.length > 0) {
      prefetchAdjacentSlides(currentIndex, hydratedItems);
    }
  }, [currentIndex, isHydrating, hydratedItems, prefetchAdjacentSlides]);

  // HD-tier upgrade: 600ms pause on slide
  useEffect(() => {
    setImageHD(false);
    if (hdUpgradeTimer.current) clearTimeout(hdUpgradeTimer.current);
    hdUpgradeTimer.current = setTimeout(() => setImageHD(true), HD_UPGRADE_DELAY_MS);
    return () => { if (hdUpgradeTimer.current) clearTimeout(hdUpgradeTimer.current); };
  }, [currentIndex]);

  // FIX #5: cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (hdUpgradeTimer.current) clearTimeout(hdUpgradeTimer.current);
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
    };
  }, []);

  const dragX = useMotionValue(0);

  const getAspectRatioPadding = (ratio?: string | null): string => {
    if (!ratio || ratio.includes('Square')) return '100%';
    const ratioMap: Record<string, string> = {
      '4:3': '75%', '3:4': '133.33%', '4:5': '125%', '5:4': '80%',
      '16:9': '56.25%', '9:16': '177.78%', '21:9': '42.86%', '2:3': '150%',
      '3:2': '66.67%', '1:1': '100%', 'square': '100%', 'portrait': '125%', 'landscape': '56.25%'
    };
    if (ratioMap[ratio]) return ratioMap[ratio];
    const parts = ratio.split(':');
    if (parts.length === 2) {
      const [w, h] = parts.map(Number);
      if (w && h) return `${Math.min((h / w), 1.5) * 100}%`;
    }
    return '100%';
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoading(false);
    if (!masterRatio && currentIndex === 0) {
      const img = e.currentTarget;
      if (img.naturalWidth > 0) {
        setMasterRatio((img.naturalHeight / img.naturalWidth).toString());
      }
    }
  };

  const goToSlide = useCallback((idx: number) => {
    if (idx === currentIndex) return;
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
    setImageLoading(true);
    setImageHD(false);
    try { navigator.vibrate?.(8); } catch {}
  }, [currentIndex]);

  const nextSlide = () => { if (currentIndex < hydratedItems.length - 1) goToSlide(currentIndex + 1); };
  const prevSlide = () => { if (currentIndex > 0) goToSlide(currentIndex - 1); };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) nextSlide();
    else if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) prevSlide();
  };

  const handleProgressBarInteract = useCallback((clientX: number) => {
    if (!progressBarRef.current || hydratedItems.length <= 1) return;
    const bar = progressBarRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - bar.left) / bar.width));
    goToSlide(Math.min(hydratedItems.length - 1, Math.floor(frac * hydratedItems.length)));
  }, [hydratedItems.length, goToSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hydratedItems]);

  // ── Social handlers

  /**
   * FIX #8 (auth-gate): null user → dispatch ceka:open-auth-modal.
   * Applies to Like, Save, and Share.
   */
  const requireAuth = (): boolean => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('ceka:open-auth-modal'));
      return false;
    }
    return true;
  };

  /**
   * Play Lottie overlay — only on the FIRST like of this piece (Instagram behaviour).
   * After that, localStorage flag prevents re-trigger.
   */
  const maybeTriggerLottie = () => {
    const seenKey = `${LOTTIE_SEEN_PREFIX}${content.id}`;
    if (!localStorage.getItem(seenKey) && lottieData) {
      localStorage.setItem(seenKey, '1');
      setShowLottieOverlay(true);
      // Auto-hide after ~1.8s (animation duration ~3s / 60fps * 108 frames)
      setTimeout(() => setShowLottieOverlay(false), 1800);
    }
  };

  const handleLike = async () => {
    if (!requireAuth()) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount(prev => nextLiked ? prev + 1 : Math.max(0, prev - 1));
    if (nextLiked) maybeTriggerLottie();
    const confirmed = await piecesSocialService.toggleLike(user!.id, content.id, liked);
    if (confirmed !== nextLiked) {
      setLiked(confirmed);
      setLikeCount(prev => confirmed ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleSave = async () => {
    if (!requireAuth()) return;
    const nextSaved = !saved;
    setSaved(nextSaved);
    toast({
      title: nextSaved ? 'Saved to your collection' : 'Removed from collection',
      description: nextSaved ? `"${content.title}" has been saved.` : undefined,
    });
    const confirmed = await piecesSocialService.toggleSave(user!.id, content.id, saved);
    if (confirmed !== nextSaved) setSaved(confirmed);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/pieces/${content.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: content.title, text: content.description || 'Civic education by CEKA', url: shareUrl });
        if (user) piecesSocialService.recordShare(user.id, content.id);
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copied!', description: 'Piece link copied to clipboard.' });
    if (user) piecesSocialService.recordShare(user.id, content.id);
  };

  /**
   * Double-tap-to-like: Instagram-style trigger on media area.
   * Fires Lottie overlay only on first like, button icon animates on subsequent likes.
   */
  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 350) {
      // Double tap detected
      clearTimeout(doubleTapTimer.current!);
      doubleTapTimer.current = null;
      if (!liked) handleLike();
      else maybeTriggerLottie(); // Always show burst on double-tap even if already liked
    }
    lastTap.current = now;
  };

  if (isHydrating) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-12 bg-muted/5 rounded-2xl min-h-[400px]", className)}>
        <CEKALoader variant="ios" size="md" />
        <p className="mt-4 text-xs font-bold text-muted-foreground uppercase animate-pulse">Hydrating Media...</p>
      </div>
    );
  }

  if (hydratedItems.length === 0) return null;

  const currentItem = hydratedItems[currentIndex];
  const activeRatio = masterRatio || (currentItem.metadata?.aspect_ratio as string);
  const rawUrl = currentItem.file_url || '';
  const swipeSrc = buildCloudinaryVariant(rawUrl, 640, 'auto:eco');
  const hdSrc = buildCloudinaryVariant(rawUrl, 1440, 'auto:good');
  const lqipSrc = buildLQIP(rawUrl);
  const activeSrc = imageHD ? (hdSrc || rawUrl) : (swipeSrc || rawUrl);

  const allPartners = coPartners.length > 0 ? coPartners : coPartner ? [coPartner] : [];

  return (
    <div className={cn("relative group max-w-xl mx-auto flex flex-col bg-transparent pieces-carousel-root", className)}>

      {/* ── TikTok/IG segmented progress bar ── */}
      {hydratedItems.length > 1 && (
        <div
          ref={progressBarRef}
          className="pieces-progress-bar"
          onTouchStart={(e) => handleProgressBarInteract(e.touches[0].clientX)}
          onTouchMove={(e) => { e.stopPropagation(); handleProgressBarInteract(e.touches[0].clientX); }}
          onClick={(e) => handleProgressBarInteract(e.clientX)}
          role="slider"
          aria-label="Slide progress — tap to jump"
          aria-valuemin={0}
          aria-valuemax={hydratedItems.length - 1}
          aria-valuenow={currentIndex}
        >
          {hydratedItems.map((_, i) => (
            <div
              key={i}
              className={cn(
                "pieces-progress-segment",
                i === currentIndex && "pieces-progress-segment--active",
                i < currentIndex && "pieces-progress-segment--past"
              )}
            />
          ))}
        </div>
      )}

      {/* ── Media container ── */}
      <div className="relative overflow-hidden rounded-2xl bg-muted/5">
        <motion.div
          className="relative w-full touch-pan-y"
          animate={{ paddingBottom: getAspectRatioPadding(activeRatio) }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        >
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={`${content.id}-${currentIndex}`}
              custom={direction}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              onTap={handleMediaTap}
              variants={{
                enter: (d: number) => ({ x: d > 0 ? '100.5%' : '-100.5%', opacity: 0, scale: 0.95 }),
                center: { x: 0, opacity: 1, scale: 1, zIndex: 1 },
                exit: (d: number) => ({ x: d < 0 ? '100.5%' : '-100.5%', opacity: 0, scale: 0.95, zIndex: 0 })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.25 },
                scale: { type: "spring", stiffness: 350, damping: 35 }
              }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing bg-black/5"
            >
              {currentItem.type === 'image' ? (
                <>
                  {imageLoading && lqipSrc && (
                    <img
                      src={lqipSrc}
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-contain blur-xl scale-110 select-none pointer-events-none"
                      draggable={false}
                    />
                  )}
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
                      <CEKALoader variant="pulse" size="md" />
                    </div>
                  )}
                  <img
                    src={activeSrc}
                    alt={content.title}
                    className={cn(
                      "w-full h-full object-contain bg-black/5 select-none pointer-events-none transition-opacity duration-300",
                      imageLoading ? "opacity-0" : "opacity-100"
                    )}
                    loading="lazy"
                    draggable={false}
                    onLoad={handleImageLoad}
                    onError={() => setImageLoading(false)}
                  />
                </>
              ) : currentItem.type === 'video' ? (
                <video src={rawUrl} controls className="w-full h-full object-contain" playsInline />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                  <Maximize2 size={40} strokeWidth={1.5} className="mb-2" />
                  <span className="text-xs uppercase tracking-widest font-medium">Unsupported Media</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Instagram double-tap Lottie overlay (80% opacity, first-like only) ── */}
          <AnimatePresence>
            {showLottieOverlay && lottieData && (
              <motion.div
                key="lottie-overlay"
                className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Lottie
                  lottieRef={lottieRef}
                  animationData={lottieData}
                  loop={false}
                  autoplay={true}
                  style={{ width: 220, height: 220 }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chevrons */}
          {currentIndex > 0 && (
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center z-20">
              <Button
                variant="ghost" size="icon"
                onClick={prevSlide}
                className="h-10 w-10 rounded-full bg-white/30 dark:bg-black/30 backdrop-blur-xl hover:bg-white/50 dark:hover:bg-black/50 text-foreground shadow-lg border border-white/20 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                aria-label="Previous slide"
              >
                <ChevronLeft size={22} />
              </Button>
            </div>
          )}
          {currentIndex < hydratedItems.length - 1 && (
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center z-20">
              <Button
                variant="ghost" size="icon"
                onClick={nextSlide}
                className="h-10 w-10 rounded-full bg-white/30 dark:bg-black/30 backdrop-blur-xl hover:bg-white/50 dark:hover:bg-black/50 text-foreground shadow-lg border border-white/20 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                aria-label="Next slide"
              >
                <ChevronRight size={22} />
              </Button>
            </div>
          )}

          {/* Partner overlay chips */}
          {allPartners.length > 0 && (
            <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1">
              {allPartners.map((p, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                  {p.org_logo_url && <img src={p.org_logo_url} alt={p.org_name} className="w-4 h-4 object-contain rounded-full" />}
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">{p.org_name}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Below-media controls ── */}
      <div className="pt-3 flex flex-col gap-3">

        {/* Dot row + counter */}
        <div className="flex justify-between items-center px-1">
          <div className="flex gap-1.5 flex-wrap max-w-[70%]">
            {hydratedItems.length > 1 && Array.from({ length: hydratedItems.length }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 cursor-pointer hover:opacity-80",
                  i === currentIndex ? "w-6 bg-kenya-red" : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          {hydratedItems.length > 1 && (
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest tabular-nums shrink-0">
              {currentIndex + 1} / {hydratedItems.length}
            </span>
          )}
        </div>

        {/* Social action bar: Like | Save | Share | → Download */}
        <div className="flex items-center gap-1 px-1">

          {/* ── Like ── */}
          <button
            onClick={handleLike}
            aria-label={liked ? 'Unlike this piece' : 'Like this piece'}
            aria-pressed={liked}
            className={cn("pieces-action-btn group/like", liked && "pieces-action-btn--liked")}
          >
            <motion.div
              animate={liked ? { scale: [1, 1.35, 1] } : {}}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {liked
                ? <LikeFilledIcon size={20} className="text-kenya-red" />
                : <LikeOutlineIcon size={20} className="text-muted-foreground group-hover/like:text-kenya-red transition-colors" />
              }
            </motion.div>
            {likeCount > 0 && (
              <span className={cn("text-[10px] font-black tabular-nums", liked ? "text-kenya-red" : "text-muted-foreground")}>
                {likeCount}
              </span>
            )}
          </button>

          {/* ── Save (bookmark to collection — NOT download) ── */}
          <button
            onClick={handleSave}
            aria-label={saved ? 'Remove from collection' : 'Save to collection'}
            aria-pressed={saved}
            className={cn("pieces-action-btn group/save", saved && "pieces-action-btn--saved")}
          >
            <motion.div
              animate={saved ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {saved
                ? <BookmarkFilledIcon size={20} className="text-kenya-green" />
                : <BookmarkOutlineIcon size={20} className="text-muted-foreground group-hover/save:text-kenya-green transition-colors" />
              }
            </motion.div>
          </button>

          {/* ── Share ── */}
          <button
            onClick={handleShare}
            aria-label="Share this piece"
            className="pieces-action-btn group/share"
          >
            <SendIcon size={19} className="text-muted-foreground group-hover/share:text-foreground transition-colors" />
          </button>

          <div className="flex-1" />

          {/* ── Download (DownloadPortal — PDF path removed from carousel, unified here) ── */}
          {(currentItem?.file_url || content.metadata?.pdf_url) && (
            <DownloadPortal
              filePath={currentItem?.file_path || currentItem?.file_url || ''}
              pdfPath={(content.metadata?.pdf_url as string) || null}
              availableQualities={(currentItem?.metadata?.qualities as string[]) || ['320p', '720p']}
              title={content.title}
              contentSlug={content.slug}
              contentId={content.id}
              trigger={
                <button className="pieces-download-btn" aria-label="Download options">
                  <DownloadArrowIcon size={15} />
                  <span>Download</span>
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramCarousel;
