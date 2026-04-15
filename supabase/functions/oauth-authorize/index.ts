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
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized: Missing identity token.')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    console.log(`[OAuth-Authorize] Initiating Handshake for: ${client_id}`);

    // STRICT MODE: Advanced Handshake Handling
    // We use redirect: 'manual' because the Auth engine might return a 302 location 
    const response = await fetch(`${SUPABASE_URL}/auth/v1/oauth/authorize`, {
      method: 'POST',
      redirect: 'manual', // Do not automatically follow redirects
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

    // 2. CAPTURE THE REDIRECT (This is where the 'code' is delivered)
    const redirectUrl = response.headers.get('location')
    
    // If it's a redirect, we've succeeded!
    if (response.status === 302 && redirectUrl) {
      console.log('[OAuth-Authorize] Handshake Redirect Captured');
      return new Response(JSON.stringify({ url: redirectUrl }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      })
    }

    // 3. FALLBACK FOR JSON RESPONSES (If not a redirect)
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();
        console.warn('[OAuth-Authorize] Non-JSON Response received:', text);
        // If it's a success status but not JSON/Redirect, something is odd but maybe okay
        if (response.ok) {
            throw new Error('Auth engine returned success but no redirect URL or JSON body.');
        } else {
            throw new Error(`Auth Error: ${text || 'Internal Handshake Failure'}`);
        }
    }

    if (!response.ok) {
      console.error('[OAuth-Authorize] Handshake Rejection:', data);
      throw new Error(data.msg || data.message || 'Authorization rejected by security server.');
    }

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
