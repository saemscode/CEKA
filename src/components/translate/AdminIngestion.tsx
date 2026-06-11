import React, { useState, useCallback, useRef, useMemo } from 'react';
import { unzipSync } from 'fflate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ── Cloudflare Worker endpoints ──────────────────────────────────────────────
const CF_VISION_URL      = 'https://ceka-vision-extract.saemscodes.workers.dev';
const CF_VALIDATOR_URL   = 'https://ceka-extraction-validator.saemscodes.workers.dev';
const CF_TRANSLATOR_URL  = 'https://ceka-translation-draft.saemscodes.workers.dev';

// ── Icon shim (re-uses icons-v5 system already on the page) ─────────────────
const Ic = ({ n, s = 18 }: { n: string; s?: number }) => (
  <div style={{ width: s, height: s }} className="inline-flex items-center justify-center shrink-0">
    <img src={`/icons-v5/${n}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
  </div>
);

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

// ── StatusBadge ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<SlideStatus, { label: string; color: string }> = {
  idle:        { label: 'Queued',       color: 'rgba(255,255,255,0.2)' },
  processing:  { label: 'Extracting…',  color: '#007aff' },
  translating: { label: 'Translating…', color: '#7832ff' },
  done:        { label: 'Done',         color: '#00cb44' },
  error:       { label: 'Error',        color: '#ff6b6b' },
};

const StatusBadge = ({ slide }: { slide: Slide }) => {
  const { label, color } = slide.status === 'done'
    ? { label: slide.validator_decision === 'auto_publish' ? 'Auto-Approved' : 'Review Needed', color: slide.validator_decision === 'auto_publish' ? '#00cb44' : '#f5a623' }
    : STATUS_MAP[slide.status];
  return (
    <span style={{ background: `${color}22`, border: `1px solid ${color}55`, color, borderRadius: '0.75rem', padding: '2px 10px', fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      {label}
    </span>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const AdminIngestion = () => {
  const { toast } = useToast();
  const [batchTitle, setBatchTitle] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [urlInputs, setUrlInputs] = useState<string[]>(['']);
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
      toast({ title: `✅ ${newSlides.length} slides loaded from ZIP` });
    } catch (e: any) {
      toast({ title: 'ZIP failed', description: e.message, variant: 'destructive' });
    }
  }, [toast]);

  // ── URL ingestion ──────────────────────────────────────────────────────────
  const loadFromUrls = () => {
    const valid = urlInputs.filter(u => u.trim().startsWith('http'));
    if (!valid.length) { toast({ title: 'No valid URLs', variant: 'destructive' }); return; }
    setSlides(valid.map((url, idx) => ({
      slide_number: idx + 1, filename: url.split('/').pop() || `slide-${idx + 1}`,
      base64: '', preview_url: url, status: 'idle', extracted: null,
      translation_draft: null, confidence: 0, validator_decision: null, error: null,
    })));
    toast({ title: `${valid.length} slides queued` });
  };

  // ── Per-slide pipeline: Vision → Validate → Translate ────────────────────
  const processSlide = async (slide: Slide, total: number): Promise<Slide> => {
    const is_final = slide.slide_number === total;
    const updated: Slide = { ...slide, status: 'processing', error: null };
    try {
      // 1. Vision extraction
      const vRes = await fetch(CF_VISION_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: slide.base64 || undefined, image_url: !slide.base64 ? slide.preview_url : undefined, slide_number: slide.slide_number, total_slides: total, is_final }),
      });
      const vData = await vRes.json() as any;
      if (!vRes.ok || vData.error) throw new Error(vData.error || 'Vision failed');
      updated.extracted = vData.extracted;
      updated.status = 'translating';

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
    if (!slides.length) { toast({ title: 'Load slides first', variant: 'destructive' }); return; }
    setProcessing(true);
    const total = slides.length;
    let arr = [...slides];
    for (let i = 0; i < arr.length; i++) {
      arr[i] = await processSlide(arr[i], total);
      setSlides([...arr]);
    }
    setProcessing(false);
    setPhase('review');
    toast({ title: `Extraction complete — ${arr.filter(s => s.status === 'done').length}/${total} slides done` });
  };

  // ── Publish to Supabase ───────────────────────────────────────────────────
  const publishBatch = async () => {
    setPublishing(true);
    try {
      const batchId = batchTitle.trim().toLowerCase().replace(/\s+/g, '-');
      let count = 0;
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
          count++;
        }
      }
      toast({ title: `🚀 Published — ${count} translation units created` });
      setPhase('published');
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = Array.from(e.dataTransfer.files).find(f => f.name.endsWith('.zip'));
    if (f) await ingestZip(f);
    else toast({ title: 'Drop a .zip file', variant: 'destructive' });
  }, [ingestZip, toast]);

  // ── Published screen ──────────────────────────────────────────────────────
  if (phase === 'published') return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
        <Ic n="check-circle-svgrepo-com.svg" s={40} />
      </div>
      <h2 className="text-2xl font-black text-white">Campaign Published! 🚀</h2>
      <Button onClick={() => { setPhase('input'); setSlides([]); setBatchTitle(''); setUrlInputs(['']); }}
        className="bg-ios-blue text-white rounded-2xl px-10 py-5 font-bold">
        Ingest Another Campaign
      </Button>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Loaded', value: stats.total },
          { label: 'Processed', value: stats.done },
          { label: 'Errors', value: stats.errors },
        ].map(s => (
          <Card key={s.label} className="p-5 flex items-center gap-4 bg-white/5 border border-white/5 rounded-[2rem]">
            <div>
              <p className="text-[0.6rem] uppercase tracking-widest text-white/20 font-black">{s.label}</p>
              <p className="text-2xl font-black text-white">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Campaign title ── */}
      <Card className="p-8 space-y-4 bg-white/5 border border-white/5 rounded-[2.5rem]">
        <h3 className="text-lg font-black text-white/90">Campaign Identity</h3>
        <input
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          className="w-full rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-ios-blue/50 text-sm font-medium"
          placeholder="e.g. Finance Bill 2026 — Voter Education"
          value={batchTitle} onChange={e => setBatchTitle(e.target.value)}
        />
      </Card>

      {/* ── Ingestion ── */}
      <Card className="p-8 space-y-6 bg-white/5 border border-white/5 rounded-[2.5rem]">
        <h3 className="text-lg font-black text-white/90">Load Carousel</h3>

        {/* ZIP dropzone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${dragOver ? '#007aff' : 'rgba(255,255,255,0.12)'}`, borderRadius: '2rem', background: dragOver ? 'rgba(0,122,255,0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s', cursor: 'pointer' }}
          className="p-10 flex flex-col items-center gap-4 text-center"
        >
          <Ic n="upload-svgrepo-com.svg" s={40} />
          <p className="text-white/50 font-bold text-sm">Drag &amp; drop a .zip of carousel slides<br /><span className="text-white/20 text-xs font-normal">Images sorted alphabetically = slide order</span></p>
          <span style={{ background: 'rgba(0,122,255,0.15)', border: '1px solid rgba(0,122,255,0.3)', color: '#007aff', borderRadius: '1rem', padding: '4px 16px', fontSize: '0.65rem', fontWeight: 900 }}>Browse Files</span>
        </div>
        <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={async e => { if (e.target.files?.[0]) await ingestZip(e.target.files[0]); }} />

        {/* URL inputs */}
        <div className="space-y-3">
          <p className="text-[0.65rem] uppercase tracking-widest text-white/20 font-black ml-2">— or paste image URLs —</p>
          {urlInputs.map((url, idx) => (
            <div key={idx} className="flex items-center gap-4 px-6 py-3 rounded-2xl border border-white/5">
              <span className="text-white/20 text-xs font-black shrink-0">{idx + 1}</span>
              <input className="flex-1 bg-transparent border-none text-sm text-white/80 outline-none" placeholder={`Slide ${idx + 1} image URL`} value={url} onChange={e => setUrlInputs(p => p.map((u, i) => i === idx ? e.target.value : u))} />
              {urlInputs.length > 1 && <button onClick={() => setUrlInputs(p => p.filter((_, i) => i !== idx))} className="text-white/20 hover:text-red-400 text-xs">✕</button>}
            </div>
          ))}
          <div className="flex gap-4">
            <button onClick={() => setUrlInputs(p => [...p, ''])} className="text-xs font-black uppercase tracking-widest text-white/30 hover:text-white/60 px-4 py-2">+ Add URL</button>
            <button onClick={loadFromUrls} className="text-xs font-black uppercase tracking-widest text-ios-blue hover:opacity-80 px-4 py-2">Load →</button>
          </div>
        </div>
      </Card>

      {/* ── Slide queue ── */}
      {slides.length > 0 && (
        <Card className="p-8 space-y-4 bg-white/5 border border-white/5 rounded-[2.5rem]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white/90">{slides.length} Slides</h3>
            <button onClick={() => setSlides([])} className="text-[0.65rem] font-black uppercase tracking-widest text-red-400/50 hover:text-red-400">Clear</button>
          </div>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {slides.map(slide => (
              <div key={slide.slide_number} className="flex items-center gap-4 p-4 rounded-2xl border border-white/5">
                {slide.preview_url && <img src={slide.preview_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[0.75rem] font-bold text-white/50 truncate">{slide.filename}</p>
                  {slide.extracted?.headline && <p className="text-[0.65rem] text-white/30 truncate mt-0.5">"{slide.extracted.headline}"</p>}
                  {slide.translation_draft && <p className="text-[0.65rem] text-ios-blue/60 truncate mt-0.5">→ {slide.translation_draft}</p>}
                  {slide.error && <p className="text-[0.65rem] text-red-400/70 truncate mt-0.5">{slide.error}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {slide.confidence > 0 && (
                    <span className="text-xs font-black" style={{ color: slide.confidence >= 0.92 ? '#00cb44' : slide.confidence >= 0.75 ? '#f5a623' : '#ff6b6b' }}>{Math.round(slide.confidence * 100)}%</span>
                  )}
                  <StatusBadge slide={slide} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Extract CTA ── */}
      {slides.length > 0 && phase !== 'review' && (
        <Button id="run-extraction-btn" onClick={runExtraction} disabled={processing || !batchTitle.trim()}
          style={{ background: 'linear-gradient(135deg,#007aff,#0040ff)', boxShadow: '0 12px 30px rgba(0,122,255,0.25)' }}
          className="w-full py-8 text-lg font-black rounded-[2rem] text-white flex items-center justify-center gap-3">
          {processing ? <>Processing {stats.done}/{slides.length}…</> : <>Run Vision + Auto-Translate ({slides.length} slides)</>}
        </Button>
      )}

      {/* ── Publish CTA ── */}
      {phase === 'review' && (
        <Button id="publish-batch-btn" onClick={publishBatch} disabled={publishing}
          style={{ background: 'linear-gradient(135deg,#00cb44,#007a28)', boxShadow: '0 12px 30px rgba(0,203,68,0.25)' }}
          className="w-full py-10 text-xl font-black rounded-[2rem] text-white flex items-center justify-center gap-3">
          {publishing ? 'Publishing…' : `Publish ${stats.done} Slides to Translation Queue`}
        </Button>
      )}
    </div>
  );
};

export default AdminIngestion;
