import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { client_id, redirect_uri, state, scope = 'profile email' } = await req.json()

    console.log(`[OAuth-Authorize] Initializing secure handshake for client: ${client_id}`);

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Using admin.authorizeUser to get the redirect URL with the code securely
    const { data, error } = await supabaseAdmin.auth.admin.authorizeUser({
        client_id,
        redirect_uri,
        response_type: 'code',
        scope,
        state: state || undefined
    })

    if (error) {
        console.error('[OAuth-Authorize] Handshake Rejection:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        })
    }

    console.log('[OAuth-Authorize] Handshake URL generated successfully');
    
    return new Response(JSON.stringify({ url: data?.url }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error: any) {
    console.error('[OAuth-Authorize] System Failure:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})
