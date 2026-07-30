import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mediaService, type MediaContent } from '@/services/mediaService';
import InstagramCarousel from '../carousel/InstagramCarousel';
import piecesSocialService, { type InteractionState } from '@/services/piecesSocialService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CEKALoader } from '@/components/ui/ceka-loader';
import { useAuth } from '@/providers/AuthProvider';
import { roleService } from '@/services/roleService';
import { supabase } from '@/integrations/supabase/client';
import ProposeCollab from '@/components/campaigns/ProposeCollab';
import {
  CancelCloseIcon as X,
  ArrowLeftIcon as ArrowLeft,
  ShareExportIcon as Share2,
  CopyDonationIcon as Copy,
  CheckIcon as Check,
  SparklesIcon as Sparkles,
  BuildingsIcon as Building2,
  CalendarIcon as Calendar,
  TagIcon as Tag
} from '@/components/ui/CustomIcons';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface PieceDetailModalProps {
  targetSlug?: string | null;
  onClose?: () => void;
}

export const PieceDetailModal: React.FC<PieceDetailModalProps> = ({ targetSlug, onClose }) => {
  const navigate = useNavigate();
  const params = useParams<{ slug?: string }>();
  const activeSlug = targetSlug || params.slug;

  const [piece, setPiece] = useState<MediaContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<{ org_name: string; org_logo_url: string | null }[]>([]);
  const [socialState, setSocialState] = useState<InteractionState>({ liked: false, saved: false, like_count: 0 });
  const [isAlly, setIsAlly] = useState(false);
  const [allyPartnerId, setAllyPartnerId] = useState<string | null>(null);
  const [allyUserId, setAllyUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const isOpen = Boolean(activeSlug);

  useEffect(() => {
    if (!activeSlug) {
      setPiece(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    mediaService.getMediaContent(activeSlug).then(async (data) => {
      if (!isMounted) return;
      if (data) {
        setPiece(data);

        // Fetch partners for co-branding
        const { data: collabData } = await (supabase.from('campaign_collaborations' as any) as any)
          .select('partner:partner_id (org_name, org_logo_url)')
          .eq('media_item_id', data.id)
          .eq('status', 'active');

        if (collabData?.length && isMounted) {
          setPartners(collabData.map((c: any) => c.partner).filter(Boolean));
        }

        // Fetch social interaction state
        if (user) {
          const statesMap = await piecesSocialService.batchGetInteractionState(user.id, [data.id]);
          const state = statesMap[data.id] || { liked: false, saved: false, like_count: 0 };
          if (isMounted) setSocialState(state);
        }
      } else {
        toast({ title: 'Piece not found', description: 'The requested piece could not be loaded.', variant: 'destructive' });
      }
      setLoading(false);
    }).catch(err => {
      console.error('[PieceDetailModal] Error loading piece:', err);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [activeSlug, user, toast]);

  // Check ally status
  useEffect(() => {
    if (!user) return;
    roleService.getUserRole(user.id, user.email).then(async role => {
      if (role === 'ally') {
        setIsAlly(true);
        setAllyUserId(user.id);
        const { data: partnerData } = await (supabase.from('partners' as any) as any)
          .select('id')
          .eq('submitted_by_user_id', user.id)
          .maybeSingle();
        if (partnerData?.id) setAllyPartnerId(partnerData.id);
      }
    });
  }, [user]);

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/pieces');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: 'Link copied to clipboard!', description: 'You can now share this piece directly.' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
        <DialogContent className="max-w-4xl w-[95vw] md:w-[90vw] max-h-[92vh] overflow-y-auto p-0 rounded-3xl border-white/10 bg-background/95 backdrop-blur-2xl shadow-2xl [&>button]:hidden">

          {/* Custom Header Bar */}
          <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="rounded-full gap-2 text-xs font-bold hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Feed</span>
              </Button>
              <div className="h-4 w-px bg-border/50 hidden sm:block" />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="rounded-full gap-1.5 text-xs font-bold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="rounded-full w-8 h-8 hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Modal Body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <CEKALoader variant="scanning" size="lg" />
              <p className="text-sm font-bold text-muted-foreground animate-pulse">Loading piece details...</p>
            </div>
          ) : piece ? (
            <div className="p-6 md:p-8 space-y-8">

              {/* Title & Metadata header */}
              <div className="space-y-3">
                <h1 className="text-2xl md:text-4xl font-black tracking-tight uppercase leading-tight text-foreground">
                  {piece.title}
                </h1>
                {piece.description && (
                  <p className="text-base text-muted-foreground font-medium leading-relaxed max-w-3xl">
                    {piece.description}
                  </p>
                )}

                {/* Partner co-branding tags */}
                {partners.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {partners.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-kenya-green/10 border border-kenya-green/20 text-kenya-green text-xs font-black uppercase tracking-wider">
                        {p.org_logo_url && <img src={p.org_logo_url} alt={p.org_name} className="w-4 h-4 rounded object-contain" />}
                        <span>In Partnership with {p.org_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Carousel */}
              <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden border border-border/50 shadow-xl bg-card">
                <InstagramCarousel
                  content={piece}
                  initialLiked={socialState.liked}
                  initialSaved={socialState.saved}
                  initialLikeCount={socialState.like_count}
                  coPartners={partners}
                  targetSlug={activeSlug}
                />
              </div>

              {/* Footer Meta & Tags */}
              <div className="pt-6 border-t border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {piece.tags && piece.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    {piece.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-xl text-[11px] font-bold">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {isAlly && allyPartnerId && (
                  <div className="w-full md:w-auto">
                    <ProposeCollab
                      mediaItemId={piece.id}
                      contentTitle={piece.title}
                      partnerId={allyPartnerId}
                      partnerUserId={allyUserId || ''}
                    />
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-20">
              <p className="font-bold text-muted-foreground">Piece could not be found.</p>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
};
