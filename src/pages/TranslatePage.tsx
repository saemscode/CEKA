import React, { useState, useEffect, useCallback } from 'react';
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
// REVIEWER DASHBOARD
// ─────────────────────────────────────────────

const ReviewerDashboard = ({ userRole }: { userRole: string }) => {
  const { toast } = useToast();
  const [queue, setQueue] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { user } = useAuth();

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('translation_submissions')
      .select(`
        id, unit_id, language_code, translated_text, channel,
        confidence_score, status, glossary_checked, reviewer_notes, created_at,
        translation_units (source_text, project_slug, field_type)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (!error && data) setQueue(data as any[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleDecision = async (id: string, decision: 'approved' | 'rejected') => {
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

    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: decision === 'approved' ? 'Approved ✓' : 'Rejected',
      description: `Submission has been ${decision}.`,
    });
    setQueue((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-ios-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-light p-6 rounded-[2rem] border border-white/50 shadow-ios-high flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-midnight">Review Queue</h2>
          <p className="text-sm text-midnight/50">{queue.length} submissions pending</p>
        </div>
        <Badge className="bg-kenya-green/20 text-green-700 border-green-300/30 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest">
          {userRole}
        </Badge>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-24">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">Queue clear!</h3>
          <p className="text-white/50 mt-2">No pending submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((sub) => {
            const flags = Array.isArray(sub.glossary_flags) ? sub.glossary_flags : [];
            return (
              <Card
                key={sub.id}
                className="glass-dark border-white/10 rounded-[2rem] p-8 space-y-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-white/5 border-white/10 text-white/40 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest">
                        {sub.translation_units?.field_type ?? 'segment'}
                      </Badge>
                      <Badge className="bg-white/5 border-white/10 text-white/40 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest">
                        {sub.language_code.toUpperCase()}
                      </Badge>
                      <Badge className="bg-white/5 border-white/10 text-white/40 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest">
                        via {sub.channel}
                      </Badge>
                      {flags.length > 0 && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/20 text-[0.6rem] px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                          <AlertTriangle size={10} />
                          {flags.length} flag{flags.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed">
                      <span className="text-white/30 font-bold uppercase text-[0.6rem] tracking-widest mr-2">SOURCE</span>
                      {sub.translation_units?.source_text}
                    </p>
                    <p className="text-white text-lg font-medium leading-relaxed">
                      <span className="text-white/30 font-bold uppercase text-[0.6rem] tracking-widest mr-2">TRANSLATION</span>
                      {sub.translated_text}
                    </p>
                    {flags.length > 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 space-y-1">
                        {flags.map((f: string, i: number) => (
                          <p key={i} className="text-yellow-300 text-xs flex items-center gap-2">
                            <AlertTriangle size={12} />
                            {f}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-black ${sub.confidence_score >= 0.7 ? 'text-green-400' : sub.confidence_score >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(sub.confidence_score * 100)}%
                    </span>
                    <p className="text-[0.55rem] text-white/20 uppercase tracking-widest">confidence</p>
                  </div>
                </div>

                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white/70 placeholder:text-white/20 outline-none resize-none h-16 transition-all focus:ring-2 focus:ring-ios-blue/20"
                  placeholder="Reviewer notes (optional)..."
                  value={notes[sub.id] ?? ''}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))
                  }
                />

                <div className="flex gap-4 justify-end">
                  <Button
                    id={`reject-${sub.id}`}
                    onClick={() => handleDecision(sub.id, 'rejected')}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-2xl px-8 py-5 font-bold"
                  >
                    Reject
                  </Button>
                  <Button
                    id={`approve-${sub.id}`}
                    onClick={() => handleDecision(sub.id, 'approved')}
                    className="bg-kenya-green hover:bg-kenya-green/90 text-white rounded-2xl px-10 py-5 font-bold shadow-ios-high"
                  >
                    <CheckCircle2 size={18} className="mr-2" />
                    Approve
                  </Button>
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
// ADMIN INGESTION FORM
// ─────────────────────────────────────────────

const AdminIngestion = () => {
  const { toast } = useToast();
  const { user, session } = useAuth();
  const [form, setForm] = useState({
    project_slug: '',
    slide_index: 1,
    field_type: 'body' as 'headline' | 'body' | 'cta' | 'caption' | 'note',
    source_text: '',
    context_hint: '',
    char_limit: '',
    priority: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_slug.trim() || !form.source_text.trim()) {
      toast({ title: 'Missing fields', description: 'Project slug and source text are required.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    const { data: newUnit, error } = await (supabase as any).from('translation_units').insert({
      project_slug: form.project_slug.trim().toLowerCase().replace(/\s+/g, '-'),
      slide_index: form.slide_index,
      field_type: form.field_type,
      source_text: form.source_text.trim(),
      context_hint: form.context_hint.trim() || null,
      char_limit: form.char_limit ? parseInt(form.char_limit, 10) : null,
      priority: form.priority,
      status: 'open',
      created_by: user?.id,
    }).select().single();

    if (error || !newUnit) {
      toast({ title: 'Failed', description: error?.message || "Insert failed", variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Trigger AI Pre-drafting for all active languages in parallel
    const { data: langs } = await (supabase as any).from("languages").select("code").eq("is_active", true);
    if (langs) {
      const langCodes = (langs as any[]).map(l => l.code);
      (supabase.functions as any).invoke('translate-ai', {
        body: {
          unit_id: newUnit.id,
          source_text: form.source_text.trim(),
          target_languages: langCodes
        }
      }).catch(console.error);
    }

    toast({ title: 'Unit created', description: 'Translation task queued. AI pre-drafting initiated for all languages.' });
    setForm({ project_slug: '', slide_index: 1, field_type: 'body', source_text: '', context_hint: '', char_limit: '', priority: 1 });
    setSubmitting(false);
  };

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-ios-blue/20 transition-all text-sm';
  const labelClass = 'text-[0.65rem] uppercase tracking-widest text-white/40 font-bold block mb-1.5';

  return (
    <div className="space-y-6">
      <div className="glass-light p-6 rounded-[2rem] border border-white/50 shadow-ios-high">
        <h2 className="text-xl font-bold text-midnight">Content Ingestion</h2>
        <p className="text-sm text-midnight/50">Add source text units for community translation.</p>
      </div>

      <Card className="glass-dark border-white/10 rounded-[3rem] p-10">
        <form id="admin-ingestion-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="project-slug" className={labelClass}>Campaign / Carousel Slug</label>
              <input
                id="project-slug"
                className={inputClass}
                placeholder="finance-bill-2026"
                value={form.project_slug}
                onChange={(e) => setForm((p) => ({ ...p, project_slug: e.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="slide-index" className={labelClass}>Slide Number</label>
              <input
                id="slide-index"
                type="number"
                min={1}
                className={inputClass}
                value={form.slide_index}
                onChange={(e) => setForm((p) => ({ ...p, slide_index: parseInt(e.target.value, 10) }))}
              />
            </div>
            <div>
              <label htmlFor="field-type" className={labelClass}>Segment Type</label>
              <select
                id="field-type"
                className={inputClass + ' appearance-none'}
                value={form.field_type}
                onChange={(e) => setForm((p) => ({ ...p, field_type: e.target.value as any }))}
              >
                <option value="headline">Headline</option>
                <option value="body">Body Text</option>
                <option value="cta">Call to Action</option>
                <option value="caption">Caption</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label htmlFor="char-limit" className={labelClass}>Character Limit (optional)</label>
              <input
                id="char-limit"
                type="number"
                min={1}
                className={inputClass}
                placeholder="Leave blank for unlimited"
                value={form.char_limit}
                onChange={(e) => setForm((p) => ({ ...p, char_limit: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label htmlFor="source-text" className={labelClass}>Source Text (English)</label>
            <textarea
              id="source-text"
              className={inputClass + ' h-32 resize-none'}
              placeholder="Paste the English text to be translated..."
              value={form.source_text}
              onChange={(e) => setForm((p) => ({ ...p, source_text: e.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor="context-hint" className={labelClass}>Context Hint for Translators</label>
            <input
              id="context-hint"
              className={inputClass}
              placeholder="e.g. 'This is a headline for a Finance Bill slide. Use formal civic language.'"
              value={form.context_hint}
              onChange={(e) => setForm((p) => ({ ...p, context_hint: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="priority" className={labelClass}>Priority (1–10)</label>
            <input
              id="priority"
              type="number"
              min={1}
              max={10}
              className={inputClass}
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: parseInt(e.target.value, 10) }))}
            />
          </div>

          <div className="flex justify-end">
            <Button
              id="submit-unit-btn"
              type="submit"
              disabled={submitting}
              className="bg-ios-blue hover:bg-ios-blue/90 text-white rounded-[2rem] px-12 py-7 text-lg font-bold shadow-ios-high transform active:scale-95 transition-all"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Plus size={18} className="mr-2" />
                  Create Translation Unit
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

type Tab = 'translate' | 'review' | 'admin';

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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; guard: boolean }[] = [
    { key: 'translate', label: 'Translate', icon: <Languages size={16} />, guard: true },
    { key: 'review', label: 'Review Queue', icon: <ShieldCheck size={16} />, guard: canReview },
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
