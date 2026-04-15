import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_ORIGINS = [
  'https://nasakaiebc.civiceducationkenya.com',
  'http://localhost:5173'
]

const CLIENT_ID = Deno.env.get('CEKA_OAUTH_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('CEKA_OAUTH_CLIENT_SECRET')!

serve(async (req) => {
  const origin = req.headers.get('origin')
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin)
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri } = await req.json()

    // 1. Initialize admin client to verify app existence (Strictly preserving original logic)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Validate the app exists in CEKA's DB before proceeding (DEEP DIFFERENTIATION)
    const { data: app, error: appError } = await supabaseAdmin
      .from('third_party_apps' as any)
      .select('*')
      .eq('client_id', CLIENT_ID)
      .eq('client_secret', CLIENT_SECRET)
      .single();

    if (appError || !app) {
      console.error('[OAuth-Token] Client Verification Failed:', appError?.message);
      return new Response(JSON.stringify({ error: 'invalid_client', details: 'Client credentials not recognized in CEKA Registry.' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`[OAuth-Token] Exchanging code for token for app: ${app.name}. Client ID: ${CLIENT_ID}`)

    // 3. Exchange code for Access Token via Supabase Auth Internal Handshake
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
        }),
    })

    const data = await response.json()

    if (!response.ok) {
        console.error('[OAuth-Token] Supabase exchange failed:', data)
        return new Response(JSON.stringify(data), { 
            status: response.status, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        })
    }

    console.log(`[OAuth-Token] Exchange successful for ${app.name}`)
    return new Response(JSON.stringify(data), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error: any) {
    console.error('[OAuth-Token] System Failure:', error.message)
    return new Response(JSON.stringify({ error: 'server_error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})


