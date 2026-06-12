export interface Env {
  AI: {
    run(model: string, inputs: Record<string, unknown>): Promise<{
      response?: string;
      description?: string;
      [key: string]: unknown;
    }>;
  };
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.arrayBuffer();
  // Use chunked btoa to avoid call-stack overflow on large images
  const bytes = new Uint8Array(blob);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS support for cross-origin calls from the React app
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const {
      image_url,
      image_base64,
      slide_number = 1,
      total_slides = 1,
      is_final = false,
    } = (await request.json()) as any;

    if (!image_url && !image_base64) {
      return Response.json({ error: 'image_url or image_base64 required' }, { status: 400, headers: corsHeaders });
    }

    let base64Image: string;
    try {
      base64Image = image_base64 || (await fetchImageAsBase64(image_url!));
    } catch {
      return Response.json({ error: 'Failed to fetch or encode image' }, { status: 400, headers: corsHeaders });
    }

    // ─────────────────────────────────────────────────────────────────
    // THE DEFINITIVE CEKA VISION ENGINE SYSTEM PROMPT
    // Scope-based, not example-based. Spatial + functional hierarchy only.
    // ─────────────────────────────────────────────────────────────────
    const slideTypeHint = is_final ? 'CTA' : slide_number === 1 ? 'HOOK' : 'CONTENT';

    const systemPrompt = `You are the CEKA Vision Engine. Extract and categorize ALL text from a civic education carousel slide.
This is slide ${slide_number} of ${total_slides}. Slide type hint: ${slideTypeHint}.

CRITICAL RULE: Do NOT rely on color or visual style. Rely ONLY on spatial hierarchy and functional role.

── EXTRACTION SCOPES ──

1. METADATA (never translate — preserve exactly as found)
   Scope: Any text that is brand-persistent, identity-marking, or platform-chrome.
   Includes: org names, social handles (@civiceducationke), hashtags, campaign series titles,
   slide counter labels, co-sponsor attributions, third-party URLs, legal lines.
   Rule: If removing this text leaves the civic message fully intact → it belongs here.

2. HEADLINE (primary translatable content)
   Scope: The single most visually dominant text block — largest font, most central, highest weight.
   One headline per slide. If two compete, the more central or largest wins.

3. SUBHEADLINE (secondary translatable content)
   Scope: Text that contextualizes or amplifies the headline. Medium visual weight.
   Only populated when a second distinct translatable layer clearly exists. Null otherwise.

4. BODY (dense readable civic content)
   Scope: Paragraph text, sentence clusters, or bulleted lists forming the civic education substance.
   Rule: ABSENT on final/CTA slides — reclassify any paragraph text found there as cta_support.

5. CTA_DIRECTIVE (final slide only — imperative scope)
   Scope: Any text that commands, invites, or provokes a viewer action.
   Includes: imperative verbs ("Share.", "Comment"), engagement questions ("Did you like this?"),
   urgency statements ("Act NOW!"), list teasers ("follow for more"), action instructions with URL or QR.
   Rule: ONLY populated when is_final === true. This is the PRIMARY field on final slides.

6. CTA_SUPPORT (final slide only — context scope)
   Scope: Text that enables or contextualizes the CTA without being the command itself.
   Includes: URLs, "link in bio", scan instructions, informal link labels, follow-up context sentences.
   Rule: Dense paragraph text on final slides goes HERE, not in body.

7. DIRECTIONAL_UI (never translate — always ignore as civic content)
   Scope: Navigation design elements.
   Includes: "Swipe to learn", "Swipe to continue", arrow labels, "Read more".
   Rule: On non-final slides → directional_ui array. On final slides, if a swipe text is the only
   action instruction present, route to cta_directive instead.

8. INLINE_EMPHASIS (flag within parent field — do not extract separately)
   Scope: Text visually differentiated mid-block (highlighted, bold mid-sentence, colored differently).
   Rule: Wrap in [EMPHASIS] tags inside the parent field string.

── SLIDE POSITION LOGIC ──
- slide_number === 1: Prioritize HEADLINE + SUBHEADLINE. Metadata load is heaviest here.
- slide_number > 1, is_final === false: Prioritize HEADLINE + BODY. Subheadline often absent.
- is_final === true → CTA-MODE: cta_directive is PRIMARY. body is reclassified as cta_support.
  metadata.urgency_label captures countdowns/deadlines ("3 DAYS LEFT", "Deadline Friday").

── OUTPUT FORMAT (strict JSON, no markdown, no explanation) ──
{
  "slide_type": "${slideTypeHint}",
  "headline": "...",
  "subheadline": "... or null",
  "body": "... or null",
  "cta_directive": "... or null",
  "cta_support": "... or null",
  "directional_ui": [],
  "metadata": {
    "brand": [],
    "hashtags": [],
    "slide_number": "... or null",
    "cosponsor": [],
    "campaign_label": "... or null",
    "urgency_label": "... or null",
    "cta_link": "... or null"
  },
  "inline_emphasis": [],
  "visual_description": "one-sentence description of non-text visual elements for alt-text"
}`;

    let byteString;
    try {
      byteString = atob(base64Image);
    } catch {
      return Response.json({ error: 'Invalid base64 encoding' }, { status: 400, headers: corsHeaders });
    }
    const imageBytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) imageBytes[i] = byteString.charCodeAt(i);

    const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      image: [...imageBytes],
      prompt: systemPrompt,
      max_tokens: 768,
    });

    const rawText = (response.response || response.description || '') as string;

    let extracted: any = {
      slide_type: slideTypeHint,
      headline: '', subheadline: null, body: null,
      cta_directive: null, cta_support: null,
      directional_ui: [],
      metadata: { brand: [], hashtags: [], slide_number: null, cosponsor: [], campaign_label: null, urgency_label: null, cta_link: null },
      inline_emphasis: [],
      visual_description: ''
    };

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = { ...extracted, ...JSON.parse(jsonMatch[0]) };
    } catch {
      extracted.body = rawText;
    }

    return Response.json(
      { extracted, raw_response: rawText, model: '@cf/meta/llama-3.2-11b-vision-instruct', slide_number, total_slides },
      { headers: corsHeaders }
    );
  },
};
