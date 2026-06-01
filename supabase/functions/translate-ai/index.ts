import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { corsHeaders } from "../_shared/cors.ts"

const CLOUDFLARE_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!
const CLOUDFLARE_TOKEN = Deno.env.get("CLOUDFLARE_AI_TOKEN")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// M2M100 Language Mapping
const getM2MCode = (code: string) => {
  const map: Record<string, string> = {
    'sw': 'swahili',
    'en': 'english',
    'fr': 'french',
    'zh': 'chinese',
    'ar': 'arabic'
  }
  return map[code] || code
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { unit_id, source_text, target_languages } = await req.json()

    if (!unit_id || !source_text || !target_languages) {
      throw new Error("Missing unit_id, source_text, or target_languages")
    }

    const WORKER_URL = 'https://ceka-translation-draft.saemscodes.workers.dev';
    const results = []

    for (const lang of target_languages) {
      // Call Cloudflare Workers AI via the Worker Bridge
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_text: source_text,
          source_language: "en",
          target_language: lang,
        }),
      })

      const result = await response.json()
      
      if (!result.error && result.translated_text) {
        const translatedText = result.translated_text
        
        // Insert as AI Submission
        const { data, error } = await supabase.from("translation_submissions").insert({
          unit_id,
          lang_code: lang,
          translated_text: translatedText,
          channel: 'ai',
          status: 'pending',
          confidence_score: 0.5 // Baseline for AI
        }).select().single()

        if (!error) results.push(data)
      }
    }

    return new Response(JSON.stringify({ success: true, drafts: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
