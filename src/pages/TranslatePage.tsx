import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Languages,
  Info,
  ChevronRight,
  CheckCircle2,
  SkipForward,
  ShieldCheck,
  Plus,
  Send,
  AlertTriangle,
  Trophy,
  Loader2,
  BookOpen,
  Upload,
  Eye,
  FlaskConical,
  ImageIcon,
  Sparkles,
  X,
  RefreshCw,
  BarChart3,
  UserCheck,
  Bot,
  Trash2,
  Edit3,
  CheckSquare,
  XSquare,
} from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

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
  language_code: string;
  translated_text: string;
  channel: string;
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

// ─────────────────────────────────────────────
// HELPER: Glossary Check (client-side mirror of server logic)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

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
    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${
      selected
        ? 'bg-ios-blue text-white shadow-md scale-105'
        : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
    }`}
  >
    {lang.name}
  </button>
);

const ProgressCard = ({ progress }: { progress: LanguageProgress }) => (
  <article className="glass-light p-5 rounded-[2rem] border border-white/50 text-center shadow-sm hover:-translate-y-1 transition-all duration-200">
    <span className="text-[0.6rem] font-black text-midnight/40 uppercase block mb-1 tracking-widest leading-none">
      {progress.language_name}
    </span>
    <span className="text-2xl font-black text-midnight block mb-2">{progress.progress_percentage}%</span>
    <div className="w-full bg-midnight/10 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-1.5 rounded-full transition-all duration-700"
        style={{
          width: `${progress.progress_percentage}%`,
          background: 'linear-gradient(90deg, #006600, #00a000)',
        }}
      />
    </div>
    <span className="text-[0.55rem] text-midnight/30 mt-1 block">
      {progress.approved_units} / {progress.total_units}
    </span>
  </article>
);

// ─────────────────────────────────────────────
// TRANSLATOR VIEW
// ─────────────────────────────────────────────

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
  
  // States
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

      // Fetch consensus for this unit
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
      language_code: selectedLang,
      translated_text: translation.trim(),
      submitted_by: user.id,
      channel: 'web',
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
    <div className="space-y-8">
      {/* Language Selector */}
      <div className="glass-dark border border-white/10 rounded-[2rem] p-5 overflow-x-auto custom-scrollbar">
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

      {/* Task Card */}
      <Card className="glass-dark border-white/10 backdrop-blur-3xl shadow-ios-high-dark rounded-[3rem] p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-ios-blue/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-ios-blue animate-spin" />
              <p className="text-white/40 text-sm">Loading next task...</p>
            </div>
          ) : noMoreTasks ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <Trophy className="w-16 h-16 text-yellow-400" />
              <h3 className="text-2xl font-bold text-white">All tasks complete!</h3>
              <p className="text-white/50 max-w-md">
                No more open translation units for{' '}
                {languages.find((l) => l.code === selectedLang)?.name ?? selectedLang}.
                Try another language or check back later.
              </p>
            </div>
          ) : task ? (
            <>
              {/* Task Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className="bg-white/5 border-white/10 text-white/40 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest">
                      {task.field_type}
                    </Badge>
                    <Badge className="bg-kenya-green/20 text-green-400 border-green-500/20 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest">
                      Slide {task.slide_index}
                    </Badge>
                    {task.ai_draft && (
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/20 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest">
                        AI Draft
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl md:text-3xl text-white font-medium leading-relaxed tracking-tight">
                    {task.source_text}
                  </h2>
                  {task.context_hint && (
                    <p className="text-sm text-ios-dark-text-secondary italic flex items-start gap-2">
                      <Info size={16} className="text-ios-blue mt-0.5 flex-shrink-0" />
                      {task.context_hint}
                    </p>
                  )}
                </div>
                <span className="text-[0.6rem] font-mono text-white/20 uppercase tracking-widest leading-none pt-1 whitespace-nowrap">
                  {task.project_slug}
                </span>
              </div>

              {/* Translation Textarea */}
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    id="translation-input"
                    className={`w-full bg-white/5 border rounded-[2rem] p-8 text-xl text-white placeholder:text-white/15 focus:ring-4 focus:ring-ios-blue/20 transition-all outline-none resize-none h-52 shadow-inner leading-relaxed ${
                      overLimit ? 'border-red-500/60' : 'border-white/10'
                    }`}
                    placeholder={`Translate to ${languages.find((l) => l.code === selectedLang)?.name ?? selectedLang}...`}
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                  />
                  <div
                    className={`absolute bottom-5 right-6 text-[0.65rem] font-mono ${
                      overLimit ? 'text-red-400' : 'text-white/20'
                    }`}
                  >
                    {charCount}
                    {charLimit !== null && ` / ${charLimit}`}
                  </div>
                </div>

                {/* Glossary & Consensus */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedLang === 'sw' && task.source_text && (() => {
                    const applicable = Object.entries(SWAHILI_GLOSSARY).filter(([en]) =>
                      task.source_text.toLowerCase().includes(en.toLowerCase())
                    );
                    return applicable.length > 0 ? (
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 space-y-2">
                        <p className="text-[0.6rem] uppercase tracking-widest text-white/30 font-bold">Glossary Enforcement</p>
                        {applicable.map(([en, sw]) => (
                          <p key={en} className="text-sm text-white/50">
                            <span className="text-white/70 font-medium">{en}</span>
                            <span className="text-white/30 mx-2">→</span>
                            <span className="text-green-400 font-medium">{sw}</span>
                          </p>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {consensus.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 space-y-2">
                      <p className="text-[0.6rem] uppercase tracking-widest text-white/30 font-bold">Community Consensus</p>
                      {consensus.map((c, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span 
                            className="text-white/60 truncate max-w-[150px] cursor-pointer hover:text-ios-blue transition-colors"
                            onClick={() => setTranslation(c.translated_text)}
                          >
                            {c.translated_text}
                          </span>
                          <Badge className="bg-white/5 text-[0.6rem]">{c.occurrence_count} match</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <button
                  id="skip-task-btn"
                  onClick={handleSkip}
                  className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors"
                >
                  <SkipForward size={16} />
                  Skip Task
                </button>
                <Button
                  id="submit-translation-btn"
                  onClick={handleSubmit}
                  disabled={submitting || !translation.trim() || overLimit}
                  className="bg-ios-blue hover:bg-ios-blue/90 text-white rounded-[2rem] px-12 py-7 text-lg font-bold shadow-ios-high transform active:scale-95 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Submit & Next
                      <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Card>

      {/* Progress Grid */}
      {progress.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {progress.slice(0, 8).map((p) => (
            <ProgressCard key={p.language_code} progress={p} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// REVIEWER DASHBOARD — Behavioral Audit Tabs
// ─────────────────────────────────────────────

type AuditTab = 'flagged' | 'fast_track' | 'auto_approved' | 'sampling';

const ReviewerDashboard = ({ userRole }: { userRole: string }) => {
  const { toast } = useToast();
  const [auditTab, setAuditTab] = useState<AuditTab>('flagged');
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editText, setEditText] = useState<Record<string, string>>({});
  const { user } = useAuth();

  const fetchQueue = useCallback(async (tab: AuditTab) => {
    setLoading(true);
    let query = (supabase as any).from('translation_submissions').select(`
      id, unit_id, lang_code, translated_text, source,
      confidence_score, status, reviewer_notes, flagged_reason, created_at,
      translation_units (source_text, carousel_id, slide_number, type)
    `);

    if (tab === 'flagged') {
      query = query.eq('status', 'flagged').order('created_at', { ascending: false }).limit(50);
    } else if (tab === 'fast_track') {
      query = query.eq('status', 'pending').gte('confidence_score', 0.60).lt('confidence_score', 0.90).order('confidence_score', { ascending: false }).limit(50);
    } else if (tab === 'auto_approved') {
      query = query.eq('status', 'approved').gte('confidence_score', 0.90).order('created_at', { ascending: false }).limit(50);
    } else if (tab === 'sampling') {
      query = query.eq('status', 'approved').gte('confidence_score', 0.90).order('created_at', { ascending: false }).limit(20);
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

    // Log AI Correction if human overrules an auto-approved submission
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

  const auditTabs: { key: AuditTab; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
    { key: 'flagged', label: 'Flagged', icon: <AlertTriangle size={14} />, desc: 'Auto-rejected or spammy', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    { key: 'fast_track', label: 'Fast Track', icon: <Sparkles size={14} />, desc: 'Score 60–89%', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    { key: 'auto_approved', label: 'Auto-Approved', icon: <Bot size={14} />, desc: 'AI approved ≥90%', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    { key: 'sampling', label: 'Sampling', icon: <BarChart3 size={14} />, desc: 'Spot-check AI quality', color: 'bg-ios-blue/20 text-ios-blue border-ios-blue/30' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-ios-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-light p-6 rounded-[2rem] border border-white/50 shadow-ios-high flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-midnight">Behavioral Audit Dashboard</h2>
          <p className="text-sm text-midnight/50">AI handles 90% automatically. You review the rest.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-kenya-green/20 text-green-700 border-green-300/30 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest">{userRole}</Badge>
          <button onClick={() => fetchQueue(auditTab)} className="p-2 glass-light rounded-xl text-midnight/40 hover:text-midnight transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Audit Tab Bar */}
      <div className="flex gap-3 flex-wrap">
        {auditTabs.map((t) => (
          <button
            key={t.key}
            id={`audit-tab-${t.key}`}
            onClick={() => setAuditTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border transition-all duration-200 ${
              auditTab === t.key ? t.color + ' shadow-md scale-105' : 'glass-dark text-white/40 border-white/10 hover:text-white/60'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab Description */}
      <div className="glass-dark border border-white/10 rounded-2xl px-5 py-3">
        <p className="text-white/40 text-xs">
          {auditTabs.find(t => t.key === auditTab)?.desc}
          {auditTab === 'sampling' && ' — Review a random sample of AI-approved translations to monitor quality drift.'}
          {auditTab === 'flagged' && ' — These submissions were automatically blocked. Verify before deleting or overruling the AI.'}
          {auditTab === 'fast_track' && ' — These almost passed automatically. A fast read is all they need.'}
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-24">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">Queue clear!</h3>
          <p className="text-white/50 mt-2">The AI is handling everything in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((sub) => {
            const score = sub.confidence_score || 0;
            const scoreColor = score >= 0.9 ? 'text-green-400' : score >= 0.6 ? 'text-yellow-400' : 'text-red-400';
            const flags = Array.isArray(sub.glossary_flags) ? sub.glossary_flags : [];
            return (
              <Card key={sub.id} className="glass-dark border-white/10 rounded-[2rem] p-8 space-y-5">
                {/* Meta Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-white/5 border-white/10 text-white/40 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest">
                      {sub.translation_units?.type ?? 'unit'}
                    </Badge>
                    <Badge className="bg-white/5 border-white/10 text-white/40 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest">
                      {(sub.lang_code || '??').toUpperCase()}
                    </Badge>
                    <Badge className="bg-white/5 border-white/10 text-white/40 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest">
                      via {sub.source || 'web'}
                    </Badge>
                    {sub.flagged_reason && (
                      <Badge className="bg-red-500/20 text-red-300 border-red-500/20 text-[0.6rem] px-3 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle size={10} /> {sub.flagged_reason}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-2xl font-black ${scoreColor}`}>{Math.round(score * 100)}%</span>
                    <p className="text-[0.55rem] text-white/20 uppercase tracking-widest">AI score</p>
                  </div>
                </div>

                {/* Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4">
                    <span className="text-[0.6rem] uppercase tracking-widest text-white/30 font-bold block mb-2">Source English</span>
                    <p className="text-white/70 text-sm leading-relaxed">{sub.translation_units?.source_text}</p>
                  </div>
                  <div className="bg-ios-blue/10 rounded-2xl p-4">
                    <span className="text-[0.6rem] uppercase tracking-widest text-ios-blue/60 font-bold block mb-2">Translation</span>
                    <p className="text-white text-sm leading-relaxed font-medium">{sub.translated_text}</p>
                  </div>
                </div>

                {/* Human Correction Field */}
                {(auditTab === 'flagged' || auditTab === 'fast_track' || auditTab === 'sampling') && (
                  <div className="space-y-2">
                    <label className="text-[0.6rem] uppercase tracking-widest text-white/30 font-bold">✏️ Correct Translation (leave blank to keep original)</label>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 outline-none resize-none h-16 focus:ring-2 focus:ring-ios-blue/20 transition-all"
                      placeholder="Type your corrected translation here..."
                      value={editText[sub.id] ?? ''}
                      onChange={(e) => setEditText(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    />
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white/60 placeholder:text-white/20 outline-none focus:ring-2 focus:ring-ios-blue/20 transition-all"
                      placeholder="Reviewer note (e.g. 'valid Dholuo idiom, not AI error')..."
                      value={notes[sub.id] ?? ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    />
                  </div>
                )}

                {/* Action Row */}
                <div className="flex gap-3 justify-end flex-wrap">
                  {editText[sub.id]?.trim() ? (
                    <Button
                      id={`correct-${sub.id}`}
                      onClick={() => handleCorrect(sub.id, sub)}
                      className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl px-8 py-5 font-bold"
                    >
                      <Edit3 size={16} className="mr-2" /> Save Correction
                    </Button>
                  ) : (
                    <>
                      <Button
                        id={`reject-${sub.id}`}
                        onClick={() => handleDecision(sub.id, 'rejected', sub)}
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-2xl px-8 py-5 font-bold"
                      >
                        <XSquare size={16} className="mr-2" /> Reject
                      </Button>
                      <Button
                        id={`approve-${sub.id}`}
                        onClick={() => handleDecision(sub.id, 'approved', sub)}
                        className="bg-kenya-green hover:bg-kenya-green/90 text-white rounded-2xl px-10 py-5 font-bold shadow-ios-high"
                      >
                        <CheckSquare size={18} className="mr-2" /> Approve
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

// ─────────────────────────────────────────────
// CAROUSEL INGEST — Full Pipeline UI
// ─────────────────────────────────────────────

interface SlideRow {
  url: string;
  slide_number: number;
  extracted: {
    headline?: string;
    subheadline?: string;
    body?: string;
    cta?: string;
    metadata?: string;
  } | null;
  confidence: number;
  status: 'idle' | 'extracting' | 'done' | 'error';
}

const INGEST_FUNCTION_URL = 'https://cajrvemigxghnfmyopiy.supabase.co/functions/v1/ingest-media';

const AdminIngestion = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [batchTitle, setBatchTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [slides, setSlides] = useState<SlideRow[]>([
    { url: '', slide_number: 1, extracted: null, confidence: 0, status: 'idle' },
  ]);
  const [extracting, setExtracting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'input' | 'review' | 'published'>('input');

  // ── MANUAL TEXT FORM (Fallback for quick adds) ──
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    project_slug: '', slide_index: 1, field_type: 'body' as string,
    source_text: '', context_hint: '', char_limit: '',
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-ios-blue/20 transition-all text-sm';
  const labelClass = 'text-[0.65rem] uppercase tracking-widest text-white/40 font-bold block mb-1.5';

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
    const validSlides = slides.filter(s => s.url.trim());
    if (!batchTitle.trim() || validSlides.length === 0) {
      toast({ title: 'Missing fields', description: 'Add a campaign title and at least one image URL.', variant: 'destructive' });
      return;
    }
    setExtracting(true);
    // Mark all as extracting
    setSlides(prev => prev.map(s => s.url.trim() ? { ...s, status: 'extracting' } : s));

    try {
      const token = session?.access_token;
      const res = await fetch(INGEST_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: batchTitle.trim(),
          source_url: sourceUrl.trim() || null,
          images: validSlides.map(s => ({ url: s.url, slide_number: s.slide_number })),
          auto_publish: false,
        }),
      });

      if (!res.ok) throw new Error(`Ingest failed: ${res.statusText}`);
      const result = await res.json();
      setBatchId(result.batch_id);

      // Merge extractions back into slides
      setSlides(prev => prev.map((s, i) => {
        const ext = (result.extractions || []).find((e: any) => e.slide_number === s.slide_number);
        if (ext) return { ...s, extracted: ext.extracted, confidence: ext.confidence, status: 'done' };
        return { ...s, status: s.url.trim() ? 'done' : 'idle' };
      }));

      setPhase('review');
      toast({ title: '🔍 Extraction Complete', description: `${result.slides_processed} slides staged for your review.` });
    } catch (err: any) {
      toast({ title: 'Extraction failed', description: err.message, variant: 'destructive' });
      setSlides(prev => prev.map(s => ({ ...s, status: 'idle' })));
    } finally {
      setExtracting(false);
    }
  };

  const publishBatch = async () => {
    if (!batchId) return;
    setPublishing(true);
    try {
      // For each slide with extracted data, push to translation_units directly
      const types: { key: string; type: string }[] = [
        { key: 'headline', type: 'headline' },
        { key: 'subheadline', type: 'subheadline' },
        { key: 'body', type: 'body' },
        { key: 'cta', type: 'cta' },
      ];

      let unitCount = 0;
      for (const slide of slides.filter(s => s.extracted && s.status === 'done')) {
        for (const { key, type } of types) {
          const text = (slide.extracted as any)?.[key]?.trim();
          if (!text || text.length < 3) continue;
          await (supabase as any).from('translation_units').insert({
            batch_id: batchId,
            carousel_id: batchTitle.trim(),
            slide_number: slide.slide_number,
            type,
            source_text: text,
            context_note: `Slide ${slide.slide_number}/${slides.length}. Human-reviewed extraction. Confidence: ${slide.confidence}.`,
            extraction_confidence: slide.confidence,
            active: true,
          });
          unitCount++;
        }
      }

      // Update batch status
      await (supabase as any).from('carousel_batches').update({ status: 'published' }).eq('id', batchId);

      // Trigger AI pre-drafting for all units in batch
      const { data: langs } = await (supabase as any).from('languages').select('code').eq('is_active', true);
      if (langs) {
        const { data: units } = await (supabase as any).from('translation_units').select('id, source_text').eq('batch_id', batchId);
        if (units) {
          for (const unit of (units as any[])) {
            (supabase.functions as any).invoke('translate-ai', {
              body: { unit_id: unit.id, source_text: unit.source_text, target_languages: (langs as any[]).map(l => l.code) }
            }).catch(console.error);
          }
        }
      }

      setPhase('published');
      toast({ title: '🚀 Campaign Published!', description: `${unitCount} translation units are now live for the community.` });
    } catch (err: any) {
      toast({ title: 'Publish failed', description: err.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.project_slug.trim() || !manualForm.source_text.trim()) {
      toast({ title: 'Missing fields', description: 'Project slug and source text are required.', variant: 'destructive' });
      return;
    }
    setManualSubmitting(true);
    const { data: newUnit, error } = await (supabase as any).from('translation_units').insert({
      carousel_id: manualForm.project_slug.trim().toLowerCase().replace(/\s+/g, '-'),
      slide_number: manualForm.slide_index,
      type: manualForm.field_type,
      source_text: manualForm.source_text.trim(),
      context_note: manualForm.context_hint.trim() || null,
      char_limit: manualForm.char_limit ? parseInt(manualForm.char_limit, 10) : null,
      active: true,
    }).select().single();
    if (error || !newUnit) { toast({ title: 'Failed', description: error?.message || 'Insert failed', variant: 'destructive' }); setManualSubmitting(false); return; }
    const { data: langs } = await (supabase as any).from('languages').select('code').eq('is_active', true);
    if (langs) {
      (supabase.functions as any).invoke('translate-ai', { body: { unit_id: (newUnit as any).id, source_text: manualForm.source_text.trim(), target_languages: (langs as any[]).map(l => l.code) } }).catch(console.error);
    }
    toast({ title: '✅ Unit created', description: 'Translation task queued. AI pre-drafting initiated.' });
    setManualForm({ project_slug: '', slide_index: 1, field_type: 'body', source_text: '', context_hint: '', char_limit: '' });
    setManualSubmitting(false);
  };

  // ── SYSTEM HEALTH MONITOR ──
  const [health, setHealth] = useState<any>(null);
  const checkHealth = async () => {
    const { count: units } = await (supabase as any).from('translation_units').select('*', { count: 'exact', head: true });
    const { count: pending } = await (supabase as any).from('translation_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: flagged } = await (supabase as any).from('translation_submissions').select('*', { count: 'exact', head: true }).eq('status', 'flagged');
    const { count: bots } = await (supabase as any).from('profiles').select('*', { count: 'exact', head: true }).not('telegram_id', 'is', null);

    setHealth({
      units: units || 0,
      pending: pending || 0,
      flagged: flagged || 0,
      bot_users: bots || 0,
      workers: [
        { name: 'Vision Engine', status: 'active', icon: <Eye size={12}/> },
        { name: 'LLM Auditor', status: 'active', icon: <Bot size={12}/> },
        { name: 'Submission Guard', status: 'active', icon: <ShieldCheck size={12}/> }
      ]
    });
  };

  useEffect(() => { checkHealth(); }, []);

  if (phase === 'published') {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
        <div className="w-20 h-20 bg-kenya-green/20 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-black text-white">Campaign Published! 🚀</h2>
        <p className="text-white/50 max-w-md">Translation units are now live. The Telegram Bot and Web UI will serve them to the community immediately.</p>
        <Button id="another-campaign-btn" onClick={() => { setPhase('input'); setBatchTitle(''); setSourceUrl(''); setSlides([{ url: '', slide_number: 1, extracted: null, confidence: 0, status: 'idle' }]); setBatchId(null); }} className="bg-ios-blue text-white rounded-2xl px-10 py-5 font-bold shadow-ios-high">
          Ingest Another Campaign
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ingested Units', value: health?.units ?? '...', icon: <BookOpen className="text-ios-blue" /> },
          { label: 'Pending Review', value: health?.pending ?? '...', icon: <RefreshCw className="text-yellow-400" /> },
          { label: 'Flagged Spam', value: health?.flagged ?? '...', icon: <AlertTriangle className="text-red-400" /> },
          { label: 'Bot Volunteers', value: health?.bot_users ?? '...', icon: <Send className="text-ios-blue" /> },
        ].map((stat, i) => (
          <Card key={i} className="glass-dark border-white/10 p-5 rounded-3xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">{stat.icon}</div>
            <div>
              <p className="text-[0.6rem] uppercase tracking-widest text-white/30 font-bold">{stat.label}</p>
              <p className="text-xl font-black text-white">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="glass-light p-6 rounded-[2rem] border border-white/50 shadow-ios-high flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-midnight">Campaign Pipeline</h2>
          <p className="text-sm text-midnight/50">Manage the autonomous ingestion & bot workers.</p>
        </div>
        <div className="flex gap-2">
          {health?.workers.map((w: any, i: number) => (
            <Badge key={i} className="bg-midnight/5 text-midnight/40 border-midnight/10 px-3 py-1.5 rounded-xl text-[0.6rem] uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {w.name}
            </Badge>
          ))}
          <button
            id="toggle-manual-mode"
            onClick={() => setManualMode(m => !m)}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border ${
              manualMode ? 'bg-midnight text-white border-midnight shadow-md' : 'bg-white/10 text-midnight border-midnight/20 hover:bg-white/30'
            }`}
          >
            {manualMode ? '← Carousel Mode' : '+ Quick Add'}
          </button>
        </div>
      </div>

      {/* Manual Quick Add Mode */}
      {manualMode ? (
        <Card className="glass-dark border-white/10 rounded-[3rem] p-10">
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-6">Quick Add — Single Translation Unit</p>
          <form id="admin-ingestion-form" onSubmit={handleManualSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Campaign / Carousel Slug</label>
                <input className={inputClass} placeholder="finance-bill-2026" value={manualForm.project_slug} onChange={e => setManualForm(p => ({ ...p, project_slug: e.target.value }))} required />
              </div>
              <div>
                <label className={labelClass}>Slide Number</label>
                <input type="number" min={1} className={inputClass} value={manualForm.slide_index} onChange={e => setManualForm(p => ({ ...p, slide_index: parseInt(e.target.value, 10) }))} />
              </div>
              <div>
                <label className={labelClass}>Segment Type</label>
                <select className={inputClass + ' appearance-none'} value={manualForm.field_type} onChange={e => setManualForm(p => ({ ...p, field_type: e.target.value }))}>
                  <option value="headline">Headline</option>
                  <option value="body">Body Text</option>
                  <option value="cta">Call to Action</option>
                  <option value="subheadline">Subheadline</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Character Limit (optional)</label>
                <input type="number" min={1} className={inputClass} placeholder="Leave blank for unlimited" value={manualForm.char_limit} onChange={e => setManualForm(p => ({ ...p, char_limit: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Source Text (English)</label>
              <textarea className={inputClass + ' h-32 resize-none'} placeholder="Paste the English text to be translated..." value={manualForm.source_text} onChange={e => setManualForm(p => ({ ...p, source_text: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Context Hint for Translators</label>
              <input className={inputClass} placeholder="e.g. Formal civic language. Headline of Finance Bill slide." value={manualForm.context_hint} onChange={e => setManualForm(p => ({ ...p, context_hint: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={manualSubmitting} className="bg-ios-blue hover:bg-ios-blue/90 text-white rounded-[2rem] px-12 py-7 text-lg font-bold shadow-ios-high">
                {manualSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus size={18} className="mr-2" />Create Unit</>}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          {/* Campaign Meta */}
          <Card className="glass-dark border-white/10 rounded-[2rem] p-8 space-y-6">
            <p className="text-white/40 text-[0.65rem] uppercase tracking-widest font-bold">Step 1 — Campaign Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Campaign Title</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Finance Bill 2026 Breakdown"
                  value={batchTitle}
                  onChange={e => setBatchTitle(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Source URL (optional)</label>
                <input
                  className={inputClass}
                  placeholder="Instagram/link where this campaign lives"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Slide URL Input */}
          <Card className="glass-dark border-white/10 rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-white/40 text-[0.65rem] uppercase tracking-widest font-bold">Step 2 — Add Slide Image URLs</p>
              <button onClick={addSlide} className="flex items-center gap-2 text-ios-blue text-sm font-bold hover:text-ios-blue/80 transition-colors">
                <Plus size={16} /> Add Slide
              </button>
            </div>
            <div className="space-y-3">
              {slides.map((slide, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/30 text-xs font-bold">
                    {slide.slide_number}
                  </div>
                  <div className="relative flex-1">
                    <ImageIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                      className={inputClass + ' pl-10'}
                      placeholder={`Slide ${slide.slide_number} image URL (https://...)`}
                      value={slide.url}
                      onChange={e => updateUrl(idx, e.target.value)}
                    />
                  </div>
                  {slide.status === 'extracting' && <Loader2 size={16} className="text-ios-blue animate-spin shrink-0" />}
                  {slide.status === 'done' && <CheckCircle2 size={16} className="text-green-400 shrink-0" />}
                  {slide.status === 'error' && <AlertTriangle size={16} className="text-red-400 shrink-0" />}
                  {slides.length > 1 && (
                    <button onClick={() => removeSlide(idx)} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Button
                id="run-extraction-btn"
                onClick={runExtraction}
                disabled={extracting || !batchTitle.trim() || slides.every(s => !s.url.trim())}
                className="w-full bg-ios-blue hover:bg-ios-blue/90 text-white rounded-[2rem] py-6 text-base font-bold shadow-ios-high disabled:opacity-50"
              >
                {extracting ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" />Extracting Text...</>
                ) : (
                  <><Sparkles size={18} className="mr-2" />Extract Text with AI</>
                )}
              </Button>
            </div>
          </Card>

          {/* Review Phase */}
          {phase === 'review' && (
            <div className="space-y-4">
              <div className="glass-light p-6 rounded-[2rem] border border-white/50 flex items-center justify-between">
                <div>
                  <p className="text-midnight font-bold text-lg">Step 3 — Review & Correct AI Extractions</p>
                  <p className="text-midnight/50 text-sm">Edit any fields before publishing. Only headline, subheadline, body, and cta become translation tasks.</p>
                </div>
                <Eye size={24} className="text-midnight/30" />
              </div>

              {slides.filter(s => s.status === 'done' && s.extracted).map((slide, idx) => (
                <Card key={slide.slide_number} className="glass-dark border-white/10 rounded-[2rem] p-8 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-ios-blue/20 rounded-xl flex items-center justify-center text-ios-blue font-black">
                        {slide.slide_number}
                      </div>
                      <div>
                        <p className="text-white font-bold">Slide {slide.slide_number} of {slides.length}</p>
                        <p className="text-white/30 text-xs">{slide.slide_number === slides.length ? '🎯 CTA Slide' : slide.slide_number === 1 ? '🪝 Hook Slide' : '📖 Content Slide'}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      slide.confidence >= 0.85 ? 'bg-green-500/20 text-green-400' :
                      slide.confidence >= 0.60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {Math.round(slide.confidence * 100)}% confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['headline', 'subheadline', 'body', 'cta'] as const).map(field => (
                      <div key={field}>
                        <label className={labelClass}>{field === 'cta' ? '🎯 Call to Action' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                        <textarea
                          className={inputClass + ' h-20 resize-none'}
                          placeholder={`No ${field} detected...`}
                          value={(slide.extracted as any)?.[field] ?? ''}
                          onChange={e => updateExtracted(slides.indexOf(slide), field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  {slide.extracted?.metadata && (
                    <div className="bg-white/5 rounded-xl px-4 py-3">
                      <span className="text-[0.6rem] uppercase tracking-widest text-white/30 font-bold">🔒 Metadata (Preserved, Not Translated)</span>
                      <p className="text-white/40 text-xs mt-1">{slide.extracted.metadata}</p>
                    </div>
                  )}
                </Card>
              ))}

              <Button
                id="publish-batch-btn"
                onClick={publishBatch}
                disabled={publishing}
                className="w-full bg-kenya-green hover:bg-kenya-green/90 text-white rounded-[2rem] py-7 text-lg font-bold shadow-ios-high"
              >
                {publishing ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" />Publishing...</>
                ) : (
                  <><Upload size={18} className="mr-2" />Confirm & Publish Campaign</>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Preserve old body-only type used in ReviewerDashboard fetch schema reference
type _LegacyPendingSubmission = PendingSubmission;




// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

type Tab = 'translate' | 'review' | 'admin' | 'audit';

const TranslatePage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [progress, setProgress] = useState<LanguageProgress[]>([]);
  const [selectedLang, setSelectedLang] = useState(searchParams.get('lang') ?? 'sw');
  const [activeTab, setActiveTab] = useState<Tab>('translate');
  const [userRole, setUserRole] = useState<string>('contributor');
  const [profileLoading, setProfileLoading] = useState(true);
  const [projects, setProjects] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState('');

  // Fetch languages
  useEffect(() => {
    (supabase as any)
      .from('languages')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }: any) => {
        if (data) setLanguages(data as Language[]);
      });
  }, []);

  // Fetch unique projects to populate the tracker
  useEffect(() => {
    (supabase as any)
      .from('translation_units')
      .select('project_slug')
      .then(({ data }: any) => {
        if (data) {
          const unique = Array.from(new Set((data as any[]).map(d => d.project_slug)));
          setProjects(unique);
          if (unique.length > 0 && !activeProject) {
            setActiveProject(unique[0]);
          }
        }
      });
  }, [activeProject]);

  // Fetch user role
  useEffect(() => {
    if (!user) { setProfileLoading(false); return; }
    (supabase as any)
      .from('profiles')
      .select('translation_role')
      .eq('id', user.id)
      .single()
      .then(({ data }: any) => {
        if (data) {
          const profile = (data as any);
          if (profile.translation_role) {
            setUserRole(profile.translation_role);
            if (profile.translation_role === 'admin' || profile.translation_role === 'reviewer') {
              setActiveTab('review');
            }
          }
        }
        setProfileLoading(false);
      });
  }, [user]);

  // Fetch progress
  useEffect(() => {
    (supabase.rpc as any)('get_translation_progress', { p_project_slug: activeProject })
      .then(({ data, error }: any) => {
        if (!error && data) setProgress(data as any[]);
      });
  }, [activeProject]);

  const handleLangChange = (code: string) => {
    setSelectedLang(code);
    setSearchParams({ lang: code });
  };

  const canReview = !profileLoading && ['reviewer', 'lead', 'admin'].includes(userRole);
  const canAdmin = !profileLoading && ['lead', 'admin'].includes(userRole);
  const canAudit = !profileLoading && ['lead', 'admin'].includes(userRole);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; guard: boolean }[] = [
    { key: 'translate', label: 'Translate', icon: <Languages size={16} />, guard: true },
    { key: 'review', label: 'Review Queue', icon: <ShieldCheck size={16} />, guard: canReview },
    { key: 'audit', label: 'AI Audit', icon: <BarChart3 size={16} />, guard: canAudit },
    { key: 'admin', label: 'Ingest Content', icon: <BookOpen size={16} />, guard: canAdmin },
  ];

  return (
    <div className="min-h-screen bg-pattern-grid-dark pt-20 pb-16 px-4 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in">

        {/* ── PAGE HEADER ── */}
        <header className="glass-light p-8 rounded-[2.5rem] border border-white/40 shadow-ios-high animate-slide-down">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="bg-kenya-green p-4 rounded-[1.5rem] shadow-xl">
                <Languages className="text-white h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-midnight tracking-tight leading-tight">
                  CEKA Translation Hub
                </h1>
                <p className="text-[0.65rem] font-bold text-midnight/40 uppercase tracking-widest mt-0.5">
                  Civic Knowledge — Every Language
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[0.7rem] font-bold text-midnight/50 uppercase tracking-widest">
                Community Active
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
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                    activeTab === t.key
                      ? 'bg-midnight text-white shadow-md'
                      : 'bg-midnight/10 text-midnight/50 hover:bg-midnight/20 hover:text-midnight'
                  }`}
                >
                  {t.icon}
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

        {activeTab === 'audit' && canAudit && (
          <ReviewerDashboard userRole={userRole} />
        )}

        {activeTab === 'admin' && canAdmin && (
          <AdminIngestion />
        )}

        {/* ── TELEGRAM CTA ── */}
        <div className="glass-dark border border-white/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-white font-bold text-lg">Translate via Telegram</h3>
            <p className="text-white/50 text-sm max-w-md leading-relaxed">
              Prefer chat? Use our Telegram bot to receive and submit translations directly without opening a browser.
            </p>
          </div>
          <a
            id="telegram-bot-link"
            href="https://t.me/CEKATranslateBot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#229ED9] hover:bg-[#229ED9]/90 text-white rounded-2xl px-8 py-4 font-bold shadow-ios-high transform active:scale-95 transition-all whitespace-nowrap"
          >
            <Send size={18} />
            Open Telegram Bot
          </a>
        </div>

      </div>
    </div>
  );
};

export default TranslatePage;
