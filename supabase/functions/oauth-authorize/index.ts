// oauth-authorize/index.ts
// CEKA OAuth 2.1 Server – Authorization Broker (Nuclear Option + Server-Side PKCE)
// STRICT MODE: Full PKCE generation server-side. code_verifier encoded into state for round-trip recovery.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Generate a cryptographically secure random string (base64url)
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// SHA-256 hash -> base64url (PKCE S256 method)
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

serve(async (req) => {
  // 0. HANDLE PREFLIGHT
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge: incoming_challenge,
      code_challenge_method: incoming_method
    } = await req.json()

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    console.log(`[OAuth-Authorize] Executing Nuclear Handshake for: ${client_id}`)
    console.log(`[OAuth-Authorize] Redirect URI: ${redirect_uri}`)

    // PKCE STRATEGY:
    // If Nasaka (or the consumer) sent valid PKCE params, use them (they hold the verifier).
    // If not, generate PKCE server-side and encode the code_verifier into the state
    // for round-trip recovery at token exchange time.
    let code_challenge: string
    let code_challenge_method: string
    let code_verifier: string | null = null
    let enrichedState = state || ''

    if (incoming_challenge && incoming_challenge.length > 0) {
      // Consumer sent PKCE - use it as-is
      code_challenge = incoming_challenge
      code_challenge_method = incoming_method || 'S256'
      console.log('[OAuth-Authorize] Using consumer-provided PKCE challenge.')
    } else {
      // No PKCE from consumer - generate server-side
      code_verifier = generateCodeVerifier()
      code_challenge = await generateCodeChallenge(code_verifier)
      code_challenge_method = 'S256'
      // Encode verifier into state for round-trip recovery: "originalState||verifier"
      enrichedState = `${state || ''}||${code_verifier}`
      console.log('[OAuth-Authorize] Generated server-side PKCE challenge.')
    }

    const params: Record<string, string> = {
      client_id,
      redirect_uri,
      response_type: 'code',
      scope: scope || 'openid profile email',
      state: enrichedState,
      code_challenge,
      code_challenge_method,
    }

    const authorizeUrl = `${SUPABASE_URL}/auth/v1/oauth/authorize?` + new URLSearchParams(params)
    console.log(`[OAuth-Authorize] Hitting OAuth Engine: ${authorizeUrl}`)

    const response = await fetch(authorizeUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      redirect: 'manual' // CRITICAL: Capture the 302 Location ourselves
    })

    const location = response.headers.get('location')

    if ((response.status === 301 || response.status === 302 || response.status === 303) && location) {
      console.log('[OAuth-Authorize] Handshake Resolved. Deliverable ready:', location)
      return new Response(JSON.stringify({ url: location }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Capture the exact rejection reason from the Auth engine
    const body = await response.text()
    console.error(`[OAuth-Authorize] Engine Rejected Handshake (${response.status}):`, body)

    return new Response(JSON.stringify({
      error: 'engine_error',
      status: response.status,
      details: body
    }), {
      status: response.status >= 400 ? response.status : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[OAuth-Authorize] Critical Handshake Failure:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
