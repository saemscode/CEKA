export interface Env {
  AI: {
    run(model: string, inputs: Record<string, unknown>): Promise<{
      translated_text?: string;
      [key: string]: unknown;
    }>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Method Restriction
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // 2. Body Parsing
    const { source_text, source_language, target_language } = await request.json() as {
      source_text: string;
      source_language: string;
      target_language: string;
    };

    if (!source_text || !target_language) {
      return Response.json({ error: 'source_text and target_language required' }, { status: 400, headers: corsHeaders });
    }

    // 3. Model Mapping
    const langMap: Record<string, string> = {
      'sw': 'swahili',
      'en': 'english',
      'ki': 'kikuyu', // Note: Placeholder for M2M mapping
      'luo': 'luo',
      'luy': 'luyia',
      'kam': 'kamba'
    };

    const mappedTarget = langMap[target_language] || target_language;
    
    // 4. M2M100 Coverage Guard
    const unsupportedLanguages = ['ki', 'luo', 'luy', 'kam'];
    if (unsupportedLanguages.includes(target_language)) {
      return Response.json({
        translated_text: null,
        target_language,
        skipped: true,
        reason: 'Language not supported by M2M100 model'
      }, { headers: corsHeaders });
    }

    try {
      // 5. Native Workers AI Binding Call
      const response = await env.AI.run('@cf/meta/m2m100-1.2b', {
        text: source_text,
        source_lang: langMap[source_language] || 'english',
        target_lang: mappedTarget
      });

      return Response.json({
        translated_text: response.translated_text || null,
        target_language,
        source_language,
        skipped: false
      }, { headers: corsHeaders });
    } catch (error: any) {
      return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
  }
};
