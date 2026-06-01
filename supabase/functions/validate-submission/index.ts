//@ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('VALIDATE_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // 1. Authorization Gate (Critical Fix #1)
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    console.error('Unauthorized access attempt to validator');
    return new Response('Unauthorized', { status: 401 });
  }

  const { submission_id } = await req.json();

  // 2. Fetch submission with unit data
  const { data: sub, error: subErr } = await supabase
    .from('translation_submissions')
    .select(`
      *,
      translation_units (
        id, source_text, ai_draft
      )
    `)
    .eq('id', submission_id)
    .single();

  if (subErr || !sub) {
    return Response.json({ error: 'Submission not found' }, { status: 404 });
  }

  // 3. Already processed check (Idempotency)
  if (sub.status !== 'pending') {
    return Response.json({ decision: 'already_processed', current_status: sub.status });
  }

  let score = 1.0;
  const flags: string[] = [];
  const breakdown: Record<string, number> = {};

  // 4. Behavioral Spam Scorer (High Severity Fix)
  let spamScore = 0;
  const suspicious: string[] = [];

  if (/\b(viagra|free money|win prize|click here)\b/i.test(sub.translated_text)) {
    spamScore += 1.0;
    suspicious.push('classic_spam');
  }
  if ((sub.translated_text.match(/http/g) || []).length > 2) {
    spamScore += 0.5;
    suspicious.push('multiple_links');
  }
  if (sub.translated_text.length < 5 && /[0-9]{6,}/.test(sub.translated_text)) {
    spamScore += 0.8;
    suspicious.push('phone_number_dump');
  }

  // Character set anomaly (Arabic/Cyrillic in Swahili)
  if (/[а-яА-Я\u0600-\u06FF]/.test(sub.translated_text)) {
    spamScore += 0.8;
    suspicious.push('invalid_charset');
  }

  if (spamScore >= 1.0) {
    flags.push(`Spam patterns: ${suspicious.join(', ')}`);
    score -= 0.6;
  }

  // 5. Length Ratio Check
  const sourceLen = sub.translation_units?.source_text?.length || 1;
  const transLen = sub.translated_text.length;
  const ratio = transLen / sourceLen;
  if (ratio < 0.2 || ratio > 3.5) {
    score -= 0.3;
    flags.push('Length ratio outlier');
  }

  // 6. Glossary Enforcement (with Regex Escaping)
  const { data: glossary } = await supabase
    .from('civic_glossary')
    .select('source_term, approved_term')
    .eq('lang_code', sub.lang_code);

  if (glossary) {
    for (const term of glossary) {
      const srcRegex = new RegExp(`\\b${escapeRegex(term.source_term)}\\b`, 'i');
      const appRegex = new RegExp(escapeRegex(term.approved_term), 'i');

      if (srcRegex.test(sub.translation_units.source_text)) {
        if (appRegex.test(sub.translated_text)) {
          score += 0.05;
        } else {
          score -= 0.1;
          flags.push(`Misused term: ${term.source_term}`);
        }
      }
    }
  }

  // 7. Lazy AI Copy Detection
  if (sub.translation_units?.ai_draft) {
    const aiDraft = sub.translation_units.ai_draft.trim().toLowerCase();
    const humanSub = sub.translated_text.trim().toLowerCase();
    if (aiDraft === humanSub) {
      score -= 0.2;
      flags.push('Unedited AI duplicate');
    }
  }

  // 8. Source Language Echo Detection
  const sourceEnglish = sub.translation_units.source_text.trim().toLowerCase();
  if (sourceEnglish === sub.translated_text.trim().toLowerCase()) {
    score -= 0.5;
    flags.push('Pasted source English');
  }

  score = Math.min(1.0, Math.max(0.0, parseFloat(score.toFixed(2))));

  // ROUTING
  let status = 'pending';
  if (score >= 0.9 && flags.length === 0) status = 'approved';
  else if (score < 0.6) status = 'flagged';

  await supabase
    .from('translation_submissions')
    .update({
      status,
      confidence_score: score,
      reviewer_notes: flags.join('; ') || null,
      reviewed_at: status === 'approved' ? new Date().toISOString() : null
    })
    .eq('id', submission_id);

  // If approved, upsert to memory (Fix #4: Unique Memory)
  if (status === 'approved') {
    await supabase.from('translation_memory').upsert({
      unit_id: sub.unit_id,
      lang_code: sub.lang_code,
      approved_text: sub.translated_text,
      approved_at: new Date().toISOString()
    }, { onConflict: 'unit_id,lang_code' });
  }

  return Response.json({ decision: status, score, flags });
});
