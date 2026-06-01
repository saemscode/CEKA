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
  const base64 = btoa(String.fromCharCode(...new Uint8Array(blob)));
  return base64;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { image_url, image_base64, slide_number = 1, total_slides = 1, is_final = false } = await request.json() as any;

    if (!image_url && !image_base64) {
      return Response.json({ error: 'image_url or image_base64 required' }, { status: 400 });
    }

    let base64Image: string;
    try {
      base64Image = image_base64 || await fetchImageAsBase64(image_url!);
    } catch {
      return Response.json({ error: 'Failed to fetch or encode image' }, { status: 400 });
    }

    // THE DEFINITIVE CEKA STRUCTURAL SYSTEM PROMPT
    let systemPrompt = `You are the CEKA Vision Engine. Extract and categorize ALL text from a civic education carousel slide.
This is slide ${slide_number} of ${total_slides}. 

Rules:
1. Rely ONLY on spatial hierarchy (Size/Position). 
2. METADATA: Brand names (CEKA), @civiceducationke, hashtags, co-sponsors must be identified but kept in the 'metadata' field. Do not put them in headlines.
3. HEADLINE: The largest, most dominant text.
4. BODY: The paragraph or sentence content.
5. CTA: Instruction text (final slide only).

Return ONLY valid JSON. No markdown.
{
  "slide_type": "${is_final ? 'CTA' : slide_number === 1 ? 'HOOK' : 'CONTENT'}",
  "headline": "...",
  "subheadline": "...",
  "body": "...",
  "cta": "...",
  "metadata": "..."
}`;

    if (is_final) {
      systemPrompt += "\nNote: This is the final slide. Switch to CTA-Mode: headline and body are secondary to the CTA command.";
    }

    const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      image: base64Image,
      prompt: systemPrompt,
      max_tokens: 512
    });

    const rawText = response.response || response.description || '';
    let extracted: any = { headline: '', body: '', cta: '', metadata: '' };

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch {
      extracted.body = rawText;
    }

    return Response.json({
      extracted,
      raw_response: rawText,
      model: '@cf/meta/llama-3.2-11b-vision-instruct'
    });
  }
};
