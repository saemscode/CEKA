// oauth-authorize/index.ts
// CEKA OAuth 2.1 – Two-Phase Authorization Broker
// Phase 1: Initiate → get authorization_id
// Phase 2: Auto-approve consent with user JWT → get final code redirect
// STRICT MODE: No removals. All existing logic preserved and extended.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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

    // STRICT: Forward the user's JWT from supabase.functions.invoke — this authenticates the consent
    const userAuthHeader = req.headers.get('Authorization') || `Bearer ${SUPABASE_ANON_KEY}`

    console.log(`[OAuth-Authorize] Two-Phase Nuclear Handshake for: ${client_id}`)
    console.log(`[OAuth-Authorize] Redirect URI: ${redirect_uri}`)

    // PKCE: Use consumer-provided challenge, or generate server-side and embed verifier in state
    let code_challenge: string
    let code_challenge_method: string
    let enrichedState = state || ''

    if (incoming_challenge && incoming_challenge.length > 0) {
      code_challenge = incoming_challenge
      code_challenge_method = incoming_method || 'S256'
      console.log('[OAuth-Authorize] Using consumer-provided PKCE challenge.')
    } else {
      const verifier = generateCodeVerifier()
      code_challenge = await generateCodeChallenge(verifier)
      code_challenge_method = 'S256'
      enrichedState = `${state || ''}||${verifier}`
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

    // ── PHASE 1: INITIATE ────────────────────────────────────────────────────
    const authorizeUrl = `${SUPABASE_URL}/auth/v1/oauth/authorize?` + new URLSearchParams(params)
    console.log(`[OAuth-Authorize] Phase 1 — Initiating: ${authorizeUrl}`)

    const phase1 = await fetch(authorizeUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': userAuthHeader,
      },
      redirect: 'manual',
    })

    const phase1Location = phase1.headers.get('location')

    if (!phase1Location) {
      const body = await phase1.text()
      console.error(`[OAuth-Authorize] Phase 1 failed (${phase1.status}):`, body)
      return new Response(JSON.stringify({ error: 'phase1_failed', status: phase1.status, details: body }), {
        status: phase1.status >= 400 ? phase1.status : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[OAuth-Authorize] Phase 1 Location: ${phase1Location}`)

    // If Supabase returned the code directly (cached consent), we're done
    if (phase1Location.includes('code=')) {
      console.log('[OAuth-Authorize] Auto-approved (cached consent). Deliverable ready.')
      return new Response(JSON.stringify({ url: phase1Location }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract authorization_id from the consent redirect URL
    let authorizationId: string | null = null
    try {
      const consentUrl = new URL(phase1Location)
      authorizationId = consentUrl.searchParams.get('authorization_id')
    } catch (_) {
      // phase1Location may be a relative URL — try parsing differently
      const match = phase1Location.match(/authorization_id=([^&]+)/)
      authorizationId = match?.[1] || null
    }

    if (!authorizationId) {
      console.error('[OAuth-Authorize] No authorization_id found in:', phase1Location)
      return new Response(JSON.stringify({ error: 'no_authorization_id', details: phase1Location }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[OAuth-Authorize] Phase 2 — Approving authorization_id: ${authorizationId}`)

    // ── PHASE 2: APPROVE CONSENT (REQUIRED: client_id + authorization_id + redirect_uri + PKCE)
    const phase2 = await fetch(
      `${SUPABASE_URL}/auth/v1/oauth/authorize?` + new URLSearchParams({ 
        authorization_id: authorizationId,
        client_id: client_id,
        redirect_uri: redirect_uri,
        code_challenge: code_challenge,
        code_challenge_method: code_challenge_method
      }),
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': userAuthHeader,
        },
        redirect: 'manual',
      }
    )

    const finalLocation = phase2.headers.get('location')

    if ((phase2.status === 301 || phase2.status === 302 || phase2.status === 303) && finalLocation) {
      console.log('[OAuth-Authorize] Phase 2 Approved! Final deliverable:', finalLocation)
      return new Response(JSON.stringify({ url: finalLocation }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const errorBody = await phase2.text()
    console.error(`[OAuth-Authorize] Phase 2 Approval Failed (${phase2.status}):`, errorBody)

    return new Response(JSON.stringify({
      error: 'consent_approval_failed',
      status: phase2.status,
      details: errorBody
    }), {
      status: phase2.status >= 400 ? phase2.status : 400,
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
