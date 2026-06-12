import React, { useState, useCallback, useRef, useMemo } from 'react';
import { unzipSync } from 'fflate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// ── Cloudflare Worker endpoints ──────────────────────────────────────────────
const CF_VISION_URL      = 'https://ceka-vision-extract.saemscodes.workers.dev';
const CF_VALIDATOR_URL   = 'https://ceka-extraction-validator.saemscodes.workers.dev';
const CF_TRANSLATOR_URL  = 'https://ceka-translation-draft.saemscodes.workers.dev';

// ── Helpers ──────────────────────────────────────────────────────────────────
function uint8ToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192)
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
}

const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const isImg = (n: string) => IMG_EXTS.some(e => n.toLowerCase().endsWith(e));

// ── Types ────────────────────────────────────────────────────────────────────
type SlideStatus = 'idle' | 'processing' | 'translating' | 'done' | 'error';

interface Slide {
  slide_number: number;
  filename: string;
  base64: string;
  preview_url: string;
  status: SlideStatus;
  extracted: any;
  translation_draft: string | null;
  confidence: number;
  validator_decision: string | null;
  error: string | null;
}

// ── Deep iOS Aesthetic Helpers ───────────────────────────────────────────────
const getStatusLabel = (s: Slide) => {
  if (s.status === 'idle') return 'Waiting';
  if (s.status === 'processing') return 'Extracting text...';
  if (s.status === 'translating') return 'Drafting Swahili...';
  if (s.status === 'done') return 'Completed';
  if (s.status === 'error') return 'Failed';
  return '';
};

const getStatusColor = (s: Slide) => {
  if (s.status === 'idle') return 'rgba(255, 255, 255, 0.3)';
  if (s.status === 'processing') return 'rgba(10, 132, 255, 0.9)'; // iOS Blue
  if (s.status === 'translating') return 'rgba(94, 92, 230, 0.9)'; // iOS Indigo
  if (s.status === 'done') return 'rgba(255, 255, 255, 0.7)';
  if (s.status === 'error') return 'rgba(255, 69, 58, 0.9)'; // iOS Red
  return 'rgba(255, 255, 255, 0.2)';
};

const getProgressWidth = (s: Slide) => {
  if (s.status === 'idle') return '0%';
  if (s.status === 'processing') return '40%';
  if (s.status === 'translating') return '80%';
  if (s.status === 'done' || s.status === 'error') return '100%';
  return '0%';
};

// ── Main component ────────────────────────────────────────────────────────────
export const AdminIngestion = () => {
  const { toast } = useToast();
  const [batchTitle, setBatchTitle] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [phase, setPhase] = useState<'input' | 'review' | 'published'>('input');
  const [processing, setProcessing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => ({
    total: slides.length,
    done: slides.filter(s => s.status === 'done').length,
    errors: slides.filter(s => s.status === 'error').length,
  }), [slides]);

  // ── ZIP ingestion ──────────────────────────────────────────────────────────
  const ingestZip = useCallback(async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const unzipped = unzipSync(new Uint8Array(buf));
      const entries = Object.entries(unzipped)
        .filter(([n]) => isImg(n))
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

      if (!entries.length) { toast({ title: 'No images in ZIP', variant: 'destructive' }); return; }

      const newSlides: Slide[] = entries.map(([name, bytes], idx) => {
        const ext = name.split('.').pop() || 'jpg';
        const mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
        return {
          slide_number: idx + 1,
          filename: name.split('/').pop() || name,
          base64: uint8ToBase64(bytes),
          preview_url: URL.createObjectURL(new Blob([bytes], { type: mime })),
          status: 'idle', extracted: null, translation_draft: null,
          confidence: 0, validator_decision: null, error: null,
        };
      });
      setSlides(newSlides);
      // No success toast. Silent, seamless UX.
    } catch (e: any) {
      toast({ title: 'Extraction failed', description: e.message, variant: 'destructive' });
    }
  }, [toast]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = Array.from(e.dataTransfer.files).find(f => f.name.endsWith('.zip'));
    if (f) await ingestZip(f);
    else toast({ title: 'Drop a .zip file', variant: 'destructive' });
  }, [ingestZip, toast]);

  // ── Per-slide pipeline: Vision → Validate → Translate ────────────────────
  const processSlide = async (slide: Slide, total: number): Promise<Slide> => {
    const is_final = slide.slide_number === total;
    let updated: Slide = { ...slide, status: 'processing', error: null };
    try {
      // 1. Vision extraction
      const vRes = await fetch(CF_VISION_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: slide.base64 || undefined, image_url: !slide.base64 ? slide.preview_url : undefined, slide_number: slide.slide_number, total_slides: total, is_final }),
      });
      const vData = await vRes.json() as any;
      if (!vRes.ok || vData.error) throw new Error(vData.error || 'Vision model failed');
      updated.extracted = vData.extracted;
      updated.status = 'translating';

      // React state micro-update to trigger UI progress bar
      setSlides(prev => prev.map(s => s.slide_number === slide.slide_number ? updated : s));

      // 2. Quality validation
      const valRes = await fetch(CF_VALIDATOR_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction: vData.extracted, slide_number: slide.slide_number, total_slides: total }),
      });
      const valData = await valRes.json() as any;
      updated.confidence = valData.score ?? 0;
      updated.validator_decision = valData.decision ?? 'human_review';

      // 3. Auto-translate headline/body → Swahili draft
      const srcText = vData.extracted?.headline || vData.extracted?.body || '';
      if (srcText.trim().length > 3) {
        const tRes = await fetch(CF_TRANSLATOR_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_text: srcText, source_language: 'en', target_language: 'sw' }),
        });
        const tData = await tRes.json() as any;
        updated.translation_draft = tData.translated_text || null;
      }
      updated.status = 'done';
    } catch (e: any) {
      updated.status = 'error';
      updated.error = e.message;
    }
    return updated;
  };

  const runExtraction = async () => {
    if (!batchTitle.trim()) { toast({ title: 'Campaign title required', variant: 'destructive' }); return; }
    if (!slides.length) return;
    setProcessing(true);
    const total = slides.length;
    let arr = [...slides];
    for (let i = 0; i < arr.length; i++) {
      arr[i] = await processSlide(arr[i], total);
      setSlides([...arr]);
    }
    setProcessing(false);
    setPhase('review');
    // Silent success. Form auto-advances to review mode.
  };

  // ── Publish to Supabase ───────────────────────────────────────────────────
  const publishBatch = async () => {
    setPublishing(true);
    try {
      const batchId = batchTitle.trim().toLowerCase().replace(/\s+/g, '-');
      for (const slide of slides.filter(s => s.status === 'done' && s.extracted)) {
        const ex = slide.extracted;
        const fields = [
          { type: 'headline',      text: ex?.headline?.trim() },
          { type: 'subheadline',   text: ex?.subheadline?.trim() },
          { type: 'body',          text: ex?.body?.trim() },
          { type: 'cta_directive', text: ex?.cta_directive?.trim() },
          { type: 'cta_support',   text: ex?.cta_support?.trim() },
        ].filter(f => f.text);

        for (const f of fields) {
          await (supabase as any).from('translation_units').upsert({
            batch_id: batchId, carousel_id: batchTitle.trim(),
            slide_number: slide.slide_number, type: f.type,
            source_text: f.text, active: true,
            ...(f.type === 'headline' && slide.translation_draft ? { ai_draft_sw: slide.translation_draft } : {}),
          }, { onConflict: 'carousel_id,slide_number,type' });
        }
      }
      setPhase('published');
    } catch (e: any) {
      toast({ title: 'Upload error', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  // ── Published screen ──────────────────────────────────────────────────────
  if (phase === 'published') return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-fade-in text-center">
      <p className="text-white/60 text-[13px] font-medium tracking-tight">Campaign live</p>
      <h2 className="text-2xl font-semibold tracking-tight text-white/90">Published successfully.</h2>
      <div className="pt-8">
        <button 
          onClick={() => { setPhase('input'); setSlides([]); setBatchTitle(''); }}
          className="bg-transparent text-ios-blue text-[15px] font-medium hover:opacity-70 transition-opacity"
        >
          Ingest another campaign
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-fade-in font-sans pt-12">

      {/* ── Minimalist Header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white/90">New Campaign</h1>
        <p className="text-[14px] text-white/40 tracking-tight">Drop a ZIP file to extract text via Vision AI.</p>
      </div>

      {/* ── Input Group ── */}
      <div className="space-y-8">
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-white/50 tracking-tight">Campaign identity</label>
          <input
            className="w-full bg-transparent border-b border-white/10 py-3 text-white/90 text-[15px] outline-none focus:border-ios-blue transition-colors placeholder:text-white/20"
            placeholder="Finance Bill 2026"
            value={batchTitle} onChange={e => setBatchTitle(e.target.value)}
          />
        </div>

        {/* Minimal Drop Area */}
        {slides.length === 0 && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`w-full h-32 flex items-center justify-center rounded-xl border border-white/5 cursor-pointer transition-all duration-300 ${dragOver ? 'bg-ios-blue/5 border-ios-blue/30' : 'bg-white/2 hover:bg-white/5'}`}
          >
            <p className="text-[13px] font-medium tracking-tight" style={{ color: dragOver ? '#0a84ff' : 'rgba(255,255,255,0.4)' }}>
              {dragOver ? 'Drop archive' : 'Select or drop .zip'}
            </p>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={async e => { if (e.target.files?.[0]) await ingestZip(e.target.files[0]); }} />
      </div>

      {/* ── The Minimal Queue List ── */}
      {slides.length > 0 && (
        <div className="space-y-1 pt-4">
          <div className="flex justify-between items-end pb-4 border-b border-white/5">
            <span className="text-[12px] font-medium text-white/40 tracking-tight">{slides.length} slides</span>
            <button onClick={() => setSlides([])} className="text-[12px] font-medium text-ios-blue hover:opacity-70 transition-opacity">Clear</button>
          </div>
          
          <div className="flex flex-col">
            {slides.map((slide, idx) => (
              <div key={slide.slide_number} className="relative py-3 group">
                <div className="flex items-center gap-4 relative z-10 px-1">
                  
                  {/* Subtle Image Skeleton / Thumbnail */}
                  <div className="w-9 h-9 shrink-0 rounded-md overflow-hidden bg-white/5">
                    {slide.preview_url ? (
                      <img src={slide.preview_url} alt="" className="w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="w-full h-full animate-pulse bg-white/10" />
                    )}
                  </div>
                  
                  {/* Text Container with crossfading values */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[13px] font-medium text-white/80 truncate font-sans tracking-tight">{slide.filename}</p>
                    {slide.extracted?.headline && <p className="text-[11px] text-white/40 truncate mt-0.5">"{slide.extracted.headline}"</p>}
                    {slide.translation_draft && <p className="text-[11px] text-ios-blue/80 truncate mt-0.5">{slide.translation_draft}</p>}
                  </div>

                  {/* Safari-like typography status */}
                  <div className="shrink-0 text-right w-24">
                    <span 
                      className="text-[10px] font-semibold tracking-wide transition-colors duration-500" 
                      style={{ color: getStatusColor(slide) }}
                    >
                      {getStatusLabel(slide)}
                    </span>
                  </div>
                </div>

                {/* Ambient ultra-thin iOS Safari Progress Line */}
                <div className="absolute bottom-0 left-0 h-[1px] bg-transparent w-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-[1200ms] ease-out rounded-r-full" 
                    style={{ width: getProgressWidth(slide), background: getStatusColor(slide), opacity: slide.status === 'done' ? 0.2 : 1 }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action Footers ── */}
      <div className="pt-8">
        {slides.length > 0 && phase !== 'review' && (
          <button 
            onClick={runExtraction} 
            disabled={processing || !batchTitle.trim()}
            className="w-full py-3.5 bg-white/10 hover:bg-white/15 disabled:bg-white/5 disabled:text-white/20 text-white/90 text-[15px] font-medium rounded-xl transition-all tracking-tight backdrop-blur-md"
          >
            {processing ? 'Processing...' : 'Run Vision Extract'}
          </button>
        )}

        {phase === 'review' && (
          <button 
            onClick={publishBatch} 
            disabled={publishing}
            className="w-full py-3.5 bg-ios-blue hover:bg-[#0070e0] disabled:opacity-50 text-white text-[15px] font-medium rounded-xl transition-all tracking-tight shadow-md"
          >
            {publishing ? 'Publishing...' : 'Publish to Database'}
          </button>
        )}
      </div>

    </div>
  );
};

export default AdminIngestion;
