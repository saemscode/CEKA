export interface Env {
  AI: {
    run(model: string, inputs: Record<string, unknown>): Promise<{
      response?: string;
      [key: string]: unknown;
    }>;
  };
  VALIDATE_WEBHOOK_SECRET?: string;
}

// ────────────────────────────────────────────────────────────
// CEKA BEHAVIORAL SPAM SCORER
// Threat model: lazy copiers, gibberish farmers, off-topic
// injectors, ballot-stuffers, script kiddies.
// NOT keyword spam — behavioral signal scoring.
// ────────────────────────────────────────────────────────────

function calcStringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;
  let matches = 0;
  const longerStr = longer.toLowerCase();
  const shorterStr = shorter.toLowerCase();
  // Bigram similarity
  for (let i = 0; i < shorterStr.length - 1; i++) {
    const bigram = shorterStr.substring(i, i + 2);
    const idx = longerStr.indexOf(bigram);
    if (idx > -1) matches++;
  }
  return (2 * matches) / (longer.length + shorter.length - 2);
}

interface SpamResult {
  spam_score: number;
  reasons: string[];
  verdict: 'clean' | 'flag' | 'reject';
}

function calculateSpamScore(
  submission: string,
  sourceText: string,
  aiDraft: string | null,
  langCode: string
): SpamResult {
  let score = 0.0;
  const reasons: string[] = [];

  // ── SIGNAL 1: Classic spam phrases (+1.0 → instant reject) ──
  const SPAM_PHRASES = [
    'win prize', 'free money', 'click here', 'make money fast',
    'job offer', 'earn ksh', 'mpesa bonus', 'congratulations you won',
    'bit.ly/', 't.me/', 'wa.me/', 'tinyurl.com', 'shorturl.at',
    'call now', 'whatsapp now', 'telegram now'
  ];
  for (const phrase of SPAM_PHRASES) {
    if (submission.toLowerCase().includes(phrase)) {
      score += 1.0;
      reasons.push(`Classic spam phrase detected: "${phrase}"`);
      break;
    }
  }

  // ── SIGNAL 2: Character set anomaly (+0.8) ──
  // Swahili/Kikuyu/Luo/Luyia/Kamba all use Latin script.
  // Presence of Cyrillic, Arabic, CJK, or Devanagari = zero-false-positive reject signal.
  const NON_LATIN_SCRIPTS = /[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u0900-\u097F]/;
  if (['sw', 'ki', 'luo', 'luy', 'kam'].includes(langCode) && NON_LATIN_SCRIPTS.test(submission)) {
    score += 0.8;
    reasons.push('Non-Latin character script detected in an expected Latin-script language field');
  }

  // ── SIGNAL 3: Source language echo (+0.5) ──
  // Submitting the original English back as the translation.
  if (sourceText && submission && submission.length > 10) {
    const srcWords = sourceText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const subWords = new Set(submission.toLowerCase().split(/\s+/));
    const echoCount = srcWords.filter(w => subWords.has(w)).length;
    const echoRatio = echoCount / Math.max(srcWords.length, 1);
    if (echoRatio > 0.75) {
      score += 0.5;
      reasons.push(`Source echo: ${Math.round(echoRatio * 100)}% of source English words found in submission`);
    }
  }

  // ── SIGNAL 4: Lazy AI copy (+0.4) ──
  // Submitting the AI draft back unchanged.
  if (aiDraft && submission && submission.length > 5) {
    const similarity = calcStringSimilarity(submission.trim(), aiDraft.trim());
    if (similarity > 0.88) {
      score += 0.4;
      reasons.push(`Lazy copy: ${Math.round(similarity * 100)}% similarity to AI draft`);
    }
  }

  // ── SIGNAL 5: Extreme length ratio (+0.5) ──
  // A Swahili translation of a 15-word sentence should not be 2 words or 80 words.
  // Civic Swahili typically runs 0.9x–1.4x the English source length.
  if (sourceText && submission && sourceText.length > 5) {
    const ratio = submission.length / sourceText.length;
    if (ratio < 0.2 || ratio > 3.5) {
      score += 0.5;
      reasons.push(`Extreme length ratio: ${ratio.toFixed(2)}x the source text length`);
    }
  }

  // ── SIGNAL 6: Multiple external links (+0.3) ──
  const urlMatches = submission.match(/https?:\/\/\S+/g) || [];
  if (urlMatches.length > 2) {
    score += 0.3;
    reasons.push(`${urlMatches.length} external links embedded in submission`);
  }

  // ── SIGNAL 7: Predominantly numeric (+0.2) ──
  const digits = (submission.match(/\d/g) || []).length;
  const digitRatio = digits / Math.max(submission.replace(/\s/g, '').length, 1);
  if (digitRatio > 0.4 && submission.length > 8) {
    score += 0.2;
    reasons.push(`${Math.round(digitRatio * 100)}% of content is numeric`);
  }

  // ── SIGNAL 8: Near-empty submission (+0.6) ──
  if (submission.trim().length < 3) {
    score += 0.6;
    reasons.push('Submission is near-empty (< 3 characters)');
  }

  const finalScore = parseFloat(score.toFixed(2));
  const verdict: SpamResult['verdict'] =
    finalScore >= 1.0 ? 'reject'
    : finalScore >= 0.5 ? 'flag'
    : 'clean';

  return { spam_score: finalScore, reasons, verdict };
}

// ────────────────────────────────────────────────────────────
// EXTRACTION QUALITY SCORER (for vision extraction validation)
// ────────────────────────────────────────────────────────────

function calculateExtractionConfidence(ex: any, slideNum: number, totalSlides: number): number {
  let score = 0.70;

  if (ex.headline && ex.headline.length > 10 && ex.headline.length < 200) score += 0.10;
  if (ex.body && ex.body.length > (ex.headline?.length || 0) * 0.3) score += 0.05;
  if (slideNum === 1 && ex.metadata) score += 0.05;
  if (slideNum === totalSlides && ex.cta_directive && ex.cta_directive.length > 5) score += 0.05;

  const totalLength = (ex.headline?.length || 0) + (ex.body?.length || 0) + (ex.cta_directive?.length || 0);
  if (totalLength < 20) score -= 0.20;
  if (ex.headline === ex.body && ex.body === ex.cta_directive && ex.headline !== '') score -= 0.30;
  // New: penalise if headline equals subheadline (copy-paste by model)
  if (ex.headline && ex.subheadline && ex.headline === ex.subheadline) score -= 0.15;

  return Math.min(1, Math.max(0, parseFloat(score.toFixed(2))));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = await request.json() as any;
    const { mode = 'extraction' } = body;

    // ── MODE: SPAM CHECK (for community translation submissions) ──
    if (mode === 'spam_check') {
      const { submission, source_text, ai_draft, lang_code } = body;
      if (!submission) {
        return Response.json({ error: 'submission required' }, { status: 400, headers: corsHeaders });
      }
      const result = calculateSpamScore(submission, source_text || '', ai_draft || null, lang_code || 'sw');
      return Response.json(result, { headers: corsHeaders });
    }

    // ── MODE: EXTRACTION VALIDATION (for vision worker output) ──
    const { extraction, slide_number = 1, total_slides = 1 } = body;
    if (!extraction) {
      return Response.json({ error: 'extraction required' }, { status: 400, headers: corsHeaders });
    }

    // Idempotency guard: skip re-scoring already-processed extractions
    if (body.status && body.status !== 'pending') {
      return Response.json({ skipped: true, reason: 'Already processed', status: body.status }, { headers: corsHeaders });
    }

    let score = calculateExtractionConfidence(extraction, slide_number, total_slides);

    // LLM secondary validation for mid-confidence extractions
    const prompt = `Review this OCR extraction from a civic education slide (slide ${slide_number} of ${total_slides}):
HEADLINE: "${extraction.headline}"
BODY: "${extraction.body || ''}"
CTA: "${extraction.cta_directive || ''}"

Does this make logical civic-education sense? Reply ONLY with JSON: {"valid": true, "issues": []}`;

    let llmValidation = { valid: true };
    if (score >= 0.60 && score < 0.92) {
      try {
        const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { prompt, max_tokens: 256 });
        const match = (aiRes.response || '').match(/\{[\s\S]*\}/);
        if (match) llmValidation = JSON.parse(match[0]);
      } catch {}
    }

    if (llmValidation && !llmValidation.valid) {
      score = Math.min(score, 0.74);
    }

    let decision = 'human_review';
    if (score >= 0.92) decision = 'auto_publish';
    else if (score >= 0.75) decision = 'auto_publish_with_flag';

    return Response.json({ decision, score, slide_number, total_slides, llm_valid: llmValidation.valid }, { headers: corsHeaders });
  },
};
