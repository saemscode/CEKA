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
    const { client_id, redirect_uri, state, scope = 'profile email' } = await req.json()
    
    // We get the user's JWT from the request headers (passed by supabase.functions.invoke)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized: Missing identity token.')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    console.log(`[OAuth-Authorize] Initializing Handshake for: ${client_id}`);

    // STRICT MODE: Direct API Handshake
    // We hit the authorize endpoint directly since the SDK might not have the Beta method
    const response = await fetch(`${SUPABASE_URL}/auth/v1/oauth/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'apikey': ANON_KEY
      },
      body: JSON.stringify({
        client_id,
        redirect_uri,
        response_type: 'code',
        scope,
        state: state || undefined
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[OAuth-Authorize] Handshake Rejection:', data);
      throw new Error(data.msg || data.message || 'Authorization rejected by security server.');
    }

    console.log('[OAuth-Authorize] Handshake successful');
    
    return new Response(JSON.stringify({ url: data?.url }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error: any) {
    console.error('[OAuth-Authorize] Critical Failure:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})
