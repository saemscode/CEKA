import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // 1. HANDLE PREFLIGHT
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { client_id, redirect_uri, state, code_challenge, code_challenge_method } = await req.json()
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized: Missing identity token.')

    console.log(`[OAuth-Authorize] Executing Nuclear Handshake for: ${client_id}`);

    // STRICT MODE: Corrected Handshake Endpoint for Supabase OAuth Server (BETA)
    // We MUST use /oauth/authorize instead of /authorize to avoid "Unsupported provider" errors.
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/oauth/authorize?` + new URLSearchParams({
        client_id,
        redirect_uri,
        response_type: 'code',
        scope: 'profile email',
        state: state || '',
        code_challenge: code_challenge || '',
        code_challenge_method: code_challenge_method || ''
    }), {
        method: 'GET',
        headers: { 'Authorization': authHeader }
    })

    // If the handshake succeeded, response.url will contain the redirect with the code
    console.log('[OAuth-Authorize] Handshake Resolved. Deliverable ready.');

    return new Response(JSON.stringify({ url: response.url }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error: any) {
    console.error('[OAuth-Authorize] Critical Handshake Failure:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})
