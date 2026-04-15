// oauth-authorize/index.ts
// CEKA OAuth 2.1 – Modern PKCE Authorization Broker
// Phase 1: Initiate → return location with authorization_id
// STRICT MODE: Alignment with CEKA OAuth Master Prompt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { 
      client_id, 
      redirect_uri, 
      state, 
      code_challenge, 
      code_challenge_method 
    } = await req.json()

    const authHeader = req.headers.get('Authorization')!
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    console.log(`[OAuth-Authorize] Initializing Handshake for: ${client_id}`)

    // ── PHASE 1: INITIATE ────────────────────────────────────────────────────
    const params = new URLSearchParams({
      client_id,
      redirect_uri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      code_challenge,
      code_challenge_method
    })

    // We hit the authorize endpoint once to trigger the session/ID generation
    const response = await fetch(`${SUPABASE_URL}/auth/v1/oauth/authorize?${params}`, {
      method: 'GET',
      headers: { 
        'Authorization': authHeader, 
        'apikey': SUPABASE_ANON_KEY 
      },
      redirect: 'manual'
    })

    const location = response.headers.get('location')
    
    // If we already have a code (user auto-approved), return it immediately
    if (location?.includes('code=')) {
      console.log('[OAuth-Authorize] Auto-approved (cached). Delivering code.')
      return new Response(JSON.stringify({ url: location }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      })
    }

    // Otherwise, return the Consent Screen URL (which will have authorization_id)
    console.log(`[OAuth-Authorize] Redirection required. Location: ${location || response.url}`)
    return new Response(JSON.stringify({ url: location || response.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error('[OAuth-Authorize] Failure:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
