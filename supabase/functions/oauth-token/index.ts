import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CLIENT_ID = Deno.env.get('CEKA_OAUTH_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('CEKA_OAUTH_CLIENT_SECRET')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // 0. HANDLE PREFLIGHT
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri, code_verifier } = await req.json()

    console.log(`[OAuth-Token] Marriage Exchange for: ${CLIENT_ID}`);

    // 1. Exchange code for Access Token via Supabase Auth Internal
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri,
        code_verifier: code_verifier || '',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[OAuth-Token] Handshake Rejected by Engine:', data);
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log('[OAuth-Token] Marriage Handshake Successful');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error('[OAuth-Token] Critical Failure:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
