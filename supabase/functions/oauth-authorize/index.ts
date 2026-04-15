import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // 1. HANDLE PREFLIGHT (CRITICAL)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { 
      client_id, 
      redirect_uri, 
      state, 
      scope = 'profile email',
      code_challenge,
      code_challenge_method
    } = body
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized: Missing identity token.')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    console.log(`[OAuth-Authorize] Initializing PKCE Handshake for: ${client_id}`);

    // 2. CONSTRUCT AUTHORIZATION URL (Standard GET Handshake)
    const authUrl = new URL(`${SUPABASE_URL}/auth/v1/oauth/authorize`)
    authUrl.searchParams.set('client_id', client_id)
    authUrl.searchParams.set('redirect_uri', redirect_uri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)
    if (state) authUrl.searchParams.set('state', state)
    if (code_challenge) authUrl.searchParams.set('code_challenge', code_challenge)
    if (code_challenge_method) authUrl.searchParams.set('code_challenge_method', code_challenge_method)

    // 3. SECURE REDIRECT CAPTURE
    const response = await fetch(authUrl.toString(), {
      method: 'GET',
      redirect: 'manual', // Intercept the 302/303 redirect containing the code
      headers: {
        'Authorization': authHeader,
        'apikey': ANON_KEY
      }
    })

    const redirectUrl = response.headers.get('location')
    
    // Status 302/303 + Location Header = SUCCESSFUL HANDSHAKE
    if ((response.status === 302 || response.status === 303) && redirectUrl) {
      console.log('[OAuth-Authorize] Identity Married Server-Side. Delivering Code...');
      return new Response(JSON.stringify({ url: redirectUrl }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      })
    }

    // 4. DETAILED ERROR LOGGING
    const text = await response.text();
    console.error(`[OAuth-Authorize] Handshake Rejection: ${response.status} - ${text}`);
    
    // If the error indicates missing PKCE, we know exactly what's wrong
    if (text.includes('code_challenge')) {
        throw new Error('PKCE Mismatch: Your Nasaka project requires a code_challenge. Please ensure it is passed in the authorize URL.');
    }

    throw new Error(`Auth Engine Rejected Handshake (${response.status}): ${text || 'Unknown Internal Error'}`);

  } catch (error: any) {
    console.error('[OAuth-Authorize] Critical Handshake Failure:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})
