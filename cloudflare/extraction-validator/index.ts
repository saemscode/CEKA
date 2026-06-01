export interface Env {
  AI: {
    run(model: string, inputs: Record<string, unknown>): Promise<{
      response?: string;
      [key: string]: unknown;
    }>;
  };
}

function calculateExtractionConfidence(ex: any, slideNum: number, totalSlides: number): number {
  let score = 0.70; // High Severity Fix #2: Use 'let' instead of 'const' ✅

  if (ex.headline && ex.headline.length > 10 && ex.headline.length < 150) score += 0.10;
  if (ex.body && ex.body.length > (ex.headline?.length || 0) * 0.3) score += 0.05;
  if (slideNum === 1 && ex.metadata && ex.metadata.length > 0) score += 0.05;
  if (slideNum === totalSlides && ex.cta && ex.cta.length > 5) score += 0.05;

  const totalLength = (ex.headline?.length || 0) + (ex.body?.length || 0) + (ex.cta?.length || 0);
  if (totalLength < 20) score -= 0.20;
  
  // Duplication check
  if (ex.headline === ex.body && ex.body === ex.cta && ex.headline !== '') score -= 0.30;

  return Math.min(1, Math.max(0, parseFloat(score.toFixed(2))));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { extraction, slide_number = 1, total_slides = 1 } = await request.json() as any;

    let score = calculateExtractionConfidence(extraction, slide_number, total_slides);
    
    const prompt = `Review this OCR extraction from a civic education slide (slide ${slide_number} of ${total_slides}):
HEADLINE: "${extraction.headline}"
BODY: "${extraction.body}"
CTA: "${extraction.cta}"

Does this extraction make logical sense? 
Reply with ONLY JSON: {"valid": true/false, "issues": []}`;

    let llmValidation = { valid: true };
    if (score >= 0.60 && score < 0.95) {
      try {
        const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt,
          max_tokens: 256
        });
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

    return Response.json({ decision, score, slide_number, total_slides });
  }
};
