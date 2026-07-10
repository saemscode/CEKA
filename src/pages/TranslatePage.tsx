import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminIngestion as NewAdminIngestion } from '@/components/translate/AdminIngestion';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
// Lucide icons purged in favor of Icons v5 SVG collection


// ─────────────────────────────────────────────
// CEKA ICON ENGINE (Icons v5)
// ─────────────────────────────────────────────

type CekaIconName =
  | 'translate' | 'review' | 'audit' | 'admin'
  | 'refresh' | 'check' | 'alert' | 'edit'
  | 'approve' | 'reject' | 'send' | 'plus'
  | 'magic' | 'upload' | 'eye' | 'loading'
  | 'image' | 'trash' | 'bot' | 'user' | 'close' | 'skip';

const ICON_MAP: Record<CekaIconName, string> = {
  translate: 'language-svgrepo-com.svg',
  review: 'shield-check-svgrepo-com.svg',
  audit: 'bar-chart-circle-03-svgrepo-com.svg',
  admin: 'book-open-svgrepo-com.svg',
  refresh: 'refresh-circle-svgrepo-com.svg',
  check: 'check-circle-svgrepo-com.svg',
  alert: 'alert-triangle-svgrepo-com.svg',
  edit: 'edit-3-svgrepo-com.svg',
  approve: 'check-square-svgrepo-com.svg',
  reject: 'square-x-svgrepo-com.svg',
  send: 'send-svgrepo-com.svg',
  plus: 'plus-circle-svgrepo-com.svg',
  magic: 'eye-scan-svgrepo-com.svg',
  upload: 'upload-svgrepo-com.svg',
  eye: 'eye-show-svgrepo-com.svg',
  loading: 'loader-2-svgrepo-com.svg',
  image: 'image-1-svgrepo-com.svg',
  trash: 'trash-bin-2-svgrepo-com.svg',
  bot: 'bot-svgrepo-com.svg',
  user: 'people-nearby-svgrepo-com.svg',
  close: 'square-x-svgrepo-com.svg',
  skip: 'media-skip-forward-svgrepo-com.svg'
};

const CekaIcon = ({ name, size = 18, className = "", color = "currentColor" }: { name: CekaIconName, size?: number, className?: string, color?: string }) => (
  <div
    className={`inline-flex items-center justify-center shrink-0 ${className} ${name === 'loading' ? 'animate-spin' : ''}`}
    style={{ width: size, height: size }}
  >
    <img
      src={`/icons-v5/${ICON_MAP[name]}`}
      alt=""
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        filter: color === 'currentColor' ? 'brightness(0) invert(1)' : 'none'
      }}
    />
  </div>
);

// ─────────────────────────────────────────────
// FACE BACKGROUND — Mathematical Lattice Mosaic
// ─────────────────────────────────────────────

const FACE_ICONS = Array.from({ length: 28 }, (_, i) => `/icons-bg/lllook (${i + 1}).svg`);

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

const CekaLatticeBackground = memo(() => {
  const sprites = useMemo(() => {
    const grid: boolean[][] = Array.from({ length: 20 }, () => Array(12).fill(false));
    const items: { id: number; src: string; x: number; y: number; w: number; h: number; rotate: number; duration: number; delay: number; opacity: number }[] = [];
    let idCounter = 0;

    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 12; c++) {
        if (grid[r][c]) continue;

        const seed = r * 12 + c;
        const roll = seededRand(seed);
        let w = 1, h = 1;

        if (roll > 0.96 && r + 3 < 20 && c + 3 < 12) { w = 4; h = 4; }
        else if (roll > 0.88 && r + 1 < 20 && c + 1 < 12) { w = 2; h = 2; }

        let canPlace = true;
        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) {
            if (grid[r + i][c + j]) canPlace = false;
          }
        }

        if (canPlace) {
          for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) grid[r + i][c + j] = true;
          }
          items.push({
            id: idCounter++,
            src: FACE_ICONS[Math.floor(seededRand(seed * 3) * FACE_ICONS.length)],
            x: c, y: r, w, h,
            rotate: (seededRand(seed * 7) - 0.5) * 40,
            duration: 15 + seededRand(seed * 9) * 15,
            delay: seededRand(seed * 11) * -20,
            opacity: 0.04 + seededRand(seed * 13) * 0.08
          });
        }
      }
    }
    return items;
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: '#060914', overflow: 'hidden' }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridTemplateRows: 'repeat(20, 1fr)',
        gap: '14px',
        padding: '20px',
        opacity: 0.8
      }}>
        {sprites.map((s) => (
          <div
            key={s.id}
            className="animate-ceka-float"
            style={{
              gridColumn: `${s.x + 1} / span ${s.w}`,
              gridRow: `${s.y + 1} / span ${s.h}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
              opacity: s.opacity,
              transform: `rotate(${s.rotate}deg)`,
            }}
          >
            <img src={s.src} alt="" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, transparent 20%, #060914 95%)' }} />
    </div>
  );
});

interface Language {
  code: string;
  name: string;
  native_name: string;
  is_active: boolean;
}

interface TranslationTask {
  unit_id: string;
  project_slug: string;
  slide_index: number;
  field_type: string;
  source_text: string;
  context_hint: string | null;
  char_limit: number | null;
  ai_draft: string | null;
}

interface LanguageProgress {
  language_code: string;
  language_name: string;
  total_units: number;
  approved_units: number;
  progress_percentage: number;
}

interface PendingSubmission {
  id: string;
  unit_id: string;
  lang_code: string;
  translated_text: string;
  source: string;
  confidence_score: number;
  status: string;
  glossary_flags: any[];
  reviewer_notes: string | null;
  created_at: string;
  translation_units: {
    source_text: string;
    project_slug: string;
    field_type: string;
  } | null;
}

interface ConsensusItem {
  translated_text: string;
  occurrence_count: number;
  avg_confidence: number;
}

const SWAHILI_GLOSSARY: Record<string, string> = {
  'Constitution': 'Katiba',
  'County Assembly': 'Baraza la Kaunti',
  'Public participation': 'Ushiriki wa umma',
  'Bill': 'Mswada',
  'Petition': 'Ombi',
  'County executive': 'Mtendaji wa Kaunti',
  'Civic education': 'Elimu ya uraia',
  'Voter registration': 'Usajili wa wapiga kura',
  'Electoral commission': 'Tume ya uchaguzi',
  'Memorandum': 'Memoranda',
  'Devolution': 'Ugatuzi',
  'Senate': 'Seneti',
  'National Assembly': 'Bunge la Taifa',
  'Assent': 'Kuidhinisha',
  'Finance Bill': 'Mswada wa Fedha',
};

function runGlossaryCheck(sourceText: string, translatedText: string, languageCode: string): string[] {
  if (languageCode !== 'sw') return [];
  const flags: string[] = [];
  for (const [en, sw] of Object.entries(SWAHILI_GLOSSARY)) {
    if (sourceText.toLowerCase().includes(en.toLowerCase())) {
      if (!translatedText.toLowerCase().includes(sw.toLowerCase())) {
        flags.push(`"${en}" → "${sw}" not found`);
      }
    }
  }
  return flags;
}

const LanguageTab = ({
  lang,
  selected,
  onClick,
}: {
  lang: Language;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    id={`lang-tab-${lang.code}`}
    onClick={onClick}
    style={selected ? {
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      color: '#fff',
      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    } : {
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
      color: 'rgba(200,210,255,0.4)',
    }}
    className="px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap active:scale-95"
  >
    {lang.name}
  </button>
);

const ProgressCard = ({ progress }: { progress: LanguageProgress }) => {
  const R = 28;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const rawPct = Number(progress.progress_percentage);
  const pct = Number.isFinite(rawPct) ? Math.min(100, Math.max(0, rawPct)) : 0;
  const approvedUnits = Number(progress.approved_units) || 0;
  const totalUnits = Number(progress.total_units) || 0;
  const offset = CIRCUMFERENCE * (1 - pct / 100);
  const isHigh = pct >= 80;
  const isDone = pct >= 100;
  const arcColor = totalUnits === 0
    ? 'rgba(255,255,255,0.12)'
    : isDone ? '#00ff66'
      : isHigh ? '#00cb44'
        : pct >= 40 ? '#f5a623'
          : '#ff6b6b';

  return (
    <article
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '2rem',
        boxShadow: isDone
          ? '0 8px 30px rgba(0,255,102,0.15), 0 0 0 1px rgba(0,255,102,0.15)'
          : '0 8px 30px rgba(0,0,0,0.25)',
      }}
      className="p-5 flex flex-col items-center gap-3 group hover:-translate-y-1 transition-all duration-500"
    >
      <div className="relative" style={{ width: 72, height: 72 }}>
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="36" cy="36" r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          <circle
            cx="36" cy="36" r={R}
            fill="none"
            stroke={arcColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)',
              filter: `drop-shadow(0 0 6px ${arcColor}88)`,
            }}
          />
          {isHigh && (
            <circle
              cx="36" cy="36" r={R}
              fill="none"
              stroke={arcColor}
              strokeWidth="1"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              opacity={0.2}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
            />
          )}
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: 'none' }}
        >
          <span
            className="font-black leading-none"
            style={{ fontSize: '0.95rem', color: isDone ? '#00ff66' : '#fff' }}
          >
            {Math.round(pct)}%
          </span>
        </div>
        {isDone && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              border: '2px solid #00ff66',
              opacity: 0.3,
              animationDuration: '2.4s',
            }}
          />
        )}
      </div>

      <span
        className="text-[0.6rem] font-black uppercase tracking-widest leading-none text-center"
        style={{ color: 'rgba(200,210,255,0.35)' }}
      >
        {progress.language_name}
      </span>

      <span className="text-[0.55rem] font-bold" style={{ color: 'rgba(200,210,255,0.15)' }}>
        {progress.approved_units}/{progress.total_units}
      </span>
    </article>
  );
};

const TranslatorView = ({
  languages,
  selectedLang,
  onLangChange,
  progress,
}: {
  languages: Language[];
  selectedLang: string;
  onLangChange: (code: string) => void;
  progress: LanguageProgress[];
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [task, setTask] = useState<TranslationTask | null>(null);
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [noMoreTasks, setNoMoreTasks] = useState(false);
  const [consensus, setConsensus] = useState<ConsensusItem[]>([]);

  const fetchNextTask = useCallback(async () => {
    setLoading(true);
    setTranslation('');
    setNoMoreTasks(false);
    setConsensus([]);

    const { data, error } = await (supabase.rpc as any)('get_next_translation_task', {
      p_lang_code: selectedLang,
      p_user_id: user?.id ?? null,
    });

    if (error || !data || (data as any[]).length === 0) {
      setTask(null);
      setNoMoreTasks(true);
    } else {
      const t = (data as any[])[0];
      setTask(t);
      if (t.ai_draft) setTranslation(t.ai_draft);

      const { data: cData } = await (supabase.rpc as any)('get_translation_consensus', {
        p_unit_id: t.unit_id,
        p_lang_code: selectedLang
      });
      if (cData) setConsensus(cData as any[]);
    }
    setLoading(false);
  }, [selectedLang, user?.id]);

  useEffect(() => {
    fetchNextTask();
  }, [fetchNextTask]);

  const handleSubmit = async () => {
    if (!task || !translation.trim()) return;
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to submit translations.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    const flags = runGlossaryCheck(task.source_text, translation, selectedLang);
    const confidence = flags.length === 0 ? 0.75 : 0.45;

    const { error } = await (supabase as any).from('translation_submissions').insert({
      unit_id: task.unit_id,
      lang_code: selectedLang,
      translated_text: translation.trim(),
      submitted_by: user.id,
      source: 'web',
      confidence_score: confidence,
      status: 'pending',
    });

    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    toast({
      title: flags.length > 0 ? 'Submitted with flags' : 'Asante! ✊🏽',
      description: flags.length > 0
        ? 'Reviewer will verify glossary consistency.'
        : 'Translation queued for verification.',
    });

    setSubmitting(false);
    fetchNextTask();
  };

  const handleSkip = async () => {
    fetchNextTask();
  };

  const charCount = translation.length;
  const charLimit = task?.char_limit ?? null;
  const overLimit = charLimit !== null && charCount > charLimit;

  return (
    <div className="space-y-8 animate-fade-in">
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '2rem',
        }}
        className="p-4 overflow-x-auto custom-scrollbar"
      >
        <div className="flex gap-3 min-w-max">
          {languages.map((lang) => (
            <LanguageTab
              key={lang.code}
              lang={lang}
              selected={selectedLang === lang.code}
              onClick={() => onLangChange(lang.code)}
            />
          ))}
        </div>
      </div>

      <Card
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '3rem',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        className="p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-ios-blue/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <div className="relative">
                <CekaIcon name="loading" size={48} className="text-ios-blue" />
              </div>
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Finding fresh content...</p>
            </div>
          ) : noMoreTasks ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
              <div className="w-20 h-20 bg-yellow-400/10 rounded-[2rem] flex items-center justify-center shadow-lg">
                <CekaIcon name="check" size={40} className="text-yellow-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">All Caught Up!</h3>
                <p className="text-white/40 max-w-sm mx-auto text-sm leading-relaxed">
                  Every segment for <span className="text-white">{languages.find((l) => l.code === selectedLang)?.name ?? selectedLang}</span> has been processed.
                  Try another language or check back later for new campaigns.
                </p>
              </div>
              <Button onClick={() => window.location.reload()} variant="ghost" className="text-ios-blue font-bold">Refresh Catalog</Button>
            </div>
          ) : task ? (
            <>
              <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} className="text-white/50 text-[0.6rem] px-4 py-1.5 rounded-xl uppercase tracking-widest font-bold">
                      {task.field_type}
                    </Badge>
                    <Badge style={{ background: 'rgba(0,179,60,0.15)', border: '1px solid rgba(0,179,60,0.2)' }} className="text-green-400 text-[0.6rem] px-4 py-1.5 rounded-xl uppercase tracking-widest font-bold">
                      Slide {task.slide_index}
                    </Badge>
                    {task.ai_draft && (
                      <Badge style={{ background: 'rgba(120,50,255,0.15)', border: '1px solid rgba(120,50,255,0.2)' }} className="text-purple-300 text-[0.6rem] px-4 py-1.5 rounded-xl uppercase tracking-widest font-bold">
                        AI Recommended
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-3xl md:text-4xl text-white font-black leading-snug tracking-tight">
                    {task.source_text}
                  </h2>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative group">
                  <textarea
                    id="translation-input"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)',
                    }}
                    className={`w-full border rounded-[2.5rem] p-10 text-2xl text-white placeholder:text-white/10 focus:ring-4 focus:ring-ios-blue/15 transition-all outline-none resize-none h-60 leading-relaxed font-medium ${overLimit ? 'border-red-500/50' : 'border-white/10'
                      }`}
                    placeholder="Type your translation here..."
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                  />
                  <div
                    className={`absolute bottom-8 right-10 text-[0.7rem] font-black tracking-tight ${overLimit ? 'text-red-400' : 'text-white/20'
                      }`}
                  >
                    {charCount}
                    {charLimit !== null && <span className="mx-1 opacity-50">/</span>}
                    {charLimit !== null && charLimit}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {consensus.length > 0 && (
                    <div className="bg-white/3 border border-white/5 rounded-[1.5rem] px-6 py-5 space-y-3">
                      <p className="text-[0.6rem] uppercase tracking-widest text-white/20 font-black">Community Favourites</p>
                      <div className="space-y-2">
                        {consensus.map((c, i) => (
                          <div
                            key={`${i}-${c.translated_text}`}
                            onClick={() => setTranslation(c.translated_text)}
                            className="flex justify-between items-center text-sm group cursor-pointer hover:bg-white/5 p-1 -m-1 rounded-lg transition-all"
                          >
                            <span className="text-white/60 font-medium group-hover:text-white">{c.translated_text}</span>
                            <Badge className="bg-white/5 text-[0.6rem] font-bold text-white/40 border-none">{c.occurrence_count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-white/5">
                <button
                  onClick={() => handleSkip()}
                  className="px-10 py-5 rounded-[1.5rem] bg-white/5 border border-white/5 text-white/40 font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 flex items-center gap-2"
                >
                  <CekaIcon name="skip" size={16} /> Skip Segment
                </button>
                <Button
                  id="submit-translation-btn"
                  onClick={handleSubmit}
                  disabled={submitting || !translation.trim()}
                  style={{ background: 'linear-gradient(135deg, #007aff 0%, #0040ff 100%)', boxShadow: '0 12px 30px rgba(0,122,255,0.2)' }}
                  className="text-white rounded-[1.5rem] px-14 py-8 font-black transform hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                >
                  <CekaIcon name="send" size={18} /> Verify & Send
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Card>

      {progress.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-white/20">Campaign Status</h4>
            <div className="h-px flex-1 mx-6 bg-white/5" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-8 gap-x-4 pt-4">
            {progress.map((p, index) => (
              <ProgressCard key={(p as any).lang_code || p.language_code || `lang-${index}`} progress={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ReviewerDashboard = ({ userRole }: { userRole: string }) => {
  const { toast } = useToast();
  const [auditTab, setAuditTab] = useState<string>('flagged');
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editText, setEditText] = useState<Record<string, string>>({});
  const { user } = useAuth();

  const fetchQueue = useCallback(async (tab: string) => {
    setLoading(true);
    let query = (supabase as any).from('translation_submissions').select(`
      id, unit_id, lang_code, translated_text, source,
      confidence_score, status, reviewer_notes, created_at,
      translation_units (source_text, project_slug, field_type)
    `);

    if (tab === 'flagged') {
      query = query.eq('status', 'flagged').order('created_at', { ascending: false }).limit(50);
    } else if (tab === 'fast_track') {
      query = query.eq('status', 'pending').gte('confidence_score', 0.60).lt('confidence_score', 0.90).order('confidence_score', { ascending: false }).limit(50);
    } else if (tab === 'auto_approved') {
      query = query.eq('status', 'approved').gte('confidence_score', 0.90).order('created_at', { ascending: false }).limit(50);
    } else if (tab === 'sampling') {
      query = query.eq('status', 'approved').order('created_at', { ascending: false }).limit(20);
    }

    const { data, error } = await query;
    if (!error && data) setQueue(data as any[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(auditTab); }, [fetchQueue, auditTab]);

  const handleDecision = async (id: string, decision: 'approved' | 'rejected', sub: any) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from('translation_submissions')
      .update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes[id] || null,
      })
      .eq('id', id);

    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }

    if (sub.confidence_score >= 0.90 && sub.status === 'approved') {
      await (supabase as any).from('ai_corrections').insert({
        submission_id: id,
        ai_decision: 'approved',
        human_decision: decision,
        correction_type: decision === 'rejected' ? 'false_positive' : 'confirmed',
        notes: notes[id] || `Human ${decision} an AI auto-approved submission`,
      });
    }

    toast({ title: decision === 'approved' ? '✅ Approved' : '❌ Rejected', description: `Submission updated.` });
    setQueue((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCorrect = async (id: string, sub: any) => {
    const corrected = editText[id];
    if (!corrected?.trim()) return;
    await (supabase as any).from('translation_submissions').update({
      translated_text: corrected,
      status: 'approved',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: `Human corrected: ${notes[id] || 'vernacular review'}`,
    }).eq('id', id);

    await (supabase as any).from('ai_corrections').insert({
      submission_id: id,
      ai_decision: sub.status,
      human_decision: 'corrected_and_approved',
      correction_type: 'vernacular_correction',
      notes: `Changed to: ${corrected}`,
    });
    toast({ title: '✏️ Corrected & Approved', description: 'Translation saved with your correction.' });
    setQueue((prev) => prev.filter((s) => s.id !== id));
  };

  const auditTabs = [
    { key: 'flagged', label: 'Flagged', icon: 'alert', desc: 'Auto-rejected or spammy' },
    { key: 'fast_track', label: 'Fast Track', icon: 'magic', desc: 'Score 60–89%' },
    { key: 'auto_approved', label: 'AI Review', icon: 'bot', desc: 'AI approved ≥90%' },
    { key: 'sampling', label: 'Quality Check', icon: 'audit', desc: 'Spot-check AI quality' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <CekaIcon name="loading" size={40} className="text-ios-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div
        style={{
          background: 'rgba(255,255,255,0.045)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '2.5rem',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}
        className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h2 className="text-2xl font-black text-white">Expert Verification Hub</h2>
          <p className="text-sm text-white/40 mt-1">AI handles 90% automatically. You verify the nuance.</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-white/5 border-none text-white/30 text-[0.6rem] px-5 py-2.5 rounded-xl flex items-center gap-2 font-black uppercase tracking-[0.2em] shadow-inner">
            <CekaIcon name="check" size={14} className="text-green-400" />
            Translation Ready
          </Badge>
          <button
            onClick={() => fetchQueue(auditTab)}
            className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl border border-white/5 text-white/20 hover:text-white transition-all active:scale-95 group"
          >
            <CekaIcon name="refresh" size={18} className="group-hover:rotate-45 transition-transform" />
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {auditTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setAuditTab(t.key)}
            style={auditTab === t.key ? {
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
            } : {
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(200,210,255,0.3)',
            }}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-[1.5rem] text-sm font-black transition-all active:scale-95"
          >
            <CekaIcon name={t.icon as any} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-32 space-y-6">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto shadow-2xl">
            <CekaIcon name="check" size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white uppercase tracking-widest">Inbox Zero</h3>
            <p className="text-white/30 text-sm">The AI is currently handling all verification for this lane.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {queue.map((sub) => {
            const score = sub.confidence_score || 0;
            const scoreColor = score >= 0.9 ? 'text-green-400' : score >= 0.6 ? 'text-yellow-400' : 'text-red-400';
            return (
              <Card
                key={sub.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(32px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '3rem',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
                }}
                className="p-10 space-y-8 relative overflow-hidden group"
              >
                <div className="flex items-start justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className="bg-white/5 border-none text-white/30 text-[0.6rem] px-4 py-1.5 rounded-xl uppercase tracking-widest font-black">
                      {sub.translation_units?.field_type ?? 'segment'}
                    </Badge>
                    <Badge className="bg-white/5 border-none text-white/30 text-[0.6rem] px-4 py-1.5 rounded-xl uppercase tracking-widest font-black">
                      {(sub.language_code || '??').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className={`text-3xl font-black ${scoreColor}`}>{Math.round(score * 100)}%</span>
                    <p className="text-[0.6rem] text-white/10 uppercase tracking-[0.2em] font-black">AI Certainty</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/5 rounded-[2.5rem] overflow-hidden border border-white/5">
                  <div className="bg-white/3 p-8">
                    <span className="text-[0.6rem] uppercase tracking-widest text-white/20 font-black block mb-4">Original Message</span>
                    <p className="text-white/80 text-lg leading-relaxed font-medium">{sub.translation_units?.source_text}</p>
                  </div>
                  <div className="bg-white/5 p-8 relative">
                    <div className="absolute inset-0 bg-ios-blue/3 pointer-events-none" />
                    <span className="text-[0.6rem] uppercase tracking-widest text-ios-blue/60 font-black block mb-4">Local Translation</span>
                    <p className="text-white text-lg leading-relaxed font-bold">{sub.translated_text}</p>
                  </div>
                </div>

                <div className="space-y-4 animate-in slide-in-from-top-4">
                  <div className="space-y-3">
                    <label className="text-[0.65rem] uppercase tracking-widest text-white/20 font-black block ml-2">Human Correction</label>
                    <textarea
                      style={{ background: 'rgba(255,255,255,0.02)', boxShadow: 'inset 0 1px 10px rgba(0,0,0,0.4)' }}
                      className="w-full border border-white/5 rounded-[2rem] px-8 py-6 text-base text-white placeholder:text-white/10 outline-none resize-none h-24 focus:ring-4 focus:ring-ios-blue/10 transition-all font-medium"
                      placeholder="Type final translation if AI made a mistake..."
                      value={editText[sub.id] ?? ''}
                      onChange={(e) => setEditText(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-4 justify-end pt-4 border-t border-white/5">
                  {editText[sub.id]?.trim() ? (
                    <Button
                      onClick={() => handleCorrect(sub.id, sub)}
                      style={{ background: 'linear-gradient(135deg, #7832ff 0%, #5500ff 100%)', boxShadow: '0 8px 24px rgba(120,50,255,0.3)' }}
                      className="text-white rounded-2xl px-12 py-7 font-black transform active:scale-95 transition-all flex items-center gap-2"
                    >
                      <CekaIcon name="edit" size={18} /> Update & Expert Approve
                    </Button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDecision(sub.id, 'rejected', sub)}
                        className="px-10 py-4 rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/5 font-black text-sm uppercase tracking-widest transition-all active:scale-95"
                      >
                        Delete Spam
                      </button>
                      <Button
                        onClick={() => handleDecision(sub.id, 'approved', sub)}
                        style={{ background: 'linear-gradient(135deg, #00cb44 0%, #007a28 100%)', boxShadow: '0 10px 30px rgba(0,203,68,0.3)' }}
                        className="text-white rounded-[1.5rem] px-14 py-7 font-black transform hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                      >
                        <CekaIcon name="approve" size={20} /> Approve Entry
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdminIngestion = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [batchTitle, setBatchTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [slides, setSlides] = useState<any[]>([
    { url: '', slide_number: 1, extracted: null, confidence: 0, status: 'idle' },
  ]);
  const [extracting, setExtracting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'input' | 'review' | 'published'>('input');

  const addSlide = () => {
    setSlides(prev => [...prev, { url: '', slide_number: prev.length + 1, extracted: null, confidence: 0, status: 'idle' }]);
  };

  const removeSlide = (idx: number) => {
    setSlides(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, slide_number: i + 1 })));
  };

  const updateUrl = (idx: number, url: string) => {
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, url } : s));
  };

  const updateExtracted = (idx: number, field: string, value: string) => {
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, extracted: { ...s.extracted, [field]: value } } : s));
  };

  const runExtraction = async () => {
    setExtracting(true);
    setSlides(prev => prev.map(s => s.url.trim() ? { ...s, status: 'extracting' } : s));
    try {
      const res = await fetch('https://iruahxgkrucidihnfytq.supabase.co/functions/v1/ingest-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ title: batchTitle.trim(), images: slides.map(s => ({ url: s.url, slide_number: s.slide_number })) }),
      });
      const result = await res.json();
      setBatchId(result.batch_id);
      setSlides(prev => prev.map((s, i) => {
        const ext = (result.extractions || []).find((e: any) => e.slide_number === s.slide_number);
        return ext ? { ...s, extracted: ext.extracted, confidence: ext.confidence, status: 'done' } : s;
      }));
      setPhase('review');
    } catch (err: any) {
      toast({ title: 'Extraction failed', description: err.message, variant: 'destructive' });
    } finally {
      setExtracting(false);
    }
  };

  const publishBatch = async () => {
    setPublishing(true);
    try {
      for (const slide of slides.filter(s => s.extracted && s.status === 'done')) {
        for (const key of ['headline', 'subheadline', 'body', 'cta']) {
          const text = (slide.extracted as any)?.[key]?.trim();
          if (text) await (supabase as any).from('translation_units').insert({ batch_id: batchId, carousel_id: batchTitle.trim(), slide_number: slide.slide_number, type: key, source_text: text, active: true });
        }
      }
      setPhase('published');
    } finally {
      setPublishing(false);
    }
  };

  const [health, setHealth] = useState<any>(null);
  const checkHealth = async () => {
    // Factual data fetch would happen here
    setHealth({
      units: 0, pending: 0, flagged: 0, bot_users: 0,
      workers: [{ name: 'Vision Engine', icon: 'eye' }, { name: 'LLM Auditor', icon: 'bot' }, { name: 'Submission Guard', icon: 'admin' }]
    });
  };

  useEffect(() => { checkHealth(); }, []);

  if (phase === 'published') {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
          <CekaIcon name="check" size={40} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-black text-white">Campaign Published! 🚀</h2>
        <Button onClick={() => window.location.reload()} className="bg-ios-blue text-white rounded-2xl px-10 py-5 font-bold shadow-ios-high">
          Ingest Another Campaign
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Cloud Segments', value: health?.units ?? '...', icon: 'admin' },
          { label: 'User Verification', value: health?.pending ?? '...', icon: 'refresh' },
          { label: 'Blocked Threats', value: health?.flagged ?? '...', icon: 'alert' },
          { label: 'Bot Volunteers', value: health?.bot_users ?? '...', icon: 'send' },
        ].map((stat) => (
          <Card key={stat.label} className="p-6 flex items-center gap-5 shadow-2xl bg-white/5 border border-white/5 rounded-[2rem]">
            <div className="w-12 h-12 rounded-[1rem] bg-white/5 flex items-center justify-center border border-white/5">
              <CekaIcon name={stat.icon as any} size={24} />
            </div>
            <div>
              <p className="text-[0.6rem] uppercase tracking-widest text-white/20 font-black">{stat.label}</p>
              <p className="text-2xl font-black text-white">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-10 space-y-8 bg-white/5 border border-white/5 rounded-[2.5rem]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white/90">Campaign Stories</h3>
            <p className="text-white/20 text-[0.65rem] font-bold uppercase tracking-widest mt-1">Provide Carousel Image URLs</p>
          </div>
          <button onClick={addSlide} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[0.7rem] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            + Add Slide
          </button>
        </div>

        <div className="space-y-4">
          <label className="text-[0.65rem] uppercase tracking-widest text-white/20 font-black block ml-2">Campaign Title / Project ID</label>
          <input
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            className="w-full rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-ios-blue/50 transition-all text-sm font-medium"
            placeholder="e.g. Finance Bill 2026 - Voter Ed"
            value={batchTitle}
            onChange={e => setBatchTitle(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {slides.map((slide, idx) => (
            <div key={idx} className="flex items-center gap-5 px-6 py-4 rounded-2xl border border-white/5">
              <div className="shrink-0 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/20 text-xs font-black">{slide.slide_number}</div>
              <div className="relative flex-1">
                <CekaIcon name="image" size={16} className="absolute left-0 top-1/2 -translate-y-1/2 opacity-20" />
                <input className="w-full border-none pl-8 text-sm text-white/80 bg-transparent outline-none" placeholder={`Slide ${slide.slide_number} URL`} value={slide.url} onChange={e => updateUrl(idx, e.target.value)} />
              </div>
              {slide.status === 'extracting' && <CekaIcon name="loading" size={18} className="text-ios-blue" />}
              {slide.status === 'done' && <CekaIcon name="check" size={18} className="text-green-400" />}
              {slides.length > 1 && <button onClick={() => removeSlide(idx)}><CekaIcon name="close" size={18} /></button>}
            </div>
          ))}
        </div>

        <Button onClick={runExtraction} disabled={extracting} className="w-full py-8 text-lg font-black bg-ios-blue rounded-[1.5rem]">
          {extracting ? <><CekaIcon name="loading" size={24} /> Extracting...</> : <><CekaIcon name="magic" size={22} /> Extract Content</>}
        </Button>
      </Card>

      {phase === 'review' && (
        <div className="space-y-8">
          {slides.filter(s => s.status === 'done').map((slide) => (
            <Card key={slide.slide_number} className="p-10 space-y-8 bg-white/5 border border-white/5 rounded-[2.5rem]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(['headline', 'subheadline', 'body', 'cta'] as const).map(field => (
                  <textarea key={field} className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 text-sm text-white h-32" value={(slide.extracted as any)?.[field] ?? ''} onChange={e => updateExtracted(slides.indexOf(slide), field, e.target.value)} />
                ))}
              </div>
            </Card>
          ))}
          <Button onClick={publishBatch} disabled={publishing} className="w-full py-10 text-xl font-black bg-green-600 rounded-[2rem]">
            {publishing ? <><CekaIcon name="loading" size={28} /> Publishing...</> : <><CekaIcon name="upload" size={24} /> Start Campaign</>}
          </Button>
        </div>
      )}
    </div>
  );
};

const TranslatePage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [progress, setProgress] = useState<LanguageProgress[]>([]);
  const [selectedLang, setSelectedLang] = useState(searchParams.get('lang') ?? 'sw');
  const [activeTab, setActiveTab] = useState<string>('translate');
  const [userRole, setUserRole] = useState<string>('contributor');
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    (supabase as any).from('languages').select('*').eq('is_active', true).then(({ data }: any) => setLanguages(data || []));
  }, []);

  useEffect(() => {
    if (!user) { setProfileLoading(false); return; }
    (supabase as any).from('profiles').select('translation_role').eq('id', user.id).single().then(({ data }: any) => {
      if (data) setUserRole(data.translation_role);
      setProfileLoading(false);
    });
  }, [user]);

  useEffect(() => {
    (supabase.rpc as any)('get_translation_progress', { p_project_slug: '' })
      .then(({ data }: any) => {
        if (data) setProgress(data as any[]);
      });
  }, []);

  const handleLangChange = (code: string) => {
    setSelectedLang(code);
    setSearchParams({ lang: code });
  };

  const canAudit = !profileLoading && ['lead', 'admin'].includes(userRole);
  const canReview = !profileLoading && ['reviewer', 'lead', 'admin'].includes(userRole);
  const canAdmin = !profileLoading && ['lead', 'admin'].includes(userRole);

  const tabs = [
    { key: 'translate', label: 'Translate', icon: 'translate', guard: true },
    { key: 'review', label: 'Verify Work', icon: 'review', guard: canReview },
    { key: 'audit', label: 'AI Quality Check', icon: 'audit', guard: canAdmin },
    { key: 'admin', label: 'Add New Stories', icon: 'admin', guard: canAdmin },
  ];

  return (
    <Layout>
    <div className="min-h-screen pt-20 pb-16 px-4" style={{ background: '#060914' }}>
      <CekaLatticeBackground />
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
        {/* ── PAGE HEADER ── */}
        <header
          style={{
            background: 'rgba(255,255,255,0.045)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '2.5rem',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
          className="p-8 animate-slide-down"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-5">
              <div
                style={{
                  background: 'linear-gradient(135deg, #00b33c 0%, #007a28 100%)',
                  borderRadius: '1rem',
                  padding: '1rem',
                  boxShadow: '0 8px 24px rgba(0,179,60,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <CekaIcon name="translate" size={42} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight" style={{ color: '#f0f4ff' }}>
                  CEKA Translation Hub
                </h1>
                <p className="text-[0.65rem] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(200,210,255,0.45)' }}>
                  Civic Knowledge in Every Kenyan Language
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[0.7rem] font-bold uppercase tracking-widest" style={{ color: 'rgba(200,210,255,0.45)' }}>
                Online
              </span>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-2 mt-8 flex-wrap">
            {tabs
              .filter((t) => t.guard)
              .map((t) => (
                <button
                  key={t.key}
                  id={`tab-${t.key}`}
                  onClick={() => setActiveTab(t.key)}
                  style={activeTab === t.key ? {
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'rgba(200,210,255,0.45)',
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 hover:border-white/20 hover:text-white/80 active:scale-95"
                >
                  <CekaIcon name={t.icon as any} size={16} />
                  {t.label}
                </button>
              ))}
          </div>
        </header>

        {/* ── ACTIVE TAB CONTENT ── */}
        {activeTab === 'translate' && (
          <TranslatorView
            languages={languages}
            selectedLang={selectedLang}
            onLangChange={handleLangChange}
            progress={progress}
          />
        )}

        {activeTab === 'review' && canReview && (
          <ReviewerDashboard userRole={userRole} />
        )}

        {activeTab === 'audit' && canAdmin && (
          <ReviewerDashboard userRole={userRole} />
        )}

        {activeTab === 'admin' && canAdmin && (
          <NewAdminIngestion />
        )}
      </div>
    </div>
    </Layout>
  );
};

export default TranslatePage;
