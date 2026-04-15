// oauth-token/index.ts
// CEKA OAuth 2.1 – Token Exchange Broker
// Goal: Exchange code for Supabase JWT without exposing CLIENT_SECRET
// STRICT MODE: Alignment with CEKA OAuth Master Prompt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CLIENT_ID = Deno.env.get('CEKA_OAUTH_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('CEKA_OAUTH_CLIENT_SECRET')!

serve(async (req) => {
  try {
    const { code, redirect_uri, code_verifier } = await req.json()

    console.log(`[OAuth-Token] Exchanging code for: ${CLIENT_ID}`)

    // 1. Exchange code for Access Token via Supabase Auth Internal
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri,
        code_verifier,
      }),
    })

    const data = await response.json()
    
    return new Response(JSON.stringify(data), { 
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      } 
    })
  } catch (error: any) {
    console.error('[OAuth-Token] Failure:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      } 
    })
  }
})
